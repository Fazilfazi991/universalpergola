import Link from "next/link";
import { FolderKanban, Settings2 } from "lucide-react";
import { StageTemplateForm } from "@/components/dashboard/project-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { requireModuleAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/crm/presentation";
import { formatMoney } from "@/lib/quotations/money";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/projects/constants";
import { projectStatusClass, stageStatusLabel } from "@/lib/projects/presentation";
import { getProjectOptions, getProjects, projectFilters } from "@/lib/projects/queries";

export default async function ProjectsPage({ searchParams }: PageProps<"/dashboard/projects">) {
  const [profile, params] = await Promise.all([requireModuleAccess("projects"), searchParams]);
  const filters = projectFilters(params);
  const [projects, options] = await Promise.all([getProjects(filters), getProjectOptions()]);
  return (
    <div className="space-y-7">
      <PageHeading title="Projects" description="Approved work moving through planning, execution, installation, and handover." />
      <form className="grid gap-3 border-y border-line bg-paper py-4 sm:rounded-lg sm:border sm:p-4 md:grid-cols-2 xl:grid-cols-4">
        <input name="search" defaultValue={filters.search} placeholder="Project, customer, phone, or site" aria-label="Search projects" className="min-h-11 rounded-md border border-line px-3 text-base xl:col-span-2" />
        <select name="stage" defaultValue={filters.stage} aria-label="Current stage" className="min-h-11 rounded-md border border-line bg-paper px-3 text-base">
          <option value="">Any stage</option>
          {options.templates.map((stage) => <option key={stage.id} value={stage.key}>{stage.name}</option>)}
        </select>
        <select name="status" defaultValue={filters.status} aria-label="Project status" className="min-h-11 rounded-md border border-line bg-paper px-3 text-base">
          <option value="">Any status</option>
          {PROJECT_STATUSES.map((status) => <option key={status} value={status}>{PROJECT_STATUS_LABELS[status]}</option>)}
        </select>
        <select name="assigned" defaultValue={filters.assigned} aria-label="Assigned staff" className="min-h-11 rounded-md border border-line bg-paper px-3 text-base">
          <option value="">Any assigned staff</option>
          {options.staff.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
        </select>
        <select name="salesperson" defaultValue={filters.salesperson} aria-label="Salesperson" className="min-h-11 rounded-md border border-line bg-paper px-3 text-base">
          <option value="">Any salesperson</option>
          {options.staff.filter((person) => person.role === "admin" || person.role === "sales").map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
        </select>
        <select name="customer" defaultValue={filters.customer} aria-label="Customer" className="min-h-11 rounded-md border border-line bg-paper px-3 text-base">
          <option value="">Any customer</option>
          {options.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select name="due" defaultValue={filters.due} aria-label="Due state" className="min-h-11 rounded-md border border-line bg-paper px-3 text-base">
            <option value="">Any due state</option><option value="overdue">Overdue</option><option value="due">Due ahead</option>
          </select>
          <button className="min-h-11 rounded-md border border-line bg-limestone px-4 text-sm font-medium">Apply</button>
        </div>
        <input name="from" type="date" defaultValue={filters.from} aria-label="Start date from" className="min-h-11 rounded-md border border-line px-3 text-base" />
        <input name="to" type="date" defaultValue={filters.to} aria-label="Start date to" className="min-h-11 rounded-md border border-line px-3 text-base" />
      </form>
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects found" description="Projects appear here after Management converts an approved current quotation." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-line bg-paper xl:block">
            <table className="w-full table-fixed text-left text-[13px]">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
                <col className="w-[11%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead className="border-b border-line bg-limestone text-xs text-stone"><tr>
                <th scope="col" className="px-3 py-3 font-medium">Project</th><th scope="col" className="px-3 py-3 font-medium">Customer</th><th scope="col" className="px-3 py-3 font-medium">Current work</th><th scope="col" className="px-3 py-3 font-medium">Status</th><th scope="col" className="px-3 py-3 font-medium">Value</th><th scope="col" className="px-3 py-3 font-medium">Owner / team</th><th scope="col" className="px-3 py-3 font-medium">Dates</th><th scope="col" className="px-3 py-3 font-medium">Progress</th>
              </tr></thead>
              <tbody className="divide-y divide-line">{projects.map((project) => (
                <tr key={project.id} className="align-top">
                  <td className="px-3 py-3"><Link href={`/dashboard/projects/${project.id}`} className="font-semibold hover:text-brass-dark">{project.project_number}</Link><p className="mt-1 text-xs leading-4 text-stone">Updated {formatDate(project.updated_at, true)}</p></td>
                  <td className="px-3 py-3"><p className="break-words font-medium">{project.customer?.name || "—"}</p><p className="mt-0.5 text-xs leading-4 text-stone">{project.customer?.phone || ""}</p></td>
                  <td className="px-3 py-3"><p className="break-words font-medium">{project.current_stage?.name || "No stage"}</p><p className="mt-0.5 text-xs leading-4 text-stone">{project.current_stage ? stageStatusLabel(project.current_stage.status) : "Template missing"}</p></td>
                  <td className="px-3 py-3"><span className={`inline-flex rounded-sm border px-2 py-1 text-xs ${projectStatusClass(project.status)}`}>{PROJECT_STATUS_LABELS[project.status]}</span></td>
                  <td className="px-3 py-3 text-xs font-semibold tabular-nums">{formatMoney(project.project_value, project.currency)}</td>
                  <td className="px-3 py-3"><p className="break-words">{project.owner?.full_name || "Unowned"}</p><p className="mt-0.5 break-words text-xs leading-4 text-stone">{project.assignments.filter((item) => ["site_team", "installer"].includes(item.assignment_role)).map((item) => item.user?.full_name).filter(Boolean).join(", ") || "No execution team"}</p></td>
                  <td className="px-3 py-3 text-xs leading-5"><p>Start {formatDate(project.start_date)}</p><p className={project.expected_completion_date && project.expected_completion_date < new Date().toISOString().slice(0, 10) && !["completed", "cancelled"].includes(project.status) ? "text-red-700" : "text-stone"}>Target {formatDate(project.expected_completion_date)}</p></td>
                  <td className="px-3 py-3"><div className="h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-line"><div className="h-full bg-brass" style={{ width: `${project.progress}%` }} /></div><p className="mt-1 text-xs tabular-nums text-stone">{project.progress}%</p></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border xl:hidden">{projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block px-4 py-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{project.project_number}</p><p className="truncate text-sm">{project.customer?.name || "Customer"}</p></div><span className={`shrink-0 rounded-sm border px-2 py-1 text-xs ${projectStatusClass(project.status)}`}>{PROJECT_STATUS_LABELS[project.status]}</span></div>
              <div className="mt-4 flex items-end justify-between gap-4"><div><p className="text-sm font-medium">{project.current_stage?.name || "No stage"}</p><p className="text-xs text-stone">{project.owner?.full_name || "Unowned"} · target {formatDate(project.expected_completion_date)}</p></div><strong className="text-sm">{formatMoney(project.project_value, project.currency)}</strong></div>
              <div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-brass" style={{ width: `${project.progress}%` }} /></div><span className="text-xs text-stone">{project.progress}%</span></div>
            </Link>
          ))}</div>
        </>
      )}
      {profile.role === "admin" ? (
        <details className="rounded-lg border border-line bg-paper">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 text-sm font-semibold sm:px-5"><Settings2 size={17} className="text-brass-dark" />Stage template for future projects</summary>
          <div className="border-t border-line px-4 sm:px-5"><p className="py-4 text-sm text-stone">Changes affect only projects created later. Existing stage histories remain frozen.</p>{options.templates.map((template) => <StageTemplateForm key={template.id} template={template} />)}</div>
        </details>
      ) : null}
    </div>
  );
}
