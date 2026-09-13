import { QUOTATION_STATUS_LABELS } from "./constants.ts";
import type { QuotationStatus } from "./types.ts";

export function quotationStatusLabel(
  status: QuotationStatus,
  validityDate?: string | null,
) {
  if (
    status === "sent" &&
    validityDate &&
    validityDate < new Date().toISOString().slice(0, 10)
  )
    return "Expired";
  return QUOTATION_STATUS_LABELS[status];
}

export function quotationStatusClass(
  status: QuotationStatus,
  validityDate?: string | null,
) {
  if (
    status === "sent" &&
    validityDate &&
    validityDate < new Date().toISOString().slice(0, 10)
  )
    return "border-amber-300 bg-amber-50 text-amber-900";
  if (status === "approved")
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "rejected" || status === "cancelled")
    return "border-red-300 bg-red-50 text-red-800";
  if (status === "sent" || status === "ready")
    return "border-blue-300 bg-blue-50 text-blue-800";
  if (status === "revised" || status === "expired")
    return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-line bg-limestone text-graphite";
}

export function quotationActivityLabel(
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  const current = typeof metadata.status === "string" ? metadata.status : "";
  if (eventType === "quotations.insert")
    return metadata.revision ? "Revision created" : "Quotation created";
  if (eventType === "quotation.item_insert") return "Quotation item added";
  if (eventType === "quotation.item_update") return "Quotation item updated";
  if (eventType === "quotation.item_delete") return "Quotation item removed";
  if (eventType === "quotation.pdf_generated") return "PDF generated";
  if (eventType === "quotation.revision_created") return "Revision created";
  if (eventType === "quotation.project_converted")
    return "Converted to project";
  if (eventType === "quotations.update" && current)
    return `Quotation marked ${quotationStatusLabel(current as QuotationStatus).toLowerCase()}`;
  if (eventType === "quotations.update") return "Quotation updated";
  return eventType
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
