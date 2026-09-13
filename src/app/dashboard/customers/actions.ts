"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireManagement, requireRole } from "@/lib/auth/dal";
import { findCustomerDuplicates } from "@/lib/crm/duplicates";
import { createClient } from "@/lib/supabase/server";
import { customerSchema, isUuid } from "@/lib/crm/validation";
import type { CrmActionState } from "@/lib/crm/types";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function nullable(value: string) { return value.trim() || null; }

function values(formData: FormData) {
  return {
    name: text(formData, "name"), customer_type: text(formData, "customer_type"),
    phone: text(formData, "phone"), whatsapp_number: text(formData, "whatsapp_number"),
    email: text(formData, "email"), company_name: text(formData, "company_name"),
    address: text(formData, "address"), area: text(formData, "area"), emirate: text(formData, "emirate"),
    notes: text(formData, "notes"), source: text(formData, "source"), assigned_to: text(formData, "assigned_to"),
  };
}

function payload(input: ReturnType<typeof customerSchema.parse>, actorId?: string) {
  return {
    name: input.name, customer_type: input.customer_type, phone: nullable(input.phone),
    whatsapp_number: nullable(input.whatsapp_number), email: nullable(input.email), company_name: nullable(input.company_name),
    address: nullable(input.address), area: nullable(input.area), emirate: nullable(input.emirate), notes: nullable(input.notes),
    source: nullable(input.source), assigned_to: nullable(input.assigned_to), ...(actorId ? { created_by: actorId } : {}),
  };
}

export async function createCustomerAction(_state: CrmActionState, formData: FormData): Promise<CrmActionState> {
  const profile = await requireRole(["admin", "sales"]);
  const parsed = customerSchema.safeParse(values(formData));
  if (!parsed.success) return { status: "error", message: "Correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const matches = await findCustomerDuplicates(parsed.data.phone, parsed.data.whatsapp_number, parsed.data.email);
  if (matches.length && text(formData, "allow_duplicate") !== "true") return { status: "error", message: "A customer with matching contact details already exists.", duplicates: matches };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const assignedTo = profile.role === "admin" ? parsed.data.assigned_to : profile.id;
  const { data, error } = await supabase.from("customers").insert({ ...payload(parsed.data, profile.id), assigned_to: nullable(assignedTo) }).select("id").single();
  if (error) return { status: "error", message: "The customer could not be saved." };
  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${data.id}`);
}

export async function updateCustomerAction(id: string, _state: CrmActionState, formData: FormData): Promise<CrmActionState> {
  await requireRole(["admin", "sales"]);
  if (!isUuid(id)) return { status: "error", message: "Invalid customer identifier." };
  const parsed = customerSchema.safeParse(values(formData));
  if (!parsed.success) return { status: "error", message: "Correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const changes = payload(parsed.data);
  delete (changes as { assigned_to?: string | null }).assigned_to;
  const { error } = await supabase.from("customers").update(changes).eq("id", id);
  if (error) return { status: "error", message: "The customer changes could not be saved." };
  revalidatePath("/dashboard/customers"); revalidatePath(`/dashboard/customers/${id}`);
  return { status: "success", message: "Customer changes saved." };
}

export async function assignCustomerAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id"); const assignedTo = text(formData, "assigned_to");
  if (!isUuid(id) || (assignedTo && !isUuid(assignedTo))) return;
  const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("customers").update({ assigned_to: assignedTo || null }).eq("id", id);
  if (error) throw new Error("Unable to change the salesperson.");
  revalidatePath("/dashboard/customers"); revalidatePath(`/dashboard/customers/${id}`);
}

export async function setCustomerArchivedAction(formData: FormData) {
  await requireManagement();
  const id = text(formData, "id"); const archived = text(formData, "archived") === "true";
  if (!isUuid(id)) return;
  const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("customers").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw new Error("Unable to change the customer archive status.");
  revalidatePath("/dashboard/customers"); revalidatePath(`/dashboard/customers/${id}`);
}
