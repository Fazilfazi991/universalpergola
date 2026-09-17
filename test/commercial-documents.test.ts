import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { formatClientReference, locationTokenFromSite } from "../src/lib/documents/client-reference.ts";
import { generateInvoicePdf } from "../src/lib/invoices/pdf.ts";
import type { InvoiceDetail, InvoiceItem } from "../src/lib/invoices/queries.ts";

test("client reference uses sequence, UP, human location, day, and year without month", () => {
  assert.equal(locationTokenFromSite("Al Barsha"), "Barsha");
  assert.equal(locationTokenFromSite("Dubai Hills"), "DubaiHills");
  assert.equal(locationTokenFromSite("Jumeirah"), "Jumeirah");
  assert.equal(locationTokenFromSite("[UAT] Villa 11, Dubai Hills, Dubai"), "DubaiHills");
  assert.equal(locationTokenFromSite("Villa 6, Al Barsha, Dubai"), "Barsha");
  assert.equal(formatClientReference(6, "Al Barsha", "2026-09-17"), "006-UP-Barsha-17-2026");
  assert.doesNotMatch(formatClientReference(6, "Al Barsha", "2026-09-17"), /-09-/);
});

test("commercial documents migration uses independent non-reused sequences and private RLS", () => {
  const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260917024453_phase_2k_commercial_documents.sql"), "utf8");
  assert.match(migration, /create sequence if not exists private\.client_reference_seq/);
  assert.match(migration, /create sequence if not exists private\.invoice_number_seq/);
  assert.match(migration, /lpad\(nextval\('private\.invoice_number_seq'\)::text, 6, '0'\)/);
  assert.match(migration, /to_char\(reference_date, 'DD'\)/);
  assert.match(migration, /to_char\(reference_date, 'YYYY'\)/);
  assert.match(migration, /alter table public\.invoices enable row level security/);
  assert.match(migration, /finance staff reads invoices/);
  assert.match(migration, /admin'::public\.app_role, 'accounts'::public\.app_role/);
  assert.match(migration, /revoke all on table public\.invoices from public, anon, authenticated/);
  assert.doesNotMatch(migration, /grant (insert|update|delete).*public\.invoices.*authenticated/i);
});

test("invoice actions and PDF route re-authorize every entry point", () => {
  const actions = readFileSync(join(process.cwd(), "src/app/dashboard/invoices/actions.ts"), "utf8");
  for (const name of ["createInvoiceFromProjectAction", "saveInvoiceDraftAction", "transitionInvoiceAction", "recordInvoicePdfGeneration"]) {
    const start = actions.indexOf(`function ${name}`);
    assert.notEqual(start, -1, `${name} is missing`);
    assert.match(actions.slice(start, start + 700), /requireModuleAccess\("invoices"\)/, `${name} must re-authorize`);
  }
  const route = readFileSync(join(process.cwd(), "src/app/dashboard/invoices/[id]/pdf/route.ts"), "utf8");
  assert.ok(route.indexOf('await requireModuleAccess("invoices")') < route.indexOf("await getInvoice(id)"));
  assert.match(route, /Cache-Control.*private, no-store/);
  assert.match(route, /X-Content-Type-Options.*nosniff/);
});

test("invoice search covers number, reference, customer, project, quotation, and site", () => {
  const queries = readFileSync(join(process.cwd(), "src/lib/invoices/queries.ts"), "utf8");
  assert.match(queries, /cleanSearch\(filters\.search\)\.toLowerCase\(\)/);
  assert.match(queries, /invoice\.customer_name_snapshot/);
  assert.match(queries, /invoice\.customer\?\.name/);
  assert.match(queries, /invoice\.project\?\.project_number/);
  assert.match(queries, /invoice\.quotation_number_snapshot/);
  assert.match(queries, /invoice\.site_address_snapshot/);

  const documents = readFileSync(join(process.cwd(), "src/app/dashboard/documents/page.tsx"), "utf8");
  assert.match(documents, /item\.quotation_number_snapshot/);
  assert.match(documents, /item\.site_address_snapshot/);
});

test("invoice PDF is deterministic A4 and carries internal and shared references", async () => {
  const invoice = {
    id: "11111111-1111-4111-8111-111111111111", invoice_number: "UP-I-2026-000001", client_reference: "006-UP-Barsha-17-2026", client_reference_sequence: 6, client_reference_location_token: "Barsha", client_reference_date: "2026-09-17",
    project_id: "22222222-2222-4222-8222-222222222222", customer_id: "33333333-3333-4333-8333-333333333333", quotation_id: "44444444-4444-4444-8444-444444444444", quotation_number_snapshot: "UP-Q-2026-000001", quotation_revision_snapshot: 0,
    issue_date: "2026-09-17", due_date: "2026-10-01", currency: "AED", subtotal: 10000, discount_type: "fixed", discount_value: 0, discount_amount: 0, vat_rate: 5, vat_amount: 500, total: 10500, status: "issued",
    customer_name_snapshot: "UAT Client", customer_company_snapshot: "UAT Design LLC", customer_phone_snapshot: "+971500000000", customer_email_snapshot: "uat@example.test", site_address_snapshot: "Al Barsha, Dubai",
    notes: "Commercial invoice generated from the approved quotation.", terms: "Payment according to the approved project schedule.", issued_at: "2026-09-17T08:00:00.000Z", issued_by: "55555555-5555-4555-8555-555555555555", cancelled_at: null, cancellation_reason: null, pdf_generated_at: null, created_at: "2026-09-17T07:00:00.000Z", updated_at: "2026-09-17T08:00:00.000Z",
    customer: { id: "33333333-3333-4333-8333-333333333333", name: "UAT Client", phone: "+971500000000" }, project: { id: "22222222-2222-4222-8222-222222222222", project_number: "UP-P-2026-000001", client_reference: "006-UP-Barsha-17-2026", project_value: 10500, currency: "AED" }, creator: { id: "55555555-5555-4555-8555-555555555555", full_name: "UAT Management" }, issuer: { id: "55555555-5555-4555-8555-555555555555", full_name: "UAT Management" },
  } as InvoiceDetail;
  const items: InvoiceItem[] = [{ id: "66666666-6666-4666-8666-666666666666", quotation_item_id: null, item_name: "Motorised louvered pergola", description: "Fabrication, powder coating, installation, and handover.", quantity: 1, unit: "project", unit_price: 10000, discount_amount: 0, taxable: true, line_subtotal: 10000, line_total: 10000, sort_order: 10 }];
  const first = await generateInvoicePdf(invoice, items);
  const second = await generateInvoicePdf(invoice, items);
  assert.deepEqual(Buffer.from(first), Buffer.from(second));
  assert.equal(Buffer.from(first).subarray(0, 4).toString(), "%PDF");
  const pdf = await PDFDocument.load(first);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(pdf.getTitle(), "UP-I-2026-000001 - Universal Pergola Invoice");
  assert.equal(pdf.getSubject(), "Commercial invoice for 006-UP-Barsha-17-2026");
});
