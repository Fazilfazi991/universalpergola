import { mkdir, writeFile } from "node:fs/promises";
import { generateInvoicePdf } from "../src/lib/invoices/pdf.ts";
import { generatePaymentReceiptPdf } from "../src/lib/payments/pdf.ts";
import { generateQuotationPdf } from "../src/lib/quotations/pdf.ts";

const outputDirectory = "output/pdf/final-client-template-review";
const clientReference = "010-UP-DubaiHills-14-2026-CLIENT-PERGOLA";
const customerName = "Mohammed Abdul Rahman Al Mansoori Al Marzouqi";
const siteAddress = "Villa 127, District 5, Dubai Hills Estate, Dubai, United Arab Emirates - rear garden installation zone beside the swimming pool deck";

const quotationItems = [
  ["Motorised louvered pergola structure", "Powder-coated aluminium frame with motorised rotating louvers, concealed drainage, controls, coordinated fabrication, and final commissioning.", "5400 W x 4200 L x 2900 H mm", 187500],
  ["Integrated perimeter lighting package", "Warm-white dimmable LED channels, drivers, concealed cabling, testing, and connection coordination.", "Full perimeter installation", 32750],
  ["Automated side-screen system", "Weather-rated motorised side screens with remote control, powder-coated cassette, guides, and commissioning.", "Three elevations", 68500],
  ["Installation and project handover", "Site coordination, access equipment, installation, alignment, testing, cleaning, and client handover.", "Complete works", 24180],
].map(([item_name, description, dimensions_details, line_total], index) => ({
  id: `44444444-4444-4444-8444-44444444444${index + 1}`,
  product_id: null,
  source_measurement_id: null,
  product_name_snapshot: null,
  product_code_snapshot: `UP-${String(index + 1).padStart(3, "0")}`,
  item_name,
  description,
  quantity: 1,
  unit: "project",
  width: null,
  height: null,
  length: null,
  dimensions_details,
  unit_price: line_total,
  discount_amount: 0,
  taxable: true,
  line_total,
  sort_order: (index + 1) * 10,
}));

const subtotal = quotationItems.reduce((sum, item) => sum + item.line_total, 0);
const vatAmount = subtotal * 0.05;
const total = subtotal + vatAmount;

const quotation = {
  id: "11111111-1111-4111-8111-111111111111",
  quotation_number: "UP-Q-2026-000140",
  client_reference: clientReference,
  customer_id: "22222222-2222-4222-8222-222222222222",
  enquiry_id: null,
  site_visit_id: null,
  owner_id: null,
  issue_date: "2026-09-19",
  validity_date: "2026-10-03",
  currency: "AED",
  status: "sent",
  revision_number: 1,
  revision_group_id: "33333333-3333-4333-8333-333333333333",
  revised_from_id: null,
  is_current: true,
  customer_name_snapshot: customerName,
  customer_company_snapshot: "Universal Architectural Outdoor Living and Pergola Contracting Services LLC",
  customer_phone_snapshot: "+971 50 123 4567",
  customer_email_snapshot: "commercial-review@example-client-domain.com",
  site_address_snapshot: siteAddress,
  introduction: "Design, fabrication, supply, and installation of a complete outdoor living system.",
  internal_notes: null,
  customer_notes: null,
  terms: null,
  discount_type: "fixed",
  discount_value: 0,
  subtotal,
  discount_amount: 0,
  vat_rate: 5,
  vat_amount: vatAmount,
  total,
  created_at: "2026-09-19T08:00:00.000Z",
  updated_at: "2026-09-19T08:00:00.000Z",
  sent_at: "2026-09-19T08:30:00.000Z",
  approved_at: null,
  approved_by: null,
  rejected_at: null,
  rejected_by: null,
  decision_note: null,
  pdf_generated_at: null,
  customer: null,
  enquiry: null,
  site_visit: null,
  owner: null,
  approver: null,
  rejector: null,
};

const invoiceItems = quotationItems.map((item) => ({
  id: item.id,
  quotation_item_id: item.id,
  item_name: item.item_name,
  description: `${item.description} ${item.dimensions_details}.`,
  quantity: item.quantity,
  unit: item.unit,
  unit_price: item.unit_price,
  discount_amount: item.discount_amount,
  taxable: item.taxable,
  line_subtotal: item.line_total,
  line_total: item.line_total,
  sort_order: item.sort_order,
}));

const invoice = {
  id: "55555555-5555-4555-8555-555555555555",
  invoice_number: "UP-I-2026-000140",
  client_reference: clientReference,
  client_reference_sequence: 10,
  client_reference_location_token: "DubaiHills",
  client_reference_date: "2026-09-19",
  project_id: "66666666-6666-4666-8666-666666666666",
  customer_id: quotation.customer_id,
  quotation_id: quotation.id,
  quotation_number_snapshot: quotation.quotation_number,
  quotation_revision_snapshot: quotation.revision_number,
  issue_date: "2026-09-19",
  due_date: "2026-10-03",
  currency: "AED",
  subtotal,
  discount_type: "fixed",
  discount_value: 0,
  discount_amount: 0,
  vat_rate: 5,
  vat_amount: vatAmount,
  total,
  status: "issued",
  customer_name_snapshot: customerName,
  customer_company_snapshot: quotation.customer_company_snapshot,
  customer_phone_snapshot: quotation.customer_phone_snapshot,
  customer_email_snapshot: quotation.customer_email_snapshot,
  site_address_snapshot: siteAddress,
  notes: "Commercial invoice generated from the approved client quotation.",
  terms: "Payment according to the approved project schedule.",
  issued_at: "2026-09-19T09:00:00.000Z",
  issued_by: "77777777-7777-4777-8777-777777777777",
  cancelled_at: null,
  cancellation_reason: null,
  pdf_generated_at: null,
  created_at: "2026-09-19T08:45:00.000Z",
  updated_at: "2026-09-19T09:00:00.000Z",
  customer: { id: quotation.customer_id, name: customerName, phone: quotation.customer_phone_snapshot },
  project: { id: "66666666-6666-4666-8666-666666666666", project_number: "UP-P-2026-000140", client_reference: clientReference, project_value: total, currency: "AED" },
  creator: { id: "77777777-7777-4777-8777-777777777777", full_name: "Commercial Operations" },
  issuer: { id: "77777777-7777-4777-8777-777777777777", full_name: "Commercial Operations" },
};

const receipt = {
  id: "88888888-8888-4888-8888-888888888888",
  receipt_number: "UP-R-2026-000140",
  project_id: invoice.project_id,
  customer_id: quotation.customer_id,
  milestone_id: "99999999-9999-4999-8999-999999999999",
  amount_received: 156203.25,
  received_date: "2026-09-19",
  payment_method: "bank_transfer",
  reference_number: "BANK-TRANSFER-CONFIRMATION-2026-09-19-000140",
  notes: null,
  voided_at: null,
  void_reason: null,
  created_at: "2026-09-19T10:00:00.000Z",
  creator: { id: "77777777-7777-4777-8777-777777777777", full_name: "Commercial Operations" },
  voider: null,
  milestone: {
    id: "99999999-9999-4999-8999-999999999999",
    name: "50% Advance Payment for Fabrication",
    description: "Advance received before material procurement, detailed fabrication drawings, powder-coating approval, motor coordination, and installation scheduling.",
    amount_due: 156203.25,
  },
  project: {
    id: invoice.project_id,
    project_number: "UP-P-2026-000140",
    currency: "AED",
    project_value: total,
    source_quotation_number: quotation.quotation_number,
    client_reference: clientReference,
  },
  customer: { id: quotation.customer_id, name: customerName, phone: quotation.customer_phone_snapshot },
  proofs: [],
};

const finance = {
  project_value: total,
  currency: "AED",
  planned: total,
  received: receipt.amount_received,
  outstanding: total - receipt.amount_received,
  overdue: 0,
  next_due_date: "2026-10-03",
  paid_percent: 50,
  plan_status: "active",
};

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  generateQuotationPdf(quotation, quotationItems).then((bytes) => writeFile(`${outputDirectory}/generated-quotation.pdf`, bytes)),
  generateInvoicePdf(invoice, invoiceItems).then((bytes) => writeFile(`${outputDirectory}/generated-invoice.pdf`, bytes)),
  generatePaymentReceiptPdf(receipt, finance).then((bytes) => writeFile(`${outputDirectory}/generated-receipt.pdf`, bytes)),
]);

console.log(JSON.stringify({ status: "passed", outputDirectory }, null, 2));
