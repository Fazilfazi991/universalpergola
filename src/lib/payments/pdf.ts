import { degrees, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { UNIVERSAL_PERGOLA_DOCUMENT } from "../documents/config.ts";
import { A4_HEIGHT, A4_WIDTH, CLIENT_TEMPLATE_WIDTH, PDF_COLORS, copyClientTemplatePage, drawDocumentFooter, drawRightText, embedBrandLogo, pdfDate, pdfMoney, safePdfText, wrapPdfText } from "../documents/pdf-kit.ts";
import { paymentMethodLabel } from "./presentation.ts";
import type { FinanceSummary, ReceiptRow } from "./types.ts";

function drawWrapped(page: PDFPage, value: unknown, x: number, y: number, width: number, size: number, font: PDFFont, color = PDF_COLORS.stone, leading = size + 3) {
  const lines = wrapPdfText(value, font, size, width);
  lines.forEach((line, index) => page.drawText(line || " ", { x, y: y - index * leading, size, font, color }));
  return y - lines.length * leading;
}

async function generateLegacyPaymentReceiptPdf(receipt: ReceiptRow, finance: FinanceSummary) {
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

  page.drawRectangle({ x: 40, y: 38, width: A4_WIDTH - 80, height: A4_HEIGHT - 76, borderColor: PDF_COLORS.line, borderWidth: 0.7 });
  page.drawImage(logo, { x: 56, y: 598, width: 156, height: 156 });
  page.drawImage(logo, { x: 105, y: 154, width: 390, height: 390, opacity: 0.08 });

  page.drawText("PAYMENT RECEIPT", { x: 300, y: 730, size: 17, font: bold, color: PDF_COLORS.ink });
  page.drawText(`REF: ${safePdfText(receipt.project?.client_reference || receipt.receipt_number)}`, { x: 300, y: 713, size: 6.5, font: bold, color: PDF_COLORS.ink });
  page.drawText(safePdfText(receipt.receipt_number), { x: 300, y: 699, size: 6.5, font: regular, color: PDF_COLORS.stone });
  if (receipt.project?.client_reference) {
    page.drawText("PROJECT REFERENCE", { x: 300, y: 680, size: 5.5, font: bold, color: PDF_COLORS.stone });
    page.drawText(safePdfText(receipt.project.client_reference), { x: 300, y: 668, size: 6.8, font: bold, color: PDF_COLORS.brass });
  }

  page.drawText("Date:", { x: 447, y: 758, size: 6, font: bold, color: PDF_COLORS.ink });
  page.drawText(pdfDate(receipt.received_date), { x: 471, y: 758, size: 6, font: regular, color: PDF_COLORS.ink });
  page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.legalName, { x: 300, y: 690, size: 6.2, font: bold, color: PDF_COLORS.ink });
  page.drawText(`${UNIVERSAL_PERGOLA_DOCUMENT.address} | ${UNIVERSAL_PERGOLA_DOCUMENT.phones[0]}`, { x: 300, y: 676, size: 5.5, font: regular, color: PDF_COLORS.ink });

  page.drawText("BILL TO", { x: 56, y: 744, size: 6.5, font: bold, color: PDF_COLORS.stone });
  const customerBottom = drawWrapped(page, receipt.customer?.name || "Customer", 56, 730, 190, 8, bold, PDF_COLORS.ink, 10);
  page.drawText(safePdfText(receipt.customer?.phone || "Phone not provided"), { x: 56, y: customerBottom - 2, size: 6, font: regular, color: PDF_COLORS.stone });
  page.drawText("PROJECT", { x: 300, y: 625, size: 6.5, font: bold, color: PDF_COLORS.brass });
  const projectBottom = drawWrapped(page, receipt.project?.project_number || "-", 300, 607, 259, 9, bold, PDF_COLORS.ink, 11);
  const sourceBottom = drawWrapped(page, `Source quotation: ${receipt.project?.source_quotation_number || "-"}`, 300, projectBottom - 3, 259, 7.2, regular, PDF_COLORS.stone, 9);

  const tableX = 36;
  const tableRight = A4_WIDTH - 36;
  const tableWidth = tableRight - tableX;
  const tableHeaderY = Math.min(535, customerBottom - 48, sourceBottom - 34);
  page.drawRectangle({ x: tableX, y: tableHeaderY, width: tableWidth, height: 32, color: PDF_COLORS.charcoal });
  page.drawText("SERVICE / DESCRIPTION", { x: tableX + 12, y: tableHeaderY + 12, size: 7, font: bold, color: PDF_COLORS.white });
  page.drawText("QTY", { x: 400, y: tableHeaderY + 12, size: 7, font: bold, color: PDF_COLORS.white });
  drawRightText(page, "AMOUNT", tableRight - 10, tableHeaderY + 12, 7, bold, PDF_COLORS.white);

  const service = receipt.milestone?.description || `Payment received for ${receipt.milestone?.name || receipt.project?.project_number || "project services"}.`;
  const serviceTop = tableHeaderY - 28;
  const milestoneBottom = drawWrapped(page, receipt.milestone?.name || "Project payment", tableX + 12, serviceTop, 322, 9.5, bold, PDF_COLORS.ink, 11);
  const serviceBottom = drawWrapped(page, service, tableX + 12, milestoneBottom - 3, 330, 7.3, regular, PDF_COLORS.stone, 9.5);
  page.drawText("1", { x: 402, y: serviceTop, size: 8, font: regular, color: PDF_COLORS.ink });
  drawRightText(page, pdfMoney(receipt.amount_received, currency), tableRight - 10, serviceTop, 9, bold);
  const tableBottom = Math.min(serviceTop - 40, serviceBottom - 7);
  page.drawLine({ start: { x: tableX, y: tableBottom }, end: { x: tableRight, y: tableBottom }, thickness: 0.7, color: PDF_COLORS.line });

  const summaryTop = tableBottom - 14;
  const summaryHeight = 96;
  const summaryBottom = summaryTop - summaryHeight;
  const summaryFill = isVoid ? rgb(0.99, 0.94, 0.93) : PDF_COLORS.sand;
  page.drawRectangle({ x: tableX, y: summaryBottom, width: tableWidth, height: summaryHeight, color: summaryFill, borderColor: isVoid ? PDF_COLORS.red : PDF_COLORS.line, borderWidth: 0.7 });
  page.drawRectangle({ x: tableX, y: summaryBottom, width: 4, height: summaryHeight, color: isVoid ? PDF_COLORS.red : PDF_COLORS.brass });
  page.drawLine({ start: { x: 300, y: summaryBottom + 10 }, end: { x: 300, y: summaryTop - 10 }, thickness: 0.45, color: PDF_COLORS.line });
  page.drawLine({ start: { x: tableX + 14, y: summaryBottom + 47 }, end: { x: tableRight - 14, y: summaryBottom + 47 }, thickness: 0.45, color: PDF_COLORS.line });

  const summaryField = (label: string, value: string, x: number, labelY: number, width: number, emphasis = false, color = PDF_COLORS.ink) => {
    page.drawText(label.toUpperCase(), { x, y: labelY, size: 5.9, font: bold, color: PDF_COLORS.stone });
    drawWrapped(page, value, x, labelY - 17, width, emphasis ? 12.5 : 8.6, bold, color, emphasis ? 14 : 10.5);
  };
  summaryField("Total received", pdfMoney(receipt.amount_received, currency), tableX + 18, summaryTop - 20, 226, true, isVoid ? PDF_COLORS.red : PDF_COLORS.ink);
  summaryField("Payment method", paymentMethodLabel(receipt.payment_method), 315, summaryTop - 20, 220);
  summaryField("Payment status", status, tableX + 18, summaryBottom + 29, 226, false, isVoid ? PDF_COLORS.red : PDF_COLORS.green);
  summaryField("Remaining amount due", pdfMoney(finance.outstanding, currency), 315, summaryBottom + 29, 220);

  const detailTop = summaryBottom - 25;
  const detailColumns = [
    { label: "Transaction reference", value: receipt.reference_number || "Not provided", x: tableX, width: 162 },
    { label: "Project total", value: pdfMoney(receipt.project?.project_value ?? finance.project_value, currency), x: 216, width: 162 },
    { label: "Recorded by", value: receipt.creator?.full_name || "Finance team", x: 396, width: 163 },
  ];
  let detailBottom = detailTop;
  for (const detail of detailColumns) {
    page.drawText(detail.label.toUpperCase(), { x: detail.x, y: detailTop, size: 5.8, font: bold, color: PDF_COLORS.brass });
    detailBottom = Math.min(detailBottom, drawWrapped(page, detail.value, detail.x, detailTop - 16, detail.width, 7.8, bold, PDF_COLORS.ink, 9.5));
  }

  const confirmation = isVoid
    ? "This document records the payment receipt stated above and its subsequent reversal."
    : "This receipt confirms payment received against the project and payment milestone stated above.";
  const confirmationTop = detailBottom - 12;
  page.drawRectangle({ x: tableX, y: confirmationTop - 25, width: tableWidth, height: 30, color: rgb(0.985, 0.98, 0.965) });
  drawWrapped(page, confirmation, tableX + 12, confirmationTop - 8, tableWidth - 24, 6.8, regular, PDF_COLORS.stone, 8.5);

  if (isVoid) {
    page.drawRectangle({ x: 36, y: 167, width: tableWidth, height: 43, color: rgb(0.99, 0.91, 0.9), borderColor: PDF_COLORS.red, borderWidth: 0.8 });
    page.drawText("VOID - THIS RECEIPT HAS BEEN REVERSED", { x: 49, y: 192, size: 9, font: bold, color: PDF_COLORS.red });
    drawWrapped(page, receipt.void_reason || "Receipt reversed in the finance system.", 49, 177, tableWidth - 26, 6.8, regular, PDF_COLORS.red, 8.5);
  } else {
    page.drawText("THANK YOU FOR YOUR PAYMENT.", { x: 36, y: 194, size: 11.5, font: bold, color: PDF_COLORS.ink });
    page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.footerLine, { x: 36, y: 179, size: 6.8, font: regular, color: PDF_COLORS.stone });
  }

  page.drawText("AUTHORIZED SIGNATORY", { x: 364, y: 151, size: 5.8, font: bold, color: PDF_COLORS.brass });
  page.drawLine({ start: { x: 364, y: 139 }, end: { x: 559, y: 139 }, thickness: 0.8, color: PDF_COLORS.line });
  drawRightText(page, UNIVERSAL_PERGOLA_DOCUMENT.signatoryName.toUpperCase(), 559, 120, 8.6, bold, PDF_COLORS.ink);
  drawRightText(page, UNIVERSAL_PERGOLA_DOCUMENT.signatoryTitle.toUpperCase(), 559, 106, 6.7, regular, PDF_COLORS.stone);
  page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.legalName, { x: 36, y: 120, size: 6.8, font: bold, color: PDF_COLORS.ink });
  page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.address, { x: 36, y: 107, size: 6.5, font: regular, color: PDF_COLORS.stone });
  page.drawText(`${UNIVERSAL_PERGOLA_DOCUMENT.instagram}  |  ${UNIVERSAL_PERGOLA_DOCUMENT.phones.join(" / ")}`, { x: 36, y: 94, size: 6.5, font: regular, color: PDF_COLORS.stone });

  if (isVoid) {
    page.drawText("VOID", { x: 156, y: 388, size: 82, font: bold, color: PDF_COLORS.red, opacity: 0.065, rotate: degrees(25) });
  }
  drawDocumentFooter(page, regular, bold, 1, 1, receipt.receipt_number);
  return document.save({ useObjectStreams: false });
}

export async function generatePaymentReceiptPdf(receipt: ReceiptRow, finance: FinanceSummary) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = await copyClientTemplatePage(document, "client-receipt-template.png");
  const currency = receipt.project?.currency || finance.currency || "AED";
  const isVoid = Boolean(receipt.voided_at);
  const status = isVoid ? "VOID - REVERSED" : "CASH RECEIVED";
  const reference = receipt.project?.client_reference || receipt.receipt_number;

  document.setTitle(`${receipt.receipt_number} - Universal Pergola Payment Receipt`);
  document.setAuthor(UNIVERSAL_PERGOLA_DOCUMENT.tradeName);
  document.setSubject(isVoid ? "Voided payment receipt" : "Payment receipt");
  document.setCreator("Universal Pergola Operations Dashboard");
  document.setProducer("Universal Pergola Operations Dashboard");
  document.setCreationDate(new Date(receipt.created_at));
  document.setModificationDate(new Date(receipt.voided_at || receipt.created_at));

  page.drawText(safePdfText(receipt.customer?.name || "Customer"), { x: 20, y: 728, size: 7.2, font: bold, color: PDF_COLORS.ink });
  page.drawText(safePdfText(receipt.customer?.phone || "-"), { x: 20, y: 714, size: 6.2, font: regular, color: PDF_COLORS.ink });
  drawRightText(page, pdfDate(receipt.received_date), 590, 715, 7, bold, PDF_COLORS.ink);
  const service = receipt.milestone?.description || receipt.milestone?.name || `Payment for ${receipt.project?.project_number || "project services"}`;
  const serviceLines = wrapPdfText(service, regular, 7.2, 235).slice(0, 3);
  serviceLines.forEach((line, index) => page.drawText(line, { x: 20, y: 530 - index * 9, size: 7.2, font: index === 0 ? bold : regular, color: PDF_COLORS.ink }));
  page.drawText("1", { x: 478, y: 530, size: 7.2, font: regular, color: PDF_COLORS.ink });
  drawRightText(page, pdfMoney(receipt.amount_received, currency), 590, 530, 7.2, bold, PDF_COLORS.ink);

  drawRightText(page, pdfMoney(receipt.amount_received, currency), 296, 454, 8, bold, PDF_COLORS.ink);
  page.drawRectangle({ x: 188, y: 420, width: 78, height: 9, color: PDF_COLORS.white });
  page.drawRectangle({ x: 330, y: 420, width: 64, height: 9, color: PDF_COLORS.white });
  page.drawRectangle({ x: 98, y: 405, width: 78, height: 9, color: PDF_COLORS.white });
  page.drawText(paymentMethodLabel(receipt.payment_method).toUpperCase(), { x: 190, y: 424, size: 7.2, font: regular, color: PDF_COLORS.ink });
  page.drawText(safePdfText(reference), { x: 332, y: 424, size: 7.2, font: bold, color: PDF_COLORS.ink });
  page.drawText(status, { x: 100, y: 409, size: 7.2, font: bold, color: isVoid ? PDF_COLORS.red : PDF_COLORS.green });
  drawRightText(page, pdfMoney(finance.outstanding, currency), 590, 347, 8, bold, PDF_COLORS.ink);
  if (isVoid) page.drawText("VOID", { x: 240, y: 330, size: 60, font: bold, color: PDF_COLORS.red, opacity: 0.12 });

  return document.save({ useObjectStreams: false });
}
