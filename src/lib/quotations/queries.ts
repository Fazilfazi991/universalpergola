import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/crm/validation";
import type { AppRole } from "@/lib/auth/permissions";
import type {
  QuotationMeasurementOption,
  QuotationProductOption,
  QuotationStatus,
} from "./types.ts";

type Person = { id: string; full_name: string } | null;
type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  company_name?: string | null;
  address?: string | null;
  area?: string | null;
  emirate?: string | null;
} | null;
type Enquiry = {
  id: string;
  enquiry_number: number;
  subject: string | null;
} | null;
type Visit = {
  id: string;
  visit_number: number;
  site_address: string;
  measurement_summary?: string | null;
  status?: string;
} | null;

export type QuotationListItem = {
  id: string;
  quotation_number: string;
  customer_id: string;
  enquiry_id: string | null;
  site_visit_id: string | null;
  owner_id: string | null;
  issue_date: string;
  validity_date: string | null;
  currency: string;
  status: QuotationStatus;
  revision_number: number;
  is_current: boolean;
  total: number;
  updated_at: string;
  customer: Customer;
  enquiry: Enquiry;
  site_visit: Visit;
  owner: Person;
};

export type QuotationItem = {
  id: string;
  product_id: string | null;
  source_measurement_id: string | null;
  product_name_snapshot: string | null;
  product_code_snapshot: string | null;
  item_name: string;
  description: string;
  quantity: number;
  unit: string;
  width: number | null;
  height: number | null;
  length: number | null;
  dimensions_details: string | null;
  unit_price: number;
  discount_amount: number;
  taxable: boolean;
  line_total: number;
  sort_order: number;
};

export type QuotationDetail = QuotationListItem & {
  revised_from_id: string | null;
  revision_group_id: string;
  customer_name_snapshot: string;
  customer_company_snapshot: string | null;
  customer_phone_snapshot: string | null;
  customer_email_snapshot: string | null;
  site_address_snapshot: string | null;
  introduction: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  terms: string | null;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  subtotal: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  created_at: string;
  sent_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  decision_note: string | null;
  pdf_generated_at: string | null;
  approver: Person;
  rejector: Person;
};

export type QuotationActivity = {
  id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: Person;
};
export type QuotationProject = {
  id: string;
  project_number: string;
  status: string;
};

function cleanSearch(value?: string) {
  return (
    value
      ?.trim()
      .slice(0, 100)
      .replace(/[^\p{L}\p{N}@+._\s-]/gu, " ")
      .replace(/\s+/g, " ") || ""
  );
}

export function quotationFilters(
  params: Record<string, string | string[] | undefined>,
) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === "string" ? value : "",
    ]),
  );
}

const listSelection =
  "id, quotation_number, customer_id, enquiry_id, site_visit_id, owner_id, issue_date, validity_date, currency, status, revision_number, is_current, total, updated_at, customer:customers!quotations_customer_id_fkey(id, name, phone), enquiry:enquiries!quotations_enquiry_id_fkey(id, enquiry_number, subject), site_visit:site_visits!quotations_site_visit_id_fkey(id, visit_number, site_address), owner:profiles!quotations_owner_id_fkey(id, full_name)";

export async function getQuotations(filters: Record<string, string>) {
  const supabase = await createClient();
  if (!supabase) return [] as QuotationListItem[];
  let query = supabase
    .from("quotations")
    .select(listSelection)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(150);
  const search = cleanSearch(filters.search);
  if (search) {
    const { data: customers, error } = await supabase
      .from("customers")
      .select("id")
      .or(
        `name.ilike.%${search}%,company_name.ilike.%${search}%,phone.ilike.%${search}%`,
      )
      .limit(60);
    if (error)
      throw new Error(`Unable to search quotation customers: ${error.message}`);
    const conditions = [
      `quotation_number.ilike.%${search}%`,
      `site_address_snapshot.ilike.%${search}%`,
    ];
    if (customers?.length)
      conditions.push(
        `customer_id.in.(${customers.map((item) => item.id).join(",")})`,
      );
    query = query.or(conditions.join(","));
  }
  if (filters.status)
    query = query.eq("status", filters.status as QuotationStatus);
  if (filters.owner) query = query.eq("owner_id", filters.owner);
  if (filters.customer) query = query.eq("customer_id", filters.customer);
  if (filters.date) query = query.eq("issue_date", filters.date);
  if (filters.state === "current") query = query.eq("is_current", true);
  if (filters.approval === "awaiting")
    query = query.in("status", ["ready", "sent"]);
  if (filters.approval === "approved") query = query.eq("status", "approved");
  if (filters.approval === "rejected") query = query.eq("status", "rejected");
  if (filters.expired === "yes")
    query = query
      .lt("validity_date", new Date().toISOString().slice(0, 10))
      .eq("status", "sent");
  if (filters.expired === "soon") {
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    query = query
      .gte("validity_date", today)
      .lte("validity_date", soon)
      .eq("status", "sent");
  }
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load quotations: ${error.message}`);
  return (data || []) as unknown as QuotationListItem[];
}

export async function getQuotation(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("quotations")
    .select(
      "id, quotation_number, customer_id, enquiry_id, site_visit_id, owner_id, issue_date, validity_date, currency, status, revision_number, revision_group_id, revised_from_id, is_current, customer_name_snapshot, customer_company_snapshot, customer_phone_snapshot, customer_email_snapshot, site_address_snapshot, introduction, internal_notes, customer_notes, terms, discount_type, discount_value, subtotal, discount_amount, vat_rate, vat_amount, total, created_at, updated_at, sent_at, approved_at, approved_by, rejected_at, rejected_by, decision_note, pdf_generated_at, customer:customers!quotations_customer_id_fkey(id, name, phone, email, company_name, address, area, emirate), enquiry:enquiries!quotations_enquiry_id_fkey(id, enquiry_number, subject), site_visit:site_visits!quotations_site_visit_id_fkey(id, visit_number, site_address, measurement_summary, status), owner:profiles!quotations_owner_id_fkey(id, full_name), approver:profiles!quotations_approved_by_fkey(id, full_name), rejector:profiles!quotations_rejected_by_fkey(id, full_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load quotation: ${error.message}`);
  return data as unknown as QuotationDetail | null;
}

export async function getQuotationWorkspace(quotation: QuotationDetail) {
  const supabase = await createClient();
  if (!supabase)
    return {
      items: [] as QuotationItem[],
      revisions: [] as QuotationListItem[],
      timeline: [] as QuotationActivity[],
      project: null as QuotationProject | null,
    };
  const [items, revisions, timeline, project] = await Promise.all([
    supabase
      .from("quotation_items")
      .select(
        "id, product_id, source_measurement_id, product_name_snapshot, product_code_snapshot, item_name, description, quantity, unit, width, height, length, dimensions_details, unit_price, discount_amount, taxable, line_total, sort_order",
      )
      .eq("quotation_id", quotation.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("quotations")
      .select(listSelection)
      .eq("revision_group_id", quotation.revision_group_id)
      .is("archived_at", null)
      .order("revision_number", { ascending: false }),
    supabase
      .from("activity_logs")
      .select(
        "id, event_type, metadata, created_at, actor:profiles!activity_logs_actor_id_fkey(id, full_name)",
      )
      .eq("entity_type", "quotations")
      .eq("entity_id", quotation.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("projects")
      .select("id, project_number, status")
      .eq("quotation_id", quotation.id)
      .maybeSingle(),
  ]);
  if (items.error || revisions.error || timeline.error || project.error)
    throw new Error("Unable to load the quotation workspace.");
  return {
    items: (items.data || []) as unknown as QuotationItem[],
    revisions: (revisions.data || []) as unknown as QuotationListItem[],
    timeline: (timeline.data || []) as unknown as QuotationActivity[],
    project: project.data as QuotationProject | null,
  };
}

export async function getQuotationCreationOptions() {
  const supabase = await createClient();
  if (!supabase)
    return {
      customers: [],
      enquiries: [],
      visits: [],
      products: [],
      measurements: [],
      staff: [],
    };
  const [customers, enquiries, visits, products, measurements, staff] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name, phone, email, company_name, address, area, emirate")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase
        .from("enquiries")
        .select("id, enquiry_number, customer_id, subject, assigned_to")
        .is("archived_at", null)
        .not("status", "in", "(approved,lost)")
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase
        .from("site_visits")
        .select(
          "id, visit_number, customer_id, enquiry_id, site_address, status, measurement_summary",
        )
        .is("archived_at", null)
        .order("scheduled_at", { ascending: false })
        .limit(150),
      supabase
        .from("products")
        .select(
          "id, name, product_code, short_description, full_description, pricing_mode, price",
        )
        .is("archived_at", null)
        .order("name")
        .limit(250),
      supabase
        .from("site_visit_measurements")
        .select(
          "id, site_visit_id, label, width, height, length, unit, quantity, notes",
        )
        .order("sort_order")
        .limit(750),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("status", "active")
        .in("role", ["admin", "sales"])
        .order("full_name")
        .limit(100),
    ]);
  if (
    [customers, enquiries, visits, products, measurements, staff].some(
      (result) => result.error,
    )
  )
    throw new Error("Unable to load quotation builder options.");
  return {
    customers: customers.data || [],
    enquiries: enquiries.data || [],
    visits: visits.data || [],
    products: (products.data || []) as unknown as QuotationProductOption[],
    measurements: (measurements.data || []) as QuotationMeasurementOption[],
    staff: staff.data || [],
  };
}

export async function getQuotationFilterOptions() {
  const supabase = await createClient();
  if (!supabase) return { customers: [], staff: [] };
  const [customers, staff] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name")
      .is("archived_at", null)
      .order("name")
      .limit(200),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("status", "active")
      .in("role", ["admin", "sales"])
      .order("full_name")
      .limit(100),
  ]);
  if (customers.error || staff.error)
    throw new Error("Unable to load quotation filters.");
  return { customers: customers.data || [], staff: staff.data || [] };
}

async function getLinkedQuotations(
  column: "customer_id" | "enquiry_id" | "site_visit_id",
  id: string,
) {
  if (!isUuid(id)) return [] as QuotationListItem[];
  const supabase = await createClient();
  if (!supabase) return [] as QuotationListItem[];
  const { data, error } = await supabase
    .from("quotations")
    .select(listSelection)
    .eq(column, id)
    .is("archived_at", null)
    .order("revision_number", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) throw new Error("Unable to load linked quotations.");
  return (data || []) as unknown as QuotationListItem[];
}
export function getCustomerQuotations(id: string) {
  return getLinkedQuotations("customer_id", id);
}
export function getEnquiryQuotations(id: string) {
  return getLinkedQuotations("enquiry_id", id);
}
export function getSiteVisitQuotations(id: string) {
  return getLinkedQuotations("site_visit_id", id);
}

export async function getQuotationDashboard(role: AppRole) {
  if (!(["admin", "sales", "accounts"] as AppRole[]).includes(role))
    return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [draft, ready, sent, expiring, approved] = await Promise.all([
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft")
      .eq("is_current", true)
      .is("archived_at", null),
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("status", "ready")
      .eq("is_current", true)
      .is("archived_at", null),
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .eq("is_current", true)
      .is("archived_at", null),
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("validity_date", today)
      .lte("validity_date", soon)
      .eq("is_current", true)
      .is("archived_at", null),
    supabase
      .from("quotations")
      .select("total")
      .eq("status", "approved")
      .eq("is_current", true)
      .is("archived_at", null),
  ]);
  if ([draft, ready, sent, expiring, approved].some((result) => result.error))
    throw new Error("Unable to load quotation metrics.");
  return {
    draft: draft.count || 0,
    ready: ready.count || 0,
    sent: sent.count || 0,
    expiring: expiring.count || 0,
    approvedValue: (approved.data || []).reduce(
      (sum, row) => sum + Number(row.total),
      0,
    ),
  };
}
