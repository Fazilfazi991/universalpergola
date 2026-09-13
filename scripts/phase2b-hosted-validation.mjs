import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
assert(url, "SUPABASE_URL is required");
assert(publishableKey, "SUPABASE_PUBLISHABLE_KEY is required");
assert(secretKey, "SUPABASE_SECRET_KEY is required");

const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const service = createClient(url, secretKey, options);
const anonymous = createClient(url, publishableKey, options);
const runId = randomUUID().slice(0, 8);
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const roles = ["admin", "sales", "site_team", "accounts"];
const users = new Map();
const created = { categoryId: null, productId: null, customerIds: [], enquiryIds: [], taskIds: [] };
const checks = [];

function pass(name, evidence = "pass") { checks.push({ name, evidence }); }
function clientForKey(key) { return createClient(url, key, options); }
async function data(query, label) { const result = await query; assert.ifError(result.error); assert(result.data !== null, `${label}: missing data`); return result.data; }
async function denied(query, label) { const result = await query; assert(result.error || (Array.isArray(result.data) && result.data.length === 0), `${label}: unexpectedly succeeded`); pass(label, result.error?.code || result.error?.message || "zero rows"); }

async function createUsers() {
  for (const role of roles) {
    const email = `qa-phase2b-${runId}-${role}@example.com`;
    const result = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `QA Phase 2B ${role}` } });
    assert.ifError(result.error); assert(result.data.user);
    users.set(role, { id: result.data.user.id, email });
    assert.ifError((await service.from("profiles").update({ role, status: "active" }).eq("id", result.data.user.id)).error);
  }
  for (const record of users.values()) {
    const client = clientForKey(publishableKey);
    const login = await client.auth.signInWithPassword({ email: record.email, password });
    assert.ifError(login.error); assert(login.data.session);
    record.client = client;
  }
  pass("Four disposable role sessions", "management, sales, site team, accounts");
}

async function createCatalogueContext() {
  const admin = users.get("admin");
  created.categoryId = randomUUID(); created.productId = randomUUID();
  assert.ifError((await admin.client.from("product_categories").insert({ id: created.categoryId, name: `QA CRM ${runId}`, slug: `qa-crm-${runId}`, is_active: true, created_by: admin.id })).error);
  assert.ifError((await admin.client.from("products").insert({ id: created.productId, category_id: created.categoryId, name: `QA CRM Product ${runId}`, slug: `qa-crm-product-${runId}`, is_published: true, published_at: new Date().toISOString(), created_by: admin.id })).error);
  pass("Published product context created", created.productId);
}

async function publicLeadAndDuplicate() {
  const phone = `+971 50 ${runId.slice(0, 3)} ${runId.slice(3, 7)}`.replace(/[a-f]/gi, "7");
  const first = await anonymous.rpc("submit_public_enquiry", { p_name: `QA Public ${runId}`, p_phone: phone, p_message: "Interested in a measured pergola proposal", p_whatsapp_number: phone, p_email: `qa-public-${runId}@example.com`, p_emirate: "Dubai", p_product_id: created.productId, p_honeypot: "" });
  assert.ifError(first.error); assert.equal(first.data.length, 1);
  created.enquiryIds.push(first.data[0].enquiry_id);
  const enquiry = await data(service.from("enquiries").select("id, customer_id, product_id, enquiry_number, status, priority, assigned_to, message, internal_notes").eq("id", first.data[0].enquiry_id).single(), "public enquiry");
  created.customerIds.push(enquiry.customer_id);
  assert.equal(enquiry.product_id, created.productId); assert.equal(enquiry.status, "new"); assert.equal(enquiry.priority, "normal"); assert.equal(enquiry.assigned_to, null); assert.equal(enquiry.internal_notes, null);
  const initial = await data(service.from("enquiry_activities").select("activity_type").eq("enquiry_id", enquiry.id), "initial activity");
  assert(initial.some((item) => item.activity_type === "enquiry_created"));
  pass("Public product lead", `enquiry ${enquiry.enquiry_number} linked to canonical product`);

  const second = await anonymous.rpc("submit_public_enquiry", { p_name: `QA Public Repeat ${runId}`, p_phone: phone, p_message: "A second enquiry from the same practical contact", p_emirate: "Dubai", p_honeypot: "" });
  assert.ifError(second.error); created.enquiryIds.push(second.data[0].enquiry_id);
  const secondRow = await data(service.from("enquiries").select("customer_id").eq("id", second.data[0].enquiry_id).single(), "second enquiry");
  assert.equal(secondRow.customer_id, enquiry.customer_id);
  const customerCount = await service.from("customers").select("id", { count: "exact", head: true }).eq("phone_normalized", phone.replace(/\D/g, ""));
  assert.ifError(customerCount.error); assert.equal(customerCount.count, 1);
  pass("Duplicate customer handling", "same exact phone reused one customer for two enquiries");

  const honeypot = await anonymous.rpc("submit_public_enquiry", { p_name: "QA Bot", p_phone: phone, p_message: "This should be rejected", p_honeypot: "filled" });
  assert(honeypot.error, "honeypot submission unexpectedly succeeded");
  pass("Public honeypot rejection", honeypot.error.message);
  return { enquiry, phone };
}

async function managementAndSalesWorkflow(enquiry) {
  const admin = users.get("admin"); const sales = users.get("sales");
  const assigned = await admin.client.from("enquiries").update({ assigned_to: sales.id }).eq("id", enquiry.id).select("id").single();
  assert.ifError(assigned.error);
  assert.equal((await data(sales.client.from("enquiries").select("id").eq("id", enquiry.id), "sales enquiry access")).length, 1);

  const taskId = randomUUID(); created.taskIds.push(taskId);
  const due = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  assert.ifError((await sales.client.from("tasks").insert({ id: taskId, kind: "enquiry_follow_up", title: "Call customer", description: "Confirm site dimensions", customer_id: enquiry.customer_id, enquiry_id: enquiry.id, assigned_to: sales.id, due_at: due, created_by: sales.id })).error);
  assert.ifError((await sales.client.from("enquiry_activities").insert({ enquiry_id: enquiry.id, activity_type: "note_added", note: "Customer prefers an afternoon call", created_by: sales.id })).error);
  assert.ifError((await sales.client.from("enquiry_activities").insert({ enquiry_id: enquiry.id, activity_type: "contacted", note: "Customer contacted", created_by: sales.id })).error);
  assert.ifError((await sales.client.from("tasks").update({ due_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() }).eq("id", taskId)).error);
  assert.ifError((await sales.client.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", taskId)).error);
  const cancelledTaskId = randomUUID(); created.taskIds.push(cancelledTaskId);
  assert.ifError((await sales.client.from("tasks").insert({ id: cancelledTaskId, kind: "enquiry_follow_up", title: "Superseded callback", customer_id: enquiry.customer_id, enquiry_id: enquiry.id, assigned_to: sales.id, due_at: due, created_by: sales.id })).error);
  assert.ifError((await sales.client.from("tasks").update({ status: "cancelled" }).eq("id", cancelledTaskId)).error);
  assert.ifError((await sales.client.from("enquiries").update({ status: "follow_up", next_action: "Prepare site visit questions", follow_up_at: due }).eq("id", enquiry.id)).error);
  const activity = await data(service.from("enquiry_activities").select("activity_type, created_by").eq("enquiry_id", enquiry.id), "sales timeline");
  for (const expected of ["salesperson_assigned", "follow_up_created", "note_added", "contacted", "follow_up_rescheduled", "follow_up_completed", "follow_up_cancelled", "status_changed"]) assert(activity.some((item) => item.activity_type === expected), `missing ${expected}`);
  pass("Sales follow-up workflow", `${activity.length} timeline entries with assignment, note, reschedule, completion and cancellation`);
}

async function staffManualLead() {
  const admin = users.get("admin"); const sales = users.get("sales");
  const result = await admin.client.rpc("create_staff_enquiry", {
    p_customer_id: null, p_customer_name: `QA Manual ${runId}`, p_phone: `+97155${runId.replace(/[a-f]/gi, "8").slice(0, 7)}`,
    p_whatsapp_number: "", p_email: "", p_company_name: "", p_customer_type: "individual", p_address: "",
    p_area: "Al Quoz", p_emirate: "Dubai", p_source: "Phone", p_product_id: null, p_subject: "Manual phone lead",
    p_message: "Customer called with a general pergola requirement", p_priority: "high", p_assigned_to: sales.id,
    p_follow_up_at: null, p_next_action: "Call tomorrow", p_internal_notes: "Internal QA note",
  });
  assert.ifError(result.error); assert.equal(result.data.length, 1);
  created.customerIds.push(result.data[0].customer_id); created.enquiryIds.push(result.data[0].enquiry_id);
  const row = await data(service.from("enquiries").select("assigned_to, source, internal_notes").eq("id", result.data[0].enquiry_id).single(), "manual enquiry");
  assert.equal(row.assigned_to, sales.id); assert.equal(row.source, "Phone"); assert.equal(row.internal_notes, "Internal QA note");
  pass("Atomic manual enquiry", "inline customer and enquiry created together");
}

async function roleBypass(enquiry) {
  const sales = users.get("sales"); const site = users.get("site_team"); const accounts = users.get("accounts");
  const anonCustomers = await anonymous.from("customers").select("id"); assert(anonCustomers.error);
  const anonEnquiries = await anonymous.from("enquiries").select("id"); assert(anonEnquiries.error);
  const anonInsert = await anonymous.from("enquiries").insert({ customer_id: enquiry.customer_id, message: "bypass" }); assert(anonInsert.error);
  pass("Anonymous CRM reads and direct writes denied", anonInsert.error.code || anonInsert.error.message);
  await denied(site.client.from("customers").update({ notes: "site bypass" }).eq("id", enquiry.customer_id).select("id"), "Site Team customer mutation denied");
  await denied(accounts.client.from("enquiries").update({ status: "approved" }).eq("id", enquiry.id).select("id"), "Accounts enquiry mutation denied");
  const salesAssign = await sales.client.from("enquiries").update({ assigned_to: users.get("admin").id }).eq("id", enquiry.id).select("id");
  assert(salesAssign.error, "Sales reassignment unexpectedly succeeded"); pass("Sales reassignment denied", salesAssign.error.message);
  await denied(sales.client.from("customers").delete().eq("id", enquiry.customer_id).select("id"), "Sales hard-delete denied");
  const wrongAssignee = await users.get("admin").client.from("enquiries").update({ assigned_to: accounts.id }).eq("id", enquiry.id).select("id");
  assert(wrongAssignee.error, "Invalid CRM assignee unexpectedly accepted"); pass("Invalid assignment target denied", wrongAssignee.error.message);
}

async function cleanup() {
  if (created.enquiryIds.length) await service.from("activity_logs").delete().in("entity_id", created.enquiryIds);
  if (created.customerIds.length) await service.from("activity_logs").delete().in("entity_id", created.customerIds);
  if (created.enquiryIds.length) await service.from("enquiries").delete().in("id", created.enquiryIds);
  if (created.customerIds.length) await service.from("customers").delete().in("id", created.customerIds);
  if (created.productId) { await service.from("activity_logs").delete().eq("entity_id", created.productId); await service.from("products").delete().eq("id", created.productId); }
  if (created.categoryId) { await service.from("activity_logs").delete().eq("entity_id", created.categoryId); await service.from("product_categories").delete().eq("id", created.categoryId); }
  for (const record of users.values()) { if (record.client) await record.client.auth.signOut(); await service.auth.admin.deleteUser(record.id); }
}

async function verifyCleanup() {
  async function countIds(table, ids) {
    const validIds = ids.filter(Boolean);
    if (!validIds.length) return 0;
    const result = await service.from(table).select("id", { count: "exact", head: true }).in("id", validIds);
    assert.ifError(result.error);
    return result.count;
  }
  const [customers, enquiries, products, categories, authUsers] = await Promise.all([
    countIds("customers", created.customerIds),
    countIds("enquiries", created.enquiryIds),
    countIds("products", [created.productId]),
    countIds("product_categories", [created.categoryId]),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  for (const count of [customers, enquiries, products, categories]) assert.equal(count, 0);
  assert.ifError(authUsers.error);
  assert.equal(authUsers.data.users.some((user) => user.email?.includes(runId)), false);
}

try {
  await createUsers(); await createCatalogueContext(); const { enquiry } = await publicLeadAndDuplicate();
  await managementAndSalesWorkflow(enquiry); await staffManualLead(); await roleBypass(enquiry);
  console.log(JSON.stringify({ status: "passed", checks }, null, 2));
} finally {
  await cleanup();
  await verifyCleanup();
  console.log(JSON.stringify({ cleanup: "complete and independently verified" }));
}
