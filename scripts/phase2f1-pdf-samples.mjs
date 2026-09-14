import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_QUOTATION_TERMS } from "../src/lib/documents/config.ts";
import { generatePaymentReceiptPdf } from "../src/lib/payments/pdf.ts";
import { generateQuotationPdf } from "../src/lib/quotations/pdf.ts";

const envText = await readFile(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
  const at = line.indexOf("=");
  return [line.slice(0, at), line.slice(at + 1).replace(/^["']|["']$/g, "")];
}));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert(url && key, "Hosted Supabase browser configuration is required");
const phase2e = JSON.parse(await readFile(".qa-runtime/phase2e-fixture.json", "utf8"));
const phase2f = JSON.parse(await readFile(".qa-runtime/phase2f-fixture.json", "utf8"));
assert(phase2e.adminEmail && phase2e.password, "Phase 2E hosted role fixture is required");
assert(phase2f.accountsEmail, "Phase 2F hosted Accounts role fixture is required");

const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const management = createClient(url, key, options);
const accounts = createClient(url, key, options);
const managementSignIn = await management.auth.signInWithPassword({ email: phase2e.adminEmail, password: phase2e.password });
assert.ifError(managementSignIn.error);
assert(managementSignIn.data.user);
assert.ifError((await accounts.auth.signInWithPassword({ email: phase2f.accountsEmail, password: phase2e.password })).error);

async function requireData(promise, label) {
  const result = await promise;
  assert.ifError(result.error);
  assert(result.data !== null, `${label}: missing data`);
  return result.data;
}

try {
  const runId = randomUUID().slice(0, 8);
  const issue = new Date().toISOString().slice(0, 10);
  const validity = new Date(Date.parse(`${issue}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  const selfProfile = await requireData(management.from("profiles").select("id, role, status").eq("id", managementSignIn.data.user.id).maybeSingle(), "Management QA profile");
  assert(selfProfile?.status === "active" && ["admin", "sales"].includes(selfProfile.role), `Hosted Management QA profile is unavailable (${selfProfile?.role || "hidden"}/${selfProfile?.status || "hidden"})`);
  const activeStaff = [selfProfile];
  const ownerId = activeStaff[0].id;
  const customerName = `Mohammed Abdul Rahman Al Mansoori ${runId}`;
  const companyName = "Pergola Client Format QA and Architectural Works LLC";
  const customerEmail = `phase2f1-document-polish-${runId}@example-client-domain.com`;
  const siteAddress = "Villa 127, District 5, Dubai Hills Estate, Dubai, United Arab Emirates";
  const customer = await requireData(management.from("customers").insert({
    name: customerName,
    customer_type: "company",
    company_name: companyName,
    phone: "+971501234567",
    email: customerEmail,
    address: siteAddress,
    area: "Dubai Hills",
    emirate: "Dubai",
    source: "Phase 2F.1 document QA",
    assigned_to: ownerId,
    created_by: managementSignIn.data.user.id,
  }).select("id").single(), "Phase 2F.1 customer");
  const items = [
    {
      product_id: null,
      source_measurement_id: null,
      item_name: "Motorised louvered pergola",
      description: "Design, fabrication, powder coating, motorised louver system, rainwater drainage, and coordinated installation.",
      quantity: "1",
      unit: "project",
      width: "5400",
      height: "2900",
      length: "4200",
      dimensions_details: "Final dimensions subject to site confirmation",
      unit_price: "45000",
      discount_amount: "0",
      taxable: true,
      sort_order: 10,
    },
    {
      product_id: null,
      source_measurement_id: null,
      item_name: "Installation and site coordination",
      description: "Professional installation, final alignment, testing, and handover coordination.",
      quantity: "1",
      unit: "service",
      width: "",
      height: "",
      length: "",
      dimensions_details: "",
      unit_price: "2500",
      discount_amount: "0",
      taxable: true,
      sort_order: 20,
    },
  ];
  const quotationId = await requireData(management.rpc("save_quotation_draft", {
    p_quotation_id: null,
    p_payload: {
      customer_id: customer.id,
      enquiry_id: null,
      site_visit_id: null,
      owner_id: ownerId,
      currency: "AED",
      issue_date: issue,
      validity_date: validity,
      customer_name_snapshot: customerName,
      customer_company_snapshot: companyName,
      customer_phone_snapshot: "+971501234567",
      customer_email_snapshot: customerEmail,
      site_address_snapshot: siteAddress,
      introduction: "Design, fabrication, supply, and installation of the agreed architectural pergola solution.",
      internal_notes: "Disposable Phase 2F.1 client-document QA quotation.",
      customer_notes: "Final site measurements and finish selection will be confirmed before fabrication.",
      terms: DEFAULT_QUOTATION_TERMS,
      discount_type: "fixed",
      discount_value: "250",
      vat_rate: "5",
      items,
    },
  }), "Phase 2F.1 quotation");
  assert.ifError((await management.from("quotations").update({ status: "ready" }).eq("id", quotationId)).error);
  assert.ifError((await management.from("quotations").update({ status: "sent" }).eq("id", quotationId)).error);
  assert.ifError((await management.from("quotations").update({ status: "approved", decision_note: "Approved for Phase 2F.1 document QA" }).eq("id", quotationId)).error);
  const quotation = await requireData(management.from("quotations").select("*").eq("id", quotationId).single(), "sample quotation");
  const quotationItems = await requireData(management.from("quotation_items").select("*").eq("quotation_id", quotationId).order("sort_order"), "sample quotation items");

  const projectId = await requireData(management.rpc("convert_approved_quotation_to_project", { p_quotation_id: quotationId }), "sample project conversion");
  assert.ifError((await management.rpc("update_project_details", {
    p_project_id: projectId,
    p_status: "active",
    p_priority: "normal",
    p_start_date: issue,
    p_target_date: validity,
    p_installation_date: null,
    p_summary: "Phase 2F.1 receipt PDF verification",
    p_notes: "Disposable hosted document fixture",
  })).error);
  const project = await requireData(accounts.from("projects").select("id, project_number, project_value, currency").eq("id", projectId).single(), "sample payment project");
  const advanceAmount = Math.round(Number(project.project_value) * 50) / 100;
  const secondAmount = Math.round(Number(project.project_value) * 40) / 100;
  const finalAmount = Math.round((Number(project.project_value) - advanceAmount - secondAmount) * 100) / 100;
  const advanceMilestone = await requireData(accounts.rpc("save_payment_milestone", {
    p_project_id: projectId, p_milestone_id: null, p_name: "50% Advance Payment", p_type: "percentage",
    p_percentage: 50, p_fixed_amount: null, p_due_date: issue,
    p_description: "Advance received before material procurement, fabrication drawings, powder-coating approval, motor coordination, and installation scheduling.", p_notes: "Phase 2F.1 receipt sample", p_sort_order: 10,
  }), "advance milestone");
  await requireData(accounts.rpc("save_payment_milestone", {
    p_project_id: projectId, p_milestone_id: null, p_name: "40% Before Installation", p_type: "percentage",
    p_percentage: 40, p_fixed_amount: null, p_due_date: validity,
    p_description: "Second payment before installation.", p_notes: "Phase 2F.1 receipt sample", p_sort_order: 20,
  }), "second milestone");
  await requireData(accounts.rpc("save_payment_milestone", {
    p_project_id: projectId, p_milestone_id: null, p_name: "10% Final Payment", p_type: "fixed",
    p_percentage: null, p_fixed_amount: finalAmount, p_due_date: validity,
    p_description: "Final payment at handover.", p_notes: "Phase 2F.1 receipt sample", p_sort_order: 30,
  }), "final milestone");
  assert.ifError((await accounts.rpc("activate_payment_plan", { p_project_id: projectId })).error);
  const receiptId = await requireData(accounts.rpc("record_payment", {
    p_project_id: projectId,
    p_milestone_id: advanceMilestone,
    p_amount: advanceAmount,
    p_received_date: issue,
    p_method: "bank_transfer",
    p_reference: `BANK-TRANSFER-CONFIRMATION-${runId.toUpperCase()}-PERGOLA-ADVANCE`,
    p_notes: "Phase 2F.1 generated receipt sample",
  }), "sample payment receipt");

  const receipt = await requireData(accounts.from("payments").select(
    "id, receipt_number, project_id, customer_id, milestone_id, amount_received, received_date, payment_method, reference_number, notes, voided_at, void_reason, created_at, creator:profiles!payments_created_by_fkey(id, full_name), voider:profiles!payments_voided_by_fkey(id, full_name), milestone:payment_milestones!payments_milestone_id_fkey(id, name, description, amount_due), project:projects!payments_project_id_fkey(id, project_number, currency, project_value, source_quotation_number), customer:customers!payments_customer_id_fkey(id, name, phone), proofs:payment_proofs(id, payment_id, storage_path, file_name, mime_type, file_size, created_at)"
  ).eq("id", receiptId).single(), "sample receipt");
  const financeRows = await requireData(accounts.rpc("get_project_finance_summary", { p_project_id: receipt.project_id }), "receipt finance summary");
  assert(financeRows[0], "Receipt finance summary is missing");

  const [quotationBytes, receiptBytes] = await Promise.all([
    generateQuotationPdf(quotation, quotationItems),
    generatePaymentReceiptPdf(receipt, financeRows[0]),
  ]);
  await mkdir("output/pdf", { recursive: true });
  const quotationPath = "output/pdf/universal-pergola-sample-quotation.pdf";
  const receiptPath = "output/pdf/universal-pergola-sample-payment-receipt.pdf";
  await Promise.all([
    writeFile(quotationPath, quotationBytes),
    writeFile(receiptPath, receiptBytes),
    mkdir(".qa-runtime", { recursive: true }),
  ]);
  await writeFile(".qa-runtime/phase2f1-fixture.json", `${JSON.stringify({
    status: "fixture-ready",
    runId,
    customerId: customer.id,
    quotationId,
    quotationNumber: quotation.quotation_number,
    receiptId: receipt.id,
    receiptNumber: receipt.receipt_number,
    projectId,
    projectNumber: project.project_number,
    quotationPath,
    receiptPath,
  }, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    status: "passed",
    hostedQuotation: quotation.quotation_number,
    hostedReceipt: receipt.receipt_number,
    totals: { subtotal: quotation.subtotal, discount: quotation.discount_amount, vat: quotation.vat_amount, total: quotation.total },
    payment: { amount: receipt.amount_received, method: receipt.payment_method, status: receipt.voided_at ? "void" : "received", outstanding: financeRows[0].outstanding },
    files: [quotationPath, receiptPath],
  }, null, 2));
} finally {
  await Promise.all([management.auth.signOut(), accounts.auth.signOut()]);
}
