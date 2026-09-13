import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, CircleDollarSign, Download, Link2, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import {
  completeProjectAction,
  downloadProjectFileAction,
  removeProjectFileAction,
  reopenProjectAction,
  setProjectAssignmentAction,
  transitionProjectStageAction,
  transitionProjectTaskAction,
} from "@/app/dashboard/projects/actions";
import {
  HandoverForm,
  ProjectFileUploader,
  ProjectPlanForm,
  ProjectTaskForm,
  ProjectUpdateForm,
  StagePlanForm,
} from "@/components/dashboard/project-controls";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusNotice } from "@/components/ui/status-notice";
import { requireModuleAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/crm/presentation";
import { formatMoney } from "@/lib/quotations/money";
import {
  PROJECT_ASSIGNMENT_LABELS,
  PROJECT_ASSIGNMENT_ROLES,
  PROJECT_FILE_CATEGORY_LABELS,
} from "@/lib/projects/constants";
import {
  assignmentRoleLabel,
  handoverStatusLabel,
  projectActivityLabel,
  projectPriorityLabel,
  projectStatusClass,
  projectStatusLabel,
  projectUpdateLabel,
  stageStatusClass,
  stageStatusLabel,
} from "@/lib/projects/presentation";
import { getProject, getProjectOptions, getProjectWorkspace } from "@/lib/projects/queries";
import { getProjectFinanceSummary } from "@/lib/payments/queries";

function bytes(value: number | null) {
  if (!value) return "—";
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(value / 1024)} KB`;
}
export default async function ProjectPage({ params, searchParams }: PageProps<"/dashboard/projects/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [profile, project] = await Promise.all([requireModuleAccess("projects"), getProject(id)]);
  if (!project) notFound();
  const [workspace, options, finance] = await Promise.all([
    getProjectWorkspace(id),
    profile.role === "admin" ? getProjectOptions() : Promise.resolve({ customers: [], staff: [], templates: [] }),
    profile.role === "site_team" ? Promise.resolve(null) : getProjectFinanceSummary(id),
  ]);
  const canManage = profile.role === "admin";
  const canOperate = profile.role === "admin" || profile.role === "site_team";
  const canAddUpdate = profile.role === "admin" || profile.role === "sales" || profile.role === "site_team";
  const participantIds = new Set([project.project_owner_id, project.assigned_salesperson, ...workspace.assignments.map((item) => item.user_id)].filter(Boolean));
  const participants = (canManage ? options.staff.filter((person) => participantIds.has(person.id)) : [{ id: profile.id, full_name: profile.fullName, role: profile.role }]);
  const currentStage = workspace.stages.find((stage) => stage.id === project.current_stage?.id) || workspace.stages.find((stage) => !["completed", "skipped"].includes(stage.status));
  const incompleteCriticalTasks = workspace.tasks.filter((task) => ["high", "urgent"].includes(task.priority) && !["completed", "cancelled"].includes(task.status));
  const readyToComplete = project.handover_status === "completed" && workspace.stages.filter((stage) => !stage.is_terminal).every((stage) => ["completed", "skipped"].includes(stage.status));
  return (
    <div className="space-y-7">
      <Link href="/dashboard/projects" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to projects</Link>
      <PageHeading
        title={project.project_number}
        description={`${project.customer?.name || "Customer"} · ${project.site_address || "Project site"}`}
        action={<span className={`inline-flex rounded-sm border px-3 py-2 text-sm ${projectStatusClass(project.status)}`}>{projectStatusLabel(project.status)}</span>}
      />
      {typeof query.error === "string" ? <StatusNotice tone="error" title="Action could not be completed"><p>{query.error}</p></StatusNotice> : null}
      <section className="overflow-hidden rounded-lg bg-graphite text-white">
        <div className="grid gap-5 px-5 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end lg:px-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Current execution stage</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{currentStage?.name || "Workflow complete"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">{currentStage?.description || project.summary || "No current-stage description."}</p>
          </div>
          <div className="min-w-48">
            <div className="flex items-baseline justify-between"><span className="text-sm text-white/55">Overall progress</span><strong className="text-2xl">{project.progress}%</strong></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-brass" style={{ width: `${project.progress}%` }} /></div>
            <p className="mt-3 text-xs text-white/45">Derived from completed stage weight</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t border-white/10 md:grid-cols-4">
          {[
            ["Owner", project.owner?.full_name || "Unowned"],
            ["Target", formatDate(project.expected_completion_date)],
            ["Value", formatMoney(project.project_value, project.currency)],
            ["Priority", projectPriorityLabel(project.priority)],
          ].map(([label, value]) => <div key={label} className="border-b border-white/10 px-5 py-4 last:border-b-0 odd:border-r md:border-b-0 md:border-r md:last:border-r-0"><dt className="text-[10px] uppercase tracking-[0.15em] text-white/35">{label}</dt><dd className="mt-1 truncate text-sm font-medium">{value}</dd></div>)}
        </dl>
      </section>
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.65fr)]">
        <div className="space-y-7">
          <section>
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Execution ledger</h2><p className="mt-1 text-sm text-stone">Frozen project stages in delivery order.</p></div><span className="text-xs text-stone">{workspace.stages.filter((stage) => ["completed", "skipped"].includes(stage.status)).length}/{workspace.stages.length} settled</span></div>
            <ol className="mt-5 border-l border-line pl-5 sm:pl-7">
              {workspace.stages.map((stage, index) => {
                const siteCanChange = profile.role === "site_team" && ["manufacturing", "installation", "handover"].includes(stage.stage_key);
                const canChange = canManage || siteCanChange;
                const projectOpen = !["completed", "cancelled"].includes(project.status);
                const actions = stage.status === "not_started" ? ["start"] : stage.status === "in_progress" ? ["complete", "block"] : stage.status === "blocked" ? ["resume", "skip"] : ["reopen"];
                return (
                  <li key={stage.id} className="relative pb-5 last:pb-0">
                    <span className={`absolute -left-[1.83rem] top-0 grid size-6 place-items-center rounded-full border text-[10px] sm:-left-[2.27rem] ${stage.status === "completed" ? "border-emerald-600 bg-emerald-600 text-white" : stage.status === "in_progress" ? "border-brass bg-brass text-ink" : stage.status === "blocked" ? "border-red-400 bg-red-50 text-red-800" : "border-line bg-limestone text-stone"}`}>{stage.status === "completed" ? <Check size={12} /> : String(index + 1).padStart(2, "0")}</span>
                    <article className={`border-y bg-paper px-4 py-4 sm:rounded-lg sm:border sm:px-5 ${stage.id === currentStage?.id ? "border-brass" : "border-line"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{stage.name}</h3><p className="mt-1 text-xs text-stone">{stage.assigned?.full_name || "Unassigned"} · target {formatDate(stage.target_date)}</p></div><span className={`rounded-sm border px-2 py-1 text-xs ${stageStatusClass(stage.status)}`}>{stageStatusLabel(stage.status)}</span></div>
                      {stage.notes ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone">{stage.notes}</p> : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone"><span>{stage.progress}% stage observation</span>{stage.started_at ? <span>Started {formatDate(stage.started_at, true)}</span> : null}{stage.completed_at ? <span>Settled {formatDate(stage.completed_at, true)}</span> : null}</div>
                      {canChange && projectOpen ? <div className="mt-4 flex flex-wrap gap-2">{actions.filter((action) => action !== "skip" || canManage).map((action) => (
                        <form key={action} action={transitionProjectStageAction}>
                          <input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="stage_id" value={stage.id} /><input type="hidden" name="action" value={action} />
                          <button className={`min-h-10 rounded-md px-3 text-sm font-medium ${action === "complete" || action === "start" || action === "resume" ? "bg-graphite text-white" : "border border-line bg-paper"}`}>{action === "reopen" ? "Reopen stage" : action === "block" ? "Mark blocked" : action[0].toUpperCase() + action.slice(1)}</button>
                        </form>
                      ))}</div> : null}
                      {canManage && projectOpen ? <StagePlanForm stage={stage} projectId={project.id} participants={participants} /> : null}
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Tasks</h2><p className="mt-1 text-sm text-stone">Execution actions linked to the project or a stage.</p></div><span className="text-xs text-stone">{workspace.tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length} open</span></div>
            <div className="mt-5 divide-y divide-line">{workspace.tasks.length ? workspace.tasks.map((task) => (
              <article key={task.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-stone">{task.stage?.name || "Whole project"} · {task.assigned?.full_name || "Unassigned"} · due {formatDate(task.due_at, true)}</p>{task.description ? <p className="mt-2 text-sm leading-6 text-stone">{task.description}</p> : null}</div><span className="shrink-0 text-xs capitalize text-stone">{task.status.replaceAll("_", " ")}</span></div>
                {canOperate && !["completed", "cancelled"].includes(project.status) ? <div className="mt-3 flex flex-wrap gap-3">{task.status !== "completed" ? <form action={transitionProjectTaskAction}><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="task_id" value={task.id} /><input type="hidden" name="status" value="completed" /><button className="min-h-9 text-sm font-medium text-emerald-700">Complete</button></form> : null}{task.status !== "blocked" && task.status !== "completed" ? <form action={transitionProjectTaskAction}><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="task_id" value={task.id} /><input type="hidden" name="status" value="blocked" /><button className="min-h-9 text-sm font-medium text-red-700">Block</button></form> : null}{["blocked", "completed"].includes(task.status) ? <form action={transitionProjectTaskAction}><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="task_id" value={task.id} /><input type="hidden" name="status" value="open" /><button className="min-h-9 text-sm font-medium text-brass-dark">Reopen</button></form> : null}</div> : null}
              </article>
            )) : <p className="py-7 text-center text-sm text-stone">No project tasks yet.</p>}</div>
            {canOperate && !["completed", "cancelled"].includes(project.status) ? <div className="mt-6 border-t border-line pt-5"><h3 className="mb-4 text-sm font-semibold">Add task</h3><ProjectTaskForm projectId={project.id} stages={workspace.stages} participants={participants} currentUserId={profile.id} role={profile.role} /></div> : null}
          </section>
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-5"><h2 className="text-lg font-semibold">Operational updates</h2>{canAddUpdate && !["completed", "cancelled"].includes(project.status) ? <div className="mt-4"><ProjectUpdateForm projectId={project.id} stages={workspace.stages} role={profile.role} /></div> : null}<div className="mt-5 divide-y divide-line">{workspace.updates.map((item) => <article key={item.id} className="py-4 first:pt-0"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{projectUpdateLabel(item.update_type)}</p><time className="text-xs text-stone">{formatDate(item.created_at, true)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.note}</p><p className="mt-2 text-xs text-stone">{item.author?.full_name || "System"}{item.stage ? ` · ${item.stage.name}` : ""}{item.progress !== null ? ` · observed ${item.progress}%` : ""}</p></article>)}</div></div>
            {profile.role !== "accounts" ? <div className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-5"><h2 className="text-lg font-semibold">Files & photos</h2>{canOperate && !["completed", "cancelled"].includes(project.status) ? <div className="mt-4"><ProjectFileUploader projectId={project.id} stages={workspace.stages} /></div> : null}<div className="mt-5 divide-y divide-line">{workspace.files.length ? workspace.files.map((file) => <article key={file.id} className="py-4 first:pt-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{file.file_name}</p><p className="mt-1 text-xs text-stone">{PROJECT_FILE_CATEGORY_LABELS[file.file_type as keyof typeof PROJECT_FILE_CATEGORY_LABELS] || file.file_type} · {file.stage?.name || "Whole project"} · {bytes(file.file_size)}</p>{file.caption ? <p className="mt-2 text-sm text-stone">{file.caption}</p> : null}</div><div className="flex shrink-0 gap-1"><form action={downloadProjectFileAction}><input type="hidden" name="file_id" value={file.id} /><input type="hidden" name="project_id" value={project.id} /><button className="grid size-10 place-items-center rounded-md border border-line" aria-label={`Download ${file.file_name}`}><Download size={15} /></button></form>{canOperate ? <form action={removeProjectFileAction}><input type="hidden" name="file_id" value={file.id} /><input type="hidden" name="project_id" value={project.id} /><button className="grid size-10 place-items-center rounded-md border border-line text-red-700" aria-label={`Delete ${file.file_name}`}><Trash2 size={15} /></button></form> : null}</div></div></article>) : <p className="py-7 text-center text-sm text-stone">No execution files uploaded.</p>}</div></div> : null}
          </section>
          <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
            <h2 className="text-lg font-semibold">Activity timeline</h2>
            <ol className="mt-5 border-l border-line pl-6">{workspace.timeline.length ? workspace.timeline.map((item) => <li key={item.id} className="relative pb-6 last:pb-0"><span className="absolute -left-[1.72rem] top-1 size-2 rounded-full bg-brass" /><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold">{projectActivityLabel(item.event_type, item.metadata)}</p><time className="text-xs text-stone">{formatDate(item.created_at, true)}</time></div><p className="mt-1 text-xs text-stone">{item.actor?.full_name || "System"}</p></li>) : <li className="text-sm text-stone">No activity recorded.</li>}</ol>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-paper p-5"><h2 className="text-base font-semibold">Commercial handoff</h2><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-xs text-stone">Approved quotation</dt><dd className="mt-1">{project.quotation ? <Link href={`/dashboard/quotations/${project.quotation.id}`} className="font-medium text-brass-dark">{project.source_quotation_number || project.quotation.quotation_number} · revision {project.source_quotation_revision || project.quotation.revision_number}</Link> : "—"}</dd></div><div><dt className="text-xs text-stone">Approved value</dt><dd className="mt-1 font-semibold">{formatMoney(project.project_value, project.currency)}</dd></div><div><dt className="text-xs text-stone">Approval date</dt><dd className="mt-1">{formatDate(project.quotation?.approved_at, true)}</dd></div></dl><p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-stone">This value is a protected quotation snapshot; catalogue changes do not recalculate it.</p></section>
          {finance ? <section className="rounded-lg border border-line bg-paper p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">Payments</h2><CircleDollarSign size={18} className="text-brass-dark" /></div><dl className="mt-4 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-stone">Received</dt><dd className="mt-1 font-semibold">{formatMoney(finance.received, finance.currency)}</dd></div><div><dt className="text-xs text-stone">Outstanding</dt><dd className={`mt-1 font-semibold ${finance.overdue > 0 ? "text-red-700" : ""}`}>{formatMoney(finance.outstanding, finance.currency)}</dd></div><div><dt className="text-xs text-stone">Overdue</dt><dd className={`mt-1 ${finance.overdue > 0 ? "text-red-700" : ""}`}>{formatMoney(finance.overdue, finance.currency)}</dd></div><div><dt className="text-xs text-stone">Next due</dt><dd className="mt-1">{formatDate(finance.next_due_date)}</dd></div></dl><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-limestone"><div className="h-full bg-brass-dark" style={{ width: `${finance.paid_percent}%` }} /></div><p className="mt-2 text-xs text-stone">{finance.paid_percent}% of project value received.</p>{profile.role === "admin" || profile.role === "accounts" ? <Link href={`/dashboard/payments/projects/${project.id}`} className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-brass-dark">Open payment workspace →</Link> : <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-stone">Sales view is summary-only. Receipt details and proof documents remain restricted to Finance.</p>}</section> : null}
          <section className="rounded-lg border border-line bg-paper p-5"><h2 className="text-base font-semibold">Source trail</h2><div className="mt-4 grid gap-2">{project.customer ? <Link href={`/dashboard/customers/${project.customer.id}`} className="inline-flex min-h-10 items-center gap-2 text-sm text-brass-dark"><Link2 size={14} />{project.customer.name}</Link> : null}{project.enquiry ? <Link href={`/dashboard/enquiries/${project.enquiry.id}`} className="inline-flex min-h-10 items-center gap-2 text-sm text-brass-dark"><Link2 size={14} />ENQ-{String(project.enquiry.enquiry_number).padStart(6, "0")}</Link> : null}{project.site_visit ? <Link href={`/dashboard/site-visits/${project.site_visit.id}`} className="inline-flex min-h-10 items-center gap-2 text-sm text-brass-dark"><Link2 size={14} />SV-{String(project.site_visit.visit_number).padStart(6, "0")}</Link> : null}</div></section>
          <section className="rounded-lg border border-line bg-paper p-5"><h2 className="text-base font-semibold">Team & assignments</h2><div className="mt-4 divide-y divide-line">{workspace.assignments.length ? workspace.assignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0"><div><p className="text-sm font-medium">{assignment.user?.full_name || "Team member"}</p><p className="text-xs text-stone">{assignmentRoleLabel(assignment.assignment_role)}</p></div>{canManage ? <form action={setProjectAssignmentAction}><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="user_id" value={assignment.user_id} /><input type="hidden" name="assignment_role" value={assignment.assignment_role} /><input type="hidden" name="enabled" value="false" /><button className="min-h-9 text-xs font-medium text-red-700">Remove</button></form> : null}</div>) : <p className="text-sm text-stone">No project team assigned.</p>}</div>{canManage ? <form action={setProjectAssignmentAction} className="mt-5 grid gap-3 border-t border-line pt-4"><select name="user_id" required defaultValue="" className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"><option value="" disabled>Choose staff</option>{options.staff.map((person) => <option key={person.id} value={person.id}>{person.full_name} · {person.role.replace("_", " ")}</option>)}</select><select name="assignment_role" defaultValue="site_team" className="min-h-11 rounded-md border border-line bg-paper px-3 text-base">{PROJECT_ASSIGNMENT_ROLES.map((role) => <option key={role} value={role}>{PROJECT_ASSIGNMENT_LABELS[role]}</option>)}</select><input type="hidden" name="project_id" value={project.id} /><input type="hidden" name="enabled" value="true" /><button className="min-h-10 text-left text-sm font-semibold text-brass-dark">Add assignment</button></form> : null}</section>
          {canManage ? <details className="rounded-lg border border-line bg-paper"><summary className="flex min-h-14 cursor-pointer list-none items-center px-5 text-sm font-semibold">Project planning</summary><div className="border-t border-line p-5"><ProjectPlanForm project={project} /></div></details> : null}
          <section className="rounded-lg border border-line bg-paper p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">Handover</h2><span className="text-xs text-stone">{handoverStatusLabel(project.handover_status)}</span></div>{incompleteCriticalTasks.length ? <div className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle size={16} className="shrink-0" /><p>{incompleteCriticalTasks.length} high/urgent task{incompleteCriticalTasks.length === 1 ? " remains" : "s remain"}. Completion is allowed only after explicit Management review.</p></div> : null}{canOperate && !["completed", "cancelled"].includes(project.status) ? <div className="mt-4"><HandoverForm project={project} /></div> : <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-stone">Date</dt><dd>{formatDate(project.handover_date)}</dd></div><div><dt className="text-xs text-stone">Representative</dt><dd>{project.handover_contact || "—"}</dd></div><div><dt className="text-xs text-stone">Notes</dt><dd className="whitespace-pre-wrap">{project.handover_notes || "—"}</dd></div></dl>}</section>
          {canManage ? <section className="rounded-lg border border-line bg-limestone p-5"><h2 className="text-base font-semibold">Completion control</h2>{finance && finance.outstanding > 0 ? <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle size={16} className="shrink-0" /><p>{formatMoney(finance.outstanding, finance.currency)} remains outstanding. This is a warning and does not block operational completion.</p></div> : null}{project.status === "completed" ? <><p className="mt-3 text-sm text-stone">Completed {formatDate(project.completed_at, true)} by {project.completer?.full_name || "Management"}.</p><form action={reopenProjectAction} className="mt-4"><input type="hidden" name="project_id" value={project.id} /><textarea name="note" required minLength={3} maxLength={4000} className="min-h-20 w-full rounded-md border border-line bg-paper p-3 text-base" placeholder="Reason for reopening" /><button className="mt-3 min-h-10 text-sm font-semibold text-red-700">Reopen project</button></form></> : <><p className="mt-3 text-sm text-stone">{readyToComplete ? "Handover and delivery stages are settled." : "Complete handover and all delivery stages first."}</p><form action={completeProjectAction} className="mt-4"><input type="hidden" name="project_id" value={project.id} /><textarea name="note" maxLength={4000} className="min-h-20 w-full rounded-md border border-line bg-paper p-3 text-base" placeholder="Optional completion note" /><button disabled={!readyToComplete} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-brass-dark px-4 text-sm font-semibold text-white disabled:opacity-40"><Check size={16} />Complete project</button></form></>}</section> : null}
        </aside>
      </div>
    </div>
  );
}
