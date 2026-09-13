"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModuleAccess, requireRole } from "@/lib/auth/dal";
import { isUuid } from "@/lib/crm/validation";
import { createClient } from "@/lib/supabase/server";
import { createPaymentProofPath, PAYMENT_PROOF_BUCKET } from "@/lib/payments/media";
import { milestoneSchema, proofSchema, reasonSchema, receiptSchema } from "@/lib/payments/validation";
import type { PaymentActionState } from "@/lib/payments/types";

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item : "";
}
function firstError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message || "Check the payment details and try again.";
}
function refresh(projectId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payments");
  if (projectId) {
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/payments/projects/${projectId}`);
  }
}

export async function saveMilestoneAction(
  _state: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  await requireRole(["admin", "accounts"]);
  const parsed = milestoneSchema.safeParse({
    project_id: value(formData, "project_id"),
    milestone_id: value(formData, "milestone_id"),
    name: value(formData, "name"),
    description: value(formData, "description"),
    milestone_type: value(formData, "milestone_type"),
    percentage: Number(value(formData, "percentage")) || Number.NaN,
    fixed_amount: Number(value(formData, "fixed_amount")) || Number.NaN,
    due_date: value(formData, "due_date"),
    notes: value(formData, "notes"),
    sort_order: value(formData, "sort_order"),
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error), fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("save_payment_milestone", {
    p_project_id: parsed.data.project_id,
    p_milestone_id: (parsed.data.milestone_id || null) as string,
    p_name: parsed.data.name,
    p_type: parsed.data.milestone_type,
    p_percentage: parsed.data.milestone_type === "percentage" ? parsed.data.percentage ?? 0 : 0,
    p_fixed_amount: parsed.data.milestone_type === "fixed" ? parsed.data.fixed_amount ?? 0 : 0,
    p_due_date: (parsed.data.due_date || null) as string,
    p_description: parsed.data.description,
    p_notes: parsed.data.notes,
    p_sort_order: parsed.data.sort_order,
  });
  if (error) return { status: "error", message: error.message };
  refresh(parsed.data.project_id);
  return { status: "success", message: parsed.data.milestone_id ? "Milestone updated." : "Milestone added. Draft mismatches are allowed until activation." };
}

export async function activatePlanAction(
  projectId: string, _state: PaymentActionState, _formData: FormData,
): Promise<PaymentActionState> {
  void _state; void _formData;
  await requireRole(["admin", "accounts"]);
  if (!isUuid(projectId)) return { status: "error", message: "Invalid project." };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("activate_payment_plan", { p_project_id: projectId });
  if (error) return { status: "error", message: error.message };
  refresh(projectId);
  return { status: "success", message: "Payment plan activated and locked." };
}

export async function cancelMilestoneAction(
  milestoneId: string, projectId: string, _state: PaymentActionState, formData: FormData,
): Promise<PaymentActionState> {
  await requireRole(["admin", "accounts"]);
  const parsed = reasonSchema.safeParse({ id: milestoneId, project_id: projectId, reason: value(formData, "reason") });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("cancel_payment_milestone", { p_milestone_id: parsed.data.id, p_reason: parsed.data.reason });
  if (error) return { status: "error", message: error.message };
  refresh(projectId);
  return { status: "success", message: "Draft milestone cancelled with an audit reason." };
}

export async function cancelPlanAction(
  projectId: string, _state: PaymentActionState, formData: FormData,
): Promise<PaymentActionState> {
  await requireRole(["admin", "accounts"]);
  const parsed = reasonSchema.safeParse({ id: projectId, reason: value(formData, "reason") });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("cancel_payment_plan", { p_project_id: projectId, p_reason: parsed.data.reason });
  if (error) return { status: "error", message: error.message };
  refresh(projectId);
  return { status: "success", message: "Payment plan cancelled." };
}

export async function recordPaymentAction(
  _state: PaymentActionState, formData: FormData,
): Promise<PaymentActionState> {
  await requireRole(["admin", "accounts"]);
  const parsed = receiptSchema.safeParse({
    project_id: value(formData, "project_id"),
    milestone_id: value(formData, "milestone_id"),
    amount: value(formData, "amount"),
    received_date: value(formData, "received_date"),
    payment_method: value(formData, "payment_method"),
    reference_number: value(formData, "reference_number"),
    notes: value(formData, "notes"),
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error), fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { data, error } = await supabase.rpc("record_payment", {
    p_project_id: parsed.data.project_id,
    p_milestone_id: parsed.data.milestone_id,
    p_amount: parsed.data.amount,
    p_received_date: parsed.data.received_date,
    p_method: parsed.data.payment_method,
    p_reference: parsed.data.reference_number,
    p_notes: parsed.data.notes,
  });
  if (error) return { status: "error", message: error.message };
  refresh(parsed.data.project_id);
  return { status: "success", message: "Receipt posted. It is now immutable; use void if it must be reversed.", recordId: data };
}

export async function voidPaymentAction(
  paymentId: string, projectId: string, _state: PaymentActionState, formData: FormData,
): Promise<PaymentActionState> {
  await requireRole(["admin", "accounts"]);
  const parsed = reasonSchema.safeParse({ id: paymentId, project_id: projectId, reason: value(formData, "reason") });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("void_payment", { p_payment_id: paymentId, p_reason: parsed.data.reason });
  if (error) return { status: "error", message: error.message };
  refresh(projectId);
  revalidatePath(`/dashboard/payments/${paymentId}`);
  return { status: "success", message: "Receipt voided. Its number and history are preserved." };
}

export async function reservePaymentProofAction(input: unknown): Promise<PaymentActionState> {
  const profile = await requireRole(["admin", "accounts"]);
  const parsed = proofSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const proofId = crypto.randomUUID();
  const storagePath = createPaymentProofPath(parsed.data.payment_id, proofId, parsed.data.mime_type);
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.from("payment_proofs").insert({
    id: proofId, payment_id: parsed.data.payment_id, storage_path: storagePath,
    file_name: parsed.data.file_name, mime_type: parsed.data.mime_type,
    file_size: parsed.data.file_size, upload_status: "pending", created_by: profile.id,
  });
  if (error) return { status: "error", message: error.message };
  return { status: "success", recordId: proofId, storagePath };
}

export async function finalizePaymentProofAction(proofId: string, paymentId: string): Promise<PaymentActionState> {
  await requireRole(["admin", "accounts"]);
  if (!isUuid(proofId) || !isUuid(paymentId)) return { status: "error", message: "Invalid proof." };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("finalize_payment_proof", { p_proof_id: proofId });
  if (error) return { status: "error", message: error.message };
  revalidatePath(`/dashboard/payments/${paymentId}`);
  return { status: "success", message: "Payment proof uploaded." };
}

export async function releasePaymentProofAction(proofId: string) {
  await requireRole(["admin", "accounts"]);
  if (!isUuid(proofId)) return;
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.rpc("release_payment_proof", { p_proof_id: proofId });
}

export async function downloadPaymentProofAction(formData: FormData) {
  await requireModuleAccess("payments");
  const proofId = value(formData, "proof_id");
  if (!isUuid(proofId)) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { data } = await supabase.from("payment_proofs").select("storage_path").eq("id", proofId).eq("upload_status", "ready").is("archived_at", null).maybeSingle();
  if (!data) return;
  const signed = await supabase.storage.from(PAYMENT_PROOF_BUCKET).createSignedUrl(data.storage_path, 120);
  if (signed.data?.signedUrl) redirect(signed.data.signedUrl);
}
