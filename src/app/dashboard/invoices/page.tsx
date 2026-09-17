import Link from "next/link";
import { ArrowRight, FilePlus2, ReceiptText } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { requireModuleAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/crm/presentation";
import { invoiceStatusClass, invoiceStatusLabel } from "@/lib/invoices/presentation";
import { getInvoices, invoiceFilters } from "@/lib/invoices/queries";
import { formatMoney } from "@/lib/quotations/money";

export default async function InvoicesPage({ searchParams }: PageProps<"/dashboard/invoices">) {
  const [, params] = await Promise.all([requireModuleAccess("invoices"), searchParams]);
  const filters = invoiceFilters(params);
  const invoices = await getInvoices(filters);
  return <div className="space-y-7">
    <PageHeading title="Invoices" description="Commercial invoice snapshots generated from approved project quotations." action={<Link href="/dashboard/invoices/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-graphite px-4 text-sm font-semibold text-white"><FilePlus2 size={17} />Generate invoice</Link>} />
    <form className="grid gap-3 border-y border-line bg-paper py-4 sm:rounded-lg sm:border sm:p-4 md:grid-cols-2 xl:grid-cols-5">
      <input name="search" defaultValue={filters.search} placeholder="Invoice, reference, customer, project, or site" className="min-h-11 rounded-md border border-line bg-paper px-3 text-base xl:col-span-2" />
      <select name="status" defaultValue={filters.status} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base"><option value="">Any status</option><option value="draft">Draft</option><option value="issued">Issued</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select>
      <label className="grid gap-1 text-xs text-stone">From<input type="date" name="from" defaultValue={filters.from} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base text-graphite" /></label>
      <div className="grid grid-cols-[1fr_auto] gap-2"><label className="grid gap-1 text-xs text-stone">To<input type="date" name="to" defaultValue={filters.to} className="min-h-11 rounded-md border border-line bg-paper px-3 text-base text-graphite" /></label><button className="min-h-11 self-end rounded-md border border-line px-4 text-sm font-semibold">Apply</button></div>
    </form>
    {!invoices.length ? <EmptyState icon={ReceiptText} title="No invoices found" description="Generate a Draft invoice from a project with a current approved quotation." /> : <>
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-paper lg:block"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-line bg-limestone/70 text-xs text-stone"><tr><th className="px-4 py-3 font-medium">Invoice</th><th className="px-4 py-3 font-medium">Reference</th><th className="px-4 py-3 font-medium">Customer / project</th><th className="px-4 py-3 font-medium">Issue / due</th><th className="px-4 py-3 text-right font-medium">Total</th><th className="px-4 py-3 font-medium">Status</th><th><span className="sr-only">Open</span></th></tr></thead><tbody className="divide-y divide-line">{invoices.map((invoice) => <tr key={invoice.id}><td className="px-4 py-3 font-semibold">{invoice.invoice_number}</td><td className="px-4 py-3 text-xs text-brass-dark">{invoice.client_reference}</td><td className="px-4 py-3"><p>{invoice.customer?.name || "Customer"}</p><p className="text-xs text-stone">{invoice.project?.project_number || "Project"}</p></td><td className="px-4 py-3"><p>{formatDate(invoice.issue_date)}</p><p className="text-xs text-stone">Due {formatDate(invoice.due_date)}</p></td><td className="px-4 py-3 text-right font-semibold">{formatMoney(invoice.total, invoice.currency)}</td><td className="px-4 py-3"><span className={`rounded-sm border px-2 py-1 text-xs ${invoiceStatusClass(invoice.status)}`}>{invoiceStatusLabel(invoice.status)}</span></td><td className="px-3 py-3"><Link href={`/dashboard/invoices/${invoice.id}`} aria-label={`Open ${invoice.invoice_number}`} className="grid size-10 place-items-center text-brass-dark"><ArrowRight size={16} /></Link></td></tr>)}</tbody></table></div>
      <div className="grid gap-3 lg:hidden">{invoices.map((invoice) => <Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}`} className="rounded-lg border border-line bg-paper p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{invoice.invoice_number}</p><p className="mt-1 truncate text-xs text-brass-dark">{invoice.client_reference}</p></div><span className={`shrink-0 rounded-sm border px-2 py-1 text-xs ${invoiceStatusClass(invoice.status)}`}>{invoiceStatusLabel(invoice.status)}</span></div><p className="mt-4 text-sm">{invoice.customer?.name || "Customer"} · {invoice.project?.project_number || "Project"}</p><div className="mt-3 flex items-end justify-between border-t border-line pt-3"><p className="text-xs text-stone">Issued {formatDate(invoice.issue_date)}<br />Due {formatDate(invoice.due_date)}</p><strong>{formatMoney(invoice.total, invoice.currency)}</strong></div></Link>)}</div>
    </>}
  </div>;
}
