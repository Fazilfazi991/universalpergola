import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { createPaymentProofPath, validatePaymentProof } from "../src/lib/payments/media.ts";
import { generatePaymentReceiptPdf } from "../src/lib/payments/pdf.ts";
import { paymentMethodLabel, paymentPlanLabel, paymentStatusClass } from "../src/lib/payments/presentation.ts";
import type { FinanceSummary, ReceiptRow } from "../src/lib/payments/types.ts";

test("payment proof paths are registry-addressable and type constrained", () => {
  const payment = "11111111-1111-4111-8111-111111111111";
  const proof = "22222222-2222-4222-8222-222222222222";
  assert.equal(createPaymentProofPath(payment, proof, "application/pdf"), `${payment}/${proof}.pdf`);
  assert.equal(createPaymentProofPath(payment, proof, "image/webp"), `${payment}/${proof}.webp`);
  assert.equal(validatePaymentProof({ type: "text/plain", size: 20 }), "Use PDF, JPEG, PNG, or WebP.");
  assert.match(validatePaymentProof({ type: "application/pdf", size: 10 * 1024 * 1024 + 1 }), /10 MB/);
  assert.equal(validatePaymentProof({ type: "image/png", size: 512 }), "");
});

test("finance labels preserve operational language", () => {
  assert.equal(paymentMethodLabel("bank_transfer"), "Bank transfer");
  assert.equal(paymentMethodLabel("online_transfer"), "Online transfer");
  assert.equal(paymentPlanLabel("completed"), "Completed");
  assert.match(paymentStatusClass("overdue"), /red/);
  assert.match(paymentStatusClass("partially_paid"), /brass/);
});

test("every payment Server Action re-authorizes its entry point", () => {
  const source = readFileSync(join(process.cwd(), "src/app/dashboard/payments/actions.ts"), "utf8");
  const actions = source.split(/\nexport async function /).slice(1);
  assert(actions.length >= 9);
  for (const action of actions) {
    const name = action.match(/^(\w+)/)?.[1] || "unknown";
    assert.match(action, /await require(?:Role|ModuleAccess)\(/, `${name} has no server-side role guard`);
  }
});

test("payment receipt PDF is deterministic and carries receipt metadata", async () => {
  const receipt: ReceiptRow = {
    id: "11111111-1111-4111-8111-111111111111",
    receipt_number: "UP-R-2026-000001",
    project_id: "22222222-2222-4222-8222-222222222222",
    customer_id: "33333333-3333-4333-8333-333333333333",
    milestone_id: "44444444-4444-4444-8444-444444444444",
    amount_received: 5000,
    received_date: "2026-09-14",
    payment_method: "bank_transfer",
    reference_number: "TXN-5000",
    notes: "Hosted payment",
    voided_at: null,
    void_reason: null,
    created_at: "2026-09-14T08:00:00.000Z",
    creator: { id: "55555555-5555-4555-8555-555555555555", full_name: "Accounts QA" },
    voider: null,
    milestone: { id: "44444444-4444-4444-8444-444444444444", name: "50% Advance", description: "Advance before fabrication", amount_due: 5000 },
    project: { id: "22222222-2222-4222-8222-222222222222", project_number: "UP-P-2026-000001", currency: "AED", project_value: 10000, source_quotation_number: "UP-Q-2026-000001" },
    customer: { id: "33333333-3333-4333-8333-333333333333", name: "PDF QA Customer", phone: "+971 50 000 0000" },
    proofs: [],
  };
  const finance: FinanceSummary = { project_value: 10000, currency: "AED", planned: 10000, received: 5000, outstanding: 5000, overdue: 0, next_due_date: "2026-09-21", paid_percent: 50, plan_status: "active" };
  const bytes = await generatePaymentReceiptPdf(receipt, finance);
  const repeated = await generatePaymentReceiptPdf(receipt, finance);
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), "%PDF");
  assert.deepEqual(Buffer.from(repeated), Buffer.from(bytes));
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(pdf.getTitle(), "UP-R-2026-000001 - Universal Pergola Payment Receipt");

  const voidedBytes = await generatePaymentReceiptPdf(
    {
      ...receipt,
      voided_at: "2026-09-14T09:00:00.000Z",
      void_reason: "Duplicate bank transfer entry",
      voider: { id: "66666666-6666-4666-8666-666666666666", full_name: "Admin QA" },
    },
    finance,
  );
  const voidedPdf = await PDFDocument.load(voidedBytes);
  assert.equal(voidedPdf.getPageCount(), 1);
  assert.equal(voidedPdf.getSubject(), "Voided payment receipt");
});

test("payment receipt PDF route authorizes before reading receipt data", () => {
  const route = readFileSync(join(process.cwd(), "src/app/dashboard/payments/[id]/pdf/route.ts"), "utf8");
  assert.ok(route.indexOf('await requireModuleAccess("payments")') < route.indexOf("await getReceipt(id)"));
  assert.match(route, /Cache-Control": "private, no-store/);
  assert.match(route, /X-Content-Type-Options": "nosniff"/);
});
