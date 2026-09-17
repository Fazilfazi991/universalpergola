import type { InvoiceStatus } from "./types";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  partially_paid: "Partially paid",
  paid: "Paid",
  cancelled: "Cancelled",
};

export function invoiceStatusLabel(status: InvoiceStatus) {
  return INVOICE_STATUS_LABELS[status];
}

export function invoiceStatusClass(status: InvoiceStatus) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "partially_paid") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "issued") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "cancelled") return "border-red-200 bg-red-50 text-red-800";
  return "border-line bg-limestone text-stone";
}

export function invoiceActivityLabel(eventType: string) {
  const labels: Record<string, string> = {
    "invoice.created": "Invoice created",
    "invoice.updated": "Invoice updated",
    "invoice.issued": "Invoice issued",
    "invoice.cancelled": "Invoice cancelled",
    "invoice.pdf_generated": "Invoice PDF generated",
    "invoice.payment_status_updated": "Invoice payment status updated",
  };
  return labels[eventType] || eventType.replaceAll(".", " ").replace(/^./, (letter) => letter.toUpperCase());
}
