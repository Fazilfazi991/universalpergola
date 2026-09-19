import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { DEFAULT_QUOTATION_PAYMENT_TERMS, UNIVERSAL_PERGOLA_DOCUMENT } from "../documents/config.ts";
import { A4_HEIGHT, A4_WIDTH, CLIENT_TEMPLATE_WIDTH, PDF_COLORS, copyClientTemplatePage, drawCenteredFittedText, drawDocumentFooter, drawFittedText, drawRightText, embedBrandLogo, pdfDate, pdfMoney, safePdfText, wrapPdfText } from "../documents/pdf-kit.ts";
import type { QuotationDetail, QuotationItem } from "./queries.ts";

// These dimensions deliberately follow the supplied client quotation sheet:
// a pale left information panel and a narrow white document column.
const FIRST_X = 224;
const PAGE_MARGIN = 42;
const BOTTOM = 52;

function drawWrapped(page: PDFPage, lines: string[], x: number, y: number, size: number, font: PDFFont, color = PDF_COLORS.stone, leading = size + 3) {
  lines.forEach((line, index) => page.drawText(line || " ", { x, y: y - index * leading, size, font, color }));
  return y - lines.length * leading;
}

// Retained as a rollback reference; exported documents use the client-supplied artwork below.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generateLegacyQuotationPdf(quote: QuotationDetail, items: QuotationItem[]) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedBrandLogo(document);
  document.setTitle(`${quote.quotation_number} - Universal Pergola`);
  document.setAuthor(UNIVERSAL_PERGOLA_DOCUMENT.tradeName);
  document.setSubject(`Quotation revision ${quote.revision_number}`);
  document.setCreator("Universal Pergola Operations Dashboard");
  document.setProducer("Universal Pergola Operations Dashboard");
  document.setCreationDate(new Date(quote.created_at));
  document.setModificationDate(new Date(quote.approved_at || quote.sent_at || quote.created_at));

  let page!: PDFPage;
  let y = 0;
  let contentX = FIRST_X;
  let contentRight = A4_WIDTH - 32;

  const drawSidebar = () => {
    const sideX = 42;
    const sideWidth = 178;
    page.drawRectangle({ x: 40, y: 38, width: A4_WIDTH - 80, height: A4_HEIGHT - 76, borderColor: PDF_COLORS.line, borderWidth: 0.7 });
    page.drawRectangle({ x: sideX, y: 40, width: sideWidth, height: A4_HEIGHT - 80, color: rgb(0.73, 0.75, 0.75) });
    page.drawImage(logo, { x: sideX + 2, y: 272, width: 230, height: 230, opacity: 0.075 });
    page.drawImage(logo, { x: sideX + 5, y: 650, width: 166, height: 166 });
    page.drawText("UNIVERSAL PERGOLA", { x: sideX + 13, y: 642, size: 10, font: bold, color: PDF_COLORS.brassLight });
    page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.tagline.toUpperCase(), { x: sideX + 20, y: 628, size: 5.2, font: regular, color: PDF_COLORS.charcoal });
    const wrapHyphenated = (value: string, size: number, width: number) => {
      const lines: string[] = [];
      let current = "";
      for (const segment of value.split(/(?<=-)/)) {
        const candidate = current + segment;
        if (regular.widthOfTextAtSize(candidate, size) <= width) { current = candidate; continue; }
        if (current) lines.push(current);
        const segmentLines = wrapPdfText(segment, regular, size, width);
        current = segmentLines.pop() || "";
        lines.push(...segmentLines);
      }
      if (current) lines.push(current);
      return lines;
    };
    const sidebarLines = (value: string, size: number, width: number) => safePdfText(value || "-").split("\n").flatMap((line) => {
      const emailAt = line.lastIndexOf("@");
      if (emailAt > 0 && regular.widthOfTextAtSize(line, size) > width) {
        return [
          ...wrapHyphenated(line.slice(0, emailAt + 1), size, width),
          ...wrapHyphenated(line.slice(emailAt + 1), size, width),
        ];
      }
      return wrapPdfText(line, regular, size, width);
    });
    const sidebarBlock = (label: string, value: string, top: number, size = 7.15) => {
      page.drawText(label.toUpperCase(), { x: sideX + 12, y: top, size: 6.2, font: bold, color: PDF_COLORS.charcoal });
      return drawWrapped(page, sidebarLines(value, size, 148), sideX + 12, top - 14, size, regular, PDF_COLORS.ink, 9.5);
    };
    let sideY = 596;
    sideY = sidebarBlock("Bill to", quote.customer_name_snapshot, sideY) - 8;
    if (quote.customer_company_snapshot) sideY = sidebarBlock("Company", quote.customer_company_snapshot, sideY) - 8;
    sideY = sidebarBlock("Contact", [quote.customer_phone_snapshot, quote.customer_email_snapshot].filter(Boolean).join("\n"), sideY, 6.8) - 8;
    sideY = sidebarBlock("Site", quote.site_address_snapshot || "Not specified", sideY) - 18;
    page.drawLine({ start: { x: sideX + 12, y: sideY }, end: { x: sideX + 165, y: sideY }, thickness: 0.5, color: PDF_COLORS.line });
    sideY -= 20;
    page.drawText("PAYMENT METHOD", { x: sideX + 12, y: sideY, size: 6.5, font: bold, color: PDF_COLORS.charcoal });
    sideY -= 19;
    for (const term of DEFAULT_QUOTATION_PAYMENT_TERMS) {
      page.drawText(`- ${term.label.toUpperCase()}: ${term.percentage}%`, { x: sideX + 15, y: sideY, size: 6.2, font: bold, color: PDF_COLORS.ink });
      sideY -= 24;
    }
    page.drawText("TERMS & CONDITIONS", { x: sideX + 12, y: 255, size: 6.4, font: bold, color: PDF_COLORS.charcoal });
    drawWrapped(page, wrapPdfText(quote.terms || "Payment is due according to the schedule above. Variation work is subject to a separate quotation.", regular, 6.2, 148).slice(0, 14), sideX + 12, 240, 6.2, regular, PDF_COLORS.ink, 8.1);
    page.drawText("CONTACT", { x: sideX + 12, y: 104, size: 6.2, font: bold, color: PDF_COLORS.charcoal });
    drawWrapped(page, [UNIVERSAL_PERGOLA_DOCUMENT.email, UNIVERSAL_PERGOLA_DOCUMENT.website, ...UNIVERSAL_PERGOLA_DOCUMENT.phones], sideX + 12, 89, 5.7, regular, PDF_COLORS.ink, 8.2);
  };

  const addPage = (continuation = false) => {
    page = document.addPage([A4_WIDTH, A4_HEIGHT]);
    contentX = continuation ? PAGE_MARGIN : FIRST_X;
    contentRight = A4_WIDTH - (continuation ? PAGE_MARGIN : 32);
    if (!continuation) {
      drawSidebar();
      page.drawImage(logo, { x: 192, y: 228, width: 345, height: 345, opacity: 0.08 });
      page.drawText("Q U O T A T I O N", { x: contentX, y: 772, size: 20, font: bold, color: PDF_COLORS.ink });
      page.drawText(`REF: ${safePdfText(quote.client_reference || quote.quotation_number)}`, { x: contentX, y: 730, size: 7, font: bold, color: PDF_COLORS.ink });
      page.drawText(safePdfText(quote.quotation_number), { x: contentX, y: 716, size: 7, font: regular, color: PDF_COLORS.stone });
      drawRightText(page, `REVISION ${quote.revision_number}`, contentRight, 730, 6.2, bold, PDF_COLORS.stone);
      if (quote.client_reference) {
        page.drawText("PROJECT REFERENCE", { x: contentX, y: 705, size: 5.7, font: bold, color: PDF_COLORS.stone });
        page.drawText(safePdfText(quote.client_reference), { x: contentX, y: 691, size: 7.4, font: bold, color: PDF_COLORS.brass });
      }
      y = quote.client_reference ? 669 : 686;
    } else {
      page.drawRectangle({ x: 0, y: 780, width: A4_WIDTH, height: 62, color: PDF_COLORS.charcoal });
      page.drawImage(logo, { x: PAGE_MARGIN, y: 787, width: 44, height: 44 });
      page.drawText("QUOTATION - CONTINUED", { x: 91, y: 811, size: 10, font: bold, color: PDF_COLORS.white });
      page.drawText(`${safePdfText(quote.quotation_number)}  |  REVISION ${quote.revision_number}`, { x: 91, y: 796, size: 6.5, font: regular, color: PDF_COLORS.brassLight });
      y = 756;
    }
  };

  const ensure = (height: number) => { if (y - height < BOTTOM) addPage(true); };
  const sectionTitle = (title: string) => {
    ensure(28);
    page.drawText(title.toUpperCase(), { x: contentX, y, size: 7, font: bold, color: PDF_COLORS.brass });
    page.drawLine({ start: { x: contentX, y: y - 7 }, end: { x: contentRight, y: y - 7 }, thickness: 0.55, color: PDF_COLORS.line });
    y -= 18;
  };
  const paragraph = (value: string, size = 8, leading = 11) => {
    for (const line of wrapPdfText(value, regular, size, contentRight - contentX)) {
      ensure(leading + 2);
      page.drawText(line || " ", { x: contentX, y, size, font: regular, color: PDF_COLORS.stone });
      y -= leading;
    }
  };
  const drawItemHeader = () => {
    ensure(30);
    const width = contentRight - contentX;
    page.drawRectangle({ x: contentX, y: y - 18, width, height: 24, color: PDF_COLORS.charcoal });
    page.drawText("DESCRIPTION", { x: contentX + 8, y: y - 10, size: 6.2, font: bold, color: PDF_COLORS.white });
    page.drawText("QTY", { x: contentX + width * 0.54, y: y - 10, size: 6.2, font: bold, color: PDF_COLORS.white });
    page.drawText("UNIT", { x: contentX + width * 0.64, y: y - 10, size: 6.2, font: bold, color: PDF_COLORS.white });
    drawRightText(page, "UNIT PRICE", contentX + width * 0.84, y - 10, 6.2, bold, PDF_COLORS.white);
    drawRightText(page, "AMOUNT", contentRight - 7, y - 10, 6.2, bold, PDF_COLORS.white);
    y -= 28;
  };

  addPage();
  page.drawRectangle({ x: contentX, y: y - 60, width: contentRight - contentX, height: 64, color: PDF_COLORS.sand });
  const info = [
    ["ISSUE DATE", pdfDate(quote.issue_date), contentX + 12],
    ["VALID UNTIL", pdfDate(quote.validity_date), contentX + 139],
    ["CURRENCY", quote.currency, contentX + 275],
  ] as const;
  for (const [label, value, x] of info) {
    page.drawText(label, { x, y: y - 17, size: 5.8, font: bold, color: PDF_COLORS.stone });
    page.drawText(safePdfText(value), { x, y: y - 35, size: 8.5, font: bold, color: PDF_COLORS.ink });
  }
  y -= 82;
  if (quote.introduction) { sectionTitle("Project scope"); paragraph(quote.introduction); y -= 8; }
  sectionTitle("Description and amount");
  drawItemHeader();

  for (const item of items) {
    const width = contentRight - contentX;
    const dimensions = [item.width && `W ${item.width}`, item.height && `H ${item.height}`, item.length && `L ${item.length}`].filter(Boolean).join(" x ");
    const details = [item.product_code_snapshot, item.description, dimensions, item.dimensions_details].filter(Boolean).join("\n");
    const detailLines = wrapPdfText(details, regular, 6.7, width * 0.49);
    const rowHeight = Math.max(31, 20 + detailLines.length * 8.5 + (item.discount_amount > 0 || !item.taxable ? 9 : 0));
    if (y - rowHeight < BOTTOM) { addPage(true); sectionTitle("Description and amount"); drawItemHeader(); }
    page.drawText(safePdfText(item.item_name), { x: contentX + 7, y, size: 8, font: bold, color: PDF_COLORS.ink });
    drawWrapped(page, detailLines, contentX + 7, y - 13, 6.7, regular, PDF_COLORS.stone, 8.5);
    page.drawText(`${item.quantity}`, { x: contentX + width * 0.54, y, size: 7.5, font: regular, color: PDF_COLORS.ink });
    page.drawText(safePdfText(item.unit), { x: contentX + width * 0.64, y, size: 7.5, font: regular, color: PDF_COLORS.ink });
    drawRightText(page, pdfMoney(item.unit_price, quote.currency), contentX + width * 0.84, y, 7, regular);
    drawRightText(page, pdfMoney(item.line_total, quote.currency), contentRight - 7, y, 7.2, bold);
    if (item.discount_amount > 0 || !item.taxable) {
      const note = `${item.discount_amount > 0 ? `Line discount ${pdfMoney(item.discount_amount, quote.currency)}` : ""}${item.discount_amount > 0 && !item.taxable ? " - " : ""}${!item.taxable ? "Non-taxable" : ""}`;
      page.drawText(note, { x: contentX + 7, y: y - rowHeight + 14, size: 5.8, font: regular, color: PDF_COLORS.brass });
    }
    y -= rowHeight;
    page.drawLine({ start: { x: contentX, y: y + 8 }, end: { x: contentRight, y: y + 8 }, thickness: 0.45, color: PDF_COLORS.line });
  }

  ensure(110);
  const totalsX = contentRight - 220;
  const totalRow = (label: string, value: string, emphasis = false) => {
    page.drawText(label, { x: totalsX, y, size: emphasis ? 9 : 7.5, font: emphasis ? bold : regular, color: emphasis ? PDF_COLORS.ink : PDF_COLORS.stone });
    drawRightText(page, value, contentRight, y, emphasis ? 9 : 7.5, emphasis ? bold : regular, emphasis ? PDF_COLORS.ink : PDF_COLORS.stone);
    y -= emphasis ? 21 : 16;
  };
  y -= 5;
  totalRow("Subtotal", pdfMoney(quote.subtotal, quote.currency));
  totalRow(`Discount${quote.discount_type === "percentage" ? ` (${quote.discount_value}%)` : ""}`, `-${pdfMoney(quote.discount_amount, quote.currency)}`);
  totalRow(`VAT (${quote.vat_rate}%)`, pdfMoney(quote.vat_amount, quote.currency));
  page.drawLine({ start: { x: totalsX, y: y + 8 }, end: { x: contentRight, y: y + 8 }, thickness: 1.2, color: PDF_COLORS.brass });
  totalRow("GRAND TOTAL", pdfMoney(quote.total, quote.currency), true);

  ensure(100);
  y -= 5;
  sectionTitle("Payment terms");
  const scheduleWidth = (contentRight - contentX - 12) / 3;
  DEFAULT_QUOTATION_PAYMENT_TERMS.forEach((term, index) => {
    const x = contentX + index * (scheduleWidth + 6);
    page.drawRectangle({ x, y: y - 38, width: scheduleWidth, height: 42, color: PDF_COLORS.sand, borderColor: PDF_COLORS.line, borderWidth: 0.5 });
    page.drawText(`${term.percentage}%`, { x: x + 9, y: y - 16, size: 11.5, font: bold, color: PDF_COLORS.brass });
    page.drawText(term.label.toUpperCase(), { x: x + 9, y: y - 29, size: 5.5, font: bold, color: PDF_COLORS.stone });
  });
  y -= 52;

  if (quote.customer_notes) { sectionTitle("Customer notes"); paragraph(quote.customer_notes); y -= 8; }
  if (quote.terms) { sectionTitle("Terms and conditions"); paragraph(quote.terms, 7.35, 9.4); y -= 3; }

  if (y - 70 < 40) addPage(true);
  page.drawRectangle({ x: contentX, y: y - 70, width: contentRight - contentX, height: 74, color: PDF_COLORS.sand });
  page.drawText("THANK YOU FOR YOUR BUSINESS.", { x: contentX + 12, y: y - 20, size: 10.5, font: bold, color: PDF_COLORS.ink });
  page.drawText(UNIVERSAL_PERGOLA_DOCUMENT.footerLine, { x: contentX + 12, y: y - 36, size: 6.3, font: regular, color: PDF_COLORS.stone });
  drawRightText(page, UNIVERSAL_PERGOLA_DOCUMENT.signatoryName.toUpperCase(), contentRight - 12, y - 50, 7.3, bold, PDF_COLORS.ink);
  drawRightText(page, UNIVERSAL_PERGOLA_DOCUMENT.signatoryTitle.toUpperCase(), contentRight - 12, y - 62, 6, regular, PDF_COLORS.stone);

  const pages = document.getPages();
  pages.forEach((pdfPage, index) => drawDocumentFooter(pdfPage, regular, bold, index + 1, pages.length, `${quote.quotation_number} R${quote.revision_number}`));
  return document.save({ useObjectStreams: false });
}

export async function generateQuotationPdf(quote: QuotationDetail, items: QuotationItem[]) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = await copyClientTemplatePage(document, "client-quotation-template.pdf");
  const right = CLIENT_TEMPLATE_WIDTH - 12;
  const reference = quote.client_reference || quote.quotation_number;

  document.setTitle(`${quote.quotation_number} - Universal Pergola`);
  document.setAuthor(UNIVERSAL_PERGOLA_DOCUMENT.tradeName);
  document.setSubject(`Quotation revision ${quote.revision_number}`);
  document.setCreator("Universal Pergola Operations Dashboard");
  document.setProducer("Universal Pergola Operations Dashboard");
  document.setCreationDate(new Date(quote.created_at));
  document.setModificationDate(new Date(quote.approved_at || quote.sent_at || quote.created_at));

  const rowsPerPage = 4;
  const pageCount = Math.max(1, Math.ceil(items.length / rowsPerPage));

  const drawLiveValues = (target: typeof page, pageIndex: number) => {
    // These baselines follow the fields in the client-supplied Word export.
    drawFittedText(target, quote.customer_name_snapshot, 83, 550, 128, 7.8, 5.5, bold);
    drawFittedText(target, quote.customer_phone_snapshot || quote.customer_email_snapshot || "-", 31, 535, 180, 7.2, 5.6, regular);
    drawFittedText(target, pdfDate(quote.issue_date), 61, 520, 150, 7.2, 5.6, regular);
    drawCenteredFittedText(target, reference, 418, 720, 305, 13, 8, bold, PDF_COLORS.charcoal);

    let y = 628;
    for (const item of items.slice(pageIndex * rowsPerPage, pageIndex * rowsPerPage + rowsPerPage)) {
      drawFittedText(target, item.item_name, 240, y, 282, 8, 6.4, bold);
      const detail = [item.description, item.dimensions_details].filter(Boolean).join(" - ");
      const detailLines = wrapPdfText(detail, regular, 7.2, 282).slice(0, 2);
      detailLines.forEach((line, index) => target.drawText(line, { x: 240, y: y - 9 - index * 8, size: 7.2, font: regular, color: PDF_COLORS.ink }));
      drawRightText(target, pdfMoney(item.line_total, quote.currency), right, y, 7.6, bold, PDF_COLORS.ink);
      y -= 34;
    }

    if (pageIndex === pageCount - 1) {
      drawRightText(target, pdfMoney(quote.subtotal, quote.currency), right, 306.65, 8, regular, PDF_COLORS.charcoal);
      drawRightText(target, pdfMoney(quote.vat_amount, quote.currency), right, 280.22, 8, regular, PDF_COLORS.charcoal);
      drawRightText(target, pdfMoney(quote.total, quote.currency), right, 259.58, 9, bold, PDF_COLORS.charcoal);
    }
  };

  drawLiveValues(page, 0);
  for (let pageIndex = 1; pageIndex < pageCount; pageIndex += 1) {
    const continuation = await copyClientTemplatePage(document, "client-quotation-template.pdf");
    drawLiveValues(continuation, pageIndex);
  }

  return document.save({ useObjectStreams: false });
}
