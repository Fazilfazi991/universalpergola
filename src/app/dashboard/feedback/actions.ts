"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModuleAccess, requireManagement } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { requestFeedbackSchema, reviewFeedbackSchema, staffFeedbackSchema } from "@/lib/feedback/validation";
import { isUuid } from "@/lib/crm/validation";

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item : "";
}

function feedbackRedirect(message: string, tone: "notice" | "error" = "notice"): never {
  redirect(`/dashboard/feedback?${tone}=${encodeURIComponent(message)}`);
}

export async function requestFeedbackAction(formData: FormData) {
  await requireModuleAccess("feedback");
  const expiry = value(formData, "expires_at");
  const expiryIso = /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? new Date(`${expiry}T23:59:59+04:00`).toISOString() : "";
  const parsed = requestFeedbackSchema.safeParse({
    project_id: value(formData, "project_id"),
    expires_at: expiryIso,
  });
  if (!parsed.success) feedbackRedirect(parsed.error.issues[0]?.message || "Check the feedback request.", "error");
  const supabase = await createClient();
  if (!supabase) feedbackRedirect("Supabase is not configured.", "error");
  const { error } = await supabase.rpc("request_project_feedback", {
    p_project_id: parsed.data.project_id,
    p_expires_at: parsed.data.expires_at,
  });
  if (error) feedbackRedirect(error.message, "error");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/feedback");
  revalidatePath(`/dashboard/projects/${parsed.data.project_id}`);
  feedbackRedirect("Secure feedback link is ready.");
}

export async function revokeFeedbackLinkAction(formData: FormData) {
  await requireModuleAccess("feedback");
  const projectId = value(formData, "project_id");
  if (!isUuid(projectId)) feedbackRedirect("Invalid project reference.", "error");
  const supabase = await createClient();
  if (!supabase) feedbackRedirect("Supabase is not configured.", "error");
  const { error } = await supabase.rpc("revoke_project_feedback_link", { p_project_id: projectId });
  if (error) feedbackRedirect(error.message, "error");
  revalidatePath("/dashboard/feedback");
  revalidatePath(`/dashboard/projects/${projectId}`);
  feedbackRedirect("Feedback link revoked.");
}

export async function saveStaffFeedbackAction(formData: FormData) {
  await requireModuleAccess("feedback");
  const parsed = staffFeedbackSchema.safeParse({
    project_id: value(formData, "project_id"),
    rating: value(formData, "rating"),
    comment: value(formData, "comment"),
    source: value(formData, "source") || "phone",
    permission: formData.get("permission") === "on",
    internal_notes: value(formData, "internal_notes"),
  });
  if (!parsed.success) feedbackRedirect(parsed.error.issues[0]?.message || "Check the feedback details.", "error");
  const supabase = await createClient();
  if (!supabase) feedbackRedirect("Supabase is not configured.", "error");
  const { error } = await supabase.rpc("save_staff_feedback", {
    p_project_id: parsed.data.project_id,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment,
    p_source: parsed.data.source,
    p_permission: parsed.data.permission,
    p_internal_notes: parsed.data.internal_notes,
  });
  if (error) feedbackRedirect(error.message, "error");
  revalidatePath("/dashboard/feedback");
  revalidatePath(`/dashboard/projects/${parsed.data.project_id}`);
  feedbackRedirect("Customer feedback recorded.");
}

export async function reviewFeedbackAction(formData: FormData) {
  await requireManagement();
  const parsed = reviewFeedbackSchema.safeParse({
    feedback_id: value(formData, "feedback_id"),
    project_id: value(formData, "project_id"),
    status: value(formData, "status"),
    internal_notes: value(formData, "internal_notes"),
  });
  if (!parsed.success) feedbackRedirect(parsed.error.issues[0]?.message || "Check the review.", "error");
  const supabase = await createClient();
  if (!supabase) feedbackRedirect("Supabase is not configured.", "error");
  const { error } = await supabase.rpc("update_feedback_review", {
    p_feedback_id: parsed.data.feedback_id,
    p_status: parsed.data.status,
    p_internal_notes: parsed.data.internal_notes,
  });
  if (error) feedbackRedirect(error.message, "error");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/feedback");
  revalidatePath(`/dashboard/projects/${parsed.data.project_id}`);
  feedbackRedirect(parsed.data.status === "reviewed" ? "Feedback marked reviewed." : "Feedback archived.");
}
