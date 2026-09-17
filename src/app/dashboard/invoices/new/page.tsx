import Link from "next/link";
import { ArrowLeft, ArrowRight, FilePlus2 } from "lucide-react";
import { createInvoiceFromProjectAction } from "@/app/dashboard/invoices/actions";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusNotice } from "@/components/ui/status-notice";
import { requireModuleAccess } from "@/lib/auth/dal";
import { getInvoiceSourceProjects } from "@/lib/invoices/queries";
import { formatMoney } from "@/lib/quotations/money";

export default async function NewInvoicePage({ searchParams }: PageProps<"/dashboard/invoices/new">) {
  const [, params, projects] = await Promise.all([requireModuleAccess("invoices"), searchParams, getInvoiceSourceProjects()]);
  const selected = typeof params.project === "string" ? projects.find((project) => project.id === params.project) : undefined;
  const error = typeof params.error === "string" ? params.error : "";
  return <div className="space-y-7">
    <Link href="/dashboard/invoices" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone"><ArrowLeft size={16} />Back to invoices</Link>
    <PageHeading title="Generate invoice" description="Choose a project with a current approved quotation. The Draft will preserve its own commercial snapshot." />
    {error ? <StatusNotice tone="error" title="Invoice was not created"><p>{decodeURIComponent(error)}</p></StatusNotice> : null}
    {selected ? <section className="grid gap-6 rounded-lg border border-line bg-paper p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><p className="text-xs font-medium text-brass-dark">{selected.client_reference || "Reference will be generated automatically"}</p><h2 className="mt-2 text-xl font-semibold">{selected.project_number}</h2><p className="mt-1 text-sm text-stone">{selected.customer?.name || "Customer"} · {selected.site_address || "Site not specified"}</p><p className="mt-4 text-sm">Approved quotation <strong>{selected.quotation?.quotation_number}</strong> · {formatMoney(Number(selected.quotation?.total || 0), selected.quotation?.currency || "AED")}</p></div><form action={createInvoiceFromProjectAction}><input type="hidden" name="project_id" value={selected.id} /><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-graphite px-5 text-sm font-semibold text-white"><FilePlus2 size={17} />Create Draft invoice</button></form></section> : null}
    <section><div><h2 className="text-lg font-semibold">Approved project sources</h2><p className="mt-1 text-sm text-stone">Invoice values are copied from the approved quotation, never recalculated from live products.</p></div><div className="mt-4 divide-y divide-line border-y border-line bg-paper sm:rounded-lg sm:border">{projects.length ? projects.map((project) => <Link key={project.id} href={`/dashboard/invoices/new?project=${project.id}`} className={`grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${selected?.id === project.id ? "bg-brass/8" : ""}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{project.project_number}</strong>{project.client_reference ? <span className="text-xs text-brass-dark">{project.client_reference}</span> : null}</div><p className="mt-1 truncate text-sm text-stone">{project.customer?.name || "Customer"} · {project.site_address || "Site not specified"}</p><p className="mt-1 text-xs text-stone">{project.quotation?.quotation_number} · {formatMoney(Number(project.quotation?.total || 0), project.quotation?.currency || "AED")}</p></div><span className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brass-dark">Select <ArrowRight size={15} /></span></Link>) : <p className="px-5 py-12 text-center text-sm text-stone">No projects with current approved quotations are available.</p>}</div></section>
  </div>;
}
