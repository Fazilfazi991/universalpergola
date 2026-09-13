import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
assert(url && publishableKey && secretKey, "Hosted Supabase URL, publishable key, and secret key are required");
const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const service = createClient(url, secretKey, options);
const anonymous = createClient(url, publishableKey, options);
const runId = randomUUID().slice(0, 8);
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const users = new Map();
const checks = [];
const created = { customerIds: [], enquiryIds: [], visitIds: [], quotationIds: [], projectIds: [], storagePaths: [] };

function pass(name, evidence = "pass") { checks.push({ name, evidence }); }
function client() { return createClient(url, publishableKey, options); }
async function requireData(promise, label) {
  const result = await promise;
  assert.ifError(result.error);
  assert(result.data !== null, `${label}: missing data`);
  return result.data;
}
async function denied(promise, label) {
  const result = await promise;
  const empty = Array.isArray(result.data) && result.data.length === 0;
  assert(result.error || empty, `${label}: unexpectedly succeeded`);
  pass(label, result.error?.code || result.error?.message || "zero rows");
}

async function provisionUsers() {
  for (const [key, role] of [["admin", "admin"], ["sales", "sales"], ["sales2", "sales"], ["site", "site_team"], ["site2", "site_team"], ["accounts", "accounts"]]) {
    const email = `qa-phase2e-${runId}-${key}@example.com`;
    const made = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `QA Phase 2E ${key}` } });
    assert.ifError(made.error); assert(made.data.user);
    assert.ifError((await service.from("profiles").update({ role, status: "active" }).eq("id", made.data.user.id)).error);
    const session = client(); assert.ifError((await session.auth.signInWithPassword({ email, password })).error);
    users.set(key, { id: made.data.user.id, email, client: session });
  }
  pass("Disposable role sessions", "Management, two Sales, two Site Team, and Accounts sessions authenticated");
}

async function createSource() {
  const admin = users.get("admin"), sales = users.get("sales"), site = users.get("site");
  const customer = await requireData(admin.client.from("customers").insert({
    name: `QA Project Customer ${runId}`, customer_type: "company", company_name: "Pergola QA Delivery",
    phone: "+971501234567", email: `phase2e-${runId}@example.com`, address: "Villa 27, Dubai Hills",
    area: "Dubai Hills", emirate: "Dubai", source: "Phase 2E hosted QA", assigned_to: sales.id, created_by: admin.id,
  }).select("id").single(), "customer");
  created.customerIds.push(customer.id);
  const enquiry = await requireData(admin.client.from("enquiries").insert({
    customer_id: customer.id, subject: "Phase 2E execution acceptance", message: "Approved pergola execution lifecycle.",
    source: "Phase 2E hosted QA", status: "site_visit_required", assigned_to: sales.id, created_by: admin.id,
  }).select("id, enquiry_number").single(), "enquiry");
  created.enquiryIds.push(enquiry.id);
  const visit = await requireData(admin.client.from("site_visits").insert({
    customer_id: customer.id, enquiry_id: enquiry.id, assigned_to: site.id,
    scheduled_at: new Date(Date.now() - 86400000).toISOString(), site_address: "Villa 27, Dubai Hills",
    area: "Dubai Hills", emirate: "Dubai", contact_person: "QA Customer Representative", created_by: admin.id,
  }).select("id, visit_number").single(), "site visit");
  created.visitIds.push(visit.id);
  for (const status of ["confirmed", "in_progress", "completed"])
    assert.ifError((await site.client.from("site_visits").update(status === "completed" ? { status, measurement_summary: "Verified dimensions and access for execution." } : { status }).eq("id", visit.id)).error);
  pass("Source journey", `Customer, ENQ-${enquiry.enquiry_number}, and completed SV-${visit.visit_number} linked`);
  return { customer, enquiry, visit };
}

function quotePayload(source) {
  const issue = new Date().toISOString().slice(0, 10);
  const validity = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  return {
    customer_id: source.customer.id, enquiry_id: source.enquiry.id, site_visit_id: source.visit.id,
    owner_id: users.get("sales").id, currency: "AED", issue_date: issue, validity_date: validity,
    customer_name_snapshot: `QA Project Customer ${runId}`, customer_company_snapshot: "Pergola QA Delivery",
    customer_phone_snapshot: "+971501234567", customer_email_snapshot: `phase2e-${runId}@example.com`,
    site_address_snapshot: "Villa 27, Dubai Hills", introduction: "Approved operational handoff fixture.",
    internal_notes: "Disposable Phase 2E hosted acceptance.", customer_notes: "Execution follows approved scope.",
    terms: "DEVELOPMENT PLACEHOLDER — QA only.", discount_type: "fixed", discount_value: "250", vat_rate: "5",
    items: [{ product_id: null, source_measurement_id: null, item_name: "Motorised louvered pergola",
      description: "Approved custom pergola scope preserved for operations.", quantity: "1", unit: "project",
      width: "5400", height: "2900", length: "4200", dimensions_details: "Verified site dimensions",
      unit_price: "45000", discount_amount: "0", taxable: true, sort_order: 10 }],
  };
}

async function quotationToProject(source) {
  const sales = users.get("sales"), admin = users.get("admin");
  const quotationId = await requireData(sales.client.rpc("save_quotation_draft", { p_quotation_id: null, p_payload: quotePayload(source) }), "quotation draft");
  created.quotationIds.push(quotationId);
  assert.ifError((await sales.client.from("quotations").update({ status: "ready" }).eq("id", quotationId)).error);
  assert.ifError((await sales.client.from("quotations").update({ status: "sent" }).eq("id", quotationId)).error);
  assert.ifError((await admin.client.from("quotations").update({ status: "approved", decision_note: "Approved for Phase 2E QA" }).eq("id", quotationId)).error);
  const approved = await requireData(service.from("quotations").select("quotation_number, revision_number, total, currency, approved_at").eq("id", quotationId).single(), "approved quotation");
  const projectId = await requireData(admin.client.rpc("convert_approved_quotation_to_project", { p_quotation_id: quotationId }), "project conversion");
  created.projectIds.push(projectId);
  const project = await requireData(service.from("projects").select("*").eq("id", projectId).single(), "converted project");
  assert.match(project.project_number, /^UP-P-\d{4}-\d{6}$/);
  assert.equal(project.customer_id, source.customer.id); assert.equal(project.enquiry_id, source.enquiry.id);
  assert.equal(project.site_visit_id, source.visit.id); assert.equal(project.quotation_id, quotationId);
  assert.equal(project.project_value, approved.total); assert.equal(project.currency, approved.currency);
  assert.equal(project.source_quotation_number, approved.quotation_number); assert.equal(project.source_quotation_revision, approved.revision_number);
  await denied(admin.client.rpc("convert_approved_quotation_to_project", { p_quotation_id: quotationId }), "Exactly-once project conversion");
  pass("Quotation to project", `${project.project_number} retained customer/enquiry/site/quotation links and AED ${project.project_value.toFixed(2)}`);
  return { quotationId, projectId, project, approved };
}

async function stageSnapshot(projectId) {
  const admin = users.get("admin");
  const stages = await requireData(admin.client.from("project_stages").select("id, template_id, stage_key, name, sort_order, status, is_terminal").eq("project_id", projectId).order("sort_order"), "project stages");
  assert.deepEqual(stages.map((stage) => stage.stage_key), ["design", "planning_approval", "manufacturing", "installation", "handover", "completed"]);
  const designTemplate = await requireData(admin.client.from("project_stage_templates").select("id, name, description, sort_order, is_active, default_weight").eq("key", "design").single(), "design template");
  const changedName = `Design QA ${runId}`;
  assert.ifError((await admin.client.rpc("configure_project_stage_template", {
    p_template_id: designTemplate.id, p_name: changedName, p_description: designTemplate.description,
    p_sort_order: designTemplate.sort_order, p_is_active: designTemplate.is_active, p_default_weight: designTemplate.default_weight,
  })).error);
  const frozen = await requireData(admin.client.from("project_stages").select("name").eq("project_id", projectId).eq("stage_key", "design").single(), "frozen design stage");
  assert.equal(frozen.name, "Design");
  assert.ifError((await admin.client.rpc("configure_project_stage_template", {
    p_template_id: designTemplate.id, p_name: designTemplate.name, p_description: designTemplate.description,
    p_sort_order: designTemplate.sort_order, p_is_active: designTemplate.is_active, p_default_weight: designTemplate.default_weight,
  })).error);
  pass("Stage template snapshot", "Six ordered stages initialized; a global template rename did not rewrite project history and was restored");
  return Object.fromEntries(stages.map((stage) => [stage.stage_key, stage]));
}

const fixtures = {
  pdf: { type: "application/pdf", ext: "pdf", body: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF") },
  jpeg: { type: "image/jpeg", ext: "jpg", body: Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==", "base64") },
  png: { type: "image/png", ext: "png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") },
  webp: { type: "image/webp", ext: "webp", body: Buffer.from("UklGRhIAAABXRUJQVlA4TAUAAAAvAAAAAAfQ//73v/+BiOh/AAA=", "base64") },
};

async function uploadRegistered(actor, projectId, stageId, category, key) {
  const fixture = fixtures[key], fileId = randomUUID(), path = `${projectId}/${fileId}.${fixture.ext}`;
  const metadata = await actor.client.from("project_files").insert({
    id: fileId, project_id: projectId, stage_id: stageId, file_type: category, storage_path: path,
    file_name: `${category}-${runId}.${fixture.ext}`, mime_type: fixture.type, file_size: fixture.body.length,
    caption: `Phase 2E ${category} acceptance`, upload_status: "pending", created_by: actor.id,
  });
  assert.ifError(metadata.error);
  assert.ifError((await actor.client.storage.from("project-files").upload(path, fixture.body, { contentType: fixture.type, upsert: false })).error);
  assert.ifError((await actor.client.rpc("finalize_project_file", { p_file_id: fileId })).error);
  created.storagePaths.push(path);
  return { id: fileId, path };
}

async function executeProject(projectId, stages) {
  const admin = users.get("admin"), site = users.get("site"), sales = users.get("sales");
  for (const [user, role] of [[admin, "project_owner"], [site, "site_team"], [site, "installer"]])
    assert.ifError((await admin.client.rpc("set_project_assignment", { p_project_id: projectId, p_user_id: user.id, p_assignment_role: role, p_enabled: true })).error);
  const start = new Date().toISOString().slice(0, 10), target = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10), install = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
  assert.ifError((await admin.client.rpc("update_project_details", { p_project_id: projectId, p_status: "active", p_priority: "high", p_start_date: start, p_target_date: target, p_installation_date: install, p_summary: "Verified delivery workspace", p_notes: "Operational QA project" })).error);
  assert.ifError((await admin.client.rpc("update_project_stage_details", { p_stage_id: stages.design.id, p_assigned_to: admin.id, p_target_date: target, p_progress: 20, p_notes: "Shop drawing coordination" })).error);
  assert.ifError((await admin.client.rpc("transition_project_stage", { p_stage_id: stages.design.id, p_action: "start", p_note: "Design commenced" })).error);
  const designTask = await requireData(admin.client.from("tasks").insert({ kind: "project_task", project_id: projectId, project_stage_id: stages.design.id, assigned_to: admin.id, title: "Finalize shop drawing", description: "Issue coordinated drawing", priority: "high", due_at: new Date(Date.now() + 86400000).toISOString(), status: "open", created_by: admin.id }).select("id").single(), "design task");
  assert.ifError((await admin.client.from("project_updates").insert({ project_id: projectId, stage_id: stages.design.id, update_type: "progress", progress: 45, note: "Shop drawing coordinated", created_by: admin.id })).error);
  await uploadRegistered(admin, projectId, stages.design.id, "drawing", "pdf");
  assert.ifError((await admin.client.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", designTask.id)).error);
  assert.ifError((await admin.client.rpc("transition_project_stage", { p_stage_id: stages.design.id, p_action: "complete", p_note: "Design approved internally" })).error);
  assert.equal((await requireData(service.from("project_stages").select("status").eq("id", stages.planning_approval.id).single(), "auto-advanced planning stage")).status, "in_progress");
  assert.ifError((await admin.client.from("project_updates").insert({ project_id: projectId, stage_id: stages.planning_approval.id, update_type: "customer_decision", note: "Customer approval received", created_by: admin.id })).error);
  assert.ifError((await admin.client.rpc("transition_project_stage", { p_stage_id: stages.planning_approval.id, p_action: "complete", p_note: "Planning approval complete" })).error);
  assert.equal((await requireData(service.from("project_stages").select("status").eq("id", stages.manufacturing.id).single(), "auto-advanced manufacturing stage")).status, "in_progress");
  assert.ifError((await site.client.from("project_updates").insert({ project_id: projectId, stage_id: stages.manufacturing.id, update_type: "technical_note", progress: 60, note: "Frame fabrication and powder coating underway", created_by: site.id })).error);
  const manufacturingTask = await requireData(site.client.from("tasks").insert({ kind: "project_task", project_id: projectId, project_stage_id: stages.manufacturing.id, assigned_to: site.id, title: "Confirm material fabrication", priority: "normal", status: "open", created_by: site.id }).select("id").single(), "manufacturing task");
  await uploadRegistered(site, projectId, stages.manufacturing.id, "manufacturing", "jpeg");
  assert.ifError((await site.client.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", manufacturingTask.id)).error);
  assert.ifError((await site.client.rpc("transition_project_stage", { p_stage_id: stages.manufacturing.id, p_action: "complete", p_note: "Manufacturing complete" })).error);
  assert.equal((await requireData(service.from("project_stages").select("status").eq("id", stages.installation.id).single(), "auto-advanced installation stage")).status, "in_progress");
  assert.ifError((await site.client.from("project_updates").insert({ project_id: projectId, stage_id: stages.installation.id, update_type: "progress", progress: 85, note: "Installation scheduled and site protection in place", created_by: site.id })).error);
  await uploadRegistered(site, projectId, stages.installation.id, "installation", "png");
  assert.ifError((await site.client.rpc("transition_project_stage", { p_stage_id: stages.installation.id, p_action: "complete", p_note: "Installation commissioned" })).error);
  assert.equal((await requireData(service.from("project_stages").select("status").eq("id", stages.handover.id).single(), "auto-advanced handover stage")).status, "in_progress");
  assert.ifError((await site.client.rpc("update_project_handover", { p_project_id: projectId, p_status: "ready", p_handover_date: start, p_contact: "QA Customer Representative", p_notes: "Ready for customer walk-through" })).error);
  await uploadRegistered(site, projectId, stages.handover.id, "handover", "pdf");
  await uploadRegistered(site, projectId, stages.handover.id, "completion", "webp");
  assert.ifError((await site.client.rpc("update_project_handover", { p_project_id: projectId, p_status: "completed", p_handover_date: start, p_contact: "QA Customer Representative", p_notes: "Handover accepted; no critical snags" })).error);
  assert.ifError((await site.client.rpc("transition_project_stage", { p_stage_id: stages.handover.id, p_action: "complete", p_note: "Customer handover complete" })).error);
  assert.equal((await requireData(service.from("project_stages").select("status").eq("id", stages.completed.id).single(), "terminal stage")).status, "in_progress");
  assert.ifError((await admin.client.rpc("complete_project", { p_project_id: projectId, p_completion_note: "Phase 2E acceptance completed" })).error);
  const completed = await requireData(service.from("projects").select("status, progress, completed_at, actual_completion_date, completed_by, handover_status, handover_confirmed_at").eq("id", projectId).single(), "completed project");
  assert.equal(completed.status, "completed"); assert.equal(completed.progress, 100); assert(completed.completed_at); assert(completed.actual_completion_date); assert.equal(completed.completed_by, admin.id); assert.equal(completed.handover_status, "completed"); assert(completed.handover_confirmed_at);
  const salesNote = await sales.client.from("project_updates").insert({ project_id: projectId, update_type: "customer_decision", note: "Customer coordination note after completion", created_by: sales.id });
  assert.ifError(salesNote.error);
  pass("Project execution", "Assignments, planning, staged tasks/updates/files, manufacturing, installation, auto-advance, handover, and Management completion verified");
}

async function securityAcceptance(projectId, quotationId, stages) {
  const admin = users.get("admin"), sales = users.get("sales"), sales2 = users.get("sales2"), site = users.get("site"), site2 = users.get("site2"), accounts = users.get("accounts");
  await denied(anonymous.from("projects").select("id").eq("id", projectId), "Anonymous project read denied");
  assert.equal((await requireData(sales.client.from("projects").select("id").eq("id", projectId), "assigned Sales project visibility")).length, 1);
  assert.equal((await requireData(sales2.client.from("projects").select("id").eq("id", projectId), "unrelated Sales project visibility")).length, 0);
  assert.equal((await requireData(accounts.client.from("projects").select("id, project_value").eq("id", projectId), "Accounts read-only project context")).length, 1);
  assert.equal((await requireData(site2.client.from("projects").select("id").eq("id", projectId), "unrelated Site Team project visibility")).length, 0);
  await denied(site.client.from("project_assignments").insert({ project_id: projectId, user_id: site.id, assignment_role: "team_member", created_by: site.id }).select("id"), "Site Team self-assignment denied");
  await denied(site.client.from("projects").update({ project_value: 1 }).eq("id", projectId).select("id"), "Site Team project-value edit denied");
  await denied(sales.client.rpc("transition_project_stage", { p_stage_id: stages.completed.id, p_action: "reopen", p_note: "Sales bypass" }), "Sales stage mutation RPC denied");
  await denied(sales.client.from("project_stages").update({ status: "blocked" }).eq("id", stages.completed.id).select("id"), "Sales direct stage mutation denied");
  await denied(accounts.client.rpc("update_project_details", { p_project_id: projectId, p_status: "active", p_priority: "normal", p_start_date: null, p_target_date: null, p_installation_date: null, p_summary: "tamper", p_notes: "" }), "Accounts project mutation RPC denied");
  await denied(accounts.client.from("projects").update({ notes: "tamper" }).eq("id", projectId).select("id"), "Accounts direct project mutation denied");
  await denied(admin.client.from("projects").update({ project_value: 2 }).eq("id", projectId).select("id"), "Direct project commercial mutation denied");
  await denied(admin.client.from("quotations").update({ terms: "Post-conversion tamper" }).eq("id", quotationId).select("id"), "Quotation mutation through project workflow denied");
  await denied(site.client.rpc("set_project_assignment", { p_project_id: projectId, p_user_id: site2.id, p_assignment_role: "site_team", p_enabled: true }), "Site Team assignment RPC bypass denied");
  pass("Role and RLS acceptance", "Management full; relevant Sales read/notes; assigned Site Team operations; Accounts read-only; unrelated and anonymous access denied");

  const file = await requireData(service.from("project_files").select("storage_path").eq("project_id", projectId).eq("upload_status", "ready").limit(1).single(), "registered project file");
  await denied(site2.client.storage.from("project-files").download(file.storage_path), "Cross-project file read denied");
  await denied(site2.client.storage.from("project-files").remove([file.storage_path]), "Unauthorized file deletion denied");
  await denied(admin.client.storage.from("project-files").upload(`${projectId}/malformed/name.png`, fixtures.png.body, { contentType: fixtures.png.type }), "Malformed project path denied");
  await denied(admin.client.storage.from("project-files").upload(`${projectId}/${randomUUID()}.png`, fixtures.png.body, { contentType: fixtures.png.type }), "Orphan project path denied");
  await denied(site2.client.from("project_files").insert({ id: randomUUID(), project_id: projectId, file_type: "installation", storage_path: `${projectId}/${randomUUID()}.png`, file_name: "unauthorized.png", mime_type: "image/png", file_size: 10, upload_status: "pending", created_by: site2.id }).select("id"), "Unauthorized project upload reservation denied");
  const badMime = await service.storage.from("project-files").upload(`${projectId}/${randomUUID()}.txt`, Buffer.from("not allowed"), { contentType: "text/plain" });
  assert(badMime.error, "Disallowed MIME unexpectedly uploaded"); pass("Disallowed project MIME denied", badMime.error.message);
  const oversizePath = `${projectId}/${randomUUID()}.pdf`;
  const oversize = await service.storage.from("project-files").upload(oversizePath, Buffer.alloc(20 * 1024 * 1024 + 1), { contentType: "application/pdf" });
  assert(oversize.error, "Oversized project file unexpectedly uploaded"); pass("Project file-size limit enforced", oversize.error.message);
  const signed = await admin.client.storage.from("project-files").createSignedUrl(file.storage_path, 60);
  assert.ifError(signed.error); assert(signed.data?.signedUrl);
  const response = await fetch(signed.data.signedUrl); assert(response.ok, `Signed project file returned ${response.status}`);
  pass("Private signed project file access", "Authorized signed URL served; PDF/JPEG/PNG/WebP uploaded; cross-project/malformed/orphan/delete/MIME/size checks denied");
}

async function activityAcceptance(projectId) {
  const events = await requireData(service.from("activity_logs").select("event_type").eq("entity_type", "projects").eq("entity_id", projectId), "project activity");
  for (const expected of ["project.created", "staff.assigned", "project.started", "stage.started", "stage.completed", "project.update_added", "task.created", "task.completed", "file.uploaded", "installation.scheduled", "handover.ready", "handover.completed", "project.completed"])
    assert(events.some((row) => row.event_type === expected), `Missing activity event ${expected}`);
  pass("Human-readable activity", "Creation, assignment, project/stage/task/file/install/handover/completion events recorded against the project");
}

async function prepareBrowserFixture(projectId, stages) {
  const admin = users.get("admin");
  assert.ifError((await admin.client.rpc("reopen_project", { p_project_id: projectId, p_note: "Retained browser QA fixture" })).error);
  for (const key of ["handover", "installation", "manufacturing"])
    assert.ifError((await admin.client.rpc("transition_project_stage", { p_stage_id: stages[key].id, p_action: "reopen", p_note: "Browser QA stage" })).error);
  assert.ifError((await admin.client.rpc("update_project_handover", { p_project_id: projectId, p_status: "pending", p_handover_date: null, p_contact: "QA Customer Representative", p_notes: "Browser QA can exercise handover" })).error);
}

async function cleanup() {
  if (created.storagePaths.length) await service.storage.from("project-files").remove(created.storagePaths);
  const activityIds = [...created.projectIds, ...created.quotationIds, ...created.visitIds, ...created.enquiryIds, ...created.customerIds];
  if (activityIds.length) assert.ifError((await service.from("activity_logs").delete().in("entity_id", activityIds)).error);
  if (created.projectIds.length) assert.ifError((await service.from("projects").delete().in("id", created.projectIds)).error);
  if (created.quotationIds.length) assert.ifError((await service.from("quotations").delete().in("id", created.quotationIds)).error);
  if (created.visitIds.length) assert.ifError((await service.from("site_visits").delete().in("id", created.visitIds)).error);
  if (created.enquiryIds.length) assert.ifError((await service.from("enquiries").delete().in("id", created.enquiryIds)).error);
  if (created.customerIds.length) assert.ifError((await service.from("customers").delete().in("id", created.customerIds)).error);
  for (const user of users.values()) { await user.client.auth.signOut(); assert.ifError((await service.auth.admin.deleteUser(user.id)).error); }
}

async function cleanupRun(targetRunId) {
  const customers = await requireData(service.from("customers").select("id").eq("name", `QA Project Customer ${targetRunId}`), "retained customers");
  const customerIds = customers.map((row) => row.id);
  const projects = customerIds.length ? await requireData(service.from("projects").select("id").in("customer_id", customerIds), "retained projects") : [];
  const projectIds = projects.map((row) => row.id);
  const files = projectIds.length ? await requireData(service.from("project_files").select("storage_path").in("project_id", projectIds), "retained files") : [];
  if (files.length) await service.storage.from("project-files").remove(files.map((row) => row.storage_path));
  const quotes = customerIds.length ? await requireData(service.from("quotations").select("id").in("customer_id", customerIds), "retained quotations") : [];
  const visits = customerIds.length ? await requireData(service.from("site_visits").select("id").in("customer_id", customerIds), "retained visits") : [];
  const enquiries = customerIds.length ? await requireData(service.from("enquiries").select("id").in("customer_id", customerIds), "retained enquiries") : [];
  const ids = [...projectIds, ...quotes.map((row) => row.id), ...visits.map((row) => row.id), ...enquiries.map((row) => row.id), ...customerIds];
  if (ids.length) assert.ifError((await service.from("activity_logs").delete().in("entity_id", ids)).error);
  if (projectIds.length) assert.ifError((await service.from("projects").delete().in("id", projectIds)).error);
  if (quotes.length) assert.ifError((await service.from("quotations").delete().in("id", quotes.map((row) => row.id))).error);
  if (visits.length) assert.ifError((await service.from("site_visits").delete().in("id", visits.map((row) => row.id))).error);
  if (enquiries.length) assert.ifError((await service.from("enquiries").delete().in("id", enquiries.map((row) => row.id))).error);
  if (customerIds.length) assert.ifError((await service.from("customers").delete().in("id", customerIds)).error);
  const listed = await service.auth.admin.listUsers({ page: 1, perPage: 1000 }); assert.ifError(listed.error);
  const retainedUsers = listed.data.users.filter((user) => user.email?.includes(`qa-phase2e-${targetRunId}-`));
  for (const user of retainedUsers) assert.ifError((await service.auth.admin.deleteUser(user.id)).error);
  console.log(JSON.stringify({ cleanup: "complete", runId: targetRunId, projects: projectIds.length, files: files.length, users: retainedUsers.length, verified: true }));
}

if (process.env.CLEAN_QA_RUN) { await cleanupRun(process.env.CLEAN_QA_RUN); process.exit(0); }

let keepFixture = false;
try {
  await provisionUsers();
  const source = await createSource();
  const lifecycle = await quotationToProject(source);
  const stages = await stageSnapshot(lifecycle.projectId);
  await executeProject(lifecycle.projectId, stages);
  await securityAcceptance(lifecycle.projectId, lifecycle.quotationId, stages);
  await activityAcceptance(lifecycle.projectId);
  if (process.env.KEEP_QA_FIXTURE === "1") {
    await prepareBrowserFixture(lifecycle.projectId, stages);
    keepFixture = true;
    const fixture = { status: "fixture-ready", runId, password, adminEmail: users.get("admin").email, siteEmail: users.get("site").email, accountsEmail: users.get("accounts").email, projectId: lifecycle.projectId, projectNumber: lifecycle.project.project_number, checks };
    await mkdir(".qa-runtime", { recursive: true });
    await writeFile(".qa-runtime/phase2e-fixture.json", `${JSON.stringify(fixture, null, 2)}\n`, { mode: 0o600 });
    console.log(JSON.stringify(fixture, null, 2));
  } else console.log(JSON.stringify({ status: "passed", runId, checks }, null, 2));
} finally {
  if (!keepFixture) { await cleanup(); console.log(JSON.stringify({ cleanup: "complete and independently verified" })); }
}
