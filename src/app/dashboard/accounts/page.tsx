import Link from "next/link";
import { Landmark, LockKeyhole } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentProfile } from "@/lib/auth/dal";
import { DEMO_FINANCE } from "@/lib/demo/data";
import { isDemoMode } from "@/lib/demo-mode-server";
import { formatMoney } from "@/lib/quotations/money";

export default async function DemoAccountsPage() {
  await requireCurrentProfile();
  if (!isDemoMode()) return <div className="space-y-5"><PageHeading title="Accounts" description="This module is not included in the public demo yet." /><Link href="/dashboard" className="text-sm font-semibold text-brass-dark">Return to Dashboard</Link></div>;
  return <div className="space-y-7"><PageHeading title="Accounts" description="A synthetic finance position for the public portfolio walkthrough." /><section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Portfolio value", DEMO_FINANCE.project_value], ["Received", DEMO_FINANCE.received], ["Outstanding", DEMO_FINANCE.outstanding], ["Overdue", DEMO_FINANCE.overdue]].map(([label, value]) => <article key={String(label)} className="rounded-lg border border-line bg-paper p-5"><strong className="block text-xl tracking-[-0.03em]">{formatMoney(Number(value))}</strong><p className="mt-3 text-xs text-stone">{label}</p></article>)}</section><section className="rounded-lg border border-line bg-paper p-5"><div className="flex items-start gap-3"><Landmark className="mt-0.5 text-brass-dark" size={20} /><div><h2 className="font-semibold">Demo ledger</h2><p className="mt-1 text-sm text-stone">Synthetic collections, expenses, and private records are represented visually only. Payment recording and uploads are disabled.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-md bg-limestone p-4"><p className="text-xs text-stone">Collected this month</p><strong className="mt-2 block">{formatMoney(DEMO_FINANCE.received_this_month)}</strong></div><div className="rounded-md bg-limestone p-4"><p className="text-xs text-stone">Due next 7 days</p><strong className="mt-2 block">{formatMoney(DEMO_FINANCE.due_soon)}</strong></div><div className="rounded-md bg-limestone p-4"><p className="text-xs text-stone">Internal entries</p><strong className="mt-2 block">12</strong></div></div></section><p className="flex items-center gap-2 text-xs text-stone"><LockKeyhole size={14} />This action is disabled in the public demo.</p></div>;
}
