import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Asset, InternalExpense, LabourWage, ProjectCostSummary } from "./types";

export async function getOperationsLedger() {
  const supabase = await createClient();
  if (!supabase) return { expenses: [], wages: [], bills: [] } as { expenses: InternalExpense[]; wages: LabourWage[]; bills: Array<Record<string, unknown>> };
  const [expenses, wages, bills] = await Promise.all([
    supabase.from("internal_expenses").select("id, scope, project_id, category, description, vendor, expense_date, amount, currency, payment_method, reference, notes, created_at, project:projects!internal_expenses_project_id_fkey(project_number)").is("archived_at", null).order("expense_date", { ascending: false }).limit(200),
    supabase.from("labour_wages").select("id, worker_name, work_date, project_id, work_description, hours, amount, currency, status, notes, project:projects!labour_wages_project_id_fkey(project_number)").is("archived_at", null).order("work_date", { ascending: false }).limit(200),
    supabase.from("purchase_bills").select("id, expense_id, asset_id, vendor, bill_number, bill_date, file_name, storage_path, mime_type, file_size, created_at").order("created_at", { ascending: false }).limit(200),
  ]);
  if (expenses.error || wages.error || bills.error) throw new Error("Unable to load Accounts ledgers.");
  return { expenses: (expenses.data || []) as unknown as InternalExpense[], wages: (wages.data || []) as unknown as LabourWage[], bills: (bills.data || []) as Array<Record<string, unknown>> };
}
export async function getAssets() {
  const supabase = await createClient();
  if (!supabase) return [] as Asset[];
  const { data, error } = await supabase.from("assets").select("id, name, asset_code, category, brand, model, status, purchase_date, planned_purchase_date, purchase_cost, estimated_cost, currency, supplier, location, notes, image_path, created_at").is("archived_at", null).order("status").order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load assets.");
  return (data || []) as unknown as Asset[];
}
export async function getProjectCostSummary(projectId: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_project_cost_summary", { p_project_id: projectId });
  if (error) throw new Error(`Unable to load project cost summary: ${error.message}`);
  return (data?.[0] || null) as ProjectCostSummary | null;
}
