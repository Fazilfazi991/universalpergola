"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addProjectTaskAction,
  addProjectUpdateAction,
  configureStageTemplateAction,
  finalizeProjectFileAction,
  releaseProjectFileReservationAction,
  reserveProjectFileAction,
  updateProjectDetailsAction,
  updateProjectHandoverAction,
  updateProjectStageDetailsAction,
} from "@/app/dashboard/projects/actions";
import type { AppRole } from "@/lib/auth/permissions";
import {
  HANDOVER_STATUSES,
  HANDOVER_STATUS_LABELS,
  PROJECT_FILE_CATEGORIES,
  PROJECT_FILE_CATEGORY_LABELS,
  PROJECT_PRIORITIES,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_UPDATE_LABELS,
  PROJECT_UPDATE_TYPES,
} from "@/lib/projects/constants";
import { PROJECT_FILE_BUCKET, validateProjectFile } from "@/lib/projects/media";
import type { ProjectDetail, ProjectStage, ProjectStaff, StageTemplate } from "@/lib/projects/queries";
import { INITIAL_PROJECT_ACTION_STATE, type ProjectActionState } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/client";

const input = "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base";

function ActionNotice({ state }: { state: ProjectActionState }) {
  return state.message ? (
    <p role="status" className={`text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>
      {state.message}
    </p>
  ) : null;
}

export function ProjectPlanForm({ project }: { project: ProjectDetail }) {
  const [state, action, pending] = useActionState(updateProjectDetailsAction.bind(null, project.id), INITIAL_PROJECT_ACTION_STATE);
  return (
    <form action={action} className="space-y-4">
      <ActionNotice state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Status
          <select name="status" defaultValue={project.status === "completed" ? "active" : project.status} className={input} disabled={project.status === "completed"}>
            {(["planned", "active", "on_hold", "cancelled"] as const).map((status) => <option key={status} value={status}>{PROJECT_STATUS_LABELS[status]}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">Priority
          <select name="priority" defaultValue={project.priority} className={input} disabled={project.status === "completed"}>
            {PROJECT_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PROJECT_PRIORITY_LABELS[priority]}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">Start date
          <input type="date" name="start_date" defaultValue={project.start_date || ""} className={input} disabled={project.status === "completed"} />
        </label>
        <label className="grid gap-2 text-sm font-medium">Target completion
          <input type="date" name="expected_completion_date" defaultValue={project.expected_completion_date || ""} className={input} disabled={project.status === "completed"} />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">Planned installation
          <input type="date" name="installation_date" defaultValue={project.installation_date || ""} className={input} disabled={project.status === "completed"} />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">Project summary
          <textarea name="summary" defaultValue={project.summary || ""} maxLength={4000} className={`${input} min-h-24 py-3`} disabled={project.status === "completed"} />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">Internal notes
          <textarea name="notes" defaultValue={project.notes || ""} maxLength={12000} className={`${input} min-h-28 py-3`} disabled={project.status === "completed"} />
        </label>
      </div>
      {project.status !== "completed" ? <button disabled={pending} className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50">{pending ? "Saving…" : "Save project plan"}</button> : null}
    </form>
  );
}

export function StagePlanForm({ stage, projectId, participants }: { stage: ProjectStage; projectId: string; participants: ProjectStaff[] }) {
  const [state, action, pending] = useActionState(updateProjectStageDetailsAction.bind(null, stage.id, projectId), INITIAL_PROJECT_ACTION_STATE);
  return (
    <form action={action} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><ActionNotice state={state} /></div>
      <label className="grid gap-1 text-xs font-medium">Stage owner
        <select name="assigned_to" defaultValue={stage.assigned_to || ""} className={input}>
          <option value="">Unassigned</option>
          {participants.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium">Target date
        <input name="target_date" type="date" defaultValue={stage.target_date || ""} className={input} />
      </label>
      <label className="grid gap-1 text-xs font-medium">Stage progress
        <input name="progress" type="number" min="0" max="99" defaultValue={stage.status === "completed" || stage.status === "skipped" ? 99 : stage.progress} className={input} />
      </label>
      <label className="grid gap-1 text-xs font-medium sm:col-span-2">Stage notes
        <textarea name="notes" defaultValue={stage.notes || ""} maxLength={8000} className={`${input} min-h-20 py-3`} />
      </label>
      <button disabled={pending} className="min-h-10 justify-self-start text-sm font-semibold text-brass-dark hover:text-graphite hover:underline disabled:opacity-50">{pending ? "Saving…" : "Save stage plan"}</button>
    </form>
  );
}

export function ProjectUpdateForm({ projectId, stages, role }: { projectId: string; stages: ProjectStage[]; role: AppRole }) {
  const [state, action, pending] = useActionState(addProjectUpdateAction.bind(null, projectId), INITIAL_PROJECT_ACTION_STATE);
  const types = role === "sales" ? PROJECT_UPDATE_TYPES.filter((type) => type === "general" || type === "customer_decision") : PROJECT_UPDATE_TYPES;
  return (
    <form action={action} className="space-y-3">
      <ActionNotice state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="update_type" defaultValue="general" className={input} aria-label="Update type">
          {types.map((type) => <option key={type} value={type}>{PROJECT_UPDATE_LABELS[type]}</option>)}
        </select>
        <select name="stage_id" defaultValue="" className={input} aria-label="Related stage">
          <option value="">Whole project</option>
          {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
        </select>
      </div>
      {role !== "sales" ? <input name="progress" type="number" min="0" max="100" className={input} placeholder="Optional observed progress %" aria-label="Observed progress" /> : <input type="hidden" name="progress" value="" />}
      <textarea name="note" required maxLength={8000} className={`${input} min-h-24 py-3`} placeholder="What changed, what is blocked, or what was decided?" />
      <button disabled={pending} className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Adding…" : "Add update"}</button>
    </form>
  );
}

export function ProjectTaskForm({ projectId, stages, participants, currentUserId, role }: { projectId: string; stages: ProjectStage[]; participants: ProjectStaff[]; currentUserId: string; role: AppRole }) {
  const [state, action, pending] = useActionState(addProjectTaskAction.bind(null, projectId), INITIAL_PROJECT_ACTION_STATE);
  const assignees = role === "site_team" ? participants.filter((person) => person.id === currentUserId) : participants;
  return (
    <form action={action} className="space-y-3">
      <ActionNotice state={state} />
      <input name="title" required maxLength={300} className={input} placeholder="Task title" />
      <textarea name="description" maxLength={4000} className={`${input} min-h-20 py-3`} placeholder="Optional execution detail" />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="project_stage_id" defaultValue="" className={input} aria-label="Task stage">
          <option value="">Whole project</option>
          {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
        </select>
        <select name="assigned_to" defaultValue={role === "site_team" ? currentUserId : ""} className={input} aria-label="Task assignee">
          <option value="">Assign to me</option>
          {assignees.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
        </select>
        <select name="priority" defaultValue="normal" className={input} aria-label="Task priority">
          {PROJECT_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PROJECT_PRIORITY_LABELS[priority]}</option>)}
        </select>
        <input type="datetime-local" name="due_at" className={input} aria-label="Task due date" />
      </div>
      <button disabled={pending} className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Adding…" : "Add task"}</button>
    </form>
  );
}

export function HandoverForm({ project }: { project: ProjectDetail }) {
  const [state, action, pending] = useActionState(updateProjectHandoverAction.bind(null, project.id), INITIAL_PROJECT_ACTION_STATE);
  return (
    <form action={action} className="space-y-3">
      <ActionNotice state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Handover state
          <select name="status" defaultValue={project.handover_status} className={input}>
            {HANDOVER_STATUSES.map((status) => <option key={status} value={status}>{HANDOVER_STATUS_LABELS[status]}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">Handover date
          <input name="handover_date" type="date" defaultValue={project.handover_date || ""} className={input} />
        </label>
      </div>
      <input name="contact" maxLength={200} defaultValue={project.handover_contact || ""} className={input} placeholder="Customer representative / contact" />
      <textarea name="notes" maxLength={8000} defaultValue={project.handover_notes || ""} className={`${input} min-h-24 py-3`} placeholder="Handover notes or outstanding issues" />
      <button disabled={pending} className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save handover"}</button>
    </form>
  );
}

export function StageTemplateForm({ template }: { template: StageTemplate }) {
  const [state, action, pending] = useActionState(configureStageTemplateAction.bind(null, template.id), INITIAL_PROJECT_ACTION_STATE);
  return (
    <form action={action} className="grid gap-3 border-t border-line py-4 first:border-t-0 sm:grid-cols-[5rem_minmax(10rem,1fr)_7rem_auto] sm:items-end">
      <label className="grid gap-1 text-xs font-medium">Order<input name="sort_order" type="number" min="0" max="10000" defaultValue={template.sort_order} className={input} /></label>
      <label className="grid gap-1 text-xs font-medium">Name<input name="name" required maxLength={120} defaultValue={template.name} className={input} /></label>
      <label className="grid gap-1 text-xs font-medium">Weight<input name="default_weight" type="number" min="0.001" max="100" step="0.001" defaultValue={template.default_weight} className={input} /></label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input name="is_active" type="checkbox" defaultChecked={template.is_active} disabled={template.is_terminal} className="size-5 accent-brass-dark" /> Active{template.is_terminal ? <input type="hidden" name="is_active" value="on" /> : null}</label>
      <label className="grid gap-1 text-xs font-medium sm:col-span-3">Description<input name="description" maxLength={2000} defaultValue={template.description || ""} className={input} /></label>
      <button disabled={pending} className="min-h-10 text-sm font-semibold text-brass-dark disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
      <div className="sm:col-span-4"><ActionNotice state={state} /></div>
    </form>
  );
}

export function ProjectFileUploader({ projectId, stages }: { projectId: string; stages: ProjectStage[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(formData: FormData) {
    if (!file) { setMessage("Choose a file first."); return; }
    const validation = validateProjectFile(file);
    if (validation) { setMessage(validation); return; }
    setBusy(true); setMessage("");
    const reservation = await reserveProjectFileAction({
      project_id: projectId,
      stage_id: String(formData.get("stage_id") || ""),
      file_type: String(formData.get("file_type") || "other"),
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      caption: String(formData.get("caption") || ""),
    });
    if (!reservation.recordId || !reservation.storagePath) { setMessage(reservation.message || "Upload could not be reserved."); setBusy(false); return; }
    const supabase = createClient();
    if (!supabase) { await releaseProjectFileReservationAction(reservation.recordId, projectId); setMessage("Supabase is not configured."); setBusy(false); return; }
    const stored = await supabase.storage.from(PROJECT_FILE_BUCKET).upload(reservation.storagePath, file, { contentType: file.type, upsert: false });
    if (stored.error) { await releaseProjectFileReservationAction(reservation.recordId, projectId); setMessage(stored.error.message); setBusy(false); return; }
    const finalized = await finalizeProjectFileAction(reservation.recordId, projectId);
    if (finalized.status === "error") {
      await supabase.storage.from(PROJECT_FILE_BUCKET).remove([reservation.storagePath]);
      await releaseProjectFileReservationAction(reservation.recordId, projectId);
      setMessage(finalized.message || "Upload could not be finalized."); setBusy(false); return;
    }
    setFile(null); setMessage("File uploaded."); setBusy(false); router.refresh();
  }
  return (
    <form action={upload} className="space-y-3">
      {message ? <p role="status" className={`text-sm ${message === "File uploaded." ? "text-emerald-700" : "text-red-700"}`}>{message}</p> : null}
      <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block min-h-11 w-full text-base file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-limestone file:px-4 file:text-base file:font-medium" />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="file_type" defaultValue="installation" className={input} aria-label="File category">
          {PROJECT_FILE_CATEGORIES.map((category) => <option key={category} value={category}>{PROJECT_FILE_CATEGORY_LABELS[category]}</option>)}
        </select>
        <select name="stage_id" defaultValue="" className={input} aria-label="File stage">
          <option value="">Whole project</option>
          {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
        </select>
      </div>
      <input name="caption" maxLength={1000} className={input} placeholder="Optional caption or description" />
      <button disabled={busy || !file} className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Uploading…" : "Upload private file"}</button>
      <p className="text-xs leading-5 text-stone">PDF, JPEG, PNG, or WebP · 20 MB maximum · private signed access only.</p>
    </form>
  );
}
