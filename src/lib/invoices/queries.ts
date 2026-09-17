import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/crm/validation";
import type { InvoiceStatus } from "./types";

type Person = { id: string; full_name: string } | null;
type Customer = { id: string; name: string; phone: string | null } | null;
type Project = {
  id: string;
  project_number: string;
  client_reference: string | null;
  project_value: number;
  currency: string;
} | null;

export type InvoiceListItem = {
  id: string;
  invoice_number: string;
  client_reference: string;
  project_id: string;
  customer_id: string;
  quotation_id: string | null;
  quotation_number_snapshot: string | null;
  quotation_revision_snapshot: number | null;
  issue_date: string;
  due_date: string | null;
  currency: string;
  total: number;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
  customer: Customer;
  project: Project;
  creator: Person;
};

export type InvoiceDetail = InvoiceListItem & {
  client_reference_sequence: number;
  client_reference_location_token: string;
  client_reference_date: string;
  customer_name_snapshot: string;
  customer_company_snapshot: string | null;
  customer_phone_snapshot: string | null;
  customer_email_snapshot: string | null;
  site_address_snapshot: string | null;
  subtotal: number;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  notes: string | null;
  terms: string | null;
  issued_at: string | null;
  issued_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  pdf_generated_at: string | null;
  issuer: Person;
};

export type InvoiceItem = {
  id: string;
  quotation_item_id: string | null;
  item_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  taxable: boolean;
  line_subtotal: number;
  line_total: number;
  sort_order: number;
};

export type InvoiceActivity = {
  id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: Person;
};

const listSelection = "id, invoice_number, client_reference, project_id, customer_id, quotation_id, quotation_number_snapshot, quotation_revision_snapshot, issue_date, due_date, currency, total, status, created_at, updated_at, customer:customers!invoices_customer_id_fkey(id, name, phone), project:projects!invoices_project_id_fkey(id, project_number, client_reference, project_value, currency), creator:profiles!invoices_created_by_fkey(id, full_name)";

function cleanSearch(value?: string) {
  return value?.trim().slice(0, 100).replace(/[^\p{L}\p{N}@+._\s-]/gu, " ").replace(/\s+/g, " ") || "";
}

export function invoiceFilters(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === "string" ? value : ""]));
}

export async function getInvoices(filters: Record<string, string> = {}) {
  const supabase = await createClient();
  if (!supabase) return [] as InvoiceListItem[];
  let query = supabase.from("invoices").select(listSelection).is("archived_at", null).order("issue_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);
  const search = cleanSearch(filters.search);
  if (search) {
    query = query.or(`invoice_number.ilike.%${search}%,client_reference.ilike.%${search}%,customer_name_snapshot.ilike.%${search}%,quotation_number_snapshot.ilike.%${search}%`);
  }
  if (filters.status) query = query.eq("status", filters.status as InvoiceStatus);
  if (filters.project) query = query.eq("project_id", filters.project);
  if (filters.customer) query = query.eq("customer_id", filters.customer);
  if (filters.from) query = query.gte("issue_date", filters.from);
  if (filters.to) query = query.lte("issue_date", filters.to);
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load invoices: ${error.message}`);
  return (data || []) as unknown as InvoiceListItem[];
}

export async function getInvoice(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("invoices").select(`${listSelection}, client_reference_sequence, client_reference_location_token, client_reference_date, customer_name_snapshot, customer_company_snapshot, customer_phone_snapshot, customer_email_snapshot, site_address_snapshot, subtotal, discount_type, discount_value, discount_amount, vat_rate, vat_amount, notes, terms, issued_at, issued_by, cancelled_at, cancellation_reason, pdf_generated_at, issuer:profiles!invoices_issued_by_fkey(id, full_name)`).eq("id", id).is("archived_at", null).maybeSingle();
  if (error) throw new Error(`Unable to load invoice: ${error.message}`);
  return data as unknown as InvoiceDetail | null;
}

export async function getInvoiceWorkspace(invoice: InvoiceDetail) {
  const supabase = await createClient();
  if (!supabase) return { items: [] as InvoiceItem[], timeline: [] as InvoiceActivity[], received: 0, paymentRelationshipValid: false };
  const [items, timeline, payments, siblingCount] = await Promise.all([
    supabase.from("invoice_items").select("id, quotation_item_id, item_name, description, quantity, unit, unit_price, discount_amount, taxable, line_subtotal, line_total, sort_order").eq("invoice_id", invoice.id).order("sort_order").order("created_at"),
    supabase.from("activity_logs").select("id, event_type, metadata, created_at, actor:profiles!activity_logs_actor_id_fkey(id, full_name)").eq("entity_type", "invoices").eq("entity_id", invoice.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("payments").select("amount_received").eq("project_id", invoice.project_id).is("archived_at", null).is("voided_at", null),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("project_id", invoice.project_id).in("status", ["issued", "partially_paid", "paid"]).is("archived_at", null),
  ]);
  if (items.error || timeline.error || payments.error || siblingCount.error) throw new Error("Unable to load the invoice workspace.");
  const paymentRelationshipValid = (siblingCount.count || 0) === 1 && invoice.status !== "draft" && invoice.status !== "cancelled";
  return {
    items: (items.data || []) as unknown as InvoiceItem[],
    timeline: (timeline.data || []) as unknown as InvoiceActivity[],
    received: paymentRelationshipValid ? (payments.data || []).reduce((sum, row) => sum + Number(row.amount_received), 0) : 0,
    paymentRelationshipValid,
  };
}

export async function getProjectInvoices(projectId: string) {
  if (!isUuid(projectId)) return [] as InvoiceListItem[];
  return getInvoices({ project: projectId });
}

export async function getCustomerInvoices(customerId: string) {
  if (!isUuid(customerId)) return [] as InvoiceListItem[];
  return getInvoices({ customer: customerId });
}

export async function getInvoiceSourceProjects() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("projects").select("id, project_number, client_reference, site_address, customer:customers!projects_customer_id_fkey(id, name), quotation:quotations!projects_quotation_id_fkey(id, quotation_number, status, is_current, total, currency)").is("archived_at", null).order("updated_at", { ascending: false }).limit(200);
  if (error) throw new Error(`Unable to load invoice sources: ${error.message}`);
  return (data || []).filter((row) => row.quotation?.status === "approved" && row.quotation.is_current);
}
