"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManagement, requireRole } from "@/lib/auth/dal";
import { isUuid } from "@/lib/crm/validation";
import { createClient } from "@/lib/supabase/server";
import { SITE_VISIT_TRANSITIONS } from "@/lib/site-visits/constants";
import { SITE_PHOTO_BUCKET } from "@/lib/site-visits/media";
import { siteVisitReference } from "@/lib/site-visits/presentation";
import type { SiteVisitActionState, SiteVisitStatus } from "@/lib/site-visits/types";
import { measurementSchema, photoMetadataSchema, siteFollowUpSchema, siteNoteSchema, siteVisitContentSchema, siteVisitCreateSchema, siteVisitTransitionSchema, siteVisitUpdateSchema } from "@/lib/site-visits/validation";

function text(formData: FormData, name: string) { const value = formData.get(name); return typeof value === "string" ? value : ""; }
function optional(value: string) { return value.trim() || null; }
function dubaiIso(value: string) { return value ? new Date(value.length === 16 ? `${value}:00+04:00` : value).toISOString() : null; }
function visitValues(formData: FormData) { return { customer_id: text(formData, "customer_id"), enquiry_id: text(formData, "enquiry_id"), assigned_to: text(formData, "assigned_to"), scheduled_at: text(formData, "scheduled_at"), site_address: text(formData, "site_address"), area: text(formData, "area"), emirate: text(formData, "emirate"), location_url: text(formData, "location_url"), contact_person: text(formData, "contact_person"), contact_phone: text(formData, "contact_phone"), notes: text(formData, "notes"), next_action: text(formData, "next_action"), next_action_at: text(formData, "next_action_at") }; }
function revalidateVisit(id?: string, customerId?: string | null, enquiryId?: string | null) {
  revalidatePath("/dashboard"); revalidatePath("/dashboard/site-visits");
  if (id) revalidatePath(`/dashboard/site-visits/${id}`);
  if (customerId) revalidatePath(`/dashboard/customers/${customerId}`);
  if (enquiryId) revalidatePath(`/dashboard/enquiries/${enquiryId}`);
}

export async function createSiteVisitAction(_state: SiteVisitActionState, formData: FormData): Promise<SiteVisitActionState> {
  const profile = await requireRole(["admin", "sales"]);
  const parsed = siteVisitCreateSchema.safeParse(visitValues(formData));
  if (!parsed.success) return { status: "error", message: "Correct the site visit details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const [customer, enquiry, assignee] = await Promise.all([
    supabase.from("customers").select("id").eq("id", parsed.data.customer_id).is("archived_at", null).maybeSingle(),
    parsed.data.enquiry_id ? supabase.from("enquiries").select("id, customer_id").eq("id", parsed.data.enquiry_id).is("archived_at", null).maybeSingle() : Promise.resolve({ data: null, error: null }),
    parsed.data.assigned_to ? supabase.from("profiles").select("id").eq("id", parsed.data.assigned_to).eq("role", "site_team").eq("status", "active").maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (!customer.data || customer.error) return { status: "error", message: "Choose an active customer." };
  if (parsed.data.enquiry_id && (!enquiry.data || enquiry.data.customer_id !== parsed.data.customer_id)) return { status: "error", message: "The enquiry does not belong to this customer." };
  if (profile.role === "admin" && parsed.data.assigned_to && !assignee.data) return { status: "error", message: "Choose active Site Team staff." };
  const { data, error } = await supabase.from("site_visits").insert({ customer_id: parsed.data.customer_id, enquiry_id: parsed.data.enquiry_id || null, assigned_to: profile.role === "admin" ? parsed.data.assigned_to || null : null, scheduled_at: dubaiIso(parsed.data.scheduled_at)!, site_address: parsed.data.site_address, area: optional(parsed.data.area), emirate: optional(parsed.data.emirate), location_url: optional(parsed.data.location_url), contact_person: optional(parsed.data.contact_person), contact_phone: optional(parsed.data.contact_phone), notes: optional(parsed.data.notes), next_action: optional(parsed.data.next_action), next_action_at: dubaiIso(parsed.data.next_action_at), created_by: profile.id }).select("id, visit_number").single();
  if (error || !data) return { status: "error", message: "The site visit could not be created." };
  if (parsed.data.enquiry_id) await supabase.from("enquiries").update({ status: "site_visit_required" }).eq("id", parsed.data.enquiry_id).not("status", "in", "(approved,lost)");
  revalidateVisit(data.id, parsed.data.customer_id, parsed.data.enquiry_id || null);
  redirect(`/dashboard/site-visits/${data.id}?created=${siteVisitReference(data.visit_number)}`);
}

export async function updateSiteVisitAction(id: string, _state: SiteVisitActionState, formData: FormData): Promise<SiteVisitActionState> {
  await requireManagement(); if (!isUuid(id)) return { status: "error", message: "Invalid visit identifier." };
  const parsed = siteVisitUpdateSchema.safeParse(visitValues(formData));
  if (!parsed.success) return { status: "error", message: "Correct the schedule and site details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { data, error } = await supabase.from("site_visits").update({ scheduled_at: dubaiIso(parsed.data.scheduled_at)!, site_address: parsed.data.site_address, area: optional(parsed.data.area), emirate: optional(parsed.data.emirate), location_url: optional(parsed.data.location_url), contact_person: optional(parsed.data.contact_person), contact_phone: optional(parsed.data.contact_phone), notes: optional(parsed.data.notes), next_action: optional(parsed.data.next_action), next_action_at: dubaiIso(parsed.data.next_action_at) }).eq("id", id).select("customer_id, enquiry_id").single();
  if (error || !data) return { status: "error", message: "The visit changes could not be saved." };
  revalidateVisit(id, data.customer_id, data.enquiry_id); return { status: "success", message: "Visit details saved." };
}

export async function assignSiteVisitAction(formData: FormData) {
  await requireManagement(); const id = text(formData, "id"); const assignedTo = text(formData, "assigned_to") || null;
  if (!isUuid(id) || (assignedTo && !isUuid(assignedTo))) return;
  const supabase = await createClient(); if (!supabase) return;
  const { data, error } = await supabase.from("site_visits").update({ assigned_to: assignedTo }).eq("id", id).select("customer_id, enquiry_id").single();
  if (error) throw new Error("Unable to assign the site visit."); revalidateVisit(id, data.customer_id, data.enquiry_id);
}

export async function updateSiteVisitContentAction(id: string, _state: SiteVisitActionState, formData: FormData): Promise<SiteVisitActionState> {
  await requireRole(["admin", "site_team"]); if (!isUuid(id)) return { status: "error", message: "Invalid visit identifier." };
  const parsed = siteVisitContentSchema.safeParse({ measurement_summary: text(formData, "measurement_summary"), notes: text(formData, "notes"), follow_up_required: formData.get("follow_up_required") === "on", next_action: text(formData, "next_action"), next_action_at: text(formData, "next_action_at") });
  if (!parsed.success) return { status: "error", message: "Correct the visit notes.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { data, error } = await supabase.from("site_visits").update({ measurement_summary: optional(parsed.data.measurement_summary), notes: optional(parsed.data.notes), follow_up_required: parsed.data.follow_up_required, next_action: optional(parsed.data.next_action), next_action_at: dubaiIso(parsed.data.next_action_at) }).eq("id", id).select("customer_id, enquiry_id").single();
  if (error || !data) return { status: "error", message: "The visit notes could not be saved." };
  revalidateVisit(id, data.customer_id, data.enquiry_id); return { status: "success", message: "Visit notes saved." };
}

export async function transitionSiteVisitAction(formData: FormData) {
  const profile = await requireRole(["admin", "site_team"]); const id = text(formData, "id");
  const parsed = siteVisitTransitionSchema.safeParse({ status: text(formData, "status"), scheduled_at: text(formData, "scheduled_at") });
  if (!isUuid(id) || !parsed.success) return;
  if (profile.role === "site_team" && !["confirmed", "in_progress", "completed", "no_show"].includes(parsed.data.status)) return;
  const supabase = await createClient(); if (!supabase) return;
  const { data: current } = await supabase.from("site_visits").select("status").eq("id", id).maybeSingle();
  if (!current || !SITE_VISIT_TRANSITIONS[current.status].includes(parsed.data.status as never)) return;
  const changes: { status: SiteVisitStatus; scheduled_at?: string } = { status: parsed.data.status };
  if (parsed.data.status === "rescheduled") { if (!parsed.data.scheduled_at) return; changes.scheduled_at = dubaiIso(parsed.data.scheduled_at)!; }
  const { data, error } = await supabase.from("site_visits").update(changes).eq("id", id).select("customer_id, enquiry_id").single();
  if (error) throw new Error("Unable to change the visit status."); revalidateVisit(id, data.customer_id, data.enquiry_id);
}

function measurementValues(formData: FormData) { return { label: text(formData, "label"), width: text(formData, "width"), height: text(formData, "height"), length: text(formData, "length"), unit: text(formData, "unit"), quantity: text(formData, "quantity"), notes: text(formData, "notes"), sort_order: text(formData, "sort_order") }; }
export async function addSiteMeasurementAction(visitId: string, _state: SiteVisitActionState, formData: FormData): Promise<SiteVisitActionState> {
  const profile = await requireRole(["admin", "site_team"]); if (!isUuid(visitId)) return { status: "error", message: "Invalid visit identifier." };
  const parsed = measurementSchema.safeParse(measurementValues(formData)); if (!parsed.success) return { status: "error", message: "Add a label and at least one valid dimension.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.from("site_visit_measurements").insert({ site_visit_id: visitId, ...parsed.data, width: parsed.data.width ?? null, height: parsed.data.height ?? null, length: parsed.data.length ?? null, notes: optional(parsed.data.notes), created_by: profile.id });
  if (error) return { status: "error", message: "The measurement could not be added." }; revalidateVisit(visitId); return { status: "success", message: "Measurement added." };
}

export async function updateSiteMeasurementAction(formData: FormData) {
  await requireRole(["admin", "site_team"]); const id = text(formData, "id"); const visitId = text(formData, "site_visit_id"); const parsed = measurementSchema.safeParse(measurementValues(formData));
  if (!isUuid(id) || !isUuid(visitId) || !parsed.success) return;
  const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("site_visit_measurements").update({ ...parsed.data, width: parsed.data.width ?? null, height: parsed.data.height ?? null, length: parsed.data.length ?? null, notes: optional(parsed.data.notes) }).eq("id", id).eq("site_visit_id", visitId);
  if (error) throw new Error("Unable to update the measurement."); revalidateVisit(visitId);
}

export async function removeSiteMeasurementAction(formData: FormData) {
  await requireRole(["admin", "site_team"]); const id = text(formData, "id"); const visitId = text(formData, "site_visit_id"); if (!isUuid(id) || !isUuid(visitId)) return;
  const supabase = await createClient(); if (!supabase) return; const { error } = await supabase.from("site_visit_measurements").delete().eq("id", id).eq("site_visit_id", visitId);
  if (error) throw new Error("Unable to remove the measurement."); revalidateVisit(visitId);
}

export async function addSiteVisitNoteAction(visitId: string, _state: SiteVisitActionState, formData: FormData): Promise<SiteVisitActionState> {
  const profile = await requireRole(["admin", "site_team"]); if (!isUuid(visitId)) return { status: "error", message: "Invalid visit identifier." };
  const parsed = siteNoteSchema.safeParse({ note: text(formData, "note") }); if (!parsed.success) return { status: "error", message: "Enter a note." };
  const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { error } = await supabase.from("site_visit_activities").insert({ site_visit_id: visitId, activity_type: "note_added", note: parsed.data.note, created_by: profile.id });
  if (error) return { status: "error", message: "The note could not be added." }; revalidateVisit(visitId); return { status: "success", message: "Note added." };
}

export async function createSiteFollowUpAction(visitId: string, customerId: string, enquiryId: string | null, _state: SiteVisitActionState, formData: FormData): Promise<SiteVisitActionState> {
  const profile = await requireRole(["admin", "site_team"]); if (!isUuid(visitId) || !isUuid(customerId) || (enquiryId && !isUuid(enquiryId))) return { status: "error", message: "Invalid visit links." };
  const parsed = siteFollowUpSchema.safeParse({ due_at: text(formData, "due_at"), next_action: text(formData, "next_action"), notes: text(formData, "notes"), assigned_to: text(formData, "assigned_to") }); if (!parsed.success) return { status: "error", message: "Correct the follow-up details.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const assignedTo = profile.role === "site_team" ? profile.id : parsed.data.assigned_to;
  const { error } = await supabase.from("tasks").insert({ kind: "site_visit_follow_up", title: parsed.data.next_action, description: optional(parsed.data.notes), customer_id: customerId, enquiry_id: enquiryId, site_visit_id: visitId, assigned_to: assignedTo, due_at: dubaiIso(parsed.data.due_at), priority: "normal", status: "open", created_by: profile.id });
  if (error) return { status: "error", message: "The follow-up could not be added." };
  await supabase.from("site_visits").update({ follow_up_required: true, next_action: parsed.data.next_action, next_action_at: dubaiIso(parsed.data.due_at) }).eq("id", visitId);
  revalidateVisit(visitId, customerId, enquiryId); return { status: "success", message: "Follow-up added." };
}

export async function completeSiteFollowUpAction(formData: FormData) {
  await requireRole(["admin", "site_team"]); const id = text(formData, "id"); const visitId = text(formData, "site_visit_id"); if (!isUuid(id) || !isUuid(visitId)) return;
  const supabase = await createClient(); if (!supabase) return; const { error } = await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id).eq("site_visit_id", visitId).eq("kind", "site_visit_follow_up");
  if (error) throw new Error("Unable to complete the follow-up."); revalidateVisit(visitId);
}

export async function registerSitePhotoAction(input: unknown): Promise<SiteVisitActionState> {
  const profile = await requireRole(["admin", "site_team"]); const parsed = photoMetadataSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "The photo metadata is invalid." };
  const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const { data, error } = await supabase.from("site_visit_photos").insert({ ...parsed.data, caption: optional(parsed.data.caption), photo_type: optional(parsed.data.photo_type), created_by: profile.id }).select("id").single();
  if (error || !data) return { status: "error", message: "The photo upload could not be reserved." };
  return { status: "success", message: "Photo upload reserved.", recordId: data.id };
}

export async function releaseSitePhotoReservationAction(input: unknown): Promise<void> {
  await requireRole(["admin", "site_team"]);
  const parsed = photoMetadataSchema.pick({ site_visit_id: true, storage_path: true }).safeParse(input);
  if (!parsed.success) return;
  const supabase = await createClient(); if (!supabase) return;
  await supabase.from("site_visit_photos").delete().eq("site_visit_id", parsed.data.site_visit_id).eq("storage_path", parsed.data.storage_path);
}

export async function updateSitePhotoAction(formData: FormData) {
  await requireRole(["admin", "site_team"]); const id = text(formData, "id"); const visitId = text(formData, "site_visit_id"); const caption = text(formData, "caption").trim(); const photoType = text(formData, "photo_type").trim(); const sortOrder = Number(text(formData, "sort_order"));
  if (!isUuid(id) || !isUuid(visitId) || caption.length > 300 || photoType.length > 80 || !Number.isInteger(sortOrder) || Math.abs(sortOrder) > 10000) return;
  const supabase = await createClient(); if (!supabase) return; const { error } = await supabase.from("site_visit_photos").update({ caption: optional(caption), photo_type: optional(photoType), sort_order: sortOrder }).eq("id", id).eq("site_visit_id", visitId);
  if (error) throw new Error("Unable to update the photo details."); revalidateVisit(visitId);
}

export async function removeSitePhotoAction(formData: FormData) {
  await requireRole(["admin", "site_team"]); const id = text(formData, "id"); const visitId = text(formData, "site_visit_id"); if (!isUuid(id) || !isUuid(visitId)) return;
  const supabase = await createClient(); if (!supabase) return; const { data } = await supabase.from("site_visit_photos").select("storage_path").eq("id", id).eq("site_visit_id", visitId).maybeSingle(); if (!data) return;
  const removal = await supabase.storage.from(SITE_PHOTO_BUCKET).remove([data.storage_path]); if (removal.error) throw new Error("Unable to remove the stored photo.");
  const { error } = await supabase.from("site_visit_photos").delete().eq("id", id).eq("site_visit_id", visitId); if (error) throw new Error("Unable to remove the photo record."); revalidateVisit(visitId);
}
