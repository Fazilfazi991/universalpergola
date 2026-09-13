import { requireModuleAccess } from "@/lib/auth/dal";
import { generateQuotationPdf } from "@/lib/quotations/pdf";
import { getQuotation, getQuotationWorkspace } from "@/lib/quotations/queries";
import { recordQuotationPdfGeneration } from "@/app/dashboard/quotations/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/dashboard/quotations/[id]/pdf">,
) {
  await requireModuleAccess("quotations");
  const { id } = await context.params;
  const quote = await getQuotation(id);
  if (!quote) return new Response("Quotation not found", { status: 404 });
  const { items } = await getQuotationWorkspace(quote);
  const bytes = await generateQuotationPdf(quote, items);
  await recordQuotationPdfGeneration(id);
  const filename = quote.quotation_number.replace(/[^A-Za-z0-9._-]/g, "-");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
