import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createPaymentProofPath, validatePaymentProof } from "../src/lib/payments/media.ts";
import { paymentMethodLabel, paymentPlanLabel, paymentStatusClass } from "../src/lib/payments/presentation.ts";

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
