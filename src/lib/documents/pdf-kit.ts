import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { rgb, type PDFDocument, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { UNIVERSAL_PERGOLA_DOCUMENT } from "./config.ts";

export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;
export const PDF_COLORS = {
  ink: rgb(0.075, 0.07, 0.06),
  charcoal: rgb(0.12, 0.115, 0.1),
  stone: rgb(0.39, 0.37, 0.33),
  brass: rgb(0.64, 0.45, 0.18),
  brassLight: rgb(0.91, 0.84, 0.69),
  sand: rgb(0.965, 0.95, 0.91),
  line: rgb(0.82, 0.79, 0.72),
  white: rgb(1, 1, 1),
  red: rgb(0.72, 0.12, 0.1),
  green: rgb(0.05, 0.48, 0.28),
} as const;

export function safePdfText(value: unknown) {
  return String(value ?? "")
    .replaceAll("²", "2")
    .replaceAll("·", "-")
    .replaceAll("•", "-")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("…", "...")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

export function pdfMoney(value: number, currency = "AED") {
  return `${currency} ${Number(value).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pdfDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return safePdfText(value);
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function wrapPdfText(value: unknown, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of safePdfText(value).split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(""); continue; }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= width) { line = word; continue; }
      let fragment = "";
      for (const character of word) {
        if (fragment && font.widthOfTextAtSize(fragment + character, size) > width) { lines.push(fragment); fragment = character; }
        else fragment += character;
      }
      line = fragment;
    }
    if (line) lines.push(line);
  }
  return lines;
}

export function drawRightText(page: PDFPage, value: unknown, right: number, y: number, size: number, font: PDFFont, color = PDF_COLORS.ink) {
  const text = safePdfText(value);
  page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, size, font, color });
}

export async function embedBrandLogo(document: PDFDocument): Promise<PDFImage> {
  const bytes = await readFile(join(process.cwd(), "public", "brand", "universal-pergola-logo.png"));
  return document.embedPng(bytes);
}

export function drawDocumentFooter(page: PDFPage, regular: PDFFont, bold: PDFFont, pageNumber: number, totalPages: number, identifier: string) {
  const { email, website, phones } = UNIVERSAL_PERGOLA_DOCUMENT;
  page.drawLine({ start: { x: 32, y: 34 }, end: { x: A4_WIDTH - 32, y: 34 }, thickness: 0.65, color: PDF_COLORS.line });
  page.drawText(`${email}  |  ${website}  |  ${phones.join(" / ")}`, { x: 32, y: 20, size: 6.2, font: regular, color: PDF_COLORS.stone });
  drawRightText(page, `${identifier}  |  ${pageNumber}/${totalPages}`, A4_WIDTH - 32, 20, 6.2, bold, PDF_COLORS.stone);
}
