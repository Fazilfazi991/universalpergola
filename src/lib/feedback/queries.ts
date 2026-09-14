import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/crm/validation";
import type { FeedbackStatus } from "./types";

type Person = { id: string; full_name: string } | null;
type FeedbackProject = {
  id: string;
  project_number: string;
  customer_id: string;
  status: string;
  customer: { id: string; name: string } | null;
} | null;

export type FeedbackRecord = {
  id: string;
  project_id: string;
  status: FeedbackStatus;
  customer_rating: number | null;
  customer_comments: string | null;
  source: string | null;
  permission_to_publish_testimonial: boolean;
  internal_notes: string | null;
  requested_at: string | null;
  requested_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  archived_at: string | null;
  token_expires_at: string | null;
  token_revoked_at: string | null;
  public_token: string;
  created_at: string;
  updated_at: string;
  project: FeedbackProject;
  requester: Person;
  reviewer: Person;
};

const selection = "id, project_id, status, customer_rating, customer_comments, source, permission_to_publish_testimonial, internal_notes, requested_at, requested_by, submitted_at, reviewed_at, archived_at, token_expires_at, token_revoked_at, public_token, created_at, updated_at, project:projects!feedback_project_id_fkey(id, project_number, customer_id, status, customer:customers!projects_customer_id_fkey(id, name)), requester:profiles!feedback_requested_by_fkey(id, full_name), reviewer:profiles!feedback_reviewed_by_fkey(id, full_name)";

export async function getFeedbackQueue(status?: string) {
  const supabase = await createClient();
  if (!supabase) return [] as FeedbackRecord[];
  let query = supabase.from("feedback").select(selection).order("updated_at", { ascending: false }).limit(150);
  if (["not_requested", "requested", "received", "reviewed", "archived"].includes(status || "")) {
    query = query.eq("status", status as FeedbackStatus);
  } else {
    query = query.neq("status", "archived");
  }
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load feedback: ${error.message}`);
  return (data || []) as unknown as FeedbackRecord[];
}

export async function getProjectFeedback(projectId: string) {
  if (!isUuid(projectId)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("feedback").select(selection).eq("project_id", projectId).maybeSingle();
  if (error) throw new Error(`Unable to load project feedback: ${error.message}`);
  return data as unknown as FeedbackRecord | null;
}

export async function getCustomerFeedback(customerId: string) {
  if (!isUuid(customerId)) return [] as FeedbackRecord[];
  const supabase = await createClient();
  if (!supabase) return [] as FeedbackRecord[];
  const customerSelection = selection.replace("projects!feedback_project_id_fkey(", "projects!feedback_project_id_fkey!inner(");
  const { data, error } = await supabase.from("feedback").select(customerSelection)
    .eq("project.customer_id", customerId).neq("status", "archived")
    .order("updated_at", { ascending: false }).limit(20);
  if (error) throw new Error(`Unable to load customer feedback: ${error.message}`);
  return (data || []) as unknown as FeedbackRecord[];
}

export async function getCompletedProjectsForFeedback() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("projects")
    .select("id, project_number, customer:customers!projects_customer_id_fkey(name), feedback(id, status)")
    .eq("status", "completed").is("archived_at", null).order("completed_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Unable to load completed projects: ${error.message}`);
  return data || [];
}

export async function getFeedbackDashboard() {
  const supabase = await createClient();
  if (!supabase) return { awaitingReview: 0 };
  const { count, error } = await supabase.from("feedback").select("id", { count: "exact", head: true }).eq("status", "received");
  if (error) throw new Error(`Unable to load feedback summary: ${error.message}`);
  return { awaitingReview: count || 0 };
}

export async function getPublicFeedbackContext(token: string) {
  if (!isUuid(token)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_public_feedback_context", { p_token: token });
  if (error || !data?.length) return null;
  return data[0];
}
