"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

function text(form: FormData, key: string) { const value = form.get(key); return typeof value === "string" ? value.trim() : ""; }
function number(form: FormData, key: string) { const value = Number(text(form, key)); return Number.isFinite(value) ? value : 0; }
function refresh() { revalidatePath("/dashboard/accounts"); revalidatePath("/dashboard/projects", "layout"); revalidatePath("/dashboard/assets"); }

export async function createExpenseAction(formData: FormData) {
  const profile = await requireRole(["admin", "accounts"]); const supabase = await createClient(); if (!supabase) return;
  const scope = text(formData, "scope") as "project" | "workshop"; const projectId = text(formData, "project_id") || null;
  if (!["project", "workshop"].includes(scope) || (scope === "project" && !projectId) || (scope === "workshop" && projectId)) return;
  const { error } = await supabase.from("internal_expenses").insert({ scope, project_id: projectId, category: text(formData, "category") || "other", description: text(formData, "description"), vendor: text(formData, "vendor") || null, expense_date: text(formData, "expense_date") || new Date().toISOString().slice(0, 10), amount: number(formData, "amount"), currency: "AED", payment_method: text(formData, "payment_method") || null, reference: text(formData, "reference") || null, notes: text(formData, "notes") || null, recorded_by: profile.id });
  if (error) throw new Error(error.message); refresh();
}
export async function createWageAction(formData: FormData) {
  const profile = await requireRole(["admin", "accounts"]); const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("labour_wages").insert({ worker_name: text(formData, "worker_name"), work_date: text(formData, "work_date") || new Date().toISOString().slice(0, 10), project_id: text(formData, "project_id") || null, work_description: text(formData, "work_description"), hours: text(formData, "hours") ? number(formData, "hours") : null, amount: number(formData, "amount"), currency: "AED", status: (text(formData, "status") || "pending") as "pending" | "paid" | "partially_paid", notes: text(formData, "notes") || null, recorded_by: profile.id });
  if (error) throw new Error(error.message); refresh();
}
export async function createAssetAction(formData: FormData) {
  const profile = await requireRole(["admin", "accounts"]); const supabase = await createClient(); if (!supabase) return;
  const { error } = await supabase.from("assets").insert({ name: text(formData, "name"), asset_code: text(formData, "asset_code"), category: text(formData, "category"), brand: text(formData, "brand") || null, model: text(formData, "model") || null, status: (text(formData, "status") || "planned") as "planned" | "active" | "maintenance" | "retired" | "archived", planned_purchase_date: text(formData, "planned_purchase_date") || null, purchase_date: text(formData, "purchase_date") || null, purchase_cost: text(formData, "purchase_cost") ? number(formData, "purchase_cost") : null, estimated_cost: text(formData, "estimated_cost") ? number(formData, "estimated_cost") : null, currency: "AED", supplier: text(formData, "supplier") || null, location: text(formData, "location") || null, notes: text(formData, "notes") || null, recorded_by: profile.id });
  if (error) throw new Error(error.message); refresh();
}
export async function reservePurchaseBillAction(formData: FormData) {
  const profile = await requireRole(["admin", "accounts"]); const supabase = await createClient(); if (!supabase) return { status: "error", message: "Supabase is not configured." };
  const fileName = text(formData, "file_name"); const mimeType = text(formData, "mime_type"); const fileSize = number(formData, "file_size");
  if (!fileName || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(mimeType) || fileSize < 1 || fileSize > 20971520) return { status: "error", message: "Use a PDF, JPEG, PNG, or WebP file up to 20 MB." };
  if (!text(formData, "expense_id") && !text(formData, "asset_id")) return { status: "error", message: "Link the bill to an expense or asset." };
  const id = crypto.randomUUID(); const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_"); const storagePath = `${id}/${safeName}`;
  const { error } = await supabase.from("purchase_bills").insert({ id, expense_id: text(formData, "expense_id") || null, asset_id: text(formData, "asset_id") || null, vendor: text(formData, "vendor") || null, bill_number: text(formData, "bill_number") || null, bill_date: text(formData, "bill_date") || null, file_name: fileName, storage_path: storagePath, mime_type: mimeType, file_size: fileSize, uploaded_by: profile.id });
  if (error) return { status: "error", message: error.message }; return { status: "success", id, storagePath };
}
export async function removePurchaseBillAction(id: string) { await requireRole(["admin", "accounts"]); const supabase = await createClient(); if (supabase) await supabase.from("purchase_bills").delete().eq("id", id); }
