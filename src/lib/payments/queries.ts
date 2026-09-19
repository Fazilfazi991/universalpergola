import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-mode-server";
import { DEMO_FINANCE, DEMO_PROJECTS } from "@/lib/demo/data";
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
  if (isDemoMode()) return DEMO_PROJECTS.map((project) => ({ project_id: project.id, project_number: project.project_number, customer_name: project.customer?.name || "Customer", currency: project.currency, project_value: project.project_value, received: project.id === DEMO_PROJECTS[0].id ? 28425 : 0, outstanding: project.id === DEMO_PROJECTS[0].id ? 20400 : project.project_value, overdue: project.id === DEMO_PROJECTS[0].id ? 0 : 18400, due_soon: 21950, status: project.status, plan_status: "active", next_due_date: "2026-09-25" })) as unknown as FinanceProjectSummary[];
  const supabase = await createClient();
  if (!supabase) return [] as FinanceProjectSummary[];
  const { data, error } = await supabase.rpc("get_finance_project_summaries");
  if (error) throw new Error(`Unable to load payment projects: ${error.message}`);
  return (data || []) as FinanceProjectSummary[];
}

export async function getFinanceDashboardSummary() {
  if (isDemoMode()) return ({ ...DEMO_FINANCE, active_plans: 2, overdue_projects: 1 } as unknown) as FinanceDashboardSummary;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_finance_dashboard_summary");
  if (error) throw new Error(`Unable to load finance summary: ${error.message}`);
  return (data?.[0] || null) as FinanceDashboardSummary | null;
}

export async function getFinanceMilestoneQueue() {
  if (isDemoMode()) return [] as FinanceMilestoneQueueItem[];
  const supabase = await createClient();
  if (!supabase) return [] as FinanceMilestoneQueueItem[];
  const { data, error } = await supabase.rpc("get_finance_milestone_queue");
  if (error) throw new Error(`Unable to load milestone queue: ${error.message}`);
  return (data || []) as FinanceMilestoneQueueItem[];
}

export async function getProjectFinanceSummary(projectId: string) {
  if (isDemoMode()) { const project = DEMO_PROJECTS.find((item) => item.id === projectId); return project ? ({ project_value: project.project_value, received: 28425, outstanding: project.project_value - 28425, overdue: 0, due_soon: 0, currency: project.currency, plan_status: "active" } as unknown as FinanceSummary) : null; }
  if (!isUuid(projectId)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_project_finance_summary", { p_project_id: projectId });
  if (error) throw new Error(`Unable to load project finance summary: ${error.message}`);
  return (data?.[0] || null) as FinanceSummary | null;
}

export async function getMilestoneSummaries(projectId: string) {
  if (isDemoMode()) return [{ id: `milestone-${projectId}`, name: "Deposit", amount_due: 24412.5, amount_received: 24412.5, outstanding: 0, status: "paid" }] as unknown as MilestoneSummary[];
  if (!isUuid(projectId)) return [] as MilestoneSummary[];
  const supabase = await createClient();
  if (!supabase) return [] as MilestoneSummary[];
  const { data, error } = await supabase.rpc("get_payment_milestone_summaries", { p_project_id: projectId });
  if (error) throw new Error(`Unable to load milestone balances: ${error.message}`);
  return (data || []) as MilestoneSummary[];
}

export async function getFinanceProject(projectId: string) {
  if (isDemoMode()) { const project = DEMO_PROJECTS.find((item) => item.id === projectId); return project ? ({ id: project.id, project_number: project.project_number, project_value: project.project_value, currency: project.currency, payment_plan_status: "active", customer_id: project.customer_id, status: project.status, customer: project.customer }) : null; }
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
  if (isDemoMode()) return [{ id: `receipt-${projectId}`, receipt_number: "RCPT-DEMO-001", project_id: projectId, customer_id: DEMO_PROJECTS.find((item) => item.id === projectId)?.customer_id || "demo-customer-001", milestone_id: null, amount_received: 28425, received_date: "2026-09-14", payment_method: "bank_transfer", reference_number: "DEMO-TRANSFER-001", notes: "Synthetic demo receipt", voided_at: null, void_reason: null, created_at: "2026-09-14T10:00:00.000Z", creator: { id: "demo-profile-alex-morgan", full_name: "Alex Morgan" }, voider: null, milestone: null, proofs: [] }] as unknown as ReceiptRow[];
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
  if (isDemoMode()) {
    const projectId = paymentId.startsWith("receipt-") ? paymentId.slice("receipt-".length) : "";
    const project = DEMO_PROJECTS.find((item) => item.id === projectId);
    if (!project) return null;
    return {
      ...(await getProjectReceipts(projectId))[0],
      project: { id: project.id, project_number: project.project_number, currency: project.currency, project_value: project.project_value, source_quotation_number: "UP-Q-DEMO-001" },
      customer: project.customer,
    } as unknown as ReceiptRow;
  }
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
  if (isDemoMode()) return (await getProjectReceipts(DEMO_PROJECTS[0].id)).slice(0, limit);
  const supabase = await createClient();
  if (!supabase) return [] as ReceiptRow[];
  const { data, error } = await supabase.from("payments").select(
    "id, receipt_number, project_id, customer_id, milestone_id, amount_received, received_date, payment_method, reference_number, notes, voided_at, void_reason, created_at, creator:profiles!payments_created_by_fkey(id, full_name), voider:profiles!payments_voided_by_fkey(id, full_name), milestone:payment_milestones!payments_milestone_id_fkey(id, name), project:projects!payments_project_id_fkey(id, project_number, currency), customer:customers!payments_customer_id_fkey(id, name), proofs:payment_proofs(id, payment_id, storage_path, file_name, mime_type, file_size, created_at)"
  ).is("archived_at", null).order("received_date", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`Unable to load recent receipts: ${error.message}`);
  return (data || []) as unknown as ReceiptRow[];
}

export async function getCustomerFinanceSummary(customerId: string) {
  if (isDemoMode()) return { project_value: 48825, received: 28425, outstanding: 20400, overdue: 0, project_count: 1 };
  if (!isUuid(customerId)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_customer_finance_summary", { p_customer_id: customerId });
  if (error) return null;
  return (data?.[0] || null) as { project_value: number; received: number; outstanding: number; overdue: number; project_count: number } | null;
}
