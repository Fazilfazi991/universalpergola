import Link from "next/link";
import { ArrowLeft, Check, Clock3, Phone, Send } from "lucide-react";
import { notFound } from "next/navigation";
import {
  assignEnquiryAction,
  cancelFollowUpAction,
  completeFollowUpAction,
  markContactedAction,
  rescheduleFollowUpAction,
} from "@/app/dashboard/enquiries/actions";
import {
  EnquiryEditor,
  EnquiryNoteForm,
  FollowUpForm,
} from "@/components/dashboard/enquiry-controls";
import { PageHeading } from "@/components/ui/page-heading";
import { DemoDisabledNotice } from "@/components/dashboard/demo-disabled-notice";
import { requireModuleAccess } from "@/lib/auth/dal";
import { isDemoMode } from "@/lib/demo-mode-server";
import {
  activityLabel,
  enquiryReference,
  followUpStatusLabel,
  formatDate,
  formatPhoneLink,
  formatWhatsAppLink,
  priorityClass,
  priorityLabel,
  statusLabel,
} from "@/lib/crm/presentation";
import {
  getEnquiry,
  getEnquiryWorkspace,
  getStaffDirectory,
} from "@/lib/crm/queries";
import {
  siteVisitReference,
  siteVisitStatusClass,
  siteVisitStatusLabel,
} from "@/lib/site-visits/presentation";
import { getEnquirySiteVisits } from "@/lib/site-visits/queries";
import { formatMoney } from "@/lib/quotations/money";
import {
  quotationStatusClass,
  quotationStatusLabel,
} from "@/lib/quotations/presentation";
import { getEnquiryQuotations } from "@/lib/quotations/queries";
import { getEnquiryProjects } from "@/lib/projects/queries";
import { projectStatusLabel } from "@/lib/projects/presentation";

export default async function EnquiryPage({
  params,
}: PageProps<"/dashboard/enquiries/[id]">) {
  const { id } = await params;
  const [profile, enquiry, workspace, staff, siteVisits, quotations, projects] =
    await Promise.all([
      requireModuleAccess("enquiries"),
      getEnquiry(id),
      getEnquiryWorkspace(id),
      getStaffDirectory(),
      getEnquirySiteVisits(id),
      getEnquiryQuotations(id),
      getEnquiryProjects(id),
    ]);
  if (!enquiry) notFound();
  const phoneHref = formatPhoneLink(enquiry.customer?.phone);
  const whatsappHref = formatWhatsAppLink(
    enquiry.customer?.whatsapp_number || enquiry.customer?.phone,
  );
  return (
    <div className="space-y-7">
      <Link
        href="/dashboard/enquiries"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"
      >
        <ArrowLeft size={16} />
        Back to enquiries
      </Link>
      <PageHeading
        title={enquiryReference(enquiry.enquiry_number)}
        description={
          enquiry.subject || enquiry.product?.name || "General enquiry"
        }
        action={
          <div className="flex flex-wrap gap-2">
            {!isDemoMode() && <Link
              href={`/dashboard/site-visits/new?customer=${enquiry.customer_id}&enquiry=${id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-graphite px-4 text-sm font-semibold text-white"
            >
              Schedule visit
            </Link>}
            {!isDemoMode() && <form action={markContactedAction}>
              <input type="hidden" name="id" value={id} />
              <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-medium">
                <Check size={16} />
                Mark contacted
              </button>
            </form>}
          </div>
        }
      />
      {isDemoMode() && <DemoDisabledNotice>Enquiry editing, scheduling, follow-ups, assignment, and notes are disabled in the public demo.</DemoDisabledNotice>}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm border border-line bg-paper px-3 py-2 text-sm">
          {statusLabel(enquiry.status)}
        </span>
        <span
          className={`rounded-sm border px-3 py-2 text-sm ${priorityClass(enquiry.priority)}`}
        >
          {priorityLabel(enquiry.priority)}
        </span>
        {phoneHref && (
          <a
            href={phoneHref}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm"
          >
            <Phone size={15} />
            Call
          </a>
        )}
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm"
          >
            <Send size={15} />
            WhatsApp
          </a>
        )}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.8fr)]">
        <div className="space-y-6">
          <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
            <h2 className="text-lg font-semibold">Opportunity</h2>
            <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-stone">Customer</dt>
                <dd className="mt-1 text-sm">
                  {enquiry.customer ? (
                    <Link
                      href={`/dashboard/customers/${enquiry.customer.id}`}
                      className="font-medium text-brass-dark"
                    >
                      {enquiry.customer.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone">Product</dt>
                <dd className="mt-1 text-sm">
                  {enquiry.product?.name || "General enquiry"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone">Source</dt>
                <dd className="mt-1 text-sm">{enquiry.source || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone">Salesperson</dt>
                <dd className="mt-1 text-sm">
                  {enquiry.assigned?.full_name || "Unassigned"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone">Created</dt>
                <dd className="mt-1 text-sm">
                  {formatDate(enquiry.created_at, true)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone">Next follow-up</dt>
                <dd className="mt-1 text-sm">
                  {formatDate(enquiry.follow_up_at, true)}
                </dd>
              </div>
            </dl>
            {enquiry.message && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-xs text-stone">Customer requirement</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {enquiry.message}
                </p>
              </div>
            )}
          </section>
          <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
            <h2 className="text-lg font-semibold">Update enquiry</h2>
            <div className="mt-5">
              {!isDemoMode() ? <EnquiryEditor enquiry={enquiry} role={profile.role} /> : <p className="text-sm text-stone">This enquiry is displayed with synthetic data for portfolio review.</p>}
            </div>
          </section>
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Site visits</h2>
                <p className="mt-1 text-sm text-stone">
                  Field visits linked to this opportunity.
                </p>
              </div>
              <Link
                href={`/dashboard/site-visits/new?customer=${enquiry.customer_id}&enquiry=${id}`}
                className="min-h-10 py-2 text-sm font-medium text-brass-dark"
              >
                Schedule visit
              </Link>
            </div>
            <div className="mt-4 divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border">
              {siteVisits.length ? (
                siteVisits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/dashboard/site-visits/${visit.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {siteVisitReference(visit.visit_number)}
                      </p>
                      <p className="truncate text-sm text-stone">
                        {visit.site_address}
                      </p>
                      {visit.status === "completed" &&
                        visit.measurement_summary && (
                          <p className="mt-1 line-clamp-2 text-xs text-stone">
                            {visit.measurement_summary}
                          </p>
                        )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex rounded-sm border px-2 py-1 text-xs ${siteVisitStatusClass(visit.status)}`}
                      >
                        {siteVisitStatusLabel(visit.status)}
                      </span>
                      <p className="mt-1 text-xs text-stone">
                        {formatDate(visit.scheduled_at, true)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-stone">
                  No site visits linked yet.
                </p>
              )}
            </div>
          </section>
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Quotations</h2>
                <p className="mt-1 text-sm text-stone">
                  Current commercial offer and preserved revisions.
                </p>
              </div>
              {(profile.role === "admin" || profile.role === "sales") && (
                <Link
                  href={`/dashboard/quotations/new?customer=${enquiry.customer_id || ""}&enquiry=${id}`}
                  className="min-h-10 py-2 text-sm font-medium text-brass-dark"
                >
                  Create quotation
                </Link>
              )}
            </div>
            <div className="mt-4 divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border">
              {quotations.length ? (
                quotations.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/dashboard/quotations/${quote.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {quote.quotation_number}
                      </p>
                      <p className="mt-1 text-xs text-stone">
                        Revision {quote.revision_number}
                        {quote.is_current
                          ? " · Active"
                          : " · Historical"} · {formatDate(quote.issue_date)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex rounded-sm border px-2 py-1 text-xs ${quotationStatusClass(quote.status, quote.validity_date)}`}
                      >
                        {quotationStatusLabel(
                          quote.status,
                          quote.validity_date,
                        )}
                      </span>
                      <p className="mt-1 text-sm font-semibold">
                        {formatMoney(quote.total, quote.currency)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-stone">
                  No quotations linked yet.
                </p>
              )}
            </div>
          </section>
          <section>
            <div><h2 className="text-lg font-semibold">Linked project</h2><p className="mt-1 text-sm text-stone">The operational handoff after quotation approval.</p></div>
            <div className="mt-4 divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border">
              {projects.length ? projects.map((project) => (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="flex items-center justify-between gap-4 px-4 py-4"><div><p className="font-semibold">{project.project_number}</p><p className="mt-1 text-xs text-stone">{project.current_stage?.name || "No current stage"} · {project.progress}%</p></div><div className="text-right"><p className="text-sm">{projectStatusLabel(project.status)}</p><p className="mt-1 text-xs text-stone">Target {formatDate(project.expected_completion_date)}</p></div></Link>
              )) : <p className="px-4 py-8 text-center text-sm text-stone">No approved project handoff yet.</p>}
            </div>
          </section>
          <section>
            <div className="flex items-center gap-2">
              <Clock3 size={18} />
              <h2 className="text-lg font-semibold">Follow-ups</h2>
            </div>
            <div className="mt-4 divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border">
              {workspace.followUps.length ? (
                workspace.followUps.map((task) => (
                  <div key={task.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="mt-1 text-xs text-stone">
                          {task.assigned?.full_name || "Unassigned"} ·{" "}
                          {formatDate(task.due_at, true)}
                        </p>
                        {task.description && (
                          <p className="mt-2 text-sm text-stone">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-stone">
                        {followUpStatusLabel(task.status)}
                      </span>
                    </div>
                    {!isDemoMode() && task.status !== "completed" &&
                      task.status !== "cancelled" && (
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                          <form action={completeFollowUpAction}>
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="enquiry_id" value={id} />
                            <button className="min-h-10 text-sm font-medium text-emerald-700">
                              Complete
                            </button>
                          </form>
                          <form action={cancelFollowUpAction}>
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="enquiry_id" value={id} />
                            <button className="min-h-10 text-sm font-medium text-red-700">
                              Cancel
                            </button>
                          </form>
                          <form
                            action={rescheduleFollowUpAction}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="enquiry_id" value={id} />
                            <input
                              className="min-h-10 rounded-md border border-line px-2 text-base"
                              name="due_at"
                              type="datetime-local"
                              defaultValue={
                                task.due_at
                                  ? new Date(
                                      new Date(task.due_at).getTime() +
                                        14400000,
                                    )
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                              required
                            />
                            <button className="min-h-10 text-sm font-medium text-brass-dark">
                              Reschedule
                            </button>
                          </form>
                        </div>
                      )}
                  </div>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-stone">
                  No follow-ups yet.
                </p>
              )}
            </div>
          </section>
          <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
            <h2 className="text-lg font-semibold">Activity timeline</h2>
            <ol className="mt-5 border-l border-line pl-6">
              {workspace.timeline.map((item) => (
                <li key={item.id} className="relative pb-6 last:pb-0">
                  <span className="absolute -left-[1.72rem] top-1 size-2 rounded-full bg-brass" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {activityLabel(item.activity_type)}
                    </p>
                    <time className="text-xs text-stone">
                      {formatDate(item.occurred_at, true)}
                    </time>
                  </div>
                  {item.note && (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone">
                      {item.note}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-stone">
                    {item.actor?.full_name || "System / website"}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="text-base font-semibold">Assignment</h2>
            {profile.role === "admin" && !isDemoMode() ? (
              <form action={assignEnquiryAction} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={id} />
                <select
                  name="assigned_to"
                  defaultValue={enquiry.assigned_to || ""}
                  className="min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base"
                >
                  <option value="">Unassigned</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name}
                    </option>
                  ))}
                </select>
                <button className="min-h-10 text-sm font-medium text-brass-dark">
                  Save assignment
                </button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-stone">
                {enquiry.assigned?.full_name || "Unassigned"}
              </p>
            )}
          </section>
          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="text-base font-semibold">Add follow-up</h2>
            <div className="mt-4">
              {!isDemoMode() && <FollowUpForm
                enquiryId={id}
                customerId={enquiry.customer_id}
                staff={staff}
                role={profile.role}
                defaultAssignee={enquiry.assigned_to}
                currentUserId={profile.id}
              />}
            </div>
          </section>
          <section className="rounded-lg border border-line bg-paper p-5">
            {!isDemoMode() ? <EnquiryNoteForm enquiryId={id} /> : <p className="text-sm text-stone">Notes are disabled in the public demo.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
