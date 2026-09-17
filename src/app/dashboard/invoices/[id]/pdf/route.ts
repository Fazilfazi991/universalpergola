import { recordInvoicePdfGeneration } from "@/app/dashboard/invoices/actions";
import { requireModuleAccess } from "@/lib/auth/dal";
import { generateInvoicePdf } from "@/lib/invoices/pdf";
import { getInvoice, getInvoiceWorkspace } from "@/lib/invoices/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext<"/dashboard/invoices/[id]/pdf">) {
  await requireModuleAccess("invoices");
  const { id } = await context.params;
  const invoice = await getInvoice(id);
  if (!invoice) return new Response("Invoice not found", { status: 404 });
  const { items } = await getInvoiceWorkspace(invoice);
  const bytes = await generateInvoicePdf(invoice, items);
  await recordInvoicePdfGeneration(id);
  const filename = invoice.invoice_number.replace(/[^A-Za-z0-9._-]/g, "-");
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}.pdf"`, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}
