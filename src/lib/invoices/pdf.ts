import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { UNIVERSAL_PERGOLA_DOCUMENT } from "../documents/config.ts";
import { A4_HEIGHT, A4_WIDTH, CLIENT_TEMPLATE_WIDTH, PDF_COLORS, copyClientTemplatePage, drawCenteredFittedText, drawDocumentFooter, drawFittedText, drawRightText, embedBrandLogo, pdfDate, pdfMoney, safePdfText, wrapPdfText } from "../documents/pdf-kit.ts";
import type { InvoiceDetail, InvoiceItem } from "./queries";

const MARGIN = 36;
const BOTTOM = 58;

function drawWrapped(page: PDFPage, value: unknown, x: number, y: number, width: number, size: number, font: PDFFont, color = PDF_COLORS.stone, leading = size + 3) {
  const lines = wrapPdfText(value, font, size, width);
  lines.forEach((line, index) => page.drawText(line || " ", { x, y: y - index * leading, size, font, color }));
  return y - lines.length * leading;
}

// Retained as a rollback reference; exported documents use the client-supplied artwork below.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generateLegacyInvoicePdf(invoice: InvoiceDetail, items: InvoiceItem[]) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedBrandLogo(document);
  document.setTitle(`${invoice.invoice_number} - Universal Pergola Invoice`);
  document.setAuthor(UNIVERSAL_PERGOLA_DOCUMENT.tradeName);
  document.setSubject(`Commercial invoice for ${invoice.client_reference}`);
  document.setCreator("Universal Pergola Operations Dashboard");
  document.setProducer("Universal Pergola Operations Dashboard");
  document.setCreationDate(new Date(invoice.created_at));
  document.setModificationDate(new Date(invoice.issued_at || invoice.updated_at));

  let page!: PDFPage;
  let y = 0;
  const contentRight = A4_WIDTH - MARGIN;

  const addPage = (continued = false) => {
    page = document.addPage([A4_WIDTH, A4_HEIGHT]);
    if (continued) {
      page.drawRectangle({ x: 0, y: 780, width: A4_WIDTH, height: 62, color: PDF_COLORS.charcoal });
      page.drawImage(logo, { x: MARGIN, y: 787, width: 44, height: 44 });
      page.drawText("INVOICE - CONTINUED", { x: 91, y: 811, size: 10, font: bold, color: PDF_COLORS.white });
      page.drawText(`${safePdfText(invoice.invoice_number)}  |  ${safePdfText(invoice.client_reference)}`, { x: 91, y: 796, size: 6.5, font: regular, color: PDF_COLORS.brassLight });
      y = 756;
      return;
    }
    page.drawRectangle({ x: 40, y: 38, width: A4_WIDTH - 80, height: A4_HEIGHT - 76, borderColor: PDF_COLORS.line, borderWidth: 0.7 });
    page.drawImage(logo, { x: 56, y: 598, width: 156, height: 156 });
    page.drawImage(logo, { x: 105, y: 154, width: 390, height: 390, opacity: 0.08 });
    page.drawText("INVOICE", { x: 350, y: 730, size: 17, font: bold, color: PDF_COLORS.ink });
    page.drawText(`REF: ${safePdfText(invoice.client_reference || invoice.invoice_number)}`, { x: 350, y: 713, size: 6.5, font: bold, color: PDF_COLORS.ink });
    page.drawText(safePdfText(invoice.invoice_number), { x: 350, y: 699, size: 6.5, font: regular, color: PDF_COLORS.stone });
    page.drawText("PROJECT REFERENCE", { x: 350, y: 680, size: 5.7, font: bold, color: PDF_COLORS.stone });
    page.drawText(safePdfText(invoice.client_reference), { x: 350, y: 668, size: 7.2, font: bold, color: PDF_COLORS.brass });
    y = 632;
  };

  const ensure = (height: number) => { if (y - height < BOTTOM) addPage(true); };
  const sectionTitle = (title: string) => {
    ensure(26);
    page.drawText(title.toUpperCase(), { x: MARGIN, y, size: 6.8, font: bold, color: PDF_COLORS.brass });
    page.drawLine({ start: { x: MARGIN, y: y - 7 }, end: { x: contentRight, y: y - 7 }, thickness: 0.55, color: PDF_COLORS.line });
    y -= 20;
  };
  const drawItemHeader = () => {
    ensure(34);
    page.drawRectangle({ x: MARGIN, y: y - 18, width: contentRight - MARGIN, height: 25, color: PDF_COLORS.charcoal });
    page.drawText("DESCRIPTION", { x: MARGIN + 9, y: y - 10, size: 6.2, font: bold, color: PDF_COLORS.white });
    page.drawText("QTY", { x: 359, y: y - 10, size: 6.2, font: bold, color: PDF_COLORS.white });
    page.drawText("UNIT", { x: 404, y: y - 10, size: 6.2, font: bold, color: PDF_COLORS.white });
    drawRightText(page, "UNIT PRICE", 490, y - 10, 6.2, bold, PDF_COLORS.white);
    drawRightText(page, "AMOUNT", contentRight - 8, y - 10, 6.2, bold, PDF_COLORS.white);
    y -= 30;
  };

  addPage();
  page.drawText("BILL TO", { x: MARGIN, y, size: 6.5, font: bold, color: PDF_COLORS.brass });
  let customerY = drawWrapped(page, invoice.customer_name_snapshot, MARGIN, y - 19, 235, 10, bold, PDF_COLORS.ink, 12);
  if (invoice.customer_company_snapshot) customerY = drawWrapped(page, invoice.customer_company_snapshot, MARGIN, customerY - 2, 235, 7.5, regular, PDF_COLORS.stone, 9.5);
  customerY = drawWrapped(page, [invoice.customer_phone_snapshot, invoice.customer_email_snapshot].filter(Boolean).join(" | "), MARGIN, customerY - 2, 235, 7, regular, PDF_COLORS.stone, 9);
  page.drawText("PROJECT / SITE", { x: 315, y, size: 6.5, font: bold, color: PDF_COLORS.brass });
  let projectY = drawWrapped(page, invoice.project?.project_number || "Project", 315, y - 19, 244, 9, bold, PDF_COLORS.ink, 11);
  projectY = drawWrapped(page, invoice.site_address_snapshot || "Site not specified", 315, projectY - 2, 244, 7.2, regular, PDF_COLORS.stone, 9.5);
  y = Math.min(customerY, projectY) - 18;

  page.drawRectangle({ x: MARGIN, y: y - 48, width: contentRight - MARGIN, height: 52, color: PDF_COLORS.sand });
  const meta = [
    ["ISSUE DATE", pdfDate(invoice.issue_date), MARGIN + 13],
    ["DUE DATE", pdfDate(invoice.due_date), 205],
    ["CURRENCY", invoice.currency, 372],
    ["STATUS", invoice.status.replaceAll("_", " ").toUpperCase(), 466],
  ] as const;
  meta.forEach(([label, value, x]) => { page.drawText(label, { x, y: y - 16, size: 5.6, font: bold, color: PDF_COLORS.stone }); page.drawText(safePdfText(value), { x, y: y - 33, size: 7.7, font: bold, color: PDF_COLORS.ink }); });
  y -= 75;

  sectionTitle("Description and amount");
  drawItemHeader();
  for (const item of items) {
    const details = [item.description, item.discount_amount > 0 ? `Line discount ${pdfMoney(item.discount_amount, invoice.currency)}` : "", !item.taxable ? "Non-taxable" : ""].filter(Boolean).join("\n");
    const detailLines = wrapPdfText(details, regular, 6.7, 290);
    const rowHeight = Math.max(34, 19 + detailLines.length * 8.5);
    if (y - rowHeight < BOTTOM) { addPage(true); sectionTitle("Description and amount"); drawItemHeader(); }
    page.drawText(safePdfText(item.item_name), { x: MARGIN + 8, y, size: 8.2, font: bold, color: PDF_COLORS.ink });
    detailLines.forEach((line, index) => page.drawText(line || " ", { x: MARGIN + 8, y: y - 13 - index * 8.5, size: 6.7, font: regular, color: PDF_COLORS.stone }));
    page.drawText(String(item.quantity), { x: 359, y, size: 7.5, font: regular, color: PDF_COLORS.ink });
    page.drawText(safePdfText(item.unit), { x: 404, y, size: 7.5, font: regular, color: PDF_COLORS.ink });
    drawRightText(page, pdfMoney(item.unit_price, invoice.currency), 490, y, 7, regular);
    drawRightText(page, pdfMoney(item.line_total, invoice.currency), contentRight - 8, y, 7.3, bold);
    y -= rowHeight;
    page.drawLine({ start: { x: MARGIN, y: y + 7 }, end: { x: contentRight, y: y + 7 }, thickness: 0.45, color: PDF_COLORS.line });
  }

  ensure(112);
  y -= 4;
  const totalsX = 340;
  const totalRow = (label: string, value: string, emphasis = false) => {
    page.drawText(label, { x: totalsX, y, size: emphasis ? 9 : 7.4, font: emphasis ? bold : regular, color: emphasis ? PDF_COLORS.ink : PDF_COLORS.stone });
    drawRightText(page, value, contentRight, y, emphasis ? 9 : 7.4, emphasis ? bold : regular, emphasis ? PDF_COLORS.ink : PDF_COLORS.stone);
    y -= emphasis ? 22 : 16;
  };
  totalRow("Subtotal", pdfMoney(invoice.subtotal, invoice.currency));
  totalRow(`Discount${invoice.discount_type === "percentage" ? ` (${invoice.discount_value}%)` : ""}`, `-${pdfMoney(invoice.discount_amount, invoice.currency)}`);
  totalRow(`VAT (${invoice.vat_rate}%)`, pdfMoney(invoice.vat_amount, invoice.currency));
  page.drawLine({ start: { x: totalsX, y: y + 8 }, end: { x: contentRight, y: y + 8 }, thickness: 1.2, color: PDF_COLORS.brass });
  totalRow("GRAND TOTAL", pdfMoney(invoice.total, invoice.currency), true);

  if (invoice.notes || invoice.terms) {
    ensure(90);
    if (invoice.notes) { sectionTitle("Notes"); y = drawWrapped(page, invoice.notes, MARGIN, y, contentRight - MARGIN, 7.2, regular, PDF_COLORS.stone, 9.4) - 8; }
    if (invoice.terms) { sectionTitle("Terms and conditions"); y = drawWrapped(page, invoice.terms, MARGIN, y, contentRight - MARGIN, 7.2, regular, PDF_COLORS.stone, 9.4) - 8; }
  }

  ensure(92);
  page.drawRectangle({ x: MARGIN, y: y - 72, width: contentRight - MARGIN, height: 76, color: PDF_COLORS.sand });
  page.drawText("THANK YOU FOR YOUR BUSINESS.", { x: MARGIN + 13, y: y - 21, size: 10.5, font: bold, color: PDF_COLORS.ink });
  page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.footerLine, { x: MARGIN + 13, y: y - 38, size: 6.3, font: regular, color: PDF_COLORS.stone });
  drawRightText(page, UNIVERSAL_PERGOLA_DOCUMENT.signatoryName.toUpperCase(), contentRight - 13, y - 51, 7.4, bold, PDF_COLORS.ink);
  drawRightText(page, UNIVERSAL_PERGOLA_DOCUMENT.signatoryTitle.toUpperCase(), contentRight - 13, y - 64, 6.1, regular, PDF_COLORS.stone);

  const pages = document.getPages();
  pages.forEach((pdfPage, index) => drawDocumentFooter(pdfPage, regular, bold, index + 1, pages.length, invoice.invoice_number));
  return document.save({ useObjectStreams: false });
}

export async function generateInvoicePdf(invoice: InvoiceDetail, items: InvoiceItem[]) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = await copyClientTemplatePage(document, "client-invoice-background.pdf");
  const right = CLIENT_TEMPLATE_WIDTH - 22;

  document.setTitle(`${invoice.invoice_number} - Universal Pergola Invoice`);
  document.setAuthor(UNIVERSAL_PERGOLA_DOCUMENT.tradeName);
  document.setSubject(`Commercial invoice for ${invoice.client_reference}`);
  document.setCreator("Universal Pergola Operations Dashboard");
  document.setProducer("Universal Pergola Operations Dashboard");
  document.setCreationDate(new Date(invoice.created_at));
  document.setModificationDate(new Date(invoice.issued_at || invoice.updated_at));

  drawCenteredFittedText(page, "INVOICE", 465, 673.18, 255, 22, 18, bold, PDF_COLORS.ink);
  drawFittedText(page, invoice.customer_name_snapshot, 20.76, 720.96, 305, 9, 5.8, bold);
  drawFittedText(page, invoice.customer_phone_snapshot || "-", 33.12, 708.46, 210, 7.5, 5.8, regular);
  drawFittedText(page, pdfDate(invoice.issue_date), 490.9, 708.46, 100, 7.5, 5.8, bold);
  const compactItems = items.length >= 4;
  let y = 530;
  for (const item of items.slice(0, 4)) {
    drawFittedText(page, item.item_name, 20.76, y, 420, compactItems ? 7.4 : 8, compactItems ? 6 : 6.4, bold);
    if (compactItems) {
      const lines = wrapPdfText(item.description, regular, 6, 420).slice(0, 2);
      lines.forEach((line, index) => page.drawText(line, { x: 20.76, y: y - 7 - index * 6.2, size: 6, font: regular, color: PDF_COLORS.ink }));
    } else {
      const lines = wrapPdfText(item.description, regular, 7.5, 420).slice(0, 2);
      lines.forEach((line, index) => page.drawText(line, { x: 20.76, y: y - 9 - index * 8, size: 7.5, font: regular, color: PDF_COLORS.ink }));
    }
    page.drawText(String(item.quantity), { x: 478, y, size: 7.8, font: regular, color: PDF_COLORS.ink });
    drawRightText(page, pdfMoney(item.line_total, invoice.currency), 590, y, 7.8, bold, PDF_COLORS.ink);
    y -= compactItems ? 19 : 27;
  }
  drawRightText(page, pdfMoney(invoice.total, invoice.currency), 296, 450.43, 9, bold, PDF_COLORS.ink);
  drawFittedText(page, "INVOICE TOTAL", 20.76, 426.29, 150, 9.5, 6.2, bold);
  drawFittedText(page, "BANK TRANSFER", 191.3, 426.29, 125, 9.5, 6.2, regular);
  drawFittedText(page, invoice.client_reference || invoice.invoice_number, 333.29, 426.29, 255, 11.5, 7.5, bold);
  drawFittedText(page, invoice.status.replaceAll("_", " ").toUpperCase(), 95.66, 412.73, 170, 9.2, 6.2, bold);
  drawRightText(page, pdfMoney(invoice.total, invoice.currency), right, 348.65, 9, bold, PDF_COLORS.ink);

  return document.save({ useObjectStreams: false });
}
