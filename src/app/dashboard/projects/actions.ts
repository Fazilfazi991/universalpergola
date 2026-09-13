"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManagement, requireModuleAccess, requireRole } from "@/lib/auth/dal";
import { isUuid } from "@/lib/crm/validation";
import { createClient } from "@/lib/supabase/server";
import { createProjectFilePath, PROJECT_FILE_BUCKET } from "@/lib/projects/media";
import {
  assignmentSchema,
  handoverSchema,
  projectCompletionSchema,
  projectDetailsSchema,
  projectFileSchema,
  projectTaskSchema,
  projectUpdateSchema,
  stageDetailsSchema,
  stageTemplateSchema,
  stageTransitionSchema,
  taskTransitionSchema,
} from "@/lib/projects/validation";
import type { ProjectActionState, TaskStatus } from "@/lib/projects/types";

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item : "";
}
function optional(input: string) { return input.trim() || null; }
function dubaiIso(input: string) {
  if (!input) return null;
  return new Date(input.length === 16 ? `${input}:00+04:00` : input).toISOString();
}
function firstError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message || "Check the project details and try again.";
}
function refreshProject(projectId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function updateProjectDetailsAction(
  projectId: string,
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  await requireManagement();
  if (!isUuid(projectId)) return { status: "error", message: "Invalid project identifier." };
  const parsed = projectDetailsSchema.safeParse({
    status: value(formData, "status"),
    priority: value(formData, "priority"),
    start_date: value(formData, "start_date"),
    expected_completion_date: value(formData, "expected_completion_date"),
    installation_date: value(formData, "installation_date"),
    summary: value(formData, "summary"),
    notes: value(formData, "notes"),
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error), fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("update_project_details", {
    p_project_id: projectId,
    p_status: parsed.data.status,
    p_priority: parsed.data.priority,
    p_start_date: (parsed.data.start_date || null) as string,
    p_target_date: (parsed.data.expected_completion_date || null) as string,
    p_installation_date: (parsed.data.installation_date || null) as string,
    p_summary: parsed.data.summary,
    p_notes: parsed.data.notes,
  });
  if (error) return { status: "error", message: error.message };
  refreshProject(projectId);
  return { status: "success", message: "Project planning saved." };
}

export async function configureStageTemplateAction(
  templateId: string,
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  await requireManagement();
  if (!isUuid(templateId)) return { status: "error", message: "Invalid stage template." };
  const parsed = stageTemplateSchema.safeParse({
    name: value(formData, "name"),
    description: value(formData, "description"),
    sort_order: value(formData, "sort_order"),
    is_active: formData.get("is_active") === "on",
    default_weight: value(formData, "default_weight"),
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("configure_project_stage_template", {
    p_template_id: templateId,
    p_name: parsed.data.name,
    p_description: parsed.data.description,
    p_sort_order: parsed.data.sort_order,
    p_is_active: parsed.data.is_active,
    p_default_weight: parsed.data.default_weight,
  });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/dashboard/projects");
  return { status: "success", message: "Template saved. Existing projects were not changed." };
}

export async function setProjectAssignmentAction(formData: FormData) {
  await requireManagement();
  const parsed = assignmentSchema.safeParse({
    project_id: value(formData, "project_id"),
    user_id: value(formData, "user_id"),
    assignment_role: value(formData, "assignment_role"),
    enabled: value(formData, "enabled") !== "false",
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("set_project_assignment", {
    p_project_id: parsed.data.project_id,
    p_user_id: parsed.data.user_id,
    p_assignment_role: parsed.data.assignment_role,
    p_enabled: parsed.data.enabled,
  });
  if (error) throw new Error(error.message);
  refreshProject(parsed.data.project_id);
}

export async function transitionProjectStageAction(formData: FormData) {
  await requireRole(["admin", "site_team"]);
  const parsed = stageTransitionSchema.safeParse({
    project_id: value(formData, "project_id"),
    stage_id: value(formData, "stage_id"),
    action: value(formData, "action"),
    note: value(formData, "note"),
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("transition_project_stage", {
    p_stage_id: parsed.data.stage_id,
    p_action: parsed.data.action,
    p_note: (parsed.data.note || null) as string,
  });
  if (error) redirect(`/dashboard/projects/${parsed.data.project_id}?error=${encodeURIComponent(error.message)}`);
  refreshProject(parsed.data.project_id);
}

export async function updateProjectStageDetailsAction(
  stageId: string,
  projectId: string,
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  await requireManagement();
  if (!isUuid(stageId) || !isUuid(projectId)) return { status: "error", message: "Invalid project stage." };
  const parsed = stageDetailsSchema.safeParse({
    assigned_to: value(formData, "assigned_to"),
    target_date: value(formData, "target_date"),
    progress: value(formData, "progress"),
    notes: value(formData, "notes"),
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("update_project_stage_details", {
    p_stage_id: stageId,
    p_assigned_to: (parsed.data.assigned_to || null) as string,
    p_target_date: (parsed.data.target_date || null) as string,
    p_progress: parsed.data.progress,
    p_notes: parsed.data.notes,
  });
  if (error) return { status: "error", message: error.message };
  refreshProject(projectId);
  return { status: "success", message: "Stage plan saved." };
}

export async function addProjectUpdateAction(
  projectId: string,
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const profile = await requireRole(["admin", "sales", "site_team"]);
  if (!isUuid(projectId)) return { status: "error", message: "Invalid project identifier." };
  const parsed = projectUpdateSchema.safeParse({
    stage_id: value(formData, "stage_id"),
    update_type: value(formData, "update_type"),
    progress: value(formData, "progress"),
    note: value(formData, "note"),
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.from("project_updates").insert({
    project_id: projectId,
    stage_id: parsed.data.stage_id || null,
    update_type: parsed.data.update_type,
    progress: value(formData, "progress") ? Number(parsed.data.progress) : null,
    note: parsed.data.note,
    created_by: profile.id,
  });
  if (error) return { status: "error", message: error.message };
  refreshProject(projectId);
  return { status: "success", message: "Project update added." };
}

export async function addProjectTaskAction(
  projectId: string,
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const profile = await requireRole(["admin", "site_team"]);
  if (!isUuid(projectId)) return { status: "error", message: "Invalid project identifier." };
  const parsed = projectTaskSchema.safeParse({
    project_stage_id: value(formData, "project_stage_id"),
    assigned_to: value(formData, "assigned_to"),
    title: value(formData, "title"),
    description: value(formData, "description"),
    priority: value(formData, "priority"),
    due_at: value(formData, "due_at"),
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.from("tasks").insert({
    kind: "project_task",
    project_id: projectId,
    project_stage_id: parsed.data.project_stage_id || null,
    assigned_to: parsed.data.assigned_to || profile.id,
    title: parsed.data.title,
    description: optional(parsed.data.description),
    priority: parsed.data.priority,
    due_at: dubaiIso(parsed.data.due_at),
    status: "open",
    created_by: profile.id,
  });
  if (error) return { status: "error", message: error.message };
  refreshProject(projectId);
  return { status: "success", message: "Project task added." };
}

const taskTransitions: Record<TaskStatus, TaskStatus[]> = {
  open: ["in_progress", "blocked", "completed", "cancelled"],
  in_progress: ["open", "blocked", "completed", "cancelled"],
  blocked: ["open", "in_progress", "completed", "cancelled"],
  completed: ["open"],
  cancelled: ["open"],
};
export async function transitionProjectTaskAction(formData: FormData) {
  await requireRole(["admin", "site_team"]);
  const parsed = taskTransitionSchema.safeParse({ project_id: value(formData, "project_id"), task_id: value(formData, "task_id"), status: value(formData, "status") });
  if (!parsed.success) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { data: current } = await supabase.from("tasks").select("status").eq("id", parsed.data.task_id).eq("project_id", parsed.data.project_id).eq("kind", "project_task").maybeSingle();
  if (!current || !taskTransitions[current.status].includes(parsed.data.status)) return;
  const { error } = await supabase.from("tasks").update({ status: parsed.data.status, completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null }).eq("id", parsed.data.task_id).eq("project_id", parsed.data.project_id).eq("kind", "project_task");
  if (error) throw new Error(error.message);
  refreshProject(parsed.data.project_id);
}

export async function updateProjectHandoverAction(
  projectId: string,
  _state: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  await requireRole(["admin", "site_team"]);
  if (!isUuid(projectId)) return { status: "error", message: "Invalid project identifier." };
  const parsed = handoverSchema.safeParse({ status: value(formData, "status"), handover_date: value(formData, "handover_date"), contact: value(formData, "contact"), notes: value(formData, "notes") });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("update_project_handover", {
    p_project_id: projectId,
    p_status: parsed.data.status,
    p_handover_date: (parsed.data.handover_date || null) as string,
    p_contact: parsed.data.contact,
    p_notes: parsed.data.notes,
  });
  if (error) return { status: "error", message: error.message };
  refreshProject(projectId);
  return { status: "success", message: "Handover record saved." };
}

export async function completeProjectAction(formData: FormData) {
  await requireManagement();
  const parsed = projectCompletionSchema.safeParse({ project_id: value(formData, "project_id"), note: value(formData, "note") });
  if (!parsed.success) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("complete_project", { p_project_id: parsed.data.project_id, p_completion_note: (parsed.data.note || null) as string });
  if (error) redirect(`/dashboard/projects/${parsed.data.project_id}?error=${encodeURIComponent(error.message)}`);
  refreshProject(parsed.data.project_id);
}

export async function reopenProjectAction(formData: FormData) {
  await requireManagement();
  const parsed = projectCompletionSchema.safeParse({ project_id: value(formData, "project_id"), note: value(formData, "note") });
  if (!parsed.success || parsed.data.note.trim().length < 3) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { error } = await supabase.rpc("reopen_project", { p_project_id: parsed.data.project_id, p_note: parsed.data.note });
  if (error) redirect(`/dashboard/projects/${parsed.data.project_id}?error=${encodeURIComponent(error.message)}`);
  refreshProject(parsed.data.project_id);
}

export async function reserveProjectFileAction(input: unknown): Promise<ProjectActionState> {
  const profile = await requireRole(["admin", "site_team"]);
  const parsed = projectFileSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const fileId = crypto.randomUUID();
  const storagePath = createProjectFilePath(parsed.data.project_id, fileId, parsed.data.mime_type);
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.from("project_files").insert({
    id: fileId,
    project_id: parsed.data.project_id,
    stage_id: parsed.data.stage_id || null,
    file_type: parsed.data.file_type,
    storage_path: storagePath,
    file_name: parsed.data.file_name,
    mime_type: parsed.data.mime_type,
    file_size: parsed.data.file_size,
    caption: optional(parsed.data.caption),
    upload_status: "pending",
    created_by: profile.id,
  });
  if (error) return { status: "error", message: error.message };
  return { status: "success", message: "Upload reserved.", recordId: fileId, storagePath };
}

export async function finalizeProjectFileAction(fileId: string, projectId: string): Promise<ProjectActionState> {
  await requireRole(["admin", "site_team"]);
  if (!isUuid(fileId) || !isUuid(projectId)) return { status: "error", message: "Invalid project file." };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("finalize_project_file", { p_file_id: fileId });
  if (error) return { status: "error", message: error.message };
  refreshProject(projectId);
  return { status: "success", message: "File uploaded." };
}

export async function releaseProjectFileReservationAction(fileId: string, projectId: string) {
  await requireRole(["admin", "site_team"]);
  if (!isUuid(fileId) || !isUuid(projectId)) return;
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("project_files").delete().eq("id", fileId).eq("project_id", projectId).eq("upload_status", "pending");
}

export async function removeProjectFileAction(formData: FormData) {
  await requireRole(["admin", "site_team"]);
  const fileId = value(formData, "file_id");
  const projectId = value(formData, "project_id");
  if (!isUuid(fileId) || !isUuid(projectId)) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { data } = await supabase.from("project_files").select("storage_path").eq("id", fileId).eq("project_id", projectId).maybeSingle();
  if (!data) return;
  const removal = await supabase.storage.from(PROJECT_FILE_BUCKET).remove([data.storage_path]);
  if (removal.error) throw new Error(removal.error.message);
  const { error } = await supabase.from("project_files").delete().eq("id", fileId).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  refreshProject(projectId);
}

export async function downloadProjectFileAction(formData: FormData) {
  await requireModuleAccess("projects");
  const fileId = value(formData, "file_id");
  const projectId = value(formData, "project_id");
  if (!isUuid(fileId) || !isUuid(projectId)) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { data } = await supabase.from("project_files").select("storage_path").eq("id", fileId).eq("project_id", projectId).eq("upload_status", "ready").maybeSingle();
  if (!data) return;
  const signed = await supabase.storage.from(PROJECT_FILE_BUCKET).createSignedUrl(data.storage_path, 120);
  if (!signed.data?.signedUrl) return;
  redirect(signed.data.signedUrl);
}
