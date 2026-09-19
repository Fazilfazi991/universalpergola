import Link from "next/link";
import { FileStack, LockKeyhole } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentProfile } from "@/lib/auth/dal";
import { DEMO_QUOTATIONS } from "@/lib/demo/data";
import { isDemoMode } from "@/lib/demo-mode-server";
import { formatMoney } from "@/lib/quotations/money";

export default async function DemoDocumentsPage() {
  await requireCurrentProfile();
  if (!isDemoMode()) return <div className="space-y-5"><PageHeading title="Commercial Documents" description="This module is not included in the public demo yet." /><Link href="/dashboard" className="text-sm font-semibold text-brass-dark">Return to Dashboard</Link></div>;
  return <div className="space-y-7"><PageHeading title="Commercial Documents" description="A synthetic register of quotations and revisions linked to fictional client and project references." /><section className="rounded-lg border border-line bg-paper p-5"><div className="flex items-start gap-3"><FileStack className="mt-0.5 text-brass-dark" size={20} /><div><h2 className="font-semibold">Quotation register</h2><p className="mt-1 text-sm text-stone">PDF generation, approval, and external delivery are disabled in this public demo.</p></div></div><div className="mt-5 overflow-x-auto"><table className="min-w-[720px] w-full text-left text-sm"><thead className="border-b border-line bg-limestone text-xs text-stone"><tr><th className="px-4 py-3">Quotation</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-line">{DEMO_QUOTATIONS.map((quote) => <tr key={quote.id}><td className="px-4 py-3 font-semibold">{quote.quotation_number} · R{quote.revision_number}</td><td className="px-4 py-3">{quote.customer.name}</td><td className="px-4 py-3">{quote.project?.project_number || "—"}</td><td className="px-4 py-3">{formatMoney(quote.total, quote.currency)}</td><td className="px-4 py-3 capitalize">{quote.status}</td></tr>)}</tbody></table></div></section><p className="flex items-center gap-2 text-xs text-stone"><LockKeyhole size={14} />This action is disabled in the public demo.</p></div>;
}
