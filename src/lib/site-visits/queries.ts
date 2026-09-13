import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/crm/validation";
import { SITE_PHOTO_BUCKET } from "./media.ts";
import type {
  SiteVisitStatus,
  VisitCustomerOption,
  VisitEnquiryOption,
  VisitStaff,
} from "./types.ts";

type Person = { id: string; full_name: string } | null;
type CustomerRelation = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  address?: string | null;
  area?: string | null;
  emirate?: string | null;
} | null;
type EnquiryRelation = {
  id: string;
  enquiry_number: number;
  subject: string | null;
  status?: string;
  product?: { name: string } | null;
} | null;

export type SiteVisitListItem = {
  id: string;
  visit_number: number;
  scheduled_at: string;
  site_address: string;
  area: string | null;
  emirate: string | null;
  status: SiteVisitStatus;
  measurement_summary: string | null;
  follow_up_required: boolean;
  next_action: string | null;
  updated_at: string;
  customer: CustomerRelation;
  enquiry: EnquiryRelation;
  assigned: Person;
};

export type SiteVisitDetail = SiteVisitListItem & {
  customer_id: string;
  enquiry_id: string | null;
  assigned_to: string | null;
  location_url: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  measurement_summary: string | null;
  notes: string | null;
  next_action_at: string | null;
  actual_started_at: string | null;
  completed_at: string | null;
  created_at: string;
  customer: CustomerRelation;
  enquiry: EnquiryRelation;
};

export type SiteMeasurement = {
  id: string;
  label: string;
  width: number | null;
  height: number | null;
  length: number | null;
  unit: string;
  quantity: number;
  notes: string | null;
  sort_order: number;
};
export type SitePhoto = {
  id: string;
  storage_path: string;
  caption: string | null;
  photo_type: string | null;
  mime_type: string | null;
  file_size: number | null;
  sort_order: number;
  created_at: string;
  url: string | null;
};
export type SiteActivity = {
  id: string;
  activity_type: string;
  note: string | null;
  occurred_at: string;
  actor: Person;
};
export type SiteFollowUp = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  status: string;
  assigned: Person;
  completed_at: string | null;
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
function dubaiBounds(date = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return {
    start: new Date(`${day}T00:00:00+04:00`).toISOString(),
    end: new Date(`${day}T23:59:59.999+04:00`).toISOString(),
  };
}

export function siteVisitFilters(
  params: Record<string, string | string[] | undefined>,
) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === "string" ? value : "",
    ]),
  );
}

export async function getSiteTeamDirectory() {
  const supabase = await createClient();
  if (!supabase) return [] as VisitStaff[];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("status", "active")
    .eq("role", "site_team")
    .order("full_name")
    .limit(100);
  if (error) throw new Error(`Unable to load Site Team: ${error.message}`);
  return (data || []) as VisitStaff[];
}

export async function getVisitTaskDirectory() {
  const supabase = await createClient();
  if (!supabase) return [] as VisitStaff[];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("status", "active")
    .in("role", ["admin", "sales", "site_team"])
    .order("full_name")
    .limit(150);
  if (error)
    throw new Error(`Unable to load staff directory: ${error.message}`);
  return (data || []) as VisitStaff[];
}

export async function getSiteVisitCreationOptions() {
  const supabase = await createClient();
  if (!supabase)
    return {
      customers: [] as VisitCustomerOption[],
      enquiries: [] as VisitEnquiryOption[],
      siteStaff: [] as VisitStaff[],
    };
  const [customers, enquiries, siteStaff] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, whatsapp_number, address, area, emirate")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("enquiries")
      .select(
        "id, enquiry_number, customer_id, subject, product:products(name)",
      )
      .is("archived_at", null)
      .not("status", "in", "(approved,lost)")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("status", "active")
      .eq("role", "site_team")
      .order("full_name")
      .limit(100),
  ]);
  if (customers.error || enquiries.error || siteStaff.error)
    throw new Error("Unable to load site visit form options.");
  return {
    customers: (customers.data || []) as VisitCustomerOption[],
    enquiries: (enquiries.data || []) as unknown as VisitEnquiryOption[],
    siteStaff: (siteStaff.data || []) as VisitStaff[],
  };
}

export async function getSiteVisits(filters: Record<string, string>) {
  const supabase = await createClient();
  if (!supabase) return [] as SiteVisitListItem[];
  let query = supabase
    .from("site_visits")
    .select(
      "id, visit_number, scheduled_at, site_address, area, emirate, status, measurement_summary, follow_up_required, next_action, updated_at, customer:customers!site_visits_customer_id_fkey(id, name, phone), enquiry:enquiries!site_visits_enquiry_id_fkey(id, enquiry_number, subject), assigned:profiles!site_visits_assigned_to_fkey(id, full_name)",
    )
    .is("archived_at", null)
    .order("scheduled_at")
    .limit(150);
  const search = cleanSearch(filters.search);
  if (search) {
    const { data: customers, error } = await supabase
      .from("customers")
      .select("id")
      .or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,company_name.ilike.%${search}%`,
      )
      .limit(60);
    if (error)
      throw new Error(`Unable to search visit customers: ${error.message}`);
    const conditions = [
      `site_address.ilike.%${search}%`,
      `area.ilike.%${search}%`,
      `emirate.ilike.%${search}%`,
      `contact_person.ilike.%${search}%`,
    ];
    const reference = /^SV-\d+$/i.test(search)
      ? Number(search.replace(/\D/g, ""))
      : null;
    if (reference) conditions.push(`visit_number.eq.${reference}`);
    if (customers?.length)
      conditions.push(
        `customer_id.in.(${customers.map((item) => item.id).join(",")})`,
      );
    query = query.or(conditions.join(","));
  }
  if (filters.status)
    query = query.eq("status", filters.status as SiteVisitStatus);
  if (filters.assigned)
    query =
      filters.assigned === "unassigned"
        ? query.is("assigned_to", null)
        : query.eq("assigned_to", filters.assigned);
  if (filters.emirate) query = query.eq("emirate", filters.emirate);
  if (filters.date) {
    const bounds = dubaiBounds(new Date(`${filters.date}T12:00:00+04:00`));
    query = query
      .gte("scheduled_at", bounds.start)
      .lte("scheduled_at", bounds.end);
  }
  const now = new Date().toISOString();
  const today = dubaiBounds();
  if (filters.window === "today")
    query = query
      .gte("scheduled_at", today.start)
      .lte("scheduled_at", today.end);
  if (filters.window === "upcoming")
    query = query
      .gt("scheduled_at", today.end)
      .not("status", "in", "(completed,cancelled,no_show)");
  if (filters.window === "overdue")
    query = query
      .lt("scheduled_at", now)
      .not("status", "in", "(completed,cancelled,no_show)");
  if (filters.window === "active")
    query = query.in("status", ["confirmed", "in_progress"]);
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load site visits: ${error.message}`);
  return (data || []) as unknown as SiteVisitListItem[];
}

export async function getSiteVisit(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("site_visits")
    .select(
      "id, visit_number, customer_id, enquiry_id, assigned_to, scheduled_at, site_address, area, emirate, location_url, contact_person, contact_phone, status, measurement_summary, notes, follow_up_required, next_action, next_action_at, actual_started_at, completed_at, created_at, updated_at, customer:customers!site_visits_customer_id_fkey(id, name, phone, whatsapp_number, email, address, area, emirate), enquiry:enquiries!site_visits_enquiry_id_fkey(id, enquiry_number, subject, status, product:products(name)), assigned:profiles!site_visits_assigned_to_fkey(id, full_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load site visit: ${error.message}`);
  return data as unknown as SiteVisitDetail | null;
}

export async function getSiteVisitWorkspace(id: string) {
  if (!isUuid(id))
    return {
      measurements: [] as SiteMeasurement[],
      photos: [] as SitePhoto[],
      timeline: [] as SiteActivity[],
      followUps: [] as SiteFollowUp[],
    };
  const supabase = await createClient();
  if (!supabase)
    return {
      measurements: [] as SiteMeasurement[],
      photos: [] as SitePhoto[],
      timeline: [] as SiteActivity[],
      followUps: [] as SiteFollowUp[],
    };
  const [measurements, photos, timeline, followUps] = await Promise.all([
    supabase
      .from("site_visit_measurements")
      .select(
        "id, label, width, height, length, unit, quantity, notes, sort_order",
      )
      .eq("site_visit_id", id)
      .order("sort_order")
      .order("created_at")
      .limit(100),
    supabase
      .from("site_visit_photos")
      .select(
        "id, storage_path, caption, photo_type, mime_type, file_size, sort_order, created_at",
      )
      .eq("site_visit_id", id)
      .order("sort_order")
      .order("created_at")
      .limit(24),
    supabase
      .from("site_visit_activities")
      .select(
        "id, activity_type, note, occurred_at, actor:profiles!site_visit_activities_created_by_fkey(id, full_name)",
      )
      .eq("site_visit_id", id)
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase
      .from("tasks")
      .select(
        "id, title, description, due_at, status, completed_at, assigned:profiles!tasks_assigned_to_fkey(id, full_name)",
      )
      .eq("site_visit_id", id)
      .eq("kind", "site_visit_follow_up")
      .is("archived_at", null)
      .order("due_at", { ascending: false })
      .limit(50),
  ]);
  if (measurements.error || photos.error || timeline.error || followUps.error)
    throw new Error("Unable to load the site visit workspace.");
  const photoRows = (photos.data || []) as Omit<SitePhoto, "url">[];
  const signed = await Promise.all(
    photoRows.map(async (photo) => {
      const result = await supabase.storage
        .from(SITE_PHOTO_BUCKET)
        .createSignedUrl(photo.storage_path, 600, {
          transform: {
            width: 960,
            height: 720,
            resize: "contain",
            quality: 80,
          },
        });
      return { ...photo, url: result.data?.signedUrl || null };
    }),
  );
  return {
    measurements: (measurements.data || []) as SiteMeasurement[],
    photos: signed,
    timeline: (timeline.data || []) as unknown as SiteActivity[],
    followUps: (followUps.data || []) as unknown as SiteFollowUp[],
  };
}

async function getLinkedVisits(
  column: "customer_id" | "enquiry_id",
  id: string,
) {
  if (!isUuid(id)) return [] as SiteVisitListItem[];
  const supabase = await createClient();
  if (!supabase) return [] as SiteVisitListItem[];
  const { data, error } = await supabase
    .from("site_visits")
    .select(
      "id, visit_number, scheduled_at, site_address, area, emirate, status, measurement_summary, follow_up_required, next_action, updated_at, customer:customers!site_visits_customer_id_fkey(id, name, phone), enquiry:enquiries!site_visits_enquiry_id_fkey(id, enquiry_number, subject), assigned:profiles!site_visits_assigned_to_fkey(id, full_name)",
    )
    .eq(column, id)
    .is("archived_at", null)
    .order("scheduled_at", { ascending: false })
    .limit(20);
  if (error) throw new Error("Unable to load linked site visits.");
  return (data || []) as unknown as SiteVisitListItem[];
}
export function getCustomerSiteVisits(id: string) {
  return getLinkedVisits("customer_id", id);
}
export function getEnquirySiteVisits(id: string) {
  return getLinkedVisits("enquiry_id", id);
}

export async function getSiteVisitDashboard() {
  const supabase = await createClient();
  if (!supabase)
    return {
      today: 0,
      upcoming: 0,
      awaiting: 0,
      todayVisits: [] as SiteVisitListItem[],
    };
  const bounds = dubaiBounds();
  const [today, upcoming, awaiting, todayVisits] = await Promise.all([
    supabase
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_at", bounds.start)
      .lte("scheduled_at", bounds.end)
      .is("archived_at", null)
      .not("status", "in", "(cancelled,no_show)"),
    supabase
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .gt("scheduled_at", bounds.end)
      .is("archived_at", null)
      .not("status", "in", "(completed,cancelled,no_show)"),
    supabase
      .from("site_visits")
      .select("id", { count: "exact", head: true })
      .in("status", ["confirmed", "in_progress"])
      .is("archived_at", null),
    getSiteVisits({ window: "today" }),
  ]);
  if (today.error || upcoming.error || awaiting.error)
    throw new Error("Unable to load site visit metrics.");
  return {
    today: today.count || 0,
    upcoming: upcoming.count || 0,
    awaiting: awaiting.count || 0,
    todayVisits: todayVisits.slice(0, 8),
  };
}
