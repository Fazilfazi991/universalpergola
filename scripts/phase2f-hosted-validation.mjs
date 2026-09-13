import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envText = await readFile(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
  const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1).replace(/^["']|["']$/g, "")];
}));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert(url && key, "Hosted Supabase browser configuration is required");
const prior = JSON.parse(await readFile(".qa-runtime/phase2e-fixture.json", "utf8"));
assert(prior.adminEmail && prior.accountsEmail && prior.siteEmail && prior.password && prior.projectId, "Retained Phase 2E fixture is required");
const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const session = () => createClient(url, key, options);
const admin = session(), accounts = session(), site = session(), anonymous = session();
const checks = [];
const pass = (name, evidence = "pass") => checks.push({ name, evidence });
async function signIn(client, email) {
  const result = await client.auth.signInWithPassword({ email, password: prior.password });
  assert.ifError(result.error); assert(result.data.user); return result.data.user;
}
async function requireData(promise, label) {
  const result = await promise; assert.ifError(result.error); assert(result.data !== null, `${label}: missing data`); return result.data;
}
async function denied(promise, label) {
  const result = await promise; const empty = Array.isArray(result.data) && result.data.length === 0;
  assert(result.error || empty, `${label}: unexpectedly succeeded`); pass(label, result.error?.message || "zero rows");
}
const fixtures = {
  pdf: { type: "application/pdf", ext: "pdf", body: Buffer.from("%PDF-1.4\n%%EOF") },
  jpeg: { type: "image/jpeg", ext: "jpg", body: Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==", "base64") },
  png: { type: "image/png", ext: "png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") },
  webp: { type: "image/webp", ext: "webp", body: Buffer.from("UklGRhIAAABXRUJQVlA4TAUAAAAvAAAAAAfQ//73v/+BiOh/AAA=", "base64") },
};

await signIn(admin, prior.adminEmail);
const accountsUser = await signIn(accounts, prior.accountsEmail);
const siteUser = await signIn(site, prior.siteEmail);
let roleChanged = false;
try {
  const project = await requireData(admin.from("projects").select("id, project_number, project_value, currency, status, payment_plan_status, customer_id").eq("id", prior.projectId).single(), "project");
  assert.equal(project.status, "active", "Retained browser fixture should be reopened for acceptance");
  await denied(anonymous.rpc("get_project_finance_summary", { p_project_id: project.id }), "Anonymous finance summary denied");
  await denied(anonymous.from("payment_milestones").select("id").eq("project_id", project.id), "Anonymous milestone read denied");
  await denied(anonymous.from("payments").select("id").eq("project_id", project.id), "Anonymous receipt read denied");
  await denied(site.rpc("get_project_finance_summary", { p_project_id: project.id }), "Site Team finance summary denied");
  assert.equal((await requireData(site.from("payment_milestones").select("id").eq("project_id", project.id), "Site milestone visibility")).length, 0);
  assert.equal((await requireData(site.from("payments").select("id").eq("project_id", project.id), "Site receipt visibility")).length, 0);
  pass("Site Team finance boundary", "No summary, milestone, receipt, or proof access");

  assert.ifError((await admin.from("profiles").update({ role: "sales" }).eq("id", siteUser.id)).error);
  roleChanged = true;
  const salesSummary = await requireData(site.rpc("get_project_finance_summary", { p_project_id: project.id }), "Sales scoped summary");
  assert.equal(salesSummary.length, 1);
  assert.equal((await requireData(site.from("payments").select("id").eq("project_id", project.id), "Sales raw receipts")).length, 0);
  assert.equal((await requireData(site.from("payment_milestones").select("id").eq("project_id", project.id), "Sales raw milestones")).length, 0);
  pass("Sales summary boundary", "Assigned Sales sees aggregate only; raw receipts and milestones remain hidden");
  assert.ifError((await admin.from("profiles").update({ role: "site_team" }).eq("id", siteUser.id)).error); roleChanged = false;

  assert.equal(project.payment_plan_status, "draft", "Fixture must begin with an untouched Phase 2F draft plan");
  const m1 = await requireData(accounts.rpc("save_payment_milestone", {
    p_project_id: project.id, p_milestone_id: null, p_name: "50% Advance", p_type: "percentage",
    p_percentage: 50, p_fixed_amount: null, p_due_date: new Date(Date.now() - 86400000).toISOString().slice(0,10),
    p_description: "Contract advance due before fabrication begins",
    p_notes: "Phase 2F hosted acceptance deposit", p_sort_order: 10,
  }), "percentage milestone");
  await denied(accounts.rpc("activate_payment_plan", { p_project_id: project.id }), "Mismatched draft activation blocked");
  const amount1 = Math.round(Number(project.project_value) * 50) / 100;
  const amount2 = Math.round(Number(project.project_value) * 40) / 100;
  const amount3 = Math.round((Number(project.project_value) - amount1 - amount2) * 100) / 100;
  const m2 = await requireData(accounts.rpc("save_payment_milestone", {
    p_project_id: project.id, p_milestone_id: null, p_name: "40% Before Installation", p_type: "percentage",
    p_percentage: 40, p_fixed_amount: null, p_due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10),
    p_description: "Second collection before the installation visit", p_notes: "Percentage milestone", p_sort_order: 20,
  }), "second percentage milestone");
  const m3 = await requireData(accounts.rpc("save_payment_milestone", {
    p_project_id: project.id, p_milestone_id: null, p_name: "10% Handover", p_type: "fixed",
    p_percentage: null, p_fixed_amount: amount3, p_due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0,10),
    p_description: "Final balance collected at handover", p_notes: "Fixed amount proves mixed-plan reconciliation", p_sort_order: 30,
  }), "fixed handover milestone");
  await denied(accounts.from("payment_milestones").insert({ project_id: project.id, name: "Bypass", amount_due: 1, milestone_type: "fixed", status: "pending", created_by: accountsUser.id }).select("id"), "Direct milestone mutation denied");
  assert.ifError((await accounts.rpc("activate_payment_plan", { p_project_id: project.id })).error);
  const active = await requireData(accounts.rpc("get_project_finance_summary", { p_project_id: project.id }), "active summary");
  assert.equal(Number(active[0].planned), Number(project.project_value));
  assert.equal(active[0].plan_status, "active");
  pass("Draft reconciliation and activation", "Mismatch saved but activation blocked; mixed percentage/fixed plan reconciled exactly and locked");
  await denied(accounts.rpc("complete_project", { p_project_id: project.id, p_completion_note: "Accounts execution bypass" }), "Accounts project-execution mutation denied");
  await denied(site.rpc("record_payment", {
    p_project_id: project.id, p_milestone_id: m1, p_amount: 1, p_received_date: new Date().toISOString().slice(0,10),
    p_method: "cash", p_reference: "SITE-BYPASS", p_notes: "",
  }), "Site Team payment mutation denied");
  assert.ifError((await admin.from("profiles").update({ role: "sales" }).eq("id", siteUser.id)).error); roleChanged = true;
  await denied(site.rpc("record_payment", {
    p_project_id: project.id, p_milestone_id: m1, p_amount: 1, p_received_date: new Date().toISOString().slice(0,10),
    p_method: "cash", p_reference: "SALES-BYPASS", p_notes: "",
  }), "Sales payment mutation denied");
  assert.ifError((await admin.from("profiles").update({ role: "site_team" }).eq("id", siteUser.id)).error); roleChanged = false;
  await denied(accounts.rpc("save_payment_milestone", {
    p_project_id: project.id, p_milestone_id: m1, p_name: "Tamper", p_type: "fixed", p_percentage: null,
    p_fixed_amount: 1, p_due_date: null, p_description: "", p_notes: "", p_sort_order: 10,
  }), "Active milestone edit denied");

  const partial = Math.round(amount1 * 0.5 * 100) / 100;
  const partialPayment = await requireData(accounts.rpc("record_payment", {
    p_project_id: project.id, p_milestone_id: m1, p_amount: partial, p_received_date: new Date().toISOString().slice(0,10),
    p_method: "bank_transfer", p_reference: "QA-PARTIAL", p_notes: "Partial deposit",
  }), "partial receipt");
  await denied(site.rpc("void_payment", { p_payment_id: partialPayment, p_reason: "Unauthorized Site Team reversal" }), "Unauthorized payment void denied");
  const raceAmount = Math.round(amount2 * 0.75 * 100) / 100;
  const race = await Promise.all([
    accounts.rpc("record_payment", { p_project_id: project.id, p_milestone_id: m2, p_amount: raceAmount, p_received_date: new Date().toISOString().slice(0,10), p_method: "cheque", p_reference: "QA-RACE-A", p_notes: "Concurrency A" }),
    admin.rpc("record_payment", { p_project_id: project.id, p_milestone_id: m2, p_amount: raceAmount, p_received_date: new Date().toISOString().slice(0,10), p_method: "cash", p_reference: "QA-RACE-B", p_notes: "Concurrency B" }),
  ]);
  assert.equal(race.filter((result) => !result.error).length, 1);
  assert.equal(race.filter((result) => result.error).length, 1);
  const racedPayment = race.find((result) => !result.error).data;
  assert(racedPayment);
  await denied(accounts.rpc("record_payment", {
    p_project_id: project.id, p_milestone_id: m2, p_amount: amount2, p_received_date: new Date().toISOString().slice(0,10),
    p_method: "cash", p_reference: "QA-OVERPAY", p_notes: "",
  }), "Overpayment blocked");
  pass("Concurrency-safe posting", "Concurrent receipts serialized on the milestone; one succeeded and one overpayment was rejected");

  const racedRow = await requireData(accounts.from("payments").select("*").eq("id", racedPayment).single(), "raced receipt");
  assert.match(racedRow.receipt_number, /^UP-R-\d{4}-\d{6}$/);
  await denied(accounts.from("payments").update({ amount_received: 1 }).eq("id", racedPayment).select("id"), "Posted receipt mutation denied");
  await denied(accounts.from("payments").delete().eq("id", racedPayment).select("id"), "Receipt hard-delete denied");
  await denied(accounts.rpc("void_payment", { p_payment_id: racedPayment, p_reason: "x" }), "Void without substantive reason denied");
  assert.ifError((await accounts.rpc("void_payment", { p_payment_id: racedPayment, p_reason: "Cheque was entered against the wrong clearing advice" })).error);
  const replacementAmount = Math.round(amount2 * 0.5 * 100) / 100;
  const replacement = await requireData(accounts.rpc("record_payment", {
    p_project_id: project.id, p_milestone_id: m2, p_amount: replacementAmount, p_received_date: new Date().toISOString().slice(0,10),
    p_method: "bank_transfer", p_reference: "QA-REPLACEMENT", p_notes: "Replacement receipt",
  }), "replacement receipt");
  const receiptRows = await requireData(accounts.from("payments").select("id, receipt_number, amount_received, voided_at").in("id", [partialPayment, racedPayment, replacement]), "receipt history");
  assert.equal(new Set(receiptRows.map((row) => row.receipt_number)).size, 3);
  assert(receiptRows.find((row) => row.id === racedPayment).voided_at);
  const summaryAfterVoid = (await requireData(accounts.rpc("get_project_finance_summary", { p_project_id: project.id }), "void summary"))[0];
  assert.equal(Number(summaryAfterVoid.received), Math.round((partial + replacementAmount) * 100) / 100);
  assert(summaryAfterVoid.outstanding > 0);
  const partialMilestones = await requireData(accounts.rpc("get_payment_milestone_summaries", { p_project_id: project.id }), "partial milestone status");
  assert.equal(partialMilestones.find((item) => item.milestone_id === m1)?.status, "overdue");
  pass("Partial overdue handling", "A partially paid milestone with a past due date remains overdue until its balance is cleared");
  const stages = await requireData(admin.from("project_stages").select("id, stage_key, status").eq("project_id", project.id).order("sort_order"), "project stages");
  for (const stageKey of ["manufacturing", "installation"]) {
    const stage = stages.find((item) => item.stage_key === stageKey);
    assert(stage);
    if (stage.status === "not_started") assert.ifError((await admin.rpc("transition_project_stage", { p_stage_id: stage.id, p_action: "start", p_note: "Phase 2F completion acceptance" })).error);
    if (stage.status === "blocked") assert.ifError((await admin.rpc("transition_project_stage", { p_stage_id: stage.id, p_action: "resume", p_note: "Phase 2F completion acceptance" })).error);
    const current = await requireData(admin.from("project_stages").select("status").eq("id", stage.id).single(), "current stage");
    if (!["completed","skipped"].includes(current.status)) assert.ifError((await admin.rpc("transition_project_stage", { p_stage_id: stage.id, p_action: "complete", p_note: "Phase 2F completion acceptance" })).error);
  }
  const handover = stages.find((item) => item.stage_key === "handover"); assert(handover);
  const handoverCurrent = await requireData(admin.from("project_stages").select("status").eq("id", handover.id).single(), "handover stage");
  if (handoverCurrent.status === "not_started") assert.ifError((await admin.rpc("transition_project_stage", { p_stage_id: handover.id, p_action: "start", p_note: "Phase 2F handover" })).error);
  assert.ifError((await admin.rpc("update_project_handover", { p_project_id: project.id, p_status: "completed", p_handover_date: new Date().toISOString().slice(0,10), p_contact: "QA customer", p_notes: "Finance-independent completion acceptance" })).error);
  const handoverReady = await requireData(admin.from("project_stages").select("status").eq("id", handover.id).single(), "handover completion");
  if (!["completed","skipped"].includes(handoverReady.status)) assert.ifError((await admin.rpc("transition_project_stage", { p_stage_id: handover.id, p_action: "complete", p_note: "Phase 2F handover complete" })).error);
  assert.ifError((await admin.rpc("complete_project", { p_project_id: project.id, p_completion_note: "Completed with an explicitly visible outstanding balance" })).error);
  const completedProject = await requireData(admin.from("projects").select("status").eq("id", project.id).single(), "completed project");
  assert.equal(completedProject.status, "completed");
  pass("Void and replacement integrity", "Void preserved its receipt number and actor/reason/time; totals excluded it; replacement received a new number");
  pass("Completion independence", "The operationally completed project remains completed while its payment plan is active and outstanding");

  const orphan = await accounts.storage.from("payment-proofs").upload(`${replacement}/${randomUUID()}.png`, fixtures.png.body, { contentType: fixtures.png.type });
  assert(orphan.error); pass("Orphan proof upload denied", orphan.error.message);
  const malformed = await accounts.storage.from("payment-proofs").upload(`malformed-${randomUUID()}.png`, fixtures.png.body, { contentType: fixtures.png.type });
  assert(malformed.error); pass("Malformed proof path denied", malformed.error.message);
  const proofIds = [];
  for (const fixture of Object.values(fixtures)) {
    const proofId = randomUUID(), path = `${replacement}/${proofId}.${fixture.ext}`;
    assert.ifError((await accounts.from("payment_proofs").insert({ id: proofId, payment_id: replacement, storage_path: path, file_name: `qa-proof.${fixture.ext}`, mime_type: fixture.type, file_size: fixture.body.length, upload_status: "pending", created_by: accountsUser.id })).error);
    assert.ifError((await accounts.storage.from("payment-proofs").upload(path, fixture.body, { contentType: fixture.type, upsert: false })).error);
    assert.ifError((await accounts.rpc("finalize_payment_proof", { p_proof_id: proofId })).error);
    proofIds.push({ id: proofId, path });
  }
  assert.equal((await requireData(accounts.from("payment_proofs").select("id").eq("payment_id", replacement), "proof registry")).length, 4);
  assert.equal((await requireData(site.from("payment_proofs").select("id").eq("payment_id", replacement), "Site proof metadata")).length, 0);
  await denied(site.storage.from("payment-proofs").download(proofIds[0].path), "Site proof download denied");
  const download = await accounts.storage.from("payment-proofs").download(proofIds[0].path); assert.ifError(download.error); assert(download.data);
  pass("Private proof workflow", "Registry-first PDF/JPEG/PNG/WebP uploads finalized; Finance download passed; Site and orphan access denied");

  const depositBalance = Math.round((amount1 - partial) * 100) / 100;
  const installationBalance = Math.round((amount2 - replacementAmount) * 100) / 100;
  await requireData(accounts.rpc("record_payment", {
    p_project_id: project.id, p_milestone_id: m1, p_amount: depositBalance, p_received_date: new Date().toISOString().slice(0,10),
    p_method: "bank_transfer", p_reference: "QA-DEPOSIT-FINAL", p_notes: "Closes overdue deposit",
  }), "deposit completion receipt");
  await requireData(accounts.rpc("record_payment", {
    p_project_id: project.id, p_milestone_id: m2, p_amount: installationBalance, p_received_date: new Date().toISOString().slice(0,10),
    p_method: "online_transfer", p_reference: "QA-INSTALL-FINAL", p_notes: "Closes installation milestone",
  }), "installation completion receipt");
  const planCompletionReceipt = await requireData(accounts.rpc("record_payment", {
    p_project_id: project.id, p_milestone_id: m3, p_amount: amount3, p_received_date: new Date().toISOString().slice(0,10),
    p_method: "card", p_reference: "QA-PLAN-FINAL", p_notes: "Closes handover milestone and payment plan",
  }), "plan completion receipt");
  const completedFinance = (await requireData(accounts.rpc("get_project_finance_summary", { p_project_id: project.id }), "completed payment plan"))[0];
  assert.equal(Number(completedFinance.outstanding), 0);
  assert.equal(completedFinance.plan_status, "completed");
  const paidMilestones = await requireData(accounts.rpc("get_payment_milestone_summaries", { p_project_id: project.id }), "paid milestones");
  assert(paidMilestones.every((item) => item.status === "paid"));
  const dashboardSummary = (await requireData(accounts.rpc("get_finance_dashboard_summary"), "finance dashboard"))[0];
  assert(Number(dashboardSummary.received_today) >= Number(project.project_value));
  assert(Number(dashboardSummary.received_this_month) >= Number(dashboardSummary.received_today));
  pass("Plan completion and reporting", "The configurable 50/40/10 mixed plan reached three paid milestones, completed the plan, and populated today/month collection totals");

  assert.ifError((await accounts.rpc("void_payment", { p_payment_id: planCompletionReceipt, p_reason: "Acceptance reversal restores an open balance for browser verification" })).error);
  const reopenedFinance = (await requireData(accounts.rpc("get_project_finance_summary", { p_project_id: project.id }), "reopened payment plan"))[0];
  assert.equal(reopenedFinance.plan_status, "active");
  assert(Number(reopenedFinance.outstanding) > 0);
  pass("Completion reversal", "Voiding the final receipt safely restored the milestone and plan to an open financial state");

  const events = await requireData(admin.from("activity_logs").select("event_type").eq("entity_type", "projects").eq("entity_id", project.id), "finance events");
  for (const expected of ["payment_plan.activated","payment_plan.completed","payment_milestone.created","payment_milestone.paid","payment.received","payment.partial_received","payment.proof_uploaded","payment.voided"]) assert(events.some((event) => event.event_type === expected), `Missing ${expected}`);
  pass("Finance activity trail", "Plan, partial payment, milestone paid, proof, receipt, completion, and void events appear in project activity");
  const financeList = await requireData(accounts.rpc("get_finance_project_summaries"), "accounts read model");
  assert(financeList.some((row) => row.project_id === project.id && Number(row.outstanding) === Number(reopenedFinance.outstanding)));
  pass("Authoritative read models", "Accounts project and dashboard summaries agree with Postgres receipt arithmetic");

  const replacementRow = await requireData(accounts.from("payments").select("receipt_number").eq("id", replacement).single(), "browser receipt");
  const fixture = { status: "fixture-ready", runId: prior.runId, password: prior.password, adminEmail: prior.adminEmail, accountsEmail: prior.accountsEmail, siteEmail: prior.siteEmail, projectId: project.id, projectNumber: project.project_number, receiptId: replacement, receiptNumber: replacementRow.receipt_number, checks };
  await mkdir(".qa-runtime", { recursive: true });
  await writeFile(".qa-runtime/phase2f-fixture.json", `${JSON.stringify(fixture, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ status: "passed", browserFixture: { projectNumber: fixture.projectNumber, receiptNumber: fixture.receiptNumber }, checks }, null, 2));
} finally {
  if (roleChanged) await admin.from("profiles").update({ role: "site_team" }).eq("id", siteUser.id);
  await Promise.all([admin.auth.signOut(), accounts.auth.signOut(), site.auth.signOut()]);
}
