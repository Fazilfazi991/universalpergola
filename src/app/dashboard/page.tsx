import Link from "next/link";
import { AlertTriangle, CalendarClock, MessageSquareText, UserRoundX, Zap } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusNotice } from "@/components/ui/status-notice";
import { requireCurrentProfile } from "@/lib/auth/dal";
import { enquiryReference, formatDate, priorityLabel, statusLabel } from "@/lib/crm/presentation";
import { getCrmDashboard } from "@/lib/crm/queries";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const [profile, { notice }] = await Promise.all([requireCurrentProfile(), searchParams]);
  const canUseCrm = profile.role === "admin" || profile.role === "sales";
  const crm = canUseCrm ? await getCrmDashboard() : null;
  const summaries = crm ? [
    { label: "New enquiries", value: crm.newEnquiries, icon: MessageSquareText },
    { label: "Due today", value: crm.dueToday, icon: CalendarClock },
    { label: "Overdue follow-ups", value: crm.overdue, icon: AlertTriangle },
    { label: "Unassigned", value: crm.unassigned, icon: UserRoundX },
    { label: "High / urgent", value: crm.priorityLeads, icon: Zap },
  ] : [];
  return <div className="space-y-7">
    <PageHeading title="Operations overview" description="Actionable work across sales, site delivery, projects, and accounts." />
    {notice === "access-denied" && <StatusNotice tone="error" title="Access restricted"><p>Your role does not have permission to open that module.</p></StatusNotice>}
    {crm ? <><section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" aria-label="Sales summary">{summaries.map(({ label, value, icon: Icon }) => <article key={label} className="min-w-0 rounded-lg border border-line bg-paper p-4"><div className="flex items-center justify-between gap-2"><Icon size={17} className="text-brass-dark" strokeWidth={1.7} /><strong className="text-2xl tracking-[-0.04em]">{value}</strong></div><p className="mt-5 text-xs leading-4 text-stone">{label}</p></article>)}</section><section className="rounded-lg border border-line bg-paper"><div className="flex items-end justify-between gap-4 border-b border-line px-4 py-4 sm:px-5"><div><h2 className="text-base font-semibold">Needs attention</h2><p className="mt-1 text-sm text-stone">New, unassigned, overdue, and priority opportunities.</p></div><Link href="/dashboard/enquiries" className="min-h-10 py-2 text-sm font-medium text-brass-dark">All enquiries</Link></div>{crm.needsAttention.length ? <div className="divide-y divide-line">{crm.needsAttention.map((item) => <Link key={item.id} href={`/dashboard/enquiries/${item.id}`} className="grid gap-2 px-4 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_9rem_9rem] sm:items-center sm:px-5"><strong className="text-sm">{enquiryReference(item.enquiry_number)}</strong><div className="min-w-0"><p className="truncate text-sm font-medium">{item.customer?.name || "Unlinked customer"}</p><p className="truncate text-xs text-stone">{item.subject || item.product?.name || item.next_action || "No context recorded"}</p></div><span className="text-xs">{statusLabel(item.status)}</span><div className="text-xs text-stone sm:text-right"><p>{["high", "urgent"].includes(item.priority) ? priorityLabel(item.priority) : item.assigned?.full_name || "Unassigned"}</p><p className="mt-1">{item.follow_up_at ? formatDate(item.follow_up_at, true) : "No follow-up"}</p></div></Link>)}</div> : <p className="px-5 py-10 text-center text-sm text-stone">Nothing needs attention right now.</p>}</section></> : <StatusNotice title="Role-specific overview"><p>Sales metrics are visible to Management and Sales. Your operational modules remain available in the navigation.</p></StatusNotice>}
    <section className="grid gap-3 md:grid-cols-3"><Panel title="Upcoming site visits" /><Panel title="Project stages" /><Panel title="Payment summary" /></section>
  </div>;
}

function Panel({ title }: { title: string }) {
  return <div className="rounded-lg border border-line bg-paper p-5"><h2 className="text-sm font-semibold">{title}</h2><div className="mt-5 border-t border-line pt-5 text-sm text-stone">No live data yet.</div></div>;
}
