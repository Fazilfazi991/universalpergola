import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  FolderKanban,
  MapPin,
  MessageSquareText,
  UserRoundX,
  Star,
  Zap,
} from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusNotice } from "@/components/ui/status-notice";
import { requireCurrentProfile } from "@/lib/auth/dal";
import {
  enquiryReference,
  formatDate,
  priorityLabel,
  statusLabel,
} from "@/lib/crm/presentation";
import { getCrmDashboard } from "@/lib/crm/queries";
import {
  siteVisitReference,
  siteVisitStatusLabel,
} from "@/lib/site-visits/presentation";
import { getSiteVisitDashboard } from "@/lib/site-visits/queries";
import { formatMoney } from "@/lib/quotations/money";
import { getQuotationDashboard } from "@/lib/quotations/queries";
import { getProjectDashboard } from "@/lib/projects/queries";
import { projectStatusLabel } from "@/lib/projects/presentation";
import { getFinanceDashboardSummary } from "@/lib/payments/queries";
import { getFeedbackDashboard } from "@/lib/feedback/queries";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const [profile, { notice }] = await Promise.all([
    requireCurrentProfile(),
    searchParams,
  ]);
  const canUseCrm = profile.role === "admin" || profile.role === "sales";
  const canUseVisits = canUseCrm || profile.role === "site_team";
  const canUseQuotations =
    profile.role === "admin" ||
    profile.role === "sales" ||
    profile.role === "accounts";
  const canUseFinance = profile.role === "admin" || profile.role === "accounts";
  const [crm, visits, quotationMetrics, projectMetrics, financeMetrics, feedbackMetrics] = await Promise.all([
    canUseCrm ? getCrmDashboard() : null,
    canUseVisits ? getSiteVisitDashboard() : null,
    canUseQuotations ? getQuotationDashboard(profile.role) : null,
    getProjectDashboard(),
    canUseFinance ? getFinanceDashboardSummary() : null,
    profile.role === "admin" ? getFeedbackDashboard() : null,
  ]);
  const summaries = crm
    ? [
        {
          label: "New enquiries",
          value: crm.newEnquiries,
          icon: MessageSquareText,
        },
        { label: "Due today", value: crm.dueToday, icon: CalendarClock },
        {
          label: "Overdue follow-ups",
          value: crm.overdue,
          icon: AlertTriangle,
        },
        { label: "Unassigned", value: crm.unassigned, icon: UserRoundX },
        { label: "High / urgent", value: crm.priorityLeads, icon: Zap },
      ]
    : [];
  if (feedbackMetrics) summaries.push({ label: "Feedback to review", value: feedbackMetrics.awaitingReview, icon: Star });
  return (
    <div className="space-y-7">
      <PageHeading
        title="Operations overview"
        description="Actionable work across sales, site delivery, projects, and accounts."
      />
      {notice === "access-denied" && (
        <StatusNotice tone="error" title="Access restricted">
          <p>Your role does not have permission to open that module.</p>
        </StatusNotice>
      )}
      {crm ? (
        <>
          <section
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
            aria-label="Sales summary"
          >
            {summaries.map(({ label, value, icon: Icon }) => (
              <article
                key={label}
                className="min-w-0 rounded-lg border border-line bg-paper p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon
                    size={17}
                    className="text-brass-dark"
                    strokeWidth={1.7}
                  />
                  <strong className="text-2xl tracking-[-0.04em]">
                    {value}
                  </strong>
                </div>
                <p className="mt-5 text-xs leading-4 text-stone">{label}</p>
              </article>
            ))}
          </section>
          <section className="rounded-lg border border-line bg-paper">
            <div className="flex items-end justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-base font-semibold">Needs attention</h2>
                <p className="mt-1 text-sm text-stone">
                  New, unassigned, overdue, and priority opportunities.
                </p>
              </div>
              <Link
                href="/dashboard/enquiries"
                className="min-h-10 py-2 text-sm font-medium text-brass-dark"
              >
                All enquiries
              </Link>
            </div>
            {crm.needsAttention.length ? (
              <div className="divide-y divide-line">
                {crm.needsAttention.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/enquiries/${item.id}`}
                    className="grid gap-2 px-4 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_9rem_9rem] sm:items-center sm:px-5"
                  >
                    <strong className="text-sm">
                      {enquiryReference(item.enquiry_number)}
                    </strong>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.customer?.name || "Unlinked customer"}
                      </p>
                      <p className="truncate text-xs text-stone">
                        {item.subject ||
                          item.product?.name ||
                          item.next_action ||
                          "No context recorded"}
                      </p>
                    </div>
                    <span className="text-xs">{statusLabel(item.status)}</span>
                    <div className="text-xs text-stone sm:text-right">
                      <p>
                        {["high", "urgent"].includes(item.priority)
                          ? priorityLabel(item.priority)
                          : item.assigned?.full_name || "Unassigned"}
                      </p>
                      <p className="mt-1">
                        {item.follow_up_at
                          ? formatDate(item.follow_up_at, true)
                          : "No follow-up"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-stone">
                Nothing needs attention right now.
              </p>
            )}
          </section>
        </>
      ) : !visits ? (
        <StatusNotice title="Role-specific overview">
          <p>Your operational modules remain available in the navigation.</p>
        </StatusNotice>
      ) : null}
      {visits && (
        <>
          <section
            className="grid grid-cols-3 gap-2"
            aria-label="Site visit summary"
          >
            {[
              { label: "Visits today", value: visits.today, window: "today" },
              {
                label: "Upcoming visits",
                value: visits.upcoming,
                window: "upcoming",
              },
              {
                label: "Awaiting completion",
                value: visits.awaiting,
                window: "active",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={`/dashboard/site-visits?window=${item.window}`}
                className="rounded-lg border border-line bg-paper p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <MapPin size={17} className="text-brass-dark" />
                  <strong className="text-2xl tracking-[-0.04em]">
                    {item.value}
                  </strong>
                </div>
                <p className="mt-5 text-xs leading-4 text-stone">
                  {item.label}
                </p>
              </Link>
            ))}
          </section>
          <section className="rounded-lg border border-line bg-paper">
            <div className="flex items-end justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-base font-semibold">
                  Today&apos;s site visits
                </h2>
                <p className="mt-1 text-sm text-stone">
                  The live field schedule in Dubai time.
                </p>
              </div>
              <Link
                href="/dashboard/site-visits?window=today"
                className="min-h-10 py-2 text-sm font-medium text-brass-dark"
              >
                Open queue
              </Link>
            </div>
            {visits.todayVisits.length ? (
              <div className="divide-y divide-line">
                {visits.todayVisits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/dashboard/site-visits/${visit.id}`}
                    className="grid gap-2 px-4 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_9rem_9rem] sm:items-center sm:px-5"
                  >
                    <strong className="text-sm">
                      {siteVisitReference(visit.visit_number)}
                    </strong>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {visit.customer?.name || "Customer"}
                      </p>
                      <p className="truncate text-xs text-stone">
                        {visit.site_address}
                      </p>
                    </div>
                    <span className="text-xs">
                      {siteVisitStatusLabel(visit.status)}
                    </span>
                    <span className="text-xs text-stone sm:text-right">
                      {visit.assigned?.full_name || "Unassigned"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-stone">
                No site visits scheduled today.
              </p>
            )}
          </section>
        </>
      )}
      {quotationMetrics && (
        <section
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5"
          aria-label="Quotation summary"
        >
          {[
            {
              label: "Draft quotations",
              value: String(quotationMetrics.draft),
              href: "/dashboard/quotations?status=draft",
            },
            {
              label: "Awaiting approval",
              value: String(quotationMetrics.ready),
              href: "/dashboard/quotations?status=ready",
            },
            {
              label: "Sent quotations",
              value: String(quotationMetrics.sent),
              href: "/dashboard/quotations?status=sent",
            },
            {
              label: "Expiring soon",
              value: String(quotationMetrics.expiring),
              href: "/dashboard/quotations?expired=soon",
            },
            {
              label: "Approved value",
              value: formatMoney(quotationMetrics.approvedValue),
              href: "/dashboard/quotations?status=approved",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="min-w-0 rounded-lg border border-line bg-paper p-4"
            >
              <FileText size={17} className="text-brass-dark" />
              <strong className="mt-4 block truncate text-xl tracking-[-0.03em]">
                {item.value}
              </strong>
              <p className="mt-2 text-xs leading-4 text-stone">{item.label}</p>
            </Link>
          ))}
        </section>
      )}
      {financeMetrics ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Accounts position</h2><p className="mt-1 text-sm text-stone">Current collections, open balances, and due-date risk.</p></div><Link href="/dashboard/payments" className="min-h-10 py-2 text-sm font-medium text-brass-dark">Open payments</Link></div>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {[
              ["Received this month", financeMetrics.received_this_month, "/dashboard/payments"],
              ["Outstanding", financeMetrics.outstanding, "/dashboard/payments"],
              ["Overdue", financeMetrics.overdue, "/dashboard/payments?due=overdue"],
              ["Due next 7 days", financeMetrics.due_soon, "/dashboard/payments?due=soon"],
            ].map(([label, value, href]) => <Link key={label} href={String(href)} className="rounded-lg border border-line bg-paper p-4"><strong className={`block truncate text-xl tracking-[-0.03em] ${label === "Overdue" && Number(value) > 0 ? "text-red-700" : ""}`}>{label === "Due next 7 days" ? Number(value) : formatMoney(Number(value))}</strong><p className="mt-3 text-xs text-stone">{label}</p></Link>)}
          </div>
          <p className="text-xs text-stone">Received today: <strong className="text-graphite">{formatMoney(financeMetrics.received_today)}</strong> · Total received: {formatMoney(financeMetrics.received)} · Portfolio value: {formatMoney(financeMetrics.project_value)}</p>
        </section>
      ) : null}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Project operations</h2><p className="mt-1 text-sm text-stone">Delivery, installation, handover, and blocked work.</p></div><Link href="/dashboard/projects" className="min-h-10 py-2 text-sm font-medium text-brass-dark">All projects</Link></div>
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {[
            ["Active projects", projectMetrics.active],
            ["Overdue projects", projectMetrics.overdue],
            ["Installations · 14 days", projectMetrics.upcomingInstallations],
            ["Handover pending", projectMetrics.handoverPending],
          ].map(([label, value]) => <Link key={label} href="/dashboard/projects" className="rounded-lg border border-line bg-paper p-4"><div className="flex items-center justify-between gap-2"><FolderKanban size={17} className="text-brass-dark" /><strong className="text-2xl tracking-[-0.04em]">{value}</strong></div><p className="mt-5 text-xs text-stone">{label}</p></Link>)}
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
          <div className="rounded-lg border border-line bg-paper"><div className="border-b border-line px-4 py-4 sm:px-5"><h3 className="text-base font-semibold">Projects needing attention</h3><p className="mt-1 text-sm text-stone">Blocked stages, overdue tasks, passed targets, or handover issues.</p></div>{projectMetrics.attention.length ? <div className="divide-y divide-line">{projectMetrics.attention.map((project) => <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="grid gap-2 px-4 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_9rem_5rem] sm:items-center sm:px-5"><strong className="text-sm">{project.project_number}</strong><div className="min-w-0"><p className="truncate text-sm font-medium">{project.customer?.name || "Customer"}</p><p className="truncate text-xs text-stone">{project.current_stage?.name || "No current stage"}</p></div><span className="text-xs">{projectStatusLabel(project.status)}</span><span className="text-xs text-stone sm:text-right">{project.progress}%</span></Link>)}</div> : <p className="px-5 py-9 text-center text-sm text-stone">No project needs attention.</p>}</div>
          <div className="rounded-lg border border-line bg-paper p-5"><h3 className="text-base font-semibold">Projects by stage</h3><div className="mt-4 divide-y divide-line">{projectMetrics.byStage.length ? projectMetrics.byStage.map((stage) => <Link key={stage.key} href={`/dashboard/projects?stage=${stage.key}`} className="flex items-center justify-between gap-3 py-3"><span className="text-sm">{stage.name}</span><strong>{stage.count}</strong></Link>) : <p className="py-5 text-sm text-stone">No active project stages.</p>}</div></div>
        </div>
      </section>
    </div>
  );
}
