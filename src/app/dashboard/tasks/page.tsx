import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { requireModuleAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/crm/presentation";
import { getTaskQueue } from "@/lib/tasks/queries";

function taskHref(item: Awaited<ReturnType<typeof getTaskQueue>>[number]) {
  if(item.project_id) return `/dashboard/projects/${item.project_id}`;
  if(item.site_visit_id) return `/dashboard/site-visits/${item.site_visit_id}`;
  if(item.enquiry_id) return `/dashboard/enquiries/${item.enquiry_id}`;
  if(item.customer_id) return `/dashboard/customers/${item.customer_id}`;
  return "/dashboard/tasks";
}

function taskReference(item: Awaited<ReturnType<typeof getTaskQueue>>[number]) {
  if (item.project) return item.project.project_number;
  if (item.enquiry) return `ENQ-${String(item.enquiry.enquiry_number).padStart(6,"0")}`;
  if (item.site_visit) return `SV-${String(item.site_visit.visit_number).padStart(6,"0")}`;
  return item.kind.replaceAll("_"," ");
}

export default async function TasksPage({searchParams}:PageProps<"/dashboard/tasks">){
  const [,params]=await Promise.all([requireModuleAccess("tasks"),searchParams]);
  const status=typeof params.status==="string"?params.status:"";
  const tasks=await getTaskQueue(status);
  return <div className="space-y-7"><PageHeading title="Task queue" description="Your accessible sales, site-visit, and project actions in one due-date queue."/><div className="flex gap-2 overflow-x-auto">{[["","Open work"],["blocked","Blocked"],["completed","Completed"]].map(([key,label])=><Link key={key} href={key?`/dashboard/tasks?status=${key}`:"/dashboard/tasks"} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${status===key?"border-graphite bg-graphite text-white":"border-line bg-paper"}`}>{label}</Link>)}</div><section className="overflow-hidden rounded-lg border border-line bg-paper">{tasks.length?<div className="divide-y divide-line">{tasks.map((item)=><Link key={item.id} href={taskHref(item)} className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_8rem] sm:items-center sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 truncate text-xs text-stone">{taskReference(item)}</p></div><span className="text-xs text-stone">{item.assigned?.full_name||"Unassigned"}</span><span className={`text-xs sm:text-right ${item.due_at&&item.due_at<new Date().toISOString()&&item.status!=="completed"?"text-red-700":"text-stone"}`}>{formatDate(item.due_at,true)}</span></Link>)}</div>:<div className="px-5 py-12 text-center"><ClipboardCheck className="mx-auto text-brass-dark"/><h2 className="mt-4 font-semibold">No tasks in this view</h2><p className="mt-2 text-sm text-stone">Linked work will appear here when assigned or accessible.</p></div>}</section></div>;
}
