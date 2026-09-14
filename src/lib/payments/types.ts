import type { Database } from "@/lib/supabase/database.generated";
import type { ActionState } from "@/lib/forms/action-state";

export type PaymentPlanStatus = Database["public"]["Enums"]["payment_plan_status"];
export type PaymentMilestoneType = Database["public"]["Enums"]["payment_milestone_type"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type PaymentActionState = ActionState & { recordId?: string; storagePath?: string };

export type FinanceSummary = {
  project_value: number;
  currency: string;
  planned: number;
  received: number;
  outstanding: number;
  overdue: number;
  next_due_date: string | null;
  next_due_amount?: number;
  paid_percent: number;
  plan_status: string;
};

export type FinanceProjectSummary = {
  project_id: string;
  project_number: string;
  customer_id: string;
  customer_name: string;
  project_value: number;
  currency: string;
  plan_status: string;
  planned: number;
  received: number;
  outstanding: number;
  overdue: number;
  next_due_date: string | null;
  paid_percent: number;
};

export type FinanceDashboardSummary = {
  project_value: number;
  received: number;
  received_this_month: number;
  received_today: number;
  outstanding: number;
  overdue: number;
  active_plans: number;
  overdue_projects: number;
  due_soon: number;
};

export type FinanceMilestoneQueueItem = {
  milestone_id: string;
  project_id: string;
  project_number: string;
  customer_id: string;
  customer_name: string;
  milestone_name: string;
  amount_due: number;
  received: number;
  outstanding: number;
  due_date: string | null;
  status: string;
  currency: string;
};

export type MilestoneSummary = {
  milestone_id: string;
  name: string;
  description: string | null;
  milestone_type: string;
  percentage: number | null;
  amount_due: number;
  due_date: string | null;
  status: string;
  sort_order: number;
  notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  received: number;
  outstanding: number;
};

export type ReceiptRow = {
  id: string;
  receipt_number: string;
  project_id: string;
  customer_id: string;
  milestone_id: string | null;
  amount_received: number;
  received_date: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  creator: { id: string; full_name: string } | null;
  voider: { id: string; full_name: string } | null;
  milestone: { id: string; name: string; description?: string | null; amount_due?: number } | null;
  project?: {
    id: string;
    project_number: string;
    currency: string;
    project_value?: number;
    source_quotation_number?: string | null;
  } | null;
  customer?: { id: string; name: string; phone?: string | null } | null;
  proofs: PaymentProof[];
};

export type PaymentProof = {
  id: string;
  payment_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

export const INITIAL_PAYMENT_ACTION_STATE: PaymentActionState = { status: "idle" };
