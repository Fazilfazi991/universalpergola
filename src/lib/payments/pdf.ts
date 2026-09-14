import { degrees, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { UNIVERSAL_PERGOLA_DOCUMENT } from "../documents/config.ts";
import { A4_HEIGHT, A4_WIDTH, PDF_COLORS, drawDocumentFooter, drawRightText, embedBrandLogo, pdfDate, pdfMoney, safePdfText, wrapPdfText } from "../documents/pdf-kit.ts";
import { paymentMethodLabel } from "./presentation.ts";
import type { FinanceSummary, ReceiptRow } from "./types.ts";

function drawWrapped(page: PDFPage, value: unknown, x: number, y: number, width: number, size: number, font: PDFFont, color = PDF_COLORS.stone, leading = size + 3) {
  const lines = wrapPdfText(value, font, size, width);
  lines.forEach((line, index) => page.drawText(line || " ", { x, y: y - index * leading, size, font, color }));
  return y - lines.length * leading;
}

export async function generatePaymentReceiptPdf(receipt: ReceiptRow, finance: FinanceSummary) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedBrandLogo(document);
  const page = document.addPage([A4_WIDTH, A4_HEIGHT]);
  const currency = receipt.project?.currency || finance.currency || "AED";
  const isVoid = Boolean(receipt.voided_at);
  const status = isVoid ? "Void - Reversed" : "Received";
  const modified = receipt.voided_at || receipt.created_at;

  document.setTitle(`${receipt.receipt_number} - Universal Pergola Payment Receipt`);
  document.setAuthor(UNIVERSAL_PERGOLA_DOCUMENT.tradeName);
  document.setSubject(isVoid ? "Voided payment receipt" : "Payment receipt");
  document.setCreator("Universal Pergola Operations Dashboard");
  document.setProducer("Universal Pergola Operations Dashboard");
  document.setCreationDate(new Date(receipt.created_at));
  document.setModificationDate(new Date(modified));

  page.drawRectangle({ x: 0, y: A4_HEIGHT - 12, width: A4_WIDTH, height: 12, color: PDF_COLORS.brass });
  page.drawImage(logo, { x: 36, y: 697, width: 108, height: 108 });
  page.drawImage(logo, { x: 150, y: 215, width: 310, height: 310, opacity: 0.035 });
  page.drawText("UNIVERSAL PERGOLA", { x: 36, y: 681, size: 10.5, font: bold, color: PDF_COLORS.ink });
  page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.tagline.toUpperCase(), { x: 36, y: 666, size: 6, font: regular, color: PDF_COLORS.brass });

  page.drawText("P A Y M E N T", { x: 300, y: 771, size: 17, font: bold, color: PDF_COLORS.ink });
  page.drawText("R E C E I P T", { x: 300, y: 746, size: 17, font: bold, color: PDF_COLORS.ink });
  page.drawRectangle({ x: 300, y: 731, width: 48, height: 3, color: isVoid ? PDF_COLORS.red : PDF_COLORS.brass });
  page.drawText(safePdfText(receipt.receipt_number), { x: 300, y: 709, size: 9, font: bold, color: PDF_COLORS.ink });

  page.drawRectangle({ x: 300, y: 646, width: 259, height: 47, color: isVoid ? rgb(0.99, 0.91, 0.9) : PDF_COLORS.sand });
  page.drawText("DATE", { x: 313, y: 676, size: 5.8, font: bold, color: PDF_COLORS.stone });
  page.drawText(pdfDate(receipt.received_date), { x: 313, y: 660, size: 8.5, font: bold, color: PDF_COLORS.ink });
  page.drawText("STATUS", { x: 442, y: 676, size: 5.8, font: bold, color: PDF_COLORS.stone });
  page.drawText(status.toUpperCase(), { x: 442, y: 660, size: 8.5, font: bold, color: isVoid ? PDF_COLORS.red : PDF_COLORS.green });

  page.drawText("BILL TO", { x: 36, y: 625, size: 6.5, font: bold, color: PDF_COLORS.brass });
  page.drawText(safePdfText(receipt.customer?.name || "Customer"), { x: 36, y: 607, size: 10.5, font: bold, color: PDF_COLORS.ink });
  page.drawText(safePdfText(receipt.customer?.phone || "Phone not provided"), { x: 36, y: 592, size: 7.5, font: regular, color: PDF_COLORS.stone });
  page.drawText("PROJECT", { x: 300, y: 625, size: 6.5, font: bold, color: PDF_COLORS.brass });
  page.drawText(safePdfText(receipt.project?.project_number || "-"), { x: 300, y: 607, size: 9, font: bold, color: PDF_COLORS.ink });
  page.drawText(`Source quotation: ${safePdfText(receipt.project?.source_quotation_number || "-")}`, { x: 300, y: 592, size: 7.2, font: regular, color: PDF_COLORS.stone });

  const tableX = 36;
  const tableRight = A4_WIDTH - 36;
  const tableWidth = tableRight - tableX;
  page.drawRectangle({ x: tableX, y: 535, width: tableWidth, height: 32, color: PDF_COLORS.charcoal });
  page.drawText("SERVICE / DESCRIPTION", { x: tableX + 12, y: 547, size: 7, font: bold, color: PDF_COLORS.white });
  page.drawText("QTY", { x: 400, y: 547, size: 7, font: bold, color: PDF_COLORS.white });
  drawRightText(page, "AMOUNT", tableRight - 10, 547, 7, bold, PDF_COLORS.white);

  const service = receipt.milestone?.description || `Payment received for ${receipt.milestone?.name || receipt.project?.project_number || "project services"}.`;
  page.drawText(safePdfText(receipt.milestone?.name || "Project payment"), { x: tableX + 12, y: 508, size: 10, font: bold, color: PDF_COLORS.ink });
  drawWrapped(page, service, tableX + 12, 492, 330, 7.3, regular, PDF_COLORS.stone, 10);
  page.drawText("1", { x: 402, y: 508, size: 8, font: regular, color: PDF_COLORS.ink });
  drawRightText(page, pdfMoney(receipt.amount_received, currency), tableRight - 10, 508, 9, bold);
  page.drawLine({ start: { x: tableX, y: 455 }, end: { x: tableRight, y: 455 }, thickness: 0.7, color: PDF_COLORS.line });

  page.drawText("TOTAL RECEIVED", { x: 344, y: 427, size: 8, font: bold, color: PDF_COLORS.stone });
  drawRightText(page, pdfMoney(receipt.amount_received, currency), tableRight, 424, 14, bold, isVoid ? PDF_COLORS.red : PDF_COLORS.ink);
  if (isVoid) page.drawLine({ start: { x: 455, y: 431 }, end: { x: tableRight, y: 431 }, thickness: 1.4, color: PDF_COLORS.red });

  const leftX = 36;
  const rightX = 315;
  const detailY = 374;
  const detail = (label: string, value: string, x: number, y: number, width: number) => {
    page.drawText(label.toUpperCase(), { x, y, size: 6, font: bold, color: PDF_COLORS.brass });
    drawWrapped(page, value || "-", x, y - 17, width, 8.2, bold, PDF_COLORS.ink, 10);
  };
  detail("Payment method", paymentMethodLabel(receipt.payment_method), leftX, detailY, 220);
  detail("Payment status", status, rightX, detailY, 225);
  detail("Transaction reference", receipt.reference_number || "Not provided", leftX, detailY - 55, 220);
  detail("Remaining amount due", pdfMoney(finance.outstanding, currency), rightX, detailY - 55, 225);
  detail("Project total", pdfMoney(receipt.project?.project_value ?? finance.project_value, currency), leftX, detailY - 110, 220);
  detail("Recorded by", receipt.creator?.full_name || "Finance team", rightX, detailY - 110, 225);

  if (isVoid) {
    page.drawRectangle({ x: 36, y: 183, width: tableWidth, height: 48, color: rgb(0.99, 0.91, 0.9), borderColor: PDF_COLORS.red, borderWidth: 0.8 });
    page.drawText("VOID - THIS RECEIPT HAS BEEN REVERSED", { x: 49, y: 211, size: 9.5, font: bold, color: PDF_COLORS.red });
    drawWrapped(page, receipt.void_reason || "Receipt reversed in the finance system.", 49, 195, tableWidth - 26, 7, regular, PDF_COLORS.red, 9);
  } else {
    page.drawText("THANK YOU FOR YOUR PAYMENT.", { x: 36, y: 210, size: 12, font: bold, color: PDF_COLORS.ink });
    page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.footerLine, { x: 36, y: 194, size: 6.8, font: regular, color: PDF_COLORS.stone });
  }

  page.drawLine({ start: { x: 364, y: 165 }, end: { x: 559, y: 165 }, thickness: 0.7, color: PDF_COLORS.line });
  drawRightText(page, UNIVERSAL_PERGOLA_DOCUMENT.signatoryName.toUpperCase(), 559, 148, 8, bold, PDF_COLORS.ink);
  drawRightText(page, UNIVERSAL_PERGOLA_DOCUMENT.signatoryTitle.toUpperCase(), 559, 135, 6.5, regular, PDF_COLORS.stone);
  page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.legalName, { x: 36, y: 148, size: 6.8, font: bold, color: PDF_COLORS.ink });
  page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.address, { x: 36, y: 135, size: 6.5, font: regular, color: PDF_COLORS.stone });
  page.drawText(`${UNIVERSAL_PERGOLA_DOCUMENT.instagram}  |  ${UNIVERSAL_PERGOLA_DOCUMENT.phones.join(" / ")}`, { x: 36, y: 122, size: 6.5, font: regular, color: PDF_COLORS.stone });

  if (isVoid) {
    page.drawText("VOID", { x: 156, y: 388, size: 82, font: bold, color: PDF_COLORS.red, opacity: 0.1, rotate: degrees(25) });
  }
  drawDocumentFooter(page, regular, bold, 1, 1, receipt.receipt_number);
  return document.save({ useObjectStreams: false });
}
