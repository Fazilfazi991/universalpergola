import { requireModuleAccess } from "@/lib/auth/dal";
import { generatePaymentReceiptPdf } from "@/lib/payments/pdf";
import { getProjectFinanceSummary, getReceipt } from "@/lib/payments/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/dashboard/payments/[id]/pdf">,
) {
  await requireModuleAccess("payments");
  const { id } = await context.params;
  const receipt = await getReceipt(id);
  if (!receipt) return new Response("Receipt not found", { status: 404 });
  const finance = await getProjectFinanceSummary(receipt.project_id);
  if (!finance) return new Response("Project finance summary not found", { status: 404 });
  const bytes = await generatePaymentReceiptPdf(receipt, finance);
  const filename = receipt.receipt_number.replace(/[^A-Za-z0-9._-]/g, "-");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
