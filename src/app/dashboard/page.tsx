import { Banknote, CalendarDays, ClipboardCheck, FileText, FolderKanban, MessageSquareText, RefreshCcw, WalletCards } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusNotice } from "@/components/ui/status-notice";

const summaries = [
  { label: "New enquiries", icon: MessageSquareText }, { label: "Follow-ups due", icon: RefreshCcw },
  { label: "Site visits", icon: CalendarDays }, { label: "Quotations pending", icon: FileText },
  { label: "Active projects", icon: FolderKanban }, { label: "Delayed projects", icon: ClipboardCheck },
  { label: "Payments received", icon: Banknote }, { label: "Outstanding", icon: WalletCards },
];

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { notice } = await searchParams;
  return (
    <div className="space-y-7">
      <PageHeading title="Operations overview" description="Actionable work across sales, site delivery, projects, and accounts." />
      {notice === "access-denied" && <StatusNotice tone="error" title="Access restricted"><p>Your role does not have permission to open that module.</p></StatusNotice>}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8" aria-label="Summary metrics">
        {summaries.map(({ label, icon: Icon }) => <article key={label} className="min-w-0 rounded-lg border border-line bg-paper p-3.5"><div className="flex items-center justify-between gap-2"><Icon size={17} className="text-brass-dark" strokeWidth={1.7} /><span className="text-lg font-semibold text-graphite">—</span></div><p className="mt-4 text-xs leading-4 text-stone">{label}</p></article>)}
      </section>
      <StatusNotice title="Live metrics begin with real data"><p>Summary values remain empty until Supabase is connected and operational records are created.</p></StatusNotice>
      <section className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-line bg-paper p-5"><h2 className="text-base font-semibold tracking-[-0.02em]">Enquiry pipeline</h2><div className="mt-8 grid min-h-44 place-items-center border-t border-line text-center"><div><p className="text-sm font-medium">No enquiry activity yet</p><p className="mt-1 text-sm text-stone">Pipeline stages will populate from live records.</p></div></div></div>
        <div className="rounded-xl border border-line bg-paper p-5"><h2 className="text-base font-semibold tracking-[-0.02em]">Pending tasks</h2><div className="mt-8 grid min-h-44 place-items-center border-t border-line text-center"><div><p className="text-sm font-medium">Nothing assigned</p><p className="mt-1 text-sm text-stone">Due and overdue tasks will appear here.</p></div></div></div>
      </section>
      <section className="grid gap-3 md:grid-cols-3"><Panel title="Upcoming site visits" /><Panel title="Project stages" /><Panel title="Payment summary" /></section>
    </div>
  );
}

function Panel({ title }: { title: string }) {
  return <div className="rounded-xl border border-line bg-paper p-5"><h2 className="text-sm font-semibold">{title}</h2><div className="mt-5 border-t border-line pt-5 text-sm text-stone">No live data yet.</div></div>;
}
