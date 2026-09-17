import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { UNIVERSAL_PERGOLA_DOCUMENT } from "../documents/config.ts";
import { A4_HEIGHT, A4_WIDTH, PDF_COLORS, drawDocumentFooter, drawRightText, embedBrandLogo, pdfDate, pdfMoney, safePdfText, wrapPdfText } from "../documents/pdf-kit.ts";
import type { InvoiceDetail, InvoiceItem } from "./queries";

const MARGIN = 36;
const BOTTOM = 58;

function drawWrapped(page: PDFPage, value: unknown, x: number, y: number, width: number, size: number, font: PDFFont, color = PDF_COLORS.stone, leading = size + 3) {
  const lines = wrapPdfText(value, font, size, width);
  lines.forEach((line, index) => page.drawText(line || " ", { x, y: y - index * leading, size, font, color }));
  return y - lines.length * leading;
}

export async function generateInvoicePdf(invoice: InvoiceDetail, items: InvoiceItem[]) {
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
    page.drawRectangle({ x: 0, y: A4_HEIGHT - 12, width: A4_WIDTH, height: 12, color: PDF_COLORS.brass });
    page.drawImage(logo, { x: MARGIN, y: 694, width: 112, height: 112 });
    page.drawImage(logo, { x: 176, y: 210, width: 250, height: 250, opacity: 0.022 });
    page.drawText("UNIVERSAL PERGOLA", { x: MARGIN, y: 678, size: 10.5, font: bold, color: PDF_COLORS.ink });
    page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.tagline.toUpperCase(), { x: MARGIN, y: 663, size: 6, font: regular, color: PDF_COLORS.brass });
    page.drawText("I N V O I C E", { x: 324, y: 770, size: 20, font: bold, color: PDF_COLORS.ink });
    page.drawRectangle({ x: 324, y: 750, width: 48, height: 3, color: PDF_COLORS.brass });
    page.drawText(safePdfText(invoice.invoice_number), { x: 324, y: 726, size: 10, font: bold, color: PDF_COLORS.ink });
    page.drawText("PROJECT REFERENCE", { x: 324, y: 708, size: 5.7, font: bold, color: PDF_COLORS.stone });
    page.drawText(safePdfText(invoice.client_reference), { x: 324, y: 694, size: 7.2, font: bold, color: PDF_COLORS.brass });
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
