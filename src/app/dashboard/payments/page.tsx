import Link from "next/link";
import { ArrowRight, Banknote, CalendarClock, CircleDollarSign, Download, ReceiptText, TriangleAlert } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { DemoDisabledNotice } from "@/components/dashboard/demo-disabled-notice";
import { requireModuleAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/crm/presentation";
import { paymentMethodLabel, paymentPlanLabel, paymentStatusClass, paymentStatusLabel } from "@/lib/payments/presentation";
import { getFinanceDashboardSummary, getFinanceMilestoneQueue, getFinanceProjectSummaries, getRecentReceipts } from "@/lib/payments/queries";
import { formatMoney } from "@/lib/quotations/money";
import { isDemoMode } from "@/lib/demo-mode-server";

function text(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function uniqueOptions<T>(items: T[], key: (item: T) => string, label: (item: T) => string) {
  return Array.from(new Map(items.map((item) => [key(item), label(item)])).entries()).filter(([value]) => value).sort((a, b) => a[1].localeCompare(b[1]));
}

export default async function PaymentsPage({ searchParams }: PageProps<"/dashboard/payments">) {
  const [profile, params] = await Promise.all([requireModuleAccess("payments"), searchParams]);
  const [summary, projects, receipts, milestones] = await Promise.all([
    getFinanceDashboardSummary(), getFinanceProjectSummaries(), getRecentReceipts(200), getFinanceMilestoneQueue(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);

  const balanceSearch = text(params.balance_search).trim().toLowerCase();
  const status = text(params.status);
  const due = text(params.due);
  const filteredProjects = projects.filter((project) => {
    if (balanceSearch && !`${project.project_number} ${project.customer_name}`.toLowerCase().includes(balanceSearch)) return false;
    if (status && project.plan_status !== status) return false;
    if (due === "overdue" && project.overdue <= 0) return false;
    if (due === "soon" && !(project.next_due_date && project.next_due_date >= today && project.next_due_date <= soon)) return false;
    return true;
  });

  const queueView = text(params.queue) || "upcoming";
  const queueItems = milestones.filter((item) => {
    if (queueView === "overdue") return item.status === "overdue";
    if (queueView === "due") return item.due_date === today && item.outstanding > 0;
    if (queueView === "paid") return item.status === "paid";
    return Boolean(item.due_date && item.due_date > today && item.outstanding > 0);
  });

  const receiptSearch = text(params.search).trim().toLowerCase();
  const projectId = text(params.project);
  const customerId = text(params.customer);
  const method = text(params.method);
  const recordedBy = text(params.recorded_by);
  const from = text(params.from);
  const to = text(params.to);
  const filteredReceipts = receipts.filter((receipt) => {
    const haystack = `${receipt.receipt_number} ${receipt.reference_number || ""} ${receipt.project?.project_number || ""} ${receipt.customer?.name || ""} ${receipt.milestone?.name || ""}`.toLowerCase();
    if (receiptSearch && !haystack.includes(receiptSearch)) return false;
    if (projectId && receipt.project_id !== projectId) return false;
    if (customerId && receipt.customer_id !== customerId) return false;
    if (method && receipt.payment_method !== method) return false;
    if (recordedBy && receipt.creator?.id !== recordedBy) return false;
    if (from && receipt.received_date < from) return false;
    if (to && receipt.received_date > to) return false;
    return true;
  });
  const projectOptions = uniqueOptions(receipts, (item) => item.project_id, (item) => item.project?.project_number || "Project");
  const customerOptions = uniqueOptions(receipts, (item) => item.customer_id, (item) => item.customer?.name || "Customer");
  const methodOptions = uniqueOptions(receipts, (item) => item.payment_method || "", (item) => paymentMethodLabel(item.payment_method));
  const recorderOptions = uniqueOptions(receipts, (item) => item.creator?.id || "", (item) => item.creator?.full_name || "Team member");

  return <div className="space-y-8">
    <PageHeading title="Payments" description="Authoritative balances, milestone schedules, immutable receipts, and private proof documents." action={!isDemoMode() ? <Link href="/dashboard/payments/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-graphite px-4 text-sm font-semibold text-white"><ReceiptText size={16} />Record payment</Link> : undefined} />
    {isDemoMode() && <DemoDisabledNotice>Recording, voiding, and uploading payment proof are disabled in the public demo.</DemoDisabledNotice>}

    <section className="overflow-hidden rounded-lg border border-line bg-paper" aria-label="Accounts reconciliation">
      <dl className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[["Project value", summary?.project_value], ["Total received", summary?.received], ["Received this month", summary?.received_this_month], ["Received today", summary?.received_today], ["Outstanding", summary?.outstanding], ["Overdue", summary?.overdue]].map(([label, value], index) => <div key={label} className={`border-line p-4 ${index % 2 === 0 ? "border-r" : ""} ${index < 4 ? "border-b xl:border-b-0" : ""} ${index < 5 ? "xl:border-r" : ""}`}><dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-stone">{label}</dt><dd className={`mt-2 truncate text-lg font-semibold tracking-[-0.03em] ${label === "Overdue" && Number(value) > 0 ? "text-red-700" : ""}`}>{formatMoney(Number(value || 0))}</dd></div>)}
      </dl>
      <div className="grid grid-cols-3 border-t border-line bg-limestone/70 px-4 py-3 text-center text-xs text-stone"><span>{summary?.active_plans || 0} active plans</span><span>{summary?.overdue_projects || 0} overdue projects</span><span>{summary?.due_soon || 0} due in 7 days</span></div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
      <section>
        <div><h2 className="text-lg font-semibold">Project balances</h2><p className="mt-1 text-sm text-stone">Reconcile project value against valid receipts.</p></div>
        <form className="mt-4 grid gap-3 rounded-lg border border-line bg-paper p-4 sm:grid-cols-2">
          <input name="balance_search" defaultValue={text(params.balance_search)} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base" placeholder="Project or customer" />
          <select name="status" defaultValue={status} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"><option value="">All plan states</option>{["draft", "active", "completed", "cancelled"].map((item) => <option key={item} value={item}>{paymentPlanLabel(item)}</option>)}</select>
          <select name="due" defaultValue={due} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"><option value="">All due dates</option><option value="overdue">Overdue</option><option value="soon">Due in 7 days</option></select>
          <button className="min-h-11 rounded-md border border-line px-4 text-sm font-semibold">Filter</button>
        </form>
        <div className="mt-4 hidden overflow-x-auto rounded-lg border border-line bg-paper md:block">
          <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-line bg-limestone/70 text-xs text-stone"><tr><th className="px-4 py-3 font-medium">Project / customer</th><th className="px-4 py-3 font-medium">Plan</th><th className="px-4 py-3 text-right font-medium">Value</th><th className="px-4 py-3 text-right font-medium">Received</th><th className="px-4 py-3 text-right font-medium">Outstanding</th><th className="px-4 py-3 font-medium">Next due</th><th /></tr></thead><tbody className="divide-y divide-line">{filteredProjects.map((project) => <tr key={project.project_id}><td className="px-4 py-3"><p className="font-semibold">{project.project_number}</p><p className="text-xs text-stone">{project.customer_name}</p></td><td className="px-4 py-3"><span className={`rounded-sm border px-2 py-1 text-xs ${paymentStatusClass(project.plan_status)}`}>{paymentPlanLabel(project.plan_status)}</span></td><td className="px-4 py-3 text-right">{formatMoney(project.project_value, project.currency)}</td><td className="px-4 py-3 text-right">{formatMoney(project.received, project.currency)}</td><td className={`px-4 py-3 text-right font-semibold ${project.overdue > 0 ? "text-red-700" : ""}`}>{formatMoney(project.outstanding, project.currency)}</td><td className="px-4 py-3"><p>{formatDate(project.next_due_date)}</p>{project.overdue > 0 ? <p className="text-xs text-red-700">{formatMoney(project.overdue, project.currency)} overdue</p> : null}</td><td className="px-4 py-3"><Link href={`/dashboard/payments/projects/${project.project_id}`} aria-label={`Open payments for ${project.project_number}`} className="grid size-10 place-items-center rounded-md text-brass-dark"><ArrowRight size={16} /></Link></td></tr>)}</tbody></table>
        </div>
        <div className="mt-4 grid gap-3 md:hidden">{filteredProjects.map((project) => <Link key={project.project_id} href={`/dashboard/payments/projects/${project.project_id}`} className="rounded-lg border border-line bg-paper p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{project.project_number}</p><p className="mt-1 text-xs text-stone">{project.customer_name}</p></div><span className={`rounded-sm border px-2 py-1 text-xs ${paymentStatusClass(project.plan_status)}`}>{paymentPlanLabel(project.plan_status)}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-stone">Received</dt><dd className="mt-1 font-medium">{formatMoney(project.received, project.currency)}</dd></div><div><dt className="text-xs text-stone">Outstanding</dt><dd className={`mt-1 font-semibold ${project.overdue > 0 ? "text-red-700" : ""}`}>{formatMoney(project.outstanding, project.currency)}</dd></div></dl><p className="mt-3 border-t border-line pt-3 text-xs text-stone">Next due {formatDate(project.next_due_date)}{project.overdue > 0 ? ` · ${formatMoney(project.overdue, project.currency)} overdue` : ""}</p></Link>)}</div>
        {!filteredProjects.length ? <p className="mt-4 rounded-lg border border-line bg-paper px-5 py-10 text-center text-sm text-stone">No project balances match these filters.</p> : null}
      </section>

      <aside className="rounded-lg bg-graphite p-5 text-white">
        <CircleDollarSign size={20} className="text-brass" /><h2 className="mt-4 text-lg font-semibold">Milestone queue</h2><p className="mt-1 text-sm text-white/60">Amounts still to collect, ordered by due date.</p>
        <nav className="mt-5 grid grid-cols-2 gap-2" aria-label="Milestone queue filters">{[["upcoming", "Upcoming"], ["due", "Due today"], ["overdue", "Overdue"], ["paid", "Paid"]].map(([value, label]) => <Link key={value} href={`/dashboard/payments?queue=${value}`} className={`rounded-md border px-3 py-2 text-center text-xs font-medium ${queueView === value ? "border-brass bg-brass/15 text-white" : "border-white/15 text-white/65"}`}>{label}</Link>)}</nav>
        <div className="mt-4 divide-y divide-white/10">{queueItems.slice(0, 10).map((item) => { const daysOverdue = item.due_date ? Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${item.due_date}T00:00:00Z`)) / 86400000)) : 0; return <Link key={item.milestone_id} href={`/dashboard/payments/projects/${item.project_id}`} className="block py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.project_number} · {item.milestone_name}</p><p className="mt-1 truncate text-xs text-white/55">{item.customer_name}</p></div><span className="shrink-0 text-sm font-semibold">{formatMoney(item.outstanding, item.currency)}</span></div><p className={`mt-2 text-xs ${item.status === "overdue" ? "text-red-300" : "text-white/55"}`}>{item.status === "overdue" ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` : `${paymentStatusLabel(item.status)} · ${formatDate(item.due_date)}`}</p></Link>; })}{!queueItems.length ? <p className="py-6 text-sm text-white/55">No milestones in this queue.</p> : null}</div>
      </aside>
    </div>

    <section>
      <div><h2 className="text-lg font-semibold">Payment history</h2><p className="mt-1 text-sm text-stone">Complete immutable receipt register · {filteredReceipts.length} result{filteredReceipts.length === 1 ? "" : "s"}.</p></div>
      <form className="mt-4 grid gap-3 rounded-lg border border-line bg-paper p-4 sm:grid-cols-2 xl:grid-cols-4">
        <input name="search" defaultValue={text(params.search)} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base" placeholder="Receipt or reference" />
        <select name="project" defaultValue={projectId} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"><option value="">All projects</option>{projectOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select name="customer" defaultValue={customerId} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"><option value="">All customers</option>{customerOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select name="method" defaultValue={method} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"><option value="">All methods</option>{methodOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <label className="grid gap-1 text-xs text-stone">From<input type="date" name="from" defaultValue={from} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base text-graphite" /></label>
        <label className="grid gap-1 text-xs text-stone">To<input type="date" name="to" defaultValue={to} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base text-graphite" /></label>
        <select name="recorded_by" defaultValue={recordedBy} className="min-h-11 self-end rounded-md border border-line bg-paper px-3 text-base"><option value="">Recorded by anyone</option>{recorderOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className="min-h-11 self-end rounded-md bg-graphite px-4 text-sm font-semibold text-white">Apply filters</button>
      </form>
      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-line bg-paper lg:block">
        <table className="w-full min-w-[1040px] text-left text-sm"><thead className="border-b border-line bg-limestone/70 text-xs text-stone"><tr><th className="px-4 py-3 font-medium">Receipt</th><th className="px-4 py-3 font-medium">Project</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Milestone</th><th className="px-4 py-3 text-right font-medium">Amount</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Method</th><th className="px-4 py-3 font-medium">Recorded by</th><th><span className="sr-only">PDF</span></th></tr></thead><tbody className="divide-y divide-line">{filteredReceipts.map((receipt) => <tr key={receipt.id} className={receipt.voided_at ? "text-stone" : ""}><td className="px-4 py-3"><Link href={`/dashboard/payments/${receipt.id}`} className={`font-semibold text-brass-dark ${receipt.voided_at ? "line-through" : ""}`}>{receipt.receipt_number}</Link>{receipt.voided_at ? <span className="ml-2 rounded-sm border border-stone-300 px-1.5 py-0.5 text-[10px] uppercase">Void</span> : null}</td><td className="px-4 py-3">{receipt.project?.project_number || "—"}</td><td className="px-4 py-3">{receipt.customer?.name || "—"}</td><td className="px-4 py-3">{receipt.milestone?.name || "—"}</td><td className="px-4 py-3 text-right font-semibold">{formatMoney(receipt.amount_received, receipt.project?.currency || "AED")}</td><td className="px-4 py-3">{formatDate(receipt.received_date)}</td><td className="px-4 py-3">{paymentMethodLabel(receipt.payment_method)}</td><td className="px-4 py-3">{receipt.creator?.full_name || "—"}</td><td className="px-3 py-3"><Link href={`/dashboard/payments/${receipt.id}/pdf`} target="_blank" aria-label={`View PDF for ${receipt.receipt_number}`} className="grid size-10 place-items-center rounded-md text-brass-dark"><Download size={16} /></Link></td></tr>)}</tbody></table>
      </div>
      <div className="mt-4 grid gap-3 lg:hidden">{filteredReceipts.map((receipt) => <article key={receipt.id} className="rounded-lg border border-line bg-paper p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/dashboard/payments/${receipt.id}`} className={`font-semibold text-brass-dark ${receipt.voided_at ? "line-through" : ""}`}>{receipt.receipt_number}</Link><p className="mt-1 text-xs text-stone">{receipt.project?.project_number || "Project"} · {receipt.customer?.name || "Customer"}</p></div><strong>{formatMoney(receipt.amount_received, receipt.project?.currency || "AED")}</strong></div><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs"><div><dt className="text-stone">Milestone</dt><dd className="mt-1">{receipt.milestone?.name || "—"}</dd></div><div><dt className="text-stone">Date / method</dt><dd className="mt-1">{formatDate(receipt.received_date)} · {paymentMethodLabel(receipt.payment_method)}</dd></div><div><dt className="text-stone">Recorded by</dt><dd className="mt-1">{receipt.creator?.full_name || "—"}{receipt.voided_at ? " · Voided" : ""}</dd></div><div className="flex items-end justify-end"><Link href={`/dashboard/payments/${receipt.id}/pdf`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line px-3 font-semibold text-brass-dark"><Download size={14} />PDF</Link></div></dl></article>)}</div>
      {!filteredReceipts.length ? <p className="mt-4 rounded-lg border border-line bg-paper px-5 py-10 text-center text-sm text-stone">No receipts match these filters.</p> : null}
    </section>

    <p className="flex items-center gap-2 text-xs text-stone"><Banknote size={14} />Signed-in role: {profile.role === "admin" ? "Management" : "Accounts"} · all displayed balances are calculated by Postgres.</p>
    <p className="sr-only"><TriangleAlert />Overdue risk <CalendarClock />Upcoming dates</p>
  </div>;
}
