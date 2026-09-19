"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/crm/validation";

const reminderTypes = ["Enquiry follow-up", "Customer call", "Meeting", "Site visit", "Quotation follow-up", "Payment follow-up", "General reminder"] as const;
function text(data: FormData, key: string) { const value = data.get(key); return typeof value === "string" ? value.trim() : ""; }
function optional(value: string) { return value || null; }
function dubaiIso(value: string) { return new Date(`${value}:00+04:00`).toISOString(); }
function revalidateTasks() { revalidatePath("/dashboard"); revalidatePath("/dashboard/tasks"); revalidatePath("/dashboard/enquiries"); }

export async function createReminderAction(data: FormData) {
  const profile = await requireRole(["admin", "sales"]);
  const title = text(data, "title"); const reminderType = text(data, "reminder_type"); const dueAt = text(data, "due_at");
  const assignedTo = text(data, "assigned_to"); const customerId = text(data, "customer_id"); const enquiryId = text(data, "enquiry_id"); const projectId = text(data, "project_id");
  if (!title || title.length > 200 || !reminderTypes.includes(reminderType as typeof reminderTypes[number]) || !dueAt || Number.isNaN(Date.parse(dueAt)) || !isUuid(assignedTo)) return;
  if ([customerId, enquiryId, projectId].some((id) => id && !isUuid(id))) return;
  const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("tasks").insert({ title, reminder_type: reminderType, description: optional(text(data, "description")), due_at: dubaiIso(dueAt), assigned_to: assignedTo, customer_id: optional(customerId), enquiry_id: optional(enquiryId), project_id: optional(projectId), kind: "general", priority: "normal", status: "open", created_by: profile.id });
  if (error) throw new Error("Unable to create reminder.");
  revalidateTasks();
}

export async function completeReminderAction(data: FormData) {
  await requireRole(["admin", "sales"]); const id = text(data, "id"); if (!isUuid(id)) return;
  const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id).not("reminder_type", "is", null);
  if (error) throw new Error("Unable to complete reminder."); revalidateTasks();
}

export async function rescheduleReminderAction(data: FormData) {
  await requireRole(["admin", "sales"]); const id = text(data, "id"); const dueAt = text(data, "due_at"); if (!isUuid(id) || !dueAt || Number.isNaN(Date.parse(dueAt))) return;
  const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("tasks").update({ due_at: dubaiIso(dueAt), status: "open", completed_at: null }).eq("id", id).not("reminder_type", "is", null);
  if (error) throw new Error("Unable to reschedule reminder."); revalidateTasks();
}
