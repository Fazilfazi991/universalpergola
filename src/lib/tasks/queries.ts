import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TaskQueueItem = {
  id:string; title:string; description:string|null; kind:string; status:string; priority:string;
  due_at:string|null; completed_at:string|null; customer_id:string|null; enquiry_id:string|null;
  project_id:string|null; site_visit_id:string|null; reminder_type:string|null;
  assigned:{id:string;full_name:string}|null;
  project:{id:string;project_number:string}|null;
  enquiry:{id:string;enquiry_number:number}|null;
  site_visit:{id:string;visit_number:number}|null;
};

export async function getTaskQueue(status?: string) {
  const supabase = await createClient();
  if (!supabase) return [] as TaskQueueItem[];
  let query = supabase.from("tasks").select("id, title, description, kind, reminder_type, status, priority, due_at, completed_at, customer_id, enquiry_id, project_id, site_visit_id, assigned:profiles!tasks_assigned_to_fkey(id, full_name), project:projects!tasks_project_id_fkey(id, project_number), enquiry:enquiries!tasks_enquiry_id_fkey(id, enquiry_number), site_visit:site_visits!tasks_site_visit_id_fkey(id, visit_number)")
    .is("archived_at", null).is("completion_checklist_key", null).order("due_at", { ascending:true, nullsFirst:false }).limit(200);
  if (["open","in_progress","blocked","completed","cancelled"].includes(status||"")) query=query.eq("status", status as "open");
  else query=query.in("status",["open","in_progress","blocked"]);
  const {data,error}=await query;
  if(error) throw new Error(`Unable to load tasks: ${error.message}`);
  return (data||[]) as unknown as TaskQueueItem[];
}
