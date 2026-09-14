import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/crm/validation";
import type {
  FinanceProjectSummary,
  FinanceDashboardSummary,
  FinanceMilestoneQueueItem,
  FinanceSummary,
  MilestoneSummary,
  ReceiptRow,
} from "./types";

export async function getFinanceProjectSummaries() {
  const supabase = await createClient();
  if (!supabase) return [] as FinanceProjectSummary[];
  const { data, error } = await supabase.rpc("get_finance_project_summaries");
  if (error) throw new Error(`Unable to load payment projects: ${error.message}`);
  return (data || []) as FinanceProjectSummary[];
}

export async function getFinanceDashboardSummary() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_finance_dashboard_summary");
  if (error) throw new Error(`Unable to load finance summary: ${error.message}`);
  return (data?.[0] || null) as FinanceDashboardSummary | null;
}

export async function getFinanceMilestoneQueue() {
  const supabase = await createClient();
  if (!supabase) return [] as FinanceMilestoneQueueItem[];
  const { data, error } = await supabase.rpc("get_finance_milestone_queue");
  if (error) throw new Error(`Unable to load milestone queue: ${error.message}`);
  return (data || []) as FinanceMilestoneQueueItem[];
}

export async function getProjectFinanceSummary(projectId: string) {
  if (!isUuid(projectId)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_project_finance_summary", { p_project_id: projectId });
  if (error) throw new Error(`Unable to load project finance summary: ${error.message}`);
  return (data?.[0] || null) as FinanceSummary | null;
}

export async function getMilestoneSummaries(projectId: string) {
  if (!isUuid(projectId)) return [] as MilestoneSummary[];
  const supabase = await createClient();
  if (!supabase) return [] as MilestoneSummary[];
  const { data, error } = await supabase.rpc("get_payment_milestone_summaries", { p_project_id: projectId });
  if (error) throw new Error(`Unable to load milestone balances: ${error.message}`);
  return (data || []) as MilestoneSummary[];
}

export async function getFinanceProject(projectId: string) {
  if (!isUuid(projectId)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("projects")
    .select("id, project_number, project_value, currency, payment_plan_status, customer_id, status, customer:customers!projects_customer_id_fkey(id, name, phone)")
    .eq("id", projectId).is("archived_at", null).maybeSingle();
  if (error) throw new Error(`Unable to load payment project: ${error.message}`);
  return data as unknown as {
    id: string; project_number: string; project_value: number; currency: string; payment_plan_status: string;
    customer_id: string; status: string; customer: { id: string; name: string; phone: string | null } | null;
  } | null;
}

export async function getProjectReceipts(projectId: string) {
  if (!isUuid(projectId)) return [] as ReceiptRow[];
  const supabase = await createClient();
  if (!supabase) return [] as ReceiptRow[];
  const { data, error } = await supabase.from("payments").select(
    "id, receipt_number, project_id, customer_id, milestone_id, amount_received, received_date, payment_method, reference_number, notes, voided_at, void_reason, created_at, creator:profiles!payments_created_by_fkey(id, full_name), voider:profiles!payments_voided_by_fkey(id, full_name), milestone:payment_milestones!payments_milestone_id_fkey(id, name), proofs:payment_proofs(id, payment_id, storage_path, file_name, mime_type, file_size, created_at)"
  ).eq("project_id", projectId).is("archived_at", null).order("received_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`Unable to load receipts: ${error.message}`);
  return (data || []) as unknown as ReceiptRow[];
}

export async function getReceipt(paymentId: string) {
  if (!isUuid(paymentId)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("payments").select(
    "id, receipt_number, project_id, customer_id, milestone_id, amount_received, received_date, payment_method, reference_number, notes, voided_at, void_reason, created_at, creator:profiles!payments_created_by_fkey(id, full_name), voider:profiles!payments_voided_by_fkey(id, full_name), milestone:payment_milestones!payments_milestone_id_fkey(id, name, description, amount_due), project:projects!payments_project_id_fkey(id, project_number, currency, project_value, source_quotation_number), customer:customers!payments_customer_id_fkey(id, name, phone), proofs:payment_proofs(id, payment_id, storage_path, file_name, mime_type, file_size, created_at)"
  ).eq("id", paymentId).is("archived_at", null).maybeSingle();
  if (error) throw new Error(`Unable to load receipt: ${error.message}`);
  return data as unknown as ReceiptRow | null;
}

export async function getRecentReceipts(limit = 20) {
  const supabase = await createClient();
  if (!supabase) return [] as ReceiptRow[];
  const { data, error } = await supabase.from("payments").select(
    "id, receipt_number, project_id, customer_id, milestone_id, amount_received, received_date, payment_method, reference_number, notes, voided_at, void_reason, created_at, creator:profiles!payments_created_by_fkey(id, full_name), voider:profiles!payments_voided_by_fkey(id, full_name), milestone:payment_milestones!payments_milestone_id_fkey(id, name), project:projects!payments_project_id_fkey(id, project_number, currency), customer:customers!payments_customer_id_fkey(id, name), proofs:payment_proofs(id, payment_id, storage_path, file_name, mime_type, file_size, created_at)"
  ).is("archived_at", null).order("received_date", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Unable to load recent receipts: ${error.message}`);
  return (data || []) as unknown as ReceiptRow[];
}

export async function getCustomerFinanceSummary(customerId: string) {
  if (!isUuid(customerId)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_customer_finance_summary", { p_customer_id: customerId });
  if (error) return null;
  return (data?.[0] || null) as { project_value: number; received: number; outstanding: number; overdue: number; project_count: number } | null;
}
