import Link from "next/link";
import { ArrowLeft, Pencil, Phone, Plus, Send } from "lucide-react";
import { notFound } from "next/navigation";
import {
  assignCustomerAction,
  setCustomerArchivedAction,
} from "@/app/dashboard/customers/actions";
import { PageHeading } from "@/components/ui/page-heading";
import { requireModuleAccess } from "@/lib/auth/dal";
import {
  enquiryReference,
  followUpStatusLabel,
  formatDate,
  formatPhoneLink,
  formatWhatsAppLink,
  statusLabel,
} from "@/lib/crm/presentation";
import {
  getCustomer,
  getCustomerWorkspace,
  getStaffDirectory,
} from "@/lib/crm/queries";
import {
  siteVisitReference,
  siteVisitStatusClass,
  siteVisitStatusLabel,
} from "@/lib/site-visits/presentation";
import { getCustomerSiteVisits } from "@/lib/site-visits/queries";
import { formatMoney } from "@/lib/quotations/money";
import {
  quotationStatusClass,
  quotationStatusLabel,
} from "@/lib/quotations/presentation";
import { getCustomerQuotations } from "@/lib/quotations/queries";
import { getCustomerProjects } from "@/lib/projects/queries";
import { projectStatusLabel } from "@/lib/projects/presentation";
import { getCustomerFinanceSummary } from "@/lib/payments/queries";

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-stone">{label}</dt>
      <dd className="mt-1 text-sm leading-6">{value || "—"}</dd>
    </div>
  );
}

export default async function CustomerPage({
  params,
}: PageProps<"/dashboard/customers/[id]">) {
  const { id } = await params;
  const [profile, customer, workspace, staff, siteVisits, quotations, projects, finance] =
    await Promise.all([
      requireModuleAccess("customers"),
      getCustomer(id),
      getCustomerWorkspace(id),
      getStaffDirectory(),
      getCustomerSiteVisits(id),
      getCustomerQuotations(id),
      getCustomerProjects(id),
      getCustomerFinanceSummary(id),
    ]);
  if (!customer) notFound();
  const canEdit = ["admin", "sales"].includes(profile.role);
  const phoneHref = formatPhoneLink(customer.phone);
  const whatsappHref = formatWhatsAppLink(
    customer.whatsapp_number || customer.phone,
  );
  return (
    <div className="space-y-7">
      <Link
        href="/dashboard/customers"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"
      >
        <ArrowLeft size={16} />
        Back to customers
      </Link>
      <PageHeading
        title={customer.name}
        description={
          [customer.company_name, customer.area, customer.emirate]
            .filter(Boolean)
            .join(" · ") || "Customer record"
        }
        action={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/site-visits/new?customer=${id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-graphite px-4 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Schedule visit
              </Link>
              <Link
                href={`/dashboard/enquiries/new?customer=${id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-medium"
              >
                <Plus size={16} />
                New enquiry
              </Link>
              <Link
                href={`/dashboard/customers/${id}/edit`}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-medium"
              >
                <Pencil size={16} />
                Edit
              </Link>
            </div>
          ) : undefined
        }
      />
      <div className="flex flex-wrap gap-2">
        {phoneHref && (
          <a
            href={phoneHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-medium"
          >
            <Phone size={16} />
            Call
          </a>
        )}
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-medium"
          >
            <Send size={16} />
            WhatsApp
          </a>
        )}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.7fr)]">
        <div className="space-y-6">
          <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6">
            <h2 className="text-lg font-semibold">Customer information</h2>
            <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Detail label="Phone" value={customer.phone} />
              <Detail label="WhatsApp" value={customer.whatsapp_number} />
              <Detail label="Email" value={customer.email} />
              <Detail label="Company" value={customer.company_name} />
              <Detail label="Address" value={customer.address} />
              <Detail
                label="Area / emirate"
                value={[customer.area, customer.emirate]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Detail label="Source" value={customer.source} />
              <Detail
                label="Assigned salesperson"
                value={customer.assigned?.full_name || "Unassigned"}
              />
            </dl>
            {customer.notes && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-xs text-stone">Internal notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {customer.notes}
                </p>
              </div>
            )}
          </section>
          <section>
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold">Enquiries</h2>
                <p className="mt-1 text-sm text-stone">
                  Every opportunity linked to this customer.
                </p>
              </div>
            </div>
            <div className="mt-4 divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border">
              {workspace.enquiries.length ? (
                workspace.enquiries.map((enquiry) => (
                  <Link
                    key={enquiry.id}
                    href={`/dashboard/enquiries/${enquiry.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {enquiryReference(enquiry.enquiry_number)}
                      </p>
                      <p className="truncate text-sm text-stone">
                        {enquiry.subject ||
                          enquiry.product?.name ||
                          "General enquiry"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm">{statusLabel(enquiry.status)}</p>
                      <p className="mt-1 text-xs text-stone">
                        {formatDate(enquiry.created_at)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-stone">
                  No enquiries linked yet.
                </p>
              )}
            </div>
          </section>
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Site visits</h2>
                <p className="mt-1 text-sm text-stone">
                  Scheduled visits and completed field records.
                </p>
              </div>
              {canEdit && (
                <Link
                  href={`/dashboard/site-visits/new?customer=${id}`}
                  className="min-h-10 py-2 text-sm font-medium text-brass-dark"
                >
                  Schedule visit
                </Link>
              )}
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
                      <p className="mt-1 truncate text-xs text-stone">
                        Assigned to {visit.assigned?.full_name || "Unassigned"}
                      </p>
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
                  Commercial history linked to this customer.
                </p>
              </div>
              {canEdit && (
                <Link
                  href={`/dashboard/quotations/new?customer=${id}`}
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
                        {formatDate(quote.issue_date)} · Revision{" "}
                        {quote.revision_number}
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
            <div>
              <h2 className="text-lg font-semibold">Projects</h2>
              <p className="mt-1 text-sm text-stone">Approved work now in delivery.</p>
            </div>
            <div className="mt-4 divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border">
              {projects.length ? projects.map((project) => (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="flex items-center justify-between gap-4 px-4 py-4">
                  <div><p className="font-semibold">{project.project_number}</p><p className="mt-1 text-xs text-stone">{project.current_stage?.name || "No current stage"} · target {formatDate(project.expected_completion_date)}</p></div>
                  <div className="text-right"><p className="text-sm">{projectStatusLabel(project.status)}</p><p className="mt-1 text-sm font-semibold">{formatMoney(project.project_value, project.currency)}</p></div>
                </Link>
              )) : <p className="px-4 py-8 text-center text-sm text-stone">No projects linked yet.</p>}
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold">Follow-ups</h2>
            <div className="mt-4 divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border">
              {workspace.followUps.length ? (
                workspace.followUps.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-4 px-4 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="mt-1 text-xs text-stone">
                        {task.assigned?.full_name || "Unassigned"}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p>{formatDate(task.due_at, true)}</p>
                      <p className="mt-1 text-stone">
                        {followUpStatusLabel(task.status)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-stone">
                  No follow-ups yet.
                </p>
              )}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          {finance && finance.project_count > 0 ? <section className="rounded-lg border border-line bg-graphite p-5 text-white"><p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">Customer finance summary</p><dl className="mt-4 grid grid-cols-2 gap-4"><div><dt className="text-xs text-white/45">Project value</dt><dd className="mt-1 font-semibold">{formatMoney(finance.project_value)}</dd></div><div><dt className="text-xs text-white/45">Received</dt><dd className="mt-1 font-semibold">{formatMoney(finance.received)}</dd></div><div><dt className="text-xs text-white/45">Outstanding</dt><dd className="mt-1 font-semibold">{formatMoney(finance.outstanding)}</dd></div><div><dt className="text-xs text-white/45">Overdue</dt><dd className={`mt-1 font-semibold ${finance.overdue > 0 ? "text-red-300" : ""}`}>{formatMoney(finance.overdue)}</dd></div></dl><p className="mt-4 border-t border-white/10 pt-3 text-xs text-white/45">{profile.role === "sales" ? "Summary only; receipt details remain with Finance." : `${finance.project_count} linked project${finance.project_count === 1 ? "" : "s"}.`}</p></section> : null}
          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="text-base font-semibold">Ownership</h2>
            {profile.role === "admin" ? (
              <form action={assignCustomerAction} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={id} />
                <select
                  name="assigned_to"
                  defaultValue={customer.assigned_to || ""}
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
                {customer.assigned?.full_name || "Unassigned"}
              </p>
            )}
            {profile.role === "admin" && (
              <form
                action={setCustomerArchivedAction}
                className="mt-5 border-t border-line pt-4"
              >
                <input type="hidden" name="id" value={id} />
                <input
                  type="hidden"
                  name="archived"
                  value={String(!customer.archived_at)}
                />
                <button className="min-h-10 text-sm font-medium text-red-700">
                  {customer.archived_at
                    ? "Reactivate customer"
                    : "Archive customer"}
                </button>
              </form>
            )}
          </section>
          <section className="rounded-lg border border-line bg-paper p-5">
            <h2 className="text-base font-semibold">Customer activity</h2>
            <ol className="mt-5 border-l border-line pl-5">
              {workspace.activity.length ? (
                workspace.activity.map((item) => (
                  <li key={item.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[1.43rem] top-1 size-2 rounded-full bg-brass" />
                    <p className="text-sm font-medium">
                      {item.event_type
                        .replaceAll(".", " ")
                        .replace(/^./, (letter) => letter.toUpperCase())}
                    </p>
                    <p className="mt-1 text-xs text-stone">
                      {item.actor?.full_name || "System"} ·{" "}
                      {formatDate(item.created_at, true)}
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-sm text-stone">No activity recorded.</li>
              )}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
