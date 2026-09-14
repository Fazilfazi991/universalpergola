import { mkdir, writeFile } from "node:fs/promises";
import { DEFAULT_QUOTATION_TERMS } from "../src/lib/documents/config.ts";
import { generatePaymentReceiptPdf } from "../src/lib/payments/pdf.ts";
import { generateQuotationPdf } from "../src/lib/quotations/pdf.ts";

const quote = {
  id: "11111111-1111-4111-8111-111111111111",
  quotation_number: "UP-Q-2026-000101",
  customer_id: "22222222-2222-4222-8222-222222222222",
  enquiry_id: null, site_visit_id: null, owner_id: null,
  issue_date: "2026-09-14", validity_date: "2026-09-21", currency: "AED", status: "sent",
  revision_number: 1, revision_group_id: "33333333-3333-4333-8333-333333333333", revised_from_id: null, is_current: true,
  customer_name_snapshot: "Ahmed Al Mansoori", customer_company_snapshot: "Al Noor Residence",
  customer_phone_snapshot: "+971 50 123 4567", customer_email_snapshot: "ahmed@example.com",
  site_address_snapshot: "Villa 27, Dubai Hills, Dubai",
  introduction: "Design, fabrication, supply, and installation of a motorised louvered aluminium pergola.",
  internal_notes: null, customer_notes: "Final finish and site dimensions will be confirmed before fabrication.", terms: DEFAULT_QUOTATION_TERMS,
  discount_type: "fixed", discount_value: 250, subtotal: 47500, discount_amount: 250, vat_rate: 5, vat_amount: 2362.5, total: 49612.5,
  created_at: "2026-09-14T08:00:00.000Z", updated_at: "2026-09-14T08:00:00.000Z", sent_at: "2026-09-14T08:30:00.000Z",
  approved_at: null, approved_by: null, rejected_at: null, rejected_by: null, decision_note: null, pdf_generated_at: null,
  customer: null, enquiry: null, site_visit: null, owner: null, approver: null, rejector: null,
};
const item = (id, name, description, unitPrice, order) => ({
  id, product_id: null, source_measurement_id: null, product_name_snapshot: null, product_code_snapshot: `UP-${String(order).padStart(3, "0")}`,
  item_name: name, description, quantity: 1, unit: order === 1 ? "project" : "service", width: order === 1 ? 5400 : null,
  height: order === 1 ? 2900 : null, length: order === 1 ? 4200 : null, dimensions_details: order === 1 ? "Final dimensions subject to site confirmation" : null,
  unit_price: unitPrice, discount_amount: 0, taxable: true, line_total: unitPrice, sort_order: order * 10,
});
const items = [
  item("44444444-4444-4444-8444-444444444441", "Motorised louvered pergola", "Powder-coated aluminium frame, motorised louvers, concealed drainage, controls, and coordinated fabrication.", 45000, 1),
  item("44444444-4444-4444-8444-444444444442", "Installation and site coordination", "Professional installation, final alignment, testing, and customer handover.", 2500, 2),
];
const receipt = {
  id: "55555555-5555-4555-8555-555555555555", receipt_number: "UP-R-2026-000101", project_id: "66666666-6666-4666-8666-666666666666",
  customer_id: quote.customer_id, milestone_id: "77777777-7777-4777-8777-777777777777", amount_received: 24806.25,
  received_date: "2026-09-14", payment_method: "bank_transfer", reference_number: "TXN-UP-240914", notes: null,
  voided_at: null, void_reason: null, created_at: "2026-09-14T09:00:00.000Z",
  creator: { id: "88888888-8888-4888-8888-888888888888", full_name: "Accounts Team" }, voider: null,
  milestone: { id: "77777777-7777-4777-8777-777777777777", name: "50% Advance Payment", description: "Advance received before material procurement and fabrication.", amount_due: 24806.25 },
  project: { id: "66666666-6666-4666-8666-666666666666", project_number: "UP-P-2026-000101", currency: "AED", project_value: 49612.5, source_quotation_number: quote.quotation_number },
  customer: { id: quote.customer_id, name: quote.customer_name_snapshot, phone: quote.customer_phone_snapshot }, proofs: [],
};
const finance = { project_value: 49612.5, currency: "AED", planned: 49612.5, received: 24806.25, outstanding: 24806.25, overdue: 0, next_due_date: "2026-09-21", paid_percent: 50, plan_status: "active" };
const longItems = Array.from({ length: 36 }, (_, index) => item(crypto.randomUUID(), `Pergola component ${index + 1}`, `Architectural fabrication detail ${index + 1}. ${"Powder-coated finish, coordinated fixing, drainage allowance, and installation constraint. ".repeat(4)}`, 1200, index + 1));
const longQuote = { ...quote, quotation_number: "UP-Q-2026-000102", subtotal: 43200, discount_value: 0, discount_amount: 0, vat_amount: 2160, total: 45360, terms: `${DEFAULT_QUOTATION_TERMS}\n${"Additional project-specific installation condition. ".repeat(70)}` };

await Promise.all([mkdir("output/pdf", { recursive: true }), mkdir("tmp/pdfs", { recursive: true })]);
await Promise.all([
  generateQuotationPdf(quote, items).then((bytes) => writeFile("output/pdf/universal-pergola-sample-quotation.pdf", bytes)),
  generatePaymentReceiptPdf(receipt, finance).then((bytes) => writeFile("output/pdf/universal-pergola-sample-payment-receipt.pdf", bytes)),
  generateQuotationPdf(longQuote, longItems).then((bytes) => writeFile("tmp/pdfs/universal-pergola-long-quotation-qa.pdf", bytes)),
]);
console.log(JSON.stringify({ status: "passed", files: ["output/pdf/universal-pergola-sample-quotation.pdf", "output/pdf/universal-pergola-sample-payment-receipt.pdf", "tmp/pdfs/universal-pergola-long-quotation-qa.pdf"] }, null, 2));
