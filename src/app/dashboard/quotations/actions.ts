"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireManagement,
  requireModuleAccess,
  requireRole,
} from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { QUOTATION_TRANSITIONS } from "@/lib/quotations/constants";
import {
  parseQuotationDraft,
  quotationTransitionSchema,
} from "@/lib/quotations/validation";
import type {
  QuotationActionState,
  QuotationStatus,
} from "@/lib/quotations/types";

function firstError(error: { issues: { message: string }[] }) {
  return (
    error.issues[0]?.message || "Check the quotation details and try again."
  );
}

function refreshQuotationPaths(id?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/quotations");
  if (id) revalidatePath(`/dashboard/quotations/${id}`);
}

export async function saveQuotationAction(
  _state: QuotationActionState,
  formData: FormData,
): Promise<QuotationActionState> {
  await requireRole(["admin", "sales"]);
  const parsed = parseQuotationDraft(formData);
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Supabase is not configured." };
  const { id, ...payload } = parsed.data;
  const { data, error } = await supabase.rpc("save_quotation_draft", {
    p_quotation_id: (id ?? null) as string,
    p_payload: payload,
  });
  if (error || !data)
    return {
      ok: false,
      message: error?.message || "Unable to save the quotation.",
    };
  refreshQuotationPaths(data);
  redirect(`/dashboard/quotations/${data}?saved=1`);
}

export async function transitionQuotationAction(formData: FormData) {
  const profile = await requireRole(["admin", "sales"]);
  const parsed = quotationTransitionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) redirect("/dashboard/quotations?notice=invalid-action");
  const { id, status, note } = parsed.data;
  const supabase = await createClient();
  if (!supabase) redirect(`/dashboard/quotations/${id}?error=configuration`);
  const { data: quote, error: readError } = await supabase
    .from("quotations")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (readError || !quote) redirect("/dashboard/quotations?notice=not-found");
  const current = quote.status as QuotationStatus;
  if (!QUOTATION_TRANSITIONS[current]?.includes(status))
    redirect(`/dashboard/quotations/${id}?error=invalid-transition`);
  if (["approved", "rejected"].includes(status) && profile.role !== "admin")
    redirect(`/dashboard/quotations/${id}?error=approval-denied`);
  const changes: { status: QuotationStatus; decision_note?: string | null } = {
    status,
  };
  if (["approved", "rejected"].includes(status))
    changes.decision_note = note || null;
  const { error } = await supabase
    .from("quotations")
    .update(changes)
    .eq("id", id);
  if (error)
    redirect(
      `/dashboard/quotations/${id}?error=${encodeURIComponent(error.message)}`,
    );
  refreshQuotationPaths(id);
  redirect(`/dashboard/quotations/${id}?status=${status}`);
}

export async function createQuotationRevisionAction(formData: FormData) {
  await requireRole(["admin", "sales"]);
  const parsed = quotationTransitionSchema
    .pick({ id: true })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/dashboard/quotations?notice=invalid-action");
  const supabase = await createClient();
  if (!supabase)
    redirect(`/dashboard/quotations/${parsed.data.id}?error=configuration`);
  const { data, error } = await supabase.rpc("create_quotation_revision", {
    p_quotation_id: parsed.data.id,
  });
  if (error || !data)
    redirect(
      `/dashboard/quotations/${parsed.data.id}?error=${encodeURIComponent(error?.message || "Unable to create revision")}`,
    );
  refreshQuotationPaths(parsed.data.id);
  revalidatePath(`/dashboard/quotations/${data}`);
  redirect(`/dashboard/quotations/${data}/edit?revision=1`);
}

export async function convertQuotationToProjectAction(formData: FormData) {
  await requireManagement();
  const parsed = quotationTransitionSchema
    .pick({ id: true })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/dashboard/quotations?notice=invalid-action");
  const supabase = await createClient();
  if (!supabase)
    redirect(`/dashboard/quotations/${parsed.data.id}?error=configuration`);
  const { data, error } = await supabase.rpc(
    "convert_approved_quotation_to_project",
    { p_quotation_id: parsed.data.id },
  );
  if (error || !data)
    redirect(
      `/dashboard/quotations/${parsed.data.id}?error=${encodeURIComponent(error?.message || "Unable to create project")}`,
    );
  refreshQuotationPaths(parsed.data.id);
  redirect(`/dashboard/quotations/${parsed.data.id}?project=${data}`);
}

export async function recordQuotationPdfGeneration(id: string) {
  const profile = await requireModuleAccess("quotations");
  if (profile.role !== "admin" && profile.role !== "sales") return;
  const supabase = await createClient();
  if (!supabase) return;
  await supabase
    .from("quotations")
    .update({ pdf_generated_at: new Date().toISOString() })
    .eq("id", id);
  refreshQuotationPaths(id);
}
