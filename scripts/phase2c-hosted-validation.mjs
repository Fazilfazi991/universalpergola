import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

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
const created = { customerIds: [], enquiryIds: [], visitIds: [], taskIds: [], paths: [] };
const checks = [];

function pass(name, evidence = "pass") { checks.push({ name, evidence }); }
function client() { return createClient(url, publishableKey, options); }
async function requireData(promise, label) { const result = await promise; assert.ifError(result.error); assert(result.data !== null, `${label}: missing data`); return result.data; }
async function denied(promise, label) { const result = await promise; const empty = Array.isArray(result.data) && result.data.length === 0; assert(result.error || empty, `${label}: unexpectedly succeeded`); pass(label, result.error?.code || result.error?.message || "zero rows"); }

async function cleanupRetainedRun(retainedRunId) {
  const customers = await requireData(service.from("customers").select("id").eq("name", `QA Site Customer ${retainedRunId}`), "retained customers");
  const customerIds = customers.map((row) => row.id);
  const visits = customerIds.length ? await requireData(service.from("site_visits").select("id").in("customer_id", customerIds), "retained visits") : [];
  const visitIds = visits.map((row) => row.id);
  const photos = visitIds.length ? await requireData(service.from("site_visit_photos").select("storage_path").in("site_visit_id", visitIds), "retained photos") : [];
  if (photos.length) assert.ifError((await service.storage.from("site-visit-photos").remove(photos.map((row) => row.storage_path))).error);
  for (const ids of [visitIds, customerIds]) if (ids.length) assert.ifError((await service.from("activity_logs").delete().in("entity_id", ids)).error);
  if (visitIds.length) assert.ifError((await service.from("site_visits").delete().in("id", visitIds)).error);
  if (customerIds.length) { assert.ifError((await service.from("enquiries").delete().in("customer_id", customerIds)).error); assert.ifError((await service.from("customers").delete().in("id", customerIds)).error); }
  const auth = await service.auth.admin.listUsers({ page: 1, perPage: 1000 }); assert.ifError(auth.error);
  const retainedUsers = auth.data.users.filter((user) => user.email?.includes(`qa-phase2c-${retainedRunId}-`));
  for (const user of retainedUsers) assert.ifError((await service.auth.admin.deleteUser(user.id)).error);
  const remaining = await service.from("customers").select("id", { count: "exact", head: true }).eq("name", `QA Site Customer ${retainedRunId}`); assert.ifError(remaining.error); assert.equal(remaining.count, 0);
  const authAfter = await service.auth.admin.listUsers({ page: 1, perPage: 1000 }); assert.ifError(authAfter.error); assert.equal(authAfter.data.users.some((user) => user.email?.includes(retainedRunId)), false);
  console.log(JSON.stringify({ cleanup: "complete", runId: retainedRunId, customers: customerIds.length, visits: visitIds.length, photos: photos.length, users: retainedUsers.length, verified: true }));
}

async function provisionUsers() {
  const roles = [["admin", "admin"], ["sales", "sales"], ["site1", "site_team"], ["site2", "site_team"], ["accounts", "accounts"]];
  for (const [key, role] of roles) {
    const email = `qa-phase2c-${runId}-${key}@example.com`;
    const made = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `QA Phase 2C ${key}` } });
    assert.ifError(made.error); assert(made.data.user);
    assert.ifError((await service.from("profiles").update({ role, status: "active" }).eq("id", made.data.user.id)).error);
    const session = client(); const login = await session.auth.signInWithPassword({ email, password }); assert.ifError(login.error);
    users.set(key, { id: made.data.user.id, email, client: session });
  }
  pass("Five disposable role sessions", "management, sales, two Site Team users, accounts");
}

async function crmToVisit() {
  const admin = users.get("admin"), sales = users.get("sales"), site1 = users.get("site1"), site2 = users.get("site2");
  const customer = await requireData(admin.client.from("customers").insert({ name: `QA Site Customer ${runId}`, phone: "+971501234567", whatsapp_number: "+971501234567", address: "Villa 42, Dubai Hills", area: "Dubai Hills", emirate: "Dubai", assigned_to: sales.id, created_by: admin.id }).select("id").single(), "customer");
  created.customerIds.push(customer.id);
  const enquiry = await requireData(admin.client.from("enquiries").insert({ customer_id: customer.id, subject: "Measured pergola request", message: "Customer requests a measured site proposal", status: "new", assigned_to: sales.id, created_by: admin.id }).select("id").single(), "enquiry");
  created.enquiryIds.push(enquiry.id);
  assert.ifError((await sales.client.from("enquiries").update({ status: "site_visit_required", next_action: "Arrange measured visit" }).eq("id", enquiry.id)).error);
  const visit = await requireData(admin.client.from("site_visits").insert({ customer_id: customer.id, enquiry_id: enquiry.id, assigned_to: null, scheduled_at: new Date(Date.now() + 3600000).toISOString(), site_address: "Villa 42, Dubai Hills", area: "Dubai Hills", emirate: "Dubai", location_url: "https://maps.google.com/?q=25.100,55.200", contact_person: "QA Customer", contact_phone: "+971501234567", created_by: admin.id }).select("id, visit_number, customer_id, enquiry_id, assigned_to").single(), "site visit");
  created.visitIds.push(visit.id);
  assert.equal(visit.customer_id, customer.id); assert.equal(visit.enquiry_id, enquiry.id); assert.equal(visit.assigned_to, null);
  assert.ifError((await admin.client.from("site_visits").update({ assigned_to: site1.id }).eq("id", visit.id)).error);
  assert.equal((await requireData(site1.client.from("site_visits").select("id").eq("id", visit.id), "assigned visit visibility")).length, 1);
  assert.equal((await requireData(site2.client.from("site_visits").select("id").eq("id", visit.id), "unrelated visit visibility")).length, 0);
  const other = await requireData(admin.client.from("site_visits").insert({ customer_id: customer.id, enquiry_id: enquiry.id, assigned_to: site2.id, scheduled_at: new Date(Date.now() + 7200000).toISOString(), site_address: "Separate scoped QA location", area: "Al Quoz", emirate: "Dubai", created_by: admin.id }).select("id").single(), "other visit");
  created.visitIds.push(other.id);
  pass("CRM to assigned site visit", `SV-${String(visit.visit_number).padStart(6, "0")} linked to customer and enquiry`);
  return { customer, enquiry, visit, other };
}

async function executeVisit({ customer, enquiry, visit, other }) {
  const site1 = users.get("site1");
  assert.ifError((await site1.client.from("site_visits").update({ status: "confirmed" }).eq("id", visit.id)).error);
  assert.ifError((await site1.client.from("site_visits").update({ status: "in_progress" }).eq("id", visit.id)).error);
  for (const [index, row] of [
    ["Front opening", 5200, 2800, null, "Finished wall to wall"],
    ["Pergola projection", null, null, 4100, "Clear of drain line"],
    ["Column position", 3750, null, 900, "From left boundary"],
  ].entries()) {
    assert.ifError((await site1.client.from("site_visit_measurements").insert({ site_visit_id: visit.id, label: row[0], width: row[1], height: row[2], length: row[3], unit: "mm", quantity: 1, notes: row[4], sort_order: (index + 1) * 10, created_by: site1.id })).error);
  }
  assert.ifError((await site1.client.from("site_visit_activities").insert({ site_visit_id: visit.id, activity_type: "note_added", note: "Access is clear; protect tiled floor during installation.", created_by: site1.id })).error);
  assert.ifError((await site1.client.from("site_visits").update({ measurement_summary: "Opening 5.2m wide, projection 4.1m, clear working access.", notes: "Measurements verified on site.", follow_up_required: true, next_action: "Send measurements to Sales", next_action_at: new Date(Date.now() + 86400000).toISOString() }).eq("id", visit.id)).error);
  const taskId = randomUUID(); created.taskIds.push(taskId);
  assert.ifError((await site1.client.from("tasks").insert({ id: taskId, kind: "site_visit_follow_up", title: "Send measurements to Sales", description: "Prepare the commercial handoff", customer_id: customer.id, enquiry_id: enquiry.id, site_visit_id: visit.id, assigned_to: site1.id, due_at: new Date(Date.now() + 86400000).toISOString(), created_by: site1.id })).error);

  const fixtures = await Promise.all([["jpg", "image/jpeg", "#c8a96a"], ["png", "image/png", "#536b52"], ["webp", "image/webp", "#8a6d4b"]].map(async ([extension, mime, background]) => [extension, mime, await sharp({ create: { width: 320, height: 240, channels: 3, background } }).toFormat(extension === "jpg" ? "jpeg" : extension).toBuffer()]));
  for (const [index, [extension, mime, bytes]] of fixtures.entries()) {
    const path = `${visit.id}/${randomUUID()}.${extension}`; created.paths.push(path);
    const upload = await site1.client.storage.from("site-visit-photos").upload(path, bytes, { contentType: mime }); assert.ifError(upload.error);
    assert.ifError((await site1.client.from("site_visit_photos").insert({ site_visit_id: visit.id, storage_path: path, caption: `QA ${extension} ${index + 1}`, photo_type: "Measurement reference", mime_type: mime, file_size: bytes.byteLength, sort_order: (index + 1) * 10, created_by: site1.id })).error);
  }
  const signed = await site1.client.storage.from("site-visit-photos").createSignedUrl(created.paths[0], 60); assert.ifError(signed.error); assert.match(signed.data.signedUrl, /token=/);
  const download = await site1.client.storage.from("site-visit-photos").download(created.paths[0]); assert.ifError(download.error); assert(download.data.size > 0);
  const salesRows = await requireData(users.get("sales").client.from("site_visit_photos").select("id").eq("site_visit_id", visit.id), "sales photo metadata"); assert.equal(salesRows.length, 3);
  await denied(site1.client.from("site_visit_photos").select("id").eq("site_visit_id", other.id), "Cross-visit photo metadata denied");
  assert.ifError((await site1.client.from("site_visits").update({ status: "completed" }).eq("id", visit.id)).error);
  const complete = await requireData(service.from("site_visits").select("status, completed_at, measurement_summary").eq("id", visit.id).single(), "completed visit"); assert.equal(complete.status, "completed"); assert(complete.completed_at); assert(complete.measurement_summary);
  const timeline = await requireData(service.from("site_visit_activities").select("activity_type").eq("site_visit_id", visit.id), "visit timeline");
  for (const expected of ["visit_created", "visit_assigned", "status_changed", "visit_started", "measurement_added", "photo_uploaded", "note_added", "follow_up_created", "visit_completed"]) assert(timeline.some((row) => row.activity_type === expected), `missing ${expected}`);
  assert.equal((await requireData(users.get("admin").client.from("site_visits").select("id").eq("customer_id", customer.id), "customer visit visibility")).length, 2);
  assert.equal((await requireData(users.get("sales").client.from("site_visits").select("id").eq("enquiry_id", enquiry.id), "enquiry visit visibility")).length, 2);
  assert.equal((await requireData(service.from("tasks").select("id").eq("id", taskId), "linked follow-up")).length, 1);
  pass("Site execution and CRM visibility", "3 measurements, 3 photo formats, note, task, completion, and full timeline");
}

async function bypassChecks({ visit, other }) {
  const site1 = users.get("site1"), site2 = users.get("site2"), sales = users.get("sales"), accounts = users.get("accounts"), admin = users.get("admin");
  const anonVisit = await anonymous.from("site_visits").select("id"); assert(anonVisit.error); pass("Anonymous visit read denied", anonVisit.error.code || anonVisit.error.message);
  const anonMeasures = await anonymous.from("site_visit_measurements").select("id"); assert(anonMeasures.error); pass("Anonymous measurement read denied", anonMeasures.error.code || anonMeasures.error.message);
  const anonDownload = await anonymous.storage.from("site-visit-photos").download(created.paths[0]); assert(anonDownload.error); pass("Anonymous private photo read denied", anonDownload.error.message);
  await denied(site2.client.from("site_visits").update({ status: "confirmed" }).eq("id", visit.id).select("id"), "Unrelated Site Team update denied");
  const reassign = await site1.client.from("site_visits").update({ assigned_to: site1.id }).eq("id", other.id).select("id"); assert(reassign.error || reassign.data.length === 0); pass("Site Team self-reassignment denied", reassign.error?.message || "zero rows");
  await denied(sales.client.from("site_visits").update({ status: "completed" }).eq("id", other.id).select("id"), "Sales completion denied");
  await denied(accounts.client.from("site_visits").update({ status: "cancelled" }).eq("id", other.id).select("id"), "Accounts mutation denied");
  const malformed = await site1.client.storage.from("site-visit-photos").upload(`bad/${randomUUID()}.jpg`, new Uint8Array([1]), { contentType: "image/jpeg" }); assert(malformed.error); pass("Malformed storage path denied", malformed.error.message);
  const invalidMime = await site1.client.storage.from("site-visit-photos").upload(`${visit.id}/${randomUUID()}.svg`, new Uint8Array([1]), { contentType: "image/svg+xml" }); assert(invalidMime.error); pass("Invalid MIME denied", invalidMime.error.message);
  const oversized = await site1.client.storage.from("site-visit-photos").upload(`${visit.id}/${randomUUID()}.jpg`, new Uint8Array(10 * 1024 * 1024 + 1), { contentType: "image/jpeg" }); assert(oversized.error); pass("Oversized image denied", oversized.error.message);
  const unauthorizedUpload = await site2.client.storage.from("site-visit-photos").upload(`${visit.id}/${randomUUID()}.jpg`, new Uint8Array([1]), { contentType: "image/jpeg" }); assert(unauthorizedUpload.error); pass("Unauthorized visit upload denied", unauthorizedUpload.error.message);
  const unauthorizedDelete = await site2.client.storage.from("site-visit-photos").remove([created.paths[0]]); assert(unauthorizedDelete.error || unauthorizedDelete.data.length === 0); const stillStored = await site1.client.storage.from("site-visit-photos").download(created.paths[0]); assert.ifError(stillStored.error); pass("Unauthorized photo deletion denied", unauthorizedDelete.error?.message || "zero rows and object retained");
  const crossDownload = await site1.client.storage.from("site-visit-photos").download(`${other.id}/${randomUUID()}.jpg`); assert(crossDownload.error); pass("Cross-visit private read denied", crossDownload.error.message);
  const orphanPath = `${visit.id}/${randomUUID()}.jpg`; created.paths.push(orphanPath); const orphan = await service.storage.from("site-visit-photos").upload(orphanPath, new Uint8Array([1, 2]), { contentType: "image/jpeg" }); assert.ifError(orphan.error);
  const orphanRead = await site1.client.storage.from("site-visit-photos").download(orphanPath); assert(orphanRead.error); pass("Orphaned object read denied", orphanRead.error.message);
  const adminRead = await admin.client.from("site_visits").select("id").in("id", [visit.id, other.id]); assert.ifError(adminRead.error); assert.equal(adminRead.data.length, 2);
}

async function cleanup() {
  async function clean(promise, label) { const result = await promise; assert.ifError(result.error, label); }
  if (created.paths.length) await clean(service.storage.from("site-visit-photos").remove(created.paths), "photo cleanup");
  if (created.visitIds.length) await clean(service.from("activity_logs").delete().in("entity_id", created.visitIds), "visit log cleanup");
  if (created.enquiryIds.length) await clean(service.from("activity_logs").delete().in("entity_id", created.enquiryIds), "enquiry log cleanup");
  if (created.customerIds.length) await clean(service.from("activity_logs").delete().in("entity_id", created.customerIds), "customer log cleanup");
  if (created.visitIds.length) await clean(service.from("site_visits").delete().in("id", created.visitIds), "visit cleanup");
  if (created.enquiryIds.length) await clean(service.from("enquiries").delete().in("id", created.enquiryIds), "enquiry cleanup");
  if (created.customerIds.length) await clean(service.from("customers").delete().in("id", created.customerIds), "customer cleanup");
  for (const user of users.values()) { await user.client.auth.signOut(); await service.auth.admin.deleteUser(user.id); }
}

async function verifyCleanup() {
  for (const [table, ids] of [["site_visits", created.visitIds], ["enquiries", created.enquiryIds], ["customers", created.customerIds]]) {
    if (!ids.length) continue; const result = await service.from(table).select("id", { count: "exact", head: true }).in("id", ids); assert.ifError(result.error); assert.equal(result.count, 0);
  }
  const auth = await service.auth.admin.listUsers({ page: 1, perPage: 1000 }); assert.ifError(auth.error); assert.equal(auth.data.users.some((user) => user.email?.includes(runId)), false);
}

if (process.env.CLEAN_QA_RUN) {
  await cleanupRetainedRun(process.env.CLEAN_QA_RUN);
  process.exit(0);
}

let keepFixture = false;
try {
  await provisionUsers(); const context = await crmToVisit(); await executeVisit(context);
  if (process.env.KEEP_QA_FIXTURE === "1") {
    keepFixture = true;
    console.log(JSON.stringify({ status: "fixture-ready", runId, password, visitId: context.visit.id, secondVisitId: context.other.id, siteTeamEmail: users.get("site1").email, secondSiteTeamEmail: users.get("site2").email, adminEmail: users.get("admin").email }, null, 2));
  } else {
    await bypassChecks(context);
    console.log(JSON.stringify({ status: "passed", runId, checks }, null, 2));
  }
} finally {
  if (!keepFixture) { await cleanup(); await verifyCleanup(); console.log(JSON.stringify({ cleanup: "complete and independently verified" })); }
}
