"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManagement, requireRole } from "@/lib/auth/dal";
import { findCustomerDuplicates } from "@/lib/crm/duplicates";
import { createClient } from "@/lib/supabase/server";
import { enquiryReference } from "@/lib/crm/presentation";
import { enquiryUpdateSchema, followUpSchema, isUuid, noteSchema, staffEnquirySchema } from "@/lib/crm/validation";
import type { CrmActionState } from "@/lib/crm/types";

function text(formData: FormData, name: string) { const value = formData.get(name); return typeof value === "string" ? value : ""; }
function optional(value: string) { return value.trim() || null; }
function dubaiIso(value: string) { return value ? new Date(value.length === 16 ? `${value}:00+04:00` : value).toISOString() : null; }
function revalidateCrm(id?: string, customerId?: string) {
  revalidatePath("/dashboard"); revalidatePath("/dashboard/enquiries"); revalidatePath("/dashboard/customers");
  if (id) revalidatePath(`/dashboard/enquiries/${id}`);
  if (customerId) revalidatePath(`/dashboard/customers/${customerId}`);
}

function createValues(formData: FormData) {
  return {
    customer_id: text(formData, "customer_id"), customer_name: text(formData, "customer_name"),
    phone: text(formData, "phone"), whatsapp_number: text(formData, "whatsapp_number"), email: text(formData, "email"),
    company_name: text(formData, "company_name"), customer_type: text(formData, "customer_type"),
    address: text(formData, "address"), area: text(formData, "area"), emirate: text(formData, "emirate"),
    source: text(formData, "source"), product_id: text(formData, "product_id"), subject: text(formData, "subject"),
    message: text(formData, "message"), priority: text(formData, "priority"), assigned_to: text(formData, "assigned_to"),
    follow_up_at: text(formData, "follow_up_at"), next_action: text(formData, "next_action"), internal_notes: text(formData, "internal_notes"),
  };
}

export async function createEnquiryAction(_state: CrmActionState, formData: FormData): Promise<CrmActionState> {
  const profile = await requireRole(["admin", "sales"]);
  const parsed = staffEnquirySchema.safeParse(createValues(formData));
  if (!parsed.success) return { status: "error", message: "Correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  let customerId = parsed.data.customer_id;
  if (!customerId) {
    const selectedMatch = text(formData, "matched_customer_id");
    if (selectedMatch && isUuid(selectedMatch)) customerId = selectedMatch;
    if (!customerId) {
      const matches = await findCustomerDuplicates(parsed.data.phone, parsed.data.whatsapp_number, parsed.data.email);
      if (matches.length && text(formData, "allow_duplicate") !== "true") return { status: "error", message: "Possible customer matches found. Link one or confirm a new record.", duplicates: matches };
    }
  }
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { data, error } = await supabase.rpc("create_staff_enquiry", {
    p_customer_id: customerId || null as unknown as string,
    p_customer_name: parsed.data.customer_name,
    p_phone: parsed.data.phone,
    p_whatsapp_number: parsed.data.whatsapp_number,
    p_email: parsed.data.email,
    p_company_name: parsed.data.company_name,
    p_customer_type: parsed.data.customer_type,
    p_address: parsed.data.address,
    p_area: parsed.data.area,
    p_emirate: parsed.data.emirate,
    p_source: parsed.data.source,
    p_product_id: parsed.data.product_id || null as unknown as string,
    p_subject: parsed.data.subject,
    p_message: parsed.data.message,
    p_priority: parsed.data.priority,
    p_assigned_to: profile.role === "admin" ? parsed.data.assigned_to || null as unknown as string : profile.id,
    p_follow_up_at: dubaiIso(parsed.data.follow_up_at) as unknown as string,
    p_next_action: parsed.data.next_action,
    p_internal_notes: parsed.data.internal_notes,
  });
  if (error || !data?.[0]) return { status: "error", message: "The enquiry could not be created. Check the customer and assignment." };
  revalidateCrm(data[0].enquiry_id, data[0].customer_id);
  redirect(`/dashboard/enquiries/${data[0].enquiry_id}?created=${enquiryReference(data[0].enquiry_number)}`);
}

export async function updateEnquiryAction(id: string, _state: CrmActionState, formData: FormData): Promise<CrmActionState> {
  await requireRole(["admin", "sales"]);
  if (!isUuid(id)) return { status: "error", message: "Invalid enquiry identifier." };
  const parsed = enquiryUpdateSchema.safeParse({
    status: text(formData, "status"), priority: text(formData, "priority"), source: text(formData, "source"),
    assigned_to: text(formData, "assigned_to"), follow_up_at: text(formData, "follow_up_at"),
    next_action: text(formData, "next_action"), internal_notes: text(formData, "internal_notes"),
  });
  if (!parsed.success) return { status: "error", message: "Correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { data: current } = await supabase.from("enquiries").select("customer_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("enquiries").update({ status: parsed.data.status, priority: parsed.data.priority,
    source: parsed.data.source, follow_up_at: dubaiIso(parsed.data.follow_up_at), next_action: optional(parsed.data.next_action),
    internal_notes: optional(parsed.data.internal_notes) }).eq("id", id);
  if (error) return { status: "error", message: "The enquiry changes could not be saved." };
  revalidateCrm(id, current?.customer_id || undefined);
  return { status: "success", message: "Enquiry changes saved." };
}

export async function assignEnquiryAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id"); const assignedTo = text(formData, "assigned_to") || null;
  if (!isUuid(id) || (assignedTo && !isUuid(assignedTo))) return;
  const supabase = await createClient(); if (!supabase) return;
  const { data, error } = await supabase.from("enquiries").update({ assigned_to: assignedTo }).eq("id", id).select("customer_id").single();
  if (error) throw new Error("Unable to assign the enquiry.");
  revalidateCrm(id, data.customer_id || undefined);
}

export async function addEnquiryNoteAction(id: string, _state: CrmActionState, formData: FormData): Promise<CrmActionState> {
  const profile = await requireRole(["admin", "sales"]);
  if (!isUuid(id)) return { status: "error", message: "Invalid enquiry identifier." };
  const parsed = noteSchema.safeParse({ note: text(formData, "note") });
  if (!parsed.success) return { status: "error", message: "Enter a note.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.from("enquiry_activities").insert({ enquiry_id: id, activity_type: "note_added", note: parsed.data.note, created_by: profile.id });
  if (error) return { status: "error", message: "The note could not be added." };
  revalidateCrm(id); return { status: "success", message: "Note added." };
}

export async function markContactedAction(formData: FormData) {
  const profile = await requireRole(["admin", "sales"]);
  const id = text(formData, "id");
  if (!isUuid(id)) return;
  const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("enquiries").update({ status: "contacted" }).eq("id", id);
  if (error) throw new Error("Unable to mark this enquiry contacted.");
  await supabase.from("enquiry_activities").insert({ enquiry_id: id, activity_type: "contacted", note: "Customer contacted", created_by: profile.id });
  revalidateCrm(id);
}

export async function createFollowUpAction(id: string, customerId: string | null, _state: CrmActionState, formData: FormData): Promise<CrmActionState> {
  const profile = await requireRole(["admin", "sales"]);
  if (!isUuid(id) || (customerId && !isUuid(customerId))) return { status: "error", message: "Invalid enquiry link." };
  const parsed = followUpSchema.safeParse({ due_at: text(formData, "due_at"), next_action: text(formData, "next_action"), notes: text(formData, "notes"), assigned_to: text(formData, "assigned_to") });
  if (!parsed.success) return { status: "error", message: "Correct the follow-up details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const assignedTo = profile.role === "admin" ? parsed.data.assigned_to : profile.id;
  const { error } = await supabase.from("tasks").insert({ kind: "enquiry_follow_up", title: parsed.data.next_action,
    description: optional(parsed.data.notes), enquiry_id: id, customer_id: customerId, assigned_to: assignedTo,
    due_at: dubaiIso(parsed.data.due_at), priority: "normal", status: "open", created_by: profile.id });
  if (error) return { status: "error", message: "The follow-up could not be added." };
  await supabase.from("enquiries").update({ follow_up_at: dubaiIso(parsed.data.due_at), next_action: parsed.data.next_action }).eq("id", id);
  revalidateCrm(id, customerId || undefined); return { status: "success", message: "Follow-up added." };
}

export async function completeFollowUpAction(formData: FormData) {
  await requireRole(["admin", "sales"]);
  const id = text(formData, "id"); const enquiryId = text(formData, "enquiry_id");
  if (!isUuid(id) || !isUuid(enquiryId)) return;
  const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id).eq("enquiry_id", enquiryId).eq("kind", "enquiry_follow_up");
  if (error) throw new Error("Unable to complete the follow-up."); revalidateCrm(enquiryId);
}

export async function cancelFollowUpAction(formData: FormData) {
  await requireRole(["admin", "sales"]);
  const id = text(formData, "id"); const enquiryId = text(formData, "enquiry_id");
  if (!isUuid(id) || !isUuid(enquiryId)) return;
  const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("tasks").update({ status: "cancelled", completed_at: null }).eq("id", id).eq("enquiry_id", enquiryId).eq("kind", "enquiry_follow_up");
  if (error) throw new Error("Unable to cancel the follow-up."); revalidateCrm(enquiryId);
}

export async function rescheduleFollowUpAction(formData: FormData) {
  await requireRole(["admin", "sales"]);
  const id = text(formData, "id"); const enquiryId = text(formData, "enquiry_id"); const dueAt = text(formData, "due_at");
  if (!isUuid(id) || !isUuid(enquiryId) || !dueAt || Number.isNaN(Date.parse(dueAt))) return;
  const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("tasks").update({ due_at: dubaiIso(dueAt), status: "open", completed_at: null }).eq("id", id).eq("enquiry_id", enquiryId).eq("kind", "enquiry_follow_up");
  if (error) throw new Error("Unable to reschedule the follow-up."); revalidateCrm(enquiryId);
}
