import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { EnquiryStatus, LeadPriority, StaffSummary } from "@/lib/crm/types";
import { isUuid } from "@/lib/crm/validation";

type AssignedRelation = { id: string; full_name: string } | null;

export type CustomerListItem = {
  id: string; name: string; phone: string | null; whatsapp_number: string | null; email: string | null;
  company_name: string | null; area: string | null; emirate: string | null; source: string | null;
  archived_at: string | null; updated_at: string; assigned: AssignedRelation;
  activeEnquiries: number; nextFollowUp: string | null; lastActivity: string;
};

export type EnquiryListItem = {
  id: string; enquiry_number: number; subject: string | null; source: string | null; lead_source: string | null;
  status: EnquiryStatus; priority: LeadPriority; follow_up_at: string | null; next_action: string | null;
  created_at: string; updated_at: string; customer: { id: string; name: string; phone: string | null } | null;
  product: { id: string; name: string } | null; assigned: AssignedRelation; lastActivity: string | null;
};

export type CustomerDetail = {
  id: string; name: string; phone: string | null; whatsapp_number: string | null; email: string | null;
  company_name: string | null; customer_type: "individual" | "company"; address: string | null;
  area: string | null; emirate: string | null; notes: string | null; source: string | null;
  assigned_to: string | null; assigned: AssignedRelation; archived_at: string | null;
  created_at: string; updated_at: string;
};

export type EnquiryDetail = Omit<EnquiryListItem, "lastActivity" | "customer"> & {
  customer_id: string | null; product_id: string | null; enquiry_type: "catalogue" | "general" | "manual";
  message: string | null; assigned_to: string | null; internal_notes: string | null; archived_at: string | null;
  referred_by: string | null; lead_source_detail: string | null;
  customer: { id: string; name: string; phone: string | null; whatsapp_number: string | null; email: string | null; company_name: string | null } | null;
};

export type TimelineItem = {
  id: string; activity_type: string; note: string | null; occurred_at: string;
  next_action_at: string | null; created_by: string | null; actor: AssignedRelation;
};

export type FollowUpItem = {
  id: string; title: string; description: string | null; due_at: string | null;
  status: "open" | "in_progress" | "blocked" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent"; assigned_to: string | null;
  assigned: AssignedRelation; completed_at: string | null;
};

function cleanSearch(value?: string) {
  return value?.trim().slice(0, 100).replace(/[^\p{L}\p{N}@+._\s-]/gu, " ").replace(/\s+/g, " ") || "";
}

function simple(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export function crmFilters(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, simple(value)]));
}

export async function getStaffDirectory() {
  const supabase = await createClient();
  if (!supabase) return [] as StaffSummary[];
  const { data, error } = await supabase.from("profiles").select("id, full_name, role")
    .eq("status", "active").in("role", ["admin", "sales"]).order("full_name").limit(100);
  if (error) throw new Error(`Unable to load staff: ${error.message}`);
  return (data || []) as StaffSummary[];
}

export async function getCustomerOptions() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("customers")
    .select("id, name, phone, whatsapp_number, email, company_name")
    .is("archived_at", null).order("updated_at", { ascending: false }).limit(150);
  if (error) throw new Error(`Unable to load customers: ${error.message}`);
  return data || [];
}

export async function getCrmProductOptions() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("products").select("id, name, product_code")
    .is("archived_at", null).order("name").limit(150);
  if (error) throw new Error(`Unable to load products: ${error.message}`);
  return data || [];
}

export async function getCustomers(filters: Record<string, string>) {
  const supabase = await createClient();
  if (!supabase) return [] as CustomerListItem[];
  let query = supabase.from("customers")
    .select("id, name, phone, whatsapp_number, email, company_name, area, emirate, source, archived_at, updated_at, assigned:profiles!customers_assigned_to_fkey(id, full_name)")
    .order("updated_at", { ascending: false }).limit(100);
  const search = cleanSearch(filters.search);
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
  if (filters.assigned) query = filters.assigned === "unassigned" ? query.is("assigned_to", null) : query.eq("assigned_to", filters.assigned);
  if (filters.emirate) query = query.eq("emirate", filters.emirate);
  if (filters.source) query = query.eq("source", filters.source);
  query = filters.state === "archived" ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load customers: ${error.message}`);
  const rows = (data || []) as unknown as Omit<CustomerListItem, "activeEnquiries" | "nextFollowUp">[];
  const ids = rows.map((row) => row.id);
  if (!ids.length) return [];
  const { data: enquiries, error: enquiryError } = await supabase.from("enquiries")
    .select("customer_id, status, follow_up_at, updated_at").in("customer_id", ids).is("archived_at", null);
  if (enquiryError) throw new Error(`Unable to load customer enquiry totals: ${enquiryError.message}`);
  const metrics = new Map<string, { active: number; nextFollowUp: string | null; lastActivity: string }>();
  for (const row of rows) metrics.set(row.id, { active: 0, nextFollowUp: null, lastActivity: row.updated_at });
  for (const enquiry of enquiries || []) {
    if (!enquiry.customer_id) continue;
    const current = metrics.get(enquiry.customer_id);
    if (!current) continue;
    if (!["approved", "lost"].includes(enquiry.status)) current.active += 1;
    if (enquiry.follow_up_at && (!current.nextFollowUp || enquiry.follow_up_at < current.nextFollowUp)) current.nextFollowUp = enquiry.follow_up_at;
    if (enquiry.updated_at > current.lastActivity) current.lastActivity = enquiry.updated_at;
  }
  return rows.map((row) => {
    const metric = metrics.get(row.id)!;
    return { ...row, activeEnquiries: metric.active, nextFollowUp: metric.nextFollowUp, lastActivity: metric.lastActivity };
  });
}

export async function getCustomer(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("customers")
    .select("id, name, phone, whatsapp_number, email, company_name, customer_type, address, area, emirate, notes, source, assigned_to, archived_at, created_at, updated_at, assigned:profiles!customers_assigned_to_fkey(id, full_name)")
    .eq("id", id).maybeSingle();
  if (error) throw new Error(`Unable to load customer: ${error.message}`);
  return data as unknown as CustomerDetail | null;
}

export async function getCustomerWorkspace(id: string) {
  if (!isUuid(id)) return { enquiries: [] as EnquiryListItem[], followUps: [] as FollowUpItem[], activity: [] as { id: string; event_type: string; created_at: string; actor: AssignedRelation }[] };
  const supabase = await createClient();
  if (!supabase) return { enquiries: [] as EnquiryListItem[], followUps: [] as FollowUpItem[], activity: [] as { id: string; event_type: string; created_at: string; actor: AssignedRelation }[] };
  const [enquiryResult, followUpResult, activityResult] = await Promise.all([
    supabase.from("enquiries")
      .select("id, enquiry_number, subject, source, status, priority, follow_up_at, next_action, created_at, updated_at, customer:customers(id, name, phone), product:products(id, name), assigned:profiles!enquiries_assigned_to_fkey(id, full_name)")
      .eq("customer_id", id).is("archived_at", null).order("created_at", { ascending: false }).limit(50),
    supabase.from("tasks")
      .select("id, title, description, due_at, status, priority, assigned_to, completed_at, assigned:profiles!tasks_assigned_to_fkey(id, full_name)")
      .eq("customer_id", id).eq("kind", "enquiry_follow_up").is("archived_at", null).order("due_at", { ascending: false }).limit(50),
    supabase.from("activity_logs")
      .select("id, event_type, created_at, actor:profiles!activity_logs_actor_id_fkey(id, full_name)")
      .eq("entity_type", "customers").eq("entity_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (enquiryResult.error) throw new Error(`Unable to load customer enquiries: ${enquiryResult.error.message}`);
  if (followUpResult.error) throw new Error(`Unable to load customer follow-ups: ${followUpResult.error.message}`);
  if (activityResult.error) throw new Error(`Unable to load customer activity: ${activityResult.error.message}`);
  return {
    enquiries: (enquiryResult.data || []).map((row) => ({ ...row, lastActivity: null })) as unknown as EnquiryListItem[],
    followUps: (followUpResult.data || []) as unknown as FollowUpItem[],
    activity: (activityResult.data || []) as unknown as { id: string; event_type: string; created_at: string; actor: AssignedRelation }[],
  };
}

export async function getEnquiries(filters: Record<string, string>) {
  const supabase = await createClient();
  if (!supabase) return [] as EnquiryListItem[];
  let query = supabase.from("enquiries")
    .select("id, enquiry_number, subject, source, lead_source, status, priority, follow_up_at, next_action, created_at, updated_at, customer:customers(id, name, phone), product:products(id, name), assigned:profiles!enquiries_assigned_to_fkey(id, full_name)")
    .is("archived_at", null).order("updated_at", { ascending: false }).limit(100);
  const search = cleanSearch(filters.search);
  if (search) {
    const { data: matchingCustomers, error: customerSearchError } = await supabase.from("customers")
      .select("id").or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`).limit(50);
    if (customerSearchError) throw new Error(`Unable to search enquiry customers: ${customerSearchError.message}`);
    const conditions = [`subject.ilike.%${search}%`, `message.ilike.%${search}%`];
    const reference = /^ENQ-\d+$/i.test(search) ? Number(search.replace(/\D/g, "")) : null;
    if (reference) conditions.push(`enquiry_number.eq.${reference}`);
    const customerIds = (matchingCustomers || []).map((customer) => customer.id);
    if (customerIds.length) conditions.push(`customer_id.in.(${customerIds.join(",")})`);
    query = query.or(conditions.join(","));
  }
  if (filters.status) query = query.eq("status", filters.status as EnquiryStatus);
  if (filters.priority) query = query.eq("priority", filters.priority as LeadPriority);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.assigned) query = filters.assigned === "unassigned" ? query.is("assigned_to", null) : query.eq("assigned_to", filters.assigned);
  if (filters.followUp === "due") query = query.lte("follow_up_at", new Date().toISOString()).not("status", "in", "(approved,lost)");
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00+04:00`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59+04:00`);
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load enquiries: ${error.message}`);
  const rows = (data || []) as unknown as Omit<EnquiryListItem, "lastActivity">[];
  const ids = rows.map((row) => row.id);
  if (!ids.length) return [];
  const { data: activity, error: activityError } = await supabase.from("enquiry_activities")
    .select("enquiry_id, occurred_at").in("enquiry_id", ids).order("occurred_at", { ascending: false }).limit(500);
  if (activityError) throw new Error(`Unable to load enquiry activity: ${activityError.message}`);
  const latest = new Map<string, string>();
  for (const item of activity || []) if (!latest.has(item.enquiry_id)) latest.set(item.enquiry_id, item.occurred_at);
  return rows.map((row) => ({ ...row, lastActivity: latest.get(row.id) || null }));
}

export async function getEnquiry(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("enquiries")
    .select("id, enquiry_number, customer_id, product_id, enquiry_type, subject, message, source, lead_source, referred_by, lead_source_detail, priority, status, assigned_to, follow_up_at, next_action, internal_notes, created_at, updated_at, archived_at, customer:customers(id, name, phone, whatsapp_number, email, company_name), product:products(id, name), assigned:profiles!enquiries_assigned_to_fkey(id, full_name)")
    .eq("id", id).maybeSingle();
  if (error) throw new Error(`Unable to load enquiry: ${error.message}`);
  return data as unknown as EnquiryDetail | null;
}

export async function getEnquiryWorkspace(id: string) {
  if (!isUuid(id)) return { timeline: [] as TimelineItem[], followUps: [] as FollowUpItem[] };
  const supabase = await createClient();
  if (!supabase) return { timeline: [] as TimelineItem[], followUps: [] as FollowUpItem[] };
  const [timelineResult, followUpResult] = await Promise.all([
    supabase.from("enquiry_activities")
      .select("id, activity_type, note, occurred_at, next_action_at, created_by, actor:profiles!enquiry_activities_created_by_fkey(id, full_name)")
      .eq("enquiry_id", id).order("occurred_at", { ascending: false }).limit(100),
    supabase.from("tasks")
      .select("id, title, description, due_at, status, priority, assigned_to, completed_at, assigned:profiles!tasks_assigned_to_fkey(id, full_name)")
      .eq("enquiry_id", id).eq("kind", "enquiry_follow_up").is("archived_at", null).order("due_at", { ascending: false }).limit(50),
  ]);
  if (timelineResult.error) throw new Error(`Unable to load enquiry timeline: ${timelineResult.error.message}`);
  if (followUpResult.error) throw new Error(`Unable to load follow-ups: ${followUpResult.error.message}`);
  return { timeline: (timelineResult.data || []) as unknown as TimelineItem[], followUps: (followUpResult.data || []) as unknown as FollowUpItem[] };
}

function dubaiDayBounds() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return { start: new Date(`${date}T00:00:00+04:00`).toISOString(), end: new Date(`${date}T23:59:59.999+04:00`).toISOString() };
}

export async function getCrmDashboard() {
  const supabase = await createClient();
  if (!supabase) return { newEnquiries: 0, dueToday: 0, overdue: 0, unassigned: 0, priorityLeads: 0, needsAttention: [] as EnquiryListItem[], reminderAttention: [] as {id:string; title:string; due_at:string|null; reminder_type:string|null; enquiry_id:string|null; customer_id:string|null; project_id:string|null; bucket:"overdue"|"today"|"upcoming"}[], noFollowUp: [] as EnquiryListItem[] };
  const { end } = dubaiDayBounds();
  const now = new Date().toISOString();
  const [newResult, dueResult, overdueResult, unassignedResult, priorityResult, attention, reminderResult] = await Promise.all([
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new").is("archived_at", null),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("kind", "enquiry_follow_up").in("status", ["open", "in_progress"]).gte("due_at", now).lte("due_at", end).is("archived_at", null),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("kind", "enquiry_follow_up").in("status", ["open", "in_progress"]).lt("due_at", now).is("archived_at", null),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).is("assigned_to", null).is("archived_at", null).not("status", "in", "(approved,lost)"),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).in("priority", ["high", "urgent"]).is("archived_at", null).not("status", "in", "(approved,lost)"),
    getEnquiries({}),
    supabase.from("tasks").select("id, title, due_at, reminder_type, enquiry_id, customer_id, project_id").in("status", ["open", "in_progress", "blocked"]).not("due_at", "is", null).is("archived_at", null).order("due_at", {ascending:true}).limit(100),
  ]);
  for (const result of [newResult, dueResult, overdueResult, unassignedResult, priorityResult]) if (result.error) throw new Error(`Unable to load dashboard metrics: ${result.error.message}`);
  const needsAttention = attention.filter((item) => item.status === "new" || !item.assigned || ["high", "urgent"].includes(item.priority) || (item.follow_up_at && item.follow_up_at < new Date().toISOString())).slice(0, 8);
  if (reminderResult.error) throw new Error(`Unable to load reminder attention: ${reminderResult.error.message}`);
  const activeEnquiries = attention.filter((item) => !["approved", "lost"].includes(item.status));
  const futureEnquiryIds = new Set((reminderResult.data || []).filter((task) => task.enquiry_id && task.due_at && task.due_at >= now).map((task) => task.enquiry_id));
  const noFollowUp = activeEnquiries.filter((item) => !futureEnquiryIds.has(item.id)).slice(0, 8);
  const reminderAttention = (reminderResult.data || []).map((task) => ({ ...task, bucket: task.due_at! < now ? "overdue" as const : task.due_at! <= end ? "today" as const : "upcoming" as const })).slice(0, 12);
  return { newEnquiries: newResult.count || 0, dueToday: dueResult.count || 0, overdue: overdueResult.count || 0, unassigned: unassignedResult.count || 0, priorityLeads: priorityResult.count || 0, needsAttention, reminderAttention, noFollowUp };
}
