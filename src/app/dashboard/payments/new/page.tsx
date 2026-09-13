import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RecordPaymentForm } from "@/components/dashboard/payment-controls";
import { PageHeading } from "@/components/ui/page-heading";
import { requireModuleAccess } from "@/lib/auth/dal";
import { formatMoney } from "@/lib/quotations/money";
import { getFinanceProjectSummaries, getMilestoneSummaries } from "@/lib/payments/queries";

export default async function NewPaymentPage({ searchParams }: PageProps<"/dashboard/payments/new">) {
  await requireModuleAccess("payments");
  const [params, projects] = await Promise.all([searchParams, getFinanceProjectSummaries()]);
  const projectId = typeof params.project === "string" ? params.project : "";
  const milestones = projectId ? await getMilestoneSummaries(projectId) : [];
  const selected = projects.find((project) => project.project_id === projectId);
  return <div className="mx-auto max-w-4xl space-y-7"><Link href={projectId ? `/dashboard/payments/projects/${projectId}` : "/dashboard/payments"} className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to payments</Link><PageHeading title="Record payment" description="Post a receipt against one active milestone. The database blocks overpayment and assigns the receipt number." />
    {selected ? <section className="rounded-lg border border-line bg-paper p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-4"><div><p className="font-semibold">{selected.project_number}</p><p className="text-sm text-stone">{selected.customer_name}</p></div><p className="text-sm"><span className="text-stone">Outstanding </span><strong>{formatMoney(selected.outstanding, selected.currency)}</strong></p></div><RecordPaymentForm projects={projects} initialProjectId={projectId} milestones={milestones} /></section> :
    <section className="rounded-lg border border-line bg-paper p-5 sm:p-6"><h2 className="text-base font-semibold">Choose an active plan</h2><div className="mt-4 divide-y divide-line">{projects.filter((project) => project.plan_status === "active" && project.outstanding > 0).map((project) => <Link key={project.project_id} href={`/dashboard/payments/new?project=${project.project_id}`} className="flex min-h-16 items-center justify-between gap-4 py-3"><div><p className="font-medium">{project.project_number}</p><p className="text-xs text-stone">{project.customer_name}</p></div><div className="flex items-center gap-3"><span className="text-sm font-semibold">{formatMoney(project.outstanding, project.currency)}</span><ArrowRight size={16} className="text-brass-dark" /></div></Link>)}</div></section>}
  </div>;
}
