export type ExpenseScope = "project" | "workshop";
export type InternalExpense = {
  id: string; scope: ExpenseScope; project_id: string | null; category: string; description: string;
  vendor: string | null; expense_date: string; amount: number; currency: string; payment_method: string | null;
  reference: string | null; notes: string | null; created_at: string;
  project?: { project_number: string } | null;
};
export type LabourWage = { id: string; worker_name: string; work_date: string; project_id: string | null; work_description: string; hours: number | null; amount: number; currency: string; status: string; notes: string | null; project?: { project_number: string } | null };
export type Asset = { id: string; name: string; asset_code: string; category: string; brand: string | null; model: string | null; status: string; purchase_date: string | null; planned_purchase_date: string | null; purchase_cost: number | null; estimated_cost: number | null; currency: string; supplier: string | null; location: string | null; notes: string | null; image_path: string | null; created_at: string };
export type ProjectCostSummary = { approved_value: number; currency: string; customer_received: number; customer_outstanding: number; material_expense: number; labour_cost: number; other_project_expenses: number; total_internal_cost: number };

export function weightedProgress(stages: Array<{ progress: number; weight: number; status?: string }>) {
  const total = stages.reduce((sum, stage) => sum + stage.weight, 0);
  if (!total) return 0;
  return Math.round(stages.reduce((sum, stage) => sum + stage.weight * (["completed", "skipped"].includes(stage.status || "") ? 100 : stage.progress), 0) / total);
}
