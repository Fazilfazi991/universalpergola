import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-mode-server";
import { DEMO_PROJECTS, DEMO_STAFF, DEMO_TASKS } from "@/lib/demo/data";
import { isUuid } from "@/lib/crm/validation";
import type { AppRole } from "@/lib/auth/permissions";
import type {
  HandoverStatus,
  ProjectAssignmentRole,
  ProjectPriority,
  ProjectStatus,
  ProjectUpdateType,
  StageStatus,
  TaskPriority,
  TaskStatus,
} from "./types";

type Person = { id: string; full_name: string; role?: AppRole } | null;
type Customer = { id: string; name: string; phone: string | null } | null;
type CurrentStage = { id: string; stage_key: string; name: string; status: StageStatus } | null;
export type ProjectListItem = {
  id: string;
  project_number: string;
  customer_id: string;
  project_value: number;
  currency: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  start_date: string | null;
  expected_completion_date: string | null;
  installation_date: string | null;
  project_owner_id: string | null;
  handover_status: HandoverStatus;
  updated_at: string;
  customer: Customer;
  current_stage: CurrentStage;
  owner: Person;
  salesperson: Person;
  assignments: { assignment_role: ProjectAssignmentRole; user: Person }[];
};
export type ProjectDetail = ProjectListItem & {
  quotation_id: string | null;
  enquiry_id: string | null;
  site_visit_id: string | null;
  site_address: string | null;
  project_owner_id: string | null;
  assigned_salesperson: string | null;
  summary: string | null;
  notes: string | null;
  actual_completion_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
  handover_date: string | null;
  handover_status: HandoverStatus;
  handover_notes: string | null;
  handover_contact: string | null;
  handover_confirmed_at: string | null;
  source_quotation_number: string | null;
  source_quotation_revision: number | null;
  created_at: string;
  quotation: { id: string; quotation_number: string; revision_number: number; total: number; currency: string; approved_at: string | null } | null;
  enquiry: { id: string; enquiry_number: number; subject: string | null } | null;
  site_visit: { id: string; visit_number: number; site_address: string; status: string } | null;
  completer: Person;
};
export type ProjectStage = {
  id: string;
  template_id: string | null;
  stage_key: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: StageStatus;
  progress: number;
  weight: number;
  is_terminal: boolean;
  target_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  assigned_to: string | null;
  assigned: Person;
};
export type ProjectAssignment = {
  id: string;
  user_id: string;
  assignment_role: ProjectAssignmentRole;
  created_at: string;
  user: Person;
};
export type ProjectTask = {
  id: string;
  project_stage_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  completed_by: string | null;
  completion_checklist_key: string | null;
  completion_note: string | null;
  created_at: string;
  assigned: Person;
  completer: Person;
  stage: { id: string; name: string } | null;
};
export type ProjectUpdate = {
  id: string;
  stage_id: string | null;
  update_type: ProjectUpdateType;
  progress: number | null;
  note: string;
  created_at: string;
  author: Person;
  stage: { id: string; name: string } | null;
};
export type ProjectFile = {
  id: string;
  stage_id: string | null;
  file_type: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  caption: string | null;
  created_at: string;
  uploader: Person;
  stage: { id: string; name: string } | null;
};
export type ProjectActivity = {
  id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: Person;
};
export type StageTemplate = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  default_weight: number;
  is_terminal: boolean;
};
export type ProjectStaff = { id: string; full_name: string; role: AppRole };

const listSelection = "id, project_number, customer_id, project_value, currency, status, priority, progress, start_date, expected_completion_date, installation_date, project_owner_id, handover_status, updated_at, customer:customers!projects_customer_id_fkey(id, name, phone), current_stage:project_stages!projects_current_stage_id_fkey(id, stage_key, name, status), owner:profiles!projects_project_owner_id_fkey(id, full_name), salesperson:profiles!projects_assigned_salesperson_fkey(id, full_name), assignments:project_assignments(assignment_role, user:profiles!project_assignments_user_id_fkey(id, full_name))";

function cleanSearch(value?: string) {
  return value?.trim().slice(0, 100).replace(/[^\p{L}\p{N}@+._\s-]/gu, " ").replace(/\s+/g, " ") || "";
}
export function projectFilters(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === "string" ? value : ""]));
}

export async function getProjects(filters: Record<string, string>) {
  if (isDemoMode()) {
    const search = filters.search?.toLowerCase() || "";
    return DEMO_PROJECTS.filter((project) => (!search || [project.project_number, project.customer?.name].some((value) => value?.toLowerCase().includes(search))) && (!filters.status || project.status === filters.status) && (!filters.stage || project.current_stage?.stage_key === filters.stage)) as unknown as ProjectListItem[];
  }
  const supabase = await createClient();
  if (!supabase) return [] as ProjectListItem[];
  let query = supabase.from("projects").select(listSelection).is("archived_at", null).order("updated_at", { ascending: false }).limit(150);
  const search = cleanSearch(filters.search);
  if (search) {
    const { data: customers, error } = await supabase.from("customers").select("id").or(`name.ilike.%${search}%,phone.ilike.%${search}%,company_name.ilike.%${search}%`).limit(60);
    if (error) throw new Error(`Unable to search project customers: ${error.message}`);
    const conditions = [`project_number.ilike.%${search}%`, `site_address.ilike.%${search}%`];
    if (customers?.length) conditions.push(`customer_id.in.(${customers.map((item) => item.id).join(",")})`);
    query = query.or(conditions.join(","));
  }
  if (filters.status) query = query.eq("status", filters.status as ProjectStatus);
  if (filters.customer) query = query.eq("customer_id", filters.customer);
  if (filters.salesperson) query = query.eq("assigned_salesperson", filters.salesperson);
  if (filters.from) query = query.gte("start_date", filters.from);
  if (filters.to) query = query.lte("start_date", filters.to);
  const today = new Date().toISOString().slice(0, 10);
  if (filters.due === "overdue") query = query.lt("expected_completion_date", today).not("status", "in", "(completed,cancelled)");
  if (filters.due === "due") query = query.gte("expected_completion_date", today).not("status", "in", "(completed,cancelled)");
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load projects: ${error.message}`);
  let rows = (data || []) as unknown as ProjectListItem[];
  if (filters.stage) rows = rows.filter((row) => row.current_stage?.stage_key === filters.stage);
  if (filters.assigned) rows = rows.filter((row) => row.project_owner_id === filters.assigned || row.assignments.some((assignment) => assignment.user?.id === filters.assigned));
  return rows;
}

export async function getProject(id: string) {
  if (isDemoMode()) return (DEMO_PROJECTS.find((project) => project.id === id) || null) as unknown as ProjectDetail | null;
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("projects").select(`${listSelection}, quotation_id, enquiry_id, site_visit_id, site_address, project_owner_id, assigned_salesperson, summary, notes, actual_completion_date, completed_at, completed_by, completion_note, handover_date, handover_status, handover_notes, handover_contact, handover_confirmed_at, source_quotation_number, source_quotation_revision, created_at, quotation:quotations!projects_quotation_id_fkey(id, quotation_number, revision_number, total, currency, approved_at), enquiry:enquiries!projects_enquiry_id_fkey(id, enquiry_number, subject), site_visit:site_visits!projects_site_visit_id_fkey(id, visit_number, site_address, status), completer:profiles!projects_completed_by_fkey(id, full_name)`).eq("id", id).maybeSingle();
  if (error) throw new Error(`Unable to load project: ${error.message}`);
  return data as unknown as ProjectDetail | null;
}

export async function getProjectWorkspace(id: string) {
  if (isDemoMode()) {
    const project = DEMO_PROJECTS.find((item) => item.id === id);
    if (!project) return { stages: [], assignments: [], tasks: [], updates: [], files: [], timeline: [] };
    return { stages: [project.current_stage].filter(Boolean).map((stage) => ({ id: stage!.id, template_id: null, stage_key: stage!.stage_key, name: stage!.name, description: "Synthetic project stage", sort_order: 1, status: stage!.status, progress: project.progress, weight: 1, is_terminal: stage!.status === "completed", target_date: project.expected_completion_date, started_at: project.created_at, completed_at: stage!.status === "completed" ? project.updated_at : null, notes: null, assigned_to: DEMO_STAFF[2].id, assigned: { id: DEMO_STAFF[2].id, full_name: DEMO_STAFF[2].full_name } })) as never[], assignments: [{ id: `assignment-${id}`, user_id: DEMO_STAFF[2].id, assignment_role: "site_team", created_at: project.created_at, user: { id: DEMO_STAFF[2].id, full_name: DEMO_STAFF[2].full_name, role: DEMO_STAFF[2].role } }] as never[], tasks: DEMO_TASKS.filter((task) => task.project_id === id).map((task) => ({ ...task, project_stage_id: project.current_stage?.id || null, completed_by: null, completion_checklist_key: null, completion_note: null, completer: null, stage: project.current_stage ? { id: project.current_stage.id, name: project.current_stage.name } : null })) as never[], updates: [{ id: `update-${id}`, stage_id: project.current_stage?.id || null, update_type: "progress", progress: project.progress, note: "Demo progress update", created_at: project.updated_at, author: { id: DEMO_STAFF[2].id, full_name: DEMO_STAFF[2].full_name }, stage: project.current_stage ? { id: project.current_stage.id, name: project.current_stage.name } : null }] as never[], files: [], timeline: [] };
  }
  if (!isUuid(id)) return { stages: [] as ProjectStage[], assignments: [] as ProjectAssignment[], tasks: [] as ProjectTask[], updates: [] as ProjectUpdate[], files: [] as ProjectFile[], timeline: [] as ProjectActivity[] };
  const supabase = await createClient();
  if (!supabase) return { stages: [] as ProjectStage[], assignments: [] as ProjectAssignment[], tasks: [] as ProjectTask[], updates: [] as ProjectUpdate[], files: [] as ProjectFile[], timeline: [] as ProjectActivity[] };
  const [stages, assignments, tasks, updates, files, timeline] = await Promise.all([
    supabase.from("project_stages").select("id, template_id, stage_key, name, description, sort_order, status, progress, weight, is_terminal, target_date, started_at, completed_at, notes, assigned_to, assigned:profiles!project_stages_assigned_to_fkey(id, full_name)").eq("project_id", id).order("sort_order").limit(50),
    supabase.from("project_assignments").select("id, user_id, assignment_role, created_at, user:profiles!project_assignments_user_id_fkey(id, full_name, role)").eq("project_id", id).order("created_at").limit(100),
    supabase.from("tasks").select("id, project_stage_id, title, description, assigned_to, due_at, priority, status, completed_at, completed_by, completion_checklist_key, completion_note, created_at, assigned:profiles!tasks_assigned_to_fkey(id, full_name), completer:profiles!tasks_completed_by_fkey(id, full_name), stage:project_stages!tasks_project_stage_id_fkey(id, name)").eq("project_id", id).eq("kind", "project_task").is("archived_at", null).order("due_at", { ascending: true, nullsFirst: false }).limit(100),
    supabase.from("project_updates").select("id, stage_id, update_type, progress, note, created_at, author:profiles!project_updates_created_by_fkey(id, full_name), stage:project_stages!project_updates_stage_id_fkey(id, name)").eq("project_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("project_files").select("id, stage_id, file_type, file_name, storage_path, mime_type, file_size, caption, created_at, uploader:profiles!project_files_created_by_fkey(id, full_name), stage:project_stages!project_files_stage_id_fkey(id, name)").eq("project_id", id).eq("upload_status", "ready").order("created_at", { ascending: false }).limit(60),
    supabase.from("activity_logs").select("id, event_type, metadata, created_at, actor:profiles!activity_logs_actor_id_fkey(id, full_name)").eq("entity_type", "projects").eq("entity_id", id).order("created_at", { ascending: false }).limit(150),
  ]);
  if ([stages, assignments, tasks, updates, files, timeline].some((result) => result.error)) throw new Error("Unable to load the project workspace.");
  return {
    stages: (stages.data || []) as unknown as ProjectStage[],
    assignments: (assignments.data || []) as unknown as ProjectAssignment[],
    tasks: (tasks.data || []) as unknown as ProjectTask[],
    updates: (updates.data || []) as unknown as ProjectUpdate[],
    files: (files.data || []) as unknown as ProjectFile[],
    timeline: (timeline.data || []) as unknown as ProjectActivity[],
  };
}

export async function getProjectOptions() {
  if (isDemoMode()) return { customers: DEMO_PROJECTS.map((project) => ({ id: project.customer_id, name: project.customer?.name || "Customer" })), staff: DEMO_STAFF as never[], templates: DEMO_PROJECTS.map((project) => ({ id: `template-${project.id}`, key: project.current_stage?.stage_key || "planning", name: project.current_stage?.name || "Planning", description: "Synthetic workflow stage", sort_order: 1, is_active: true, default_weight: 1, is_terminal: project.status === "completed" })) as never[] };
  const supabase = await createClient();
  if (!supabase) return { customers: [], staff: [] as ProjectStaff[], templates: [] as StageTemplate[] };
  const [customers, staff, templates] = await Promise.all([
    supabase.from("customers").select("id, name").is("archived_at", null).order("name").limit(250),
    supabase.from("profiles").select("id, full_name, role").eq("status", "active").order("full_name").limit(200),
    supabase.from("project_stage_templates").select("id, key, name, description, sort_order, is_active, default_weight, is_terminal").is("archived_at", null).order("sort_order").limit(50),
  ]);
  if (customers.error || staff.error || templates.error) throw new Error("Unable to load project filters.");
  return { customers: customers.data || [], staff: (staff.data || []) as ProjectStaff[], templates: (templates.data || []) as StageTemplate[] };
}

async function getLinkedProjects(column: "customer_id" | "enquiry_id" | "site_visit_id" | "quotation_id", id: string) {
  if (!isUuid(id)) return [] as ProjectListItem[];
  const supabase = await createClient();
  if (!supabase) return [] as ProjectListItem[];
  const { data, error } = await supabase.from("projects").select(listSelection).eq(column, id).is("archived_at", null).order("updated_at", { ascending: false }).limit(30);
  if (error) throw new Error("Unable to load linked projects.");
  return (data || []) as unknown as ProjectListItem[];
}
export const getCustomerProjects = (id: string) => getLinkedProjects("customer_id", id);
export const getEnquiryProjects = (id: string) => getLinkedProjects("enquiry_id", id);
export const getSiteVisitProjects = (id: string) => getLinkedProjects("site_visit_id", id);
export const getQuotationProjects = (id: string) => getLinkedProjects("quotation_id", id);

export async function getProjectDashboard() {
  if (isDemoMode()) return { active: DEMO_PROJECTS.filter((project) => project.status === "active").length, overdue: 0, upcomingInstallations: 2, handoverPending: 1, byStage: DEMO_PROJECTS.filter((project) => project.status === "active").map((project) => ({ key: project.current_stage?.stage_key || "planning", name: project.current_stage?.name || "Planning", count: 1 })), attention: DEMO_PROJECTS.filter((project) => project.status === "active") as unknown as ProjectListItem[] };
  const supabase = await createClient();
  if (!supabase) return { active: 0, overdue: 0, upcomingInstallations: 0, handoverPending: 0, byStage: [] as { key: string; name: string; count: number }[], attention: [] as ProjectListItem[] };
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const [active, overdue, installations, handover, stageRows, attentionRows, blocked, overdueTasks] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "active").is("archived_at", null),
    supabase.from("projects").select("id", { count: "exact", head: true }).lt("expected_completion_date", today).not("status", "in", "(completed,cancelled)").is("archived_at", null),
    supabase.from("projects").select("id", { count: "exact", head: true }).gte("installation_date", today).lte("installation_date", upcoming).not("status", "in", "(completed,cancelled)").is("archived_at", null),
    supabase.from("projects").select("id", { count: "exact", head: true }).in("handover_status", ["pending", "ready", "issues_outstanding"]).not("status", "in", "(completed,cancelled)").is("archived_at", null),
    supabase.from("projects").select("id, current_stage:project_stages!projects_current_stage_id_fkey(stage_key, name)").not("status", "in", "(completed,cancelled)").is("archived_at", null).limit(500),
    supabase.from("projects").select(listSelection).not("status", "in", "(completed,cancelled)").is("archived_at", null).order("expected_completion_date", { ascending: true, nullsFirst: false }).limit(30),
    supabase.from("project_stages").select("project_id").eq("status", "blocked").limit(200),
    supabase.from("tasks").select("project_id").eq("kind", "project_task").lt("due_at", new Date().toISOString()).in("status", ["open", "in_progress", "blocked"]).not("project_id", "is", null).is("archived_at", null).limit(200),
  ]);
  if ([active, overdue, installations, handover, stageRows, attentionRows, blocked, overdueTasks].some((result) => result.error)) throw new Error("Unable to load project dashboard metrics.");
  const stageMap = new Map<string, { key: string; name: string; count: number }>();
  for (const row of stageRows.data || []) {
    const stage = row.current_stage as unknown as { stage_key: string; name: string } | null;
    if (!stage) continue;
    const item = stageMap.get(stage.stage_key) || { key: stage.stage_key, name: stage.name, count: 0 };
    item.count += 1;
    stageMap.set(stage.stage_key, item);
  }
  const flagged = new Set([...(blocked.data || []).map((row) => row.project_id), ...(overdueTasks.data || []).map((row) => row.project_id)]);
  const attention = ((attentionRows.data || []) as unknown as ProjectListItem[]).filter((project) => flagged.has(project.id) || Boolean(project.expected_completion_date && project.expected_completion_date < today) || project.handover_status === "issues_outstanding").slice(0, 8);
  return { active: active.count || 0, overdue: overdue.count || 0, upcomingInstallations: installations.count || 0, handoverPending: handover.count || 0, byStage: [...stageMap.values()], attention };
}
