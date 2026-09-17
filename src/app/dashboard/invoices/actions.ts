"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModuleAccess } from "@/lib/auth/dal";
import { isUuid } from "@/lib/crm/validation";
import { createClient } from "@/lib/supabase/server";
import { parseInvoiceDraft, invoiceTransitionSchema } from "@/lib/invoices/validation";
import { invoicePayloadJson, type InvoiceActionState } from "@/lib/invoices/types";

function refreshInvoicePaths(id?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/projects");
  if (id) revalidatePath(`/dashboard/invoices/${id}`);
}

export async function createInvoiceFromProjectAction(formData: FormData) {
  await requireModuleAccess("invoices");
  const projectId = String(formData.get("project_id") || "");
  if (!isUuid(projectId)) redirect("/dashboard/invoices/new?error=invalid-project");
  const supabase = await createClient();
  if (!supabase) redirect("/dashboard/invoices/new?error=configuration");
  const { data, error } = await supabase.rpc("create_invoice_from_project", { p_project_id: projectId });
  if (error || !data) redirect(`/dashboard/invoices/new?error=${encodeURIComponent(error?.message || "Unable to create invoice")}`);
  refreshInvoicePaths(data);
  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/invoices/${data}?created=1`);
}

export async function saveInvoiceDraftAction(
  invoiceId: string,
  _state: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  await requireModuleAccess("invoices");
  if (!isUuid(invoiceId)) return { status: "error", message: "Invalid invoice identifier." };
  const parsed = parseInvoiceDraft(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message || "Check the invoice details." };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.rpc("save_invoice_draft", {
    p_invoice_id: invoiceId,
    p_payload: invoicePayloadJson(parsed.data),
  });
  if (error) return { status: "error", message: error.message };
  refreshInvoicePaths(invoiceId);
  return { status: "success", message: "Draft invoice saved." };
}

export async function transitionInvoiceAction(formData: FormData) {
  await requireModuleAccess("invoices");
  const parsed = invoiceTransitionSchema.safeParse({
    id: String(formData.get("id") || ""),
    action: String(formData.get("action") || ""),
    reason: String(formData.get("reason") || ""),
  });
  if (!parsed.success) redirect("/dashboard/invoices?notice=invalid-action");
  const supabase = await createClient();
  if (!supabase) redirect(`/dashboard/invoices/${parsed.data.id}?error=configuration`);
  const { error } = await supabase.rpc("transition_invoice", {
    p_invoice_id: parsed.data.id,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason,
  });
  if (error) redirect(`/dashboard/invoices/${parsed.data.id}?error=${encodeURIComponent(error.message)}`);
  refreshInvoicePaths(parsed.data.id);
  redirect(`/dashboard/invoices/${parsed.data.id}?status=${parsed.data.action === "issue" ? "issued" : "cancelled"}`);
}

export async function recordInvoicePdfGeneration(id: string) {
  await requireModuleAccess("invoices");
  if (!isUuid(id)) return;
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.rpc("record_invoice_pdf_generation", { p_invoice_id: id });
  refreshInvoicePaths(id);
}
