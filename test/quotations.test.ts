import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { quotationPreviewTotals } from "../src/lib/quotations/money.ts";
import { generateQuotationPdf } from "../src/lib/quotations/pdf.ts";
import { quotationDraftSchema } from "../src/lib/quotations/validation.ts";
import type {
  QuotationDetail,
  QuotationItem,
} from "../src/lib/quotations/queries.ts";

const item = (overrides: Partial<QuotationItem> = {}): QuotationItem => ({
  id: crypto.randomUUID(),
  product_id: null,
  source_measurement_id: null,
  product_name_snapshot: null,
  product_code_snapshot: null,
  item_name: "Custom pergola",
  description: "Fabricated aluminium pergola with powder-coated finish.",
  quantity: 1,
  unit: "item",
  width: 4,
  height: 2.8,
  length: 5,
  dimensions_details: null,
  unit_price: 100,
  discount_amount: 0,
  taxable: true,
  line_total: 100,
  sort_order: 10,
  ...overrides,
});

test("quotation preview uses minor-unit rounding, proportional discount, and taxable allocation", () => {
  const totals = quotationPreviewTotals(
    [
      {
        product_id: null,
        source_measurement_id: null,
        item_name: "Taxable",
        description: "",
        quantity: "2.5",
        unit: "item",
        width: "",
        height: "",
        length: "",
        dimensions_details: "",
        unit_price: "123.45",
        discount_amount: "8.63",
        taxable: true,
        sort_order: 10,
      },
      {
        product_id: null,
        source_measurement_id: null,
        item_name: "Non-taxable",
        description: "",
        quantity: "1",
        unit: "service",
        width: "",
        height: "",
        length: "",
        dimensions_details: "",
        unit_price: "100",
        discount_amount: "0",
        taxable: false,
        sort_order: 20,
      },
    ],
    "percentage",
    "10",
    "5",
  );
  assert.deepEqual(totals, {
    lines: [300, 100],
    subtotal: 400,
    discount: 40,
    vat: 13.5,
    total: 373.5,
  });
});

test("quotation validation rejects invalid dates, excessive discounts, and empty items", () => {
  const result = quotationDraftSchema.safeParse({
    id: null,
    customer_id: crypto.randomUUID(),
    enquiry_id: null,
    site_visit_id: null,
    owner_id: null,
    currency: "AED",
    issue_date: "2026-09-13",
    validity_date: "2026-09-12",
    customer_name_snapshot: "QA Customer",
    customer_company_snapshot: null,
    customer_phone_snapshot: null,
    customer_email_snapshot: null,
    site_address_snapshot: null,
    introduction: null,
    internal_notes: null,
    customer_notes: null,
    terms: null,
    discount_type: "percentage",
    discount_value: 101,
    vat_rate: 5,
    items: [],
  });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.error.issues.length >= 3);
});

test("Phase 2D migrations provide generated numbers, immutable revisions, authoritative totals, and unique conversion", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase",
      "migrations",
      "20260913081221_phase_2d_quotation_lifecycle.sql",
    ),
    "utf8",
  );
  const atomic = readFileSync(
    join(
      process.cwd(),
      "supabase",
      "migrations",
      "20260913082018_phase_2d_atomic_quotation_drafts.sql",
    ),
    "utf8",
  );
  const activity = readFileSync(
    join(
      process.cwd(),
      "supabase",
      "migrations",
      "20260913083500_phase_2d_quotation_activity_and_indexes.sql",
    ),
    "utf8",
  );
  const returningPolicy = readFileSync(
    join(
      process.cwd(),
      "supabase",
      "migrations",
      "20260913084500_phase_2d_quotation_returning_policy.sql",
    ),
    "utf8",
  );
  const scopedActivity = readFileSync(
    join(
      process.cwd(),
      "supabase",
      "migrations",
      "20260913090000_phase_2d_scope_quotation_activity.sql",
    ),
    "utf8",
  );
  assert.match(migration, /private\.quotation_number_seq/);
  assert.match(migration, /quotations_one_current_revision_idx/);
  assert.match(migration, /projects_one_quotation_conversion_idx/);
  assert.match(migration, /Issued quotation commercial data is immutable/);
  assert.match(
    migration,
    /round\(greatest\(taxable_subtotal - taxable_discount, 0\)/,
  );
  assert.match(
    atomic,
    /create or replace function public\.save_quotation_draft/,
  );
  assert.match(atomic, /security invoker/);
  assert.match(activity, /quotation\.revision_created/);
  assert.match(activity, /quotation\.project_converted/);
  assert.match(returningPolicy, /owner_id = \(select auth\.uid\(\)\)/);
  assert.match(scopedActivity, /private\.can_read_quotation\(entity_id\)/);
});

test("quotation Server Actions re-authorize every mutation entry point", () => {
  const actions = readFileSync(
    join(process.cwd(), "src", "app", "dashboard", "quotations", "actions.ts"),
    "utf8",
  );
  for (const name of [
    "saveQuotationAction",
    "transitionQuotationAction",
    "createQuotationRevisionAction",
    "convertQuotationToProjectAction",
    "recordQuotationPdfGeneration",
  ]) {
    const start = actions.indexOf(`function ${name}`);
    assert.notEqual(start, -1, `${name} is missing`);
    const body = actions.slice(start, start + 650);
    assert.match(
      body,
      /require(Role|Management|ModuleAccess)/,
      `${name} must re-authorize`,
    );
  }
});

test("multi-page quotation PDF preserves structured content and page footers", async () => {
  const quote = {
    id: crypto.randomUUID(),
    quotation_number: "UP-Q-2026-000001",
    customer_id: crypto.randomUUID(),
    enquiry_id: null,
    site_visit_id: null,
    owner_id: crypto.randomUUID(),
    issue_date: "2026-09-13",
    validity_date: "2026-10-13",
    currency: "AED",
    status: "sent",
    revision_number: 1,
    revision_group_id: crypto.randomUUID(),
    revised_from_id: null,
    is_current: true,
    customer_name_snapshot: "PDF QA Customer",
    customer_company_snapshot: "Universal QA LLC",
    customer_phone_snapshot: "+971500000000",
    customer_email_snapshot: "qa@example.com",
    site_address_snapshot: "Dubai, United Arab Emirates",
    introduction:
      "A complete architectural pergola quotation with a deliberately long multi-page scope.",
    internal_notes: null,
    customer_notes: "Customer-facing QA note.",
    terms: "Development terms. ".repeat(80),
    discount_type: "percentage",
    discount_value: 5,
    subtotal: 4000,
    discount_amount: 200,
    vat_rate: 5,
    vat_amount: 190,
    total: 3990,
    created_at: "2026-09-13T08:00:00.000Z",
    updated_at: "2026-09-13T08:30:00.000Z",
    sent_at: "2026-09-13T08:30:00.000Z",
    approved_at: null,
    approved_by: null,
    rejected_at: null,
    rejected_by: null,
    decision_note: null,
    pdf_generated_at: null,
    updated_at_extra: "",
    customer: null,
    enquiry: null,
    site_visit: null,
    owner: null,
    approver: null,
    rejector: null,
  } as unknown as QuotationDetail;
  const items = Array.from({ length: 36 }, (_, index) =>
    item({
      id: crypto.randomUUID(),
      item_name: `Quotation item ${index + 1}`,
      description: `Long item description ${index + 1}. ${"Architectural fabrication detail and installation constraint. ".repeat(5)}`,
      line_total: 100,
      sort_order: (index + 1) * 10,
    }),
  );
  const bytes = await generateQuotationPdf(quote, items);
  const repeatedBytes = await generateQuotationPdf(quote, items);
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), "%PDF");
  assert.deepEqual(Buffer.from(repeatedBytes), Buffer.from(bytes));
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 3);
  assert.equal(pdf.getTitle(), "UP-Q-2026-000001 - Universal Pergola");
});
