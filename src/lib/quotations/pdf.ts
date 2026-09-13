import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { QuotationDetail, QuotationItem } from "./queries.ts";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CHARCOAL = rgb(0.1, 0.105, 0.11);
const STONE = rgb(0.39, 0.38, 0.35);
const BRASS = rgb(0.56, 0.42, 0.18);
const LINE = rgb(0.86, 0.84, 0.78);
const LIGHT = rgb(0.97, 0.96, 0.93);

function safeText(value: unknown) {
  return String(value ?? "")
    .replaceAll("²", "2")
    .replaceAll("·", "-")
    .replaceAll("•", "-")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("…", "...")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

function money(value: number, currency: string) {
  return `${currency} ${Number(value).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of safeText(text).split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= width) {
        line = word;
        continue;
      }
      let fragment = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(fragment + char, size) > width && fragment) {
          lines.push(fragment);
          fragment = char;
        } else fragment += char;
      }
      line = fragment;
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function generateQuotationPdf(
  quote: QuotationDetail,
  items: QuotationItem[],
) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  document.setTitle(`${quote.quotation_number} - Universal Pergola`);
  document.setAuthor("Universal Pergola");
  document.setSubject(`Quotation revision ${quote.revision_number}`);
  document.setCreator("Universal Pergola Operations Dashboard");
  document.setProducer("Universal Pergola Operations Dashboard");
  document.setCreationDate(new Date(quote.created_at));
  document.setModificationDate(
    new Date(quote.approved_at || quote.sent_at || quote.created_at),
  );

  let page!: PDFPage;
  let y = 0;
  const addPage = () => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 104,
      width: PAGE_WIDTH,
      height: 104,
      color: CHARCOAL,
    });
    page.drawRectangle({
      x: MARGIN,
      y: PAGE_HEIGHT - 107,
      width: 72,
      height: 3,
      color: BRASS,
    });
    page.drawText("UNIVERSAL PERGOLA", {
      x: MARGIN,
      y: PAGE_HEIGHT - 55,
      size: 17,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page.drawText("ARCHITECTURAL OUTDOOR SOLUTIONS", {
      x: MARGIN,
      y: PAGE_HEIGHT - 76,
      size: 7.5,
      font: regular,
      color: rgb(0.72, 0.72, 0.7),
    });
    page.drawText("QUOTATION", {
      x: PAGE_WIDTH - MARGIN - 96,
      y: PAGE_HEIGHT - 57,
      size: 13,
      font: bold,
      color: rgb(1, 1, 1),
    });
    y = PAGE_HEIGHT - 132;
  };
  const ensure = (height: number) => {
    if (y - height < 58) addPage();
  };
  const line = () => {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.7,
      color: LINE,
    });
    y -= 12;
  };
  const heading = (text: string) => {
    ensure(30);
    page.drawText(safeText(text).toUpperCase(), {
      x: MARGIN,
      y,
      size: 9,
      font: bold,
      color: BRASS,
    });
    y -= 18;
  };
  const body = (
    text: string,
    width = PAGE_WIDTH - MARGIN * 2,
    size = 9,
    color = STONE,
  ) => {
    const lines = wrap(text, regular, size, width);
    for (const textLine of lines) {
      ensure(size + 5);
      page.drawText(textLine, { x: MARGIN, y, size, font: regular, color });
      y -= size + 4;
    }
  };
  const labelValue = (
    label: string,
    value: string,
    x: number,
    top: number,
    width: number,
  ) => {
    page.drawText(safeText(label).toUpperCase(), {
      x,
      y: top,
      size: 6.5,
      font: bold,
      color: STONE,
    });
    const lines = wrap(value || "-", regular, 9, width).slice(0, 3);
    lines.forEach((text, index) =>
      page.drawText(text, {
        x,
        y: top - 14 - index * 12,
        size: 9,
        font: regular,
        color: CHARCOAL,
      }),
    );
  };

  addPage();
  page.drawText(safeText(quote.quotation_number), {
    x: MARGIN,
    y,
    size: 16,
    font: bold,
    color: CHARCOAL,
  });
  page.drawText(`REVISION ${quote.revision_number}`, {
    x: PAGE_WIDTH - MARGIN - 78,
    y: y + 2,
    size: 8,
    font: bold,
    color: BRASS,
  });
  y -= 28;
  page.drawRectangle({
    x: MARGIN,
    y: y - 78,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 82,
    color: LIGHT,
  });
  labelValue(
    "Customer",
    quote.customer_name_snapshot,
    MARGIN + 14,
    y - 15,
    220,
  );
  labelValue(
    "Company",
    quote.customer_company_snapshot || "-",
    MARGIN + 14,
    y - 52,
    220,
  );
  labelValue("Issue date", quote.issue_date, 330, y - 15, 100);
  labelValue("Valid until", quote.validity_date || "-", 447, y - 15, 92);
  labelValue(
    "Contact",
    [quote.customer_phone_snapshot, quote.customer_email_snapshot]
      .filter(Boolean)
      .join(" / ") || "-",
    330,
    y - 52,
    209,
  );
  y -= 101;
  heading("Site / project address");
  body(quote.site_address_snapshot || "Not specified");
  if (quote.introduction) {
    y -= 7;
    heading("Scope");
    body(quote.introduction);
  }
  y -= 10;
  heading("Quotation items");

  const drawItemHeader = () => {
    ensure(28);
    page.drawRectangle({
      x: MARGIN,
      y: y - 16,
      width: PAGE_WIDTH - MARGIN * 2,
      height: 22,
      color: CHARCOAL,
    });
    page.drawText("DESCRIPTION", {
      x: MARGIN + 8,
      y: y - 9,
      size: 6.5,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page.drawText("QTY", {
      x: 330,
      y: y - 9,
      size: 6.5,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page.drawText("UNIT PRICE", {
      x: 382,
      y: y - 9,
      size: 6.5,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page.drawText("LINE TOTAL", {
      x: 486,
      y: y - 9,
      size: 6.5,
      font: bold,
      color: rgb(1, 1, 1),
    });
    y -= 28;
  };
  drawItemHeader();
  for (const item of items) {
    if (y - 54 < 58) {
      addPage();
      drawItemHeader();
    }
    page.drawText(safeText(item.item_name), {
      x: MARGIN + 6,
      y,
      size: 9,
      font: bold,
      color: CHARCOAL,
    });
    if (item.product_code_snapshot)
      page.drawText(safeText(item.product_code_snapshot), {
        x: MARGIN + 6,
        y: y - 12,
        size: 6.5,
        font: regular,
        color: STONE,
      });
    page.drawText(`${item.quantity} ${safeText(item.unit)}`, {
      x: 330,
      y,
      size: 8,
      font: regular,
      color: CHARCOAL,
    });
    page.drawText(money(item.unit_price, quote.currency), {
      x: 382,
      y,
      size: 8,
      font: regular,
      color: CHARCOAL,
    });
    page.drawText(money(item.line_total, quote.currency), {
      x: 486,
      y,
      size: 8,
      font: bold,
      color: CHARCOAL,
    });
    y -= item.product_code_snapshot ? 27 : 16;
    const details = [
      item.description,
      [
        item.width && `W ${item.width}`,
        item.height && `H ${item.height}`,
        item.length && `L ${item.length}`,
      ]
        .filter(Boolean)
        .join(" x "),
      item.dimensions_details,
    ]
      .filter(Boolean)
      .join("\n");
    for (const detailLine of wrap(details, regular, 7.5, 270)) {
      if (y - 13 < 58) {
        addPage();
        drawItemHeader();
        page.drawText(`${safeText(item.item_name)} (continued)`, {
          x: MARGIN + 6,
          y,
          size: 8,
          font: bold,
          color: CHARCOAL,
        });
        y -= 15;
      }
      page.drawText(detailLine, {
        x: MARGIN + 6,
        y,
        size: 7.5,
        font: regular,
        color: STONE,
      });
      y -= 11;
    }
    if (item.discount_amount > 0 || !item.taxable) {
      if (y - 15 < 58) {
        addPage();
        drawItemHeader();
        page.drawText(`${safeText(item.item_name)} (continued)`, {
          x: MARGIN + 6,
          y,
          size: 8,
          font: bold,
          color: CHARCOAL,
        });
        y -= 15;
      }
      page.drawText(
        `${item.discount_amount > 0 ? `Line discount ${money(item.discount_amount, quote.currency)}` : ""}${item.discount_amount > 0 && !item.taxable ? " - " : ""}${!item.taxable ? "Non-taxable" : ""}`,
        { x: MARGIN + 6, y, size: 6.5, font: regular, color: STONE },
      );
      y -= 11;
    }
    y -= 7;
    line();
  }

  ensure(132);
  const totalsX = 344;
  const totalRow = (label: string, value: string, emphasis = false) => {
    page.drawText(label, {
      x: totalsX,
      y,
      size: emphasis ? 10 : 8.5,
      font: emphasis ? bold : regular,
      color: emphasis ? CHARCOAL : STONE,
    });
    const width = (emphasis ? bold : regular).widthOfTextAtSize(
      value,
      emphasis ? 10 : 8.5,
    );
    page.drawText(value, {
      x: PAGE_WIDTH - MARGIN - width,
      y,
      size: emphasis ? 10 : 8.5,
      font: emphasis ? bold : regular,
      color: CHARCOAL,
    });
    y -= emphasis ? 20 : 17;
  };
  totalRow("Subtotal", money(quote.subtotal, quote.currency));
  totalRow(
    `Discount${quote.discount_type === "percentage" ? ` (${quote.discount_value}%)` : ""}`,
    `-${money(quote.discount_amount, quote.currency)}`,
  );
  totalRow(`VAT (${quote.vat_rate}%)`, money(quote.vat_amount, quote.currency));
  page.drawLine({
    start: { x: totalsX, y: y + 7 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 7 },
    thickness: 1,
    color: BRASS,
  });
  totalRow("GRAND TOTAL", money(quote.total, quote.currency), true);

  if (quote.customer_notes) {
    y -= 8;
    heading("Customer notes");
    body(quote.customer_notes);
  }
  if (quote.terms) {
    y -= 8;
    heading("Terms and conditions");
    body(quote.terms);
  }
  y -= 10;
  ensure(30);
  page.drawText("Thank you for considering Universal Pergola.", {
    x: MARGIN,
    y,
    size: 9,
    font: bold,
    color: BRASS,
  });

  const pages = document.getPages();
  pages.forEach((pdfPage, index) => {
    pdfPage.drawLine({
      start: { x: MARGIN, y: 42 },
      end: { x: PAGE_WIDTH - MARGIN, y: 42 },
      thickness: 0.6,
      color: LINE,
    });
    pdfPage.drawText("Universal Pergola - Private business document", {
      x: MARGIN,
      y: 26,
      size: 6.5,
      font: regular,
      color: STONE,
    });
    const number = `Page ${index + 1} of ${pages.length}`;
    pdfPage.drawText(number, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(number, 6.5),
      y: 26,
      size: 6.5,
      font: regular,
      color: STONE,
    });
  });
  return document.save({ useObjectStreams: false });
}
