import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envText = await readFile(".env.local", "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1).replace(/^["']|["']$/g, "")];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
assert(url && publishableKey && secretKey, "Hosted configuration and SUPABASE_SECRET_KEY are required");
assert(url.includes("jwyjuhtektmtqffnillj"), "Refusing to seed an unexpected Supabase project");

const clientOptions = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const service = createClient(url, secretKey, clientOptions);
const sessions = Object.fromEntries(["admin", "sales", "site_team", "accounts"].map((role) => [role, createClient(url, publishableKey, clientOptions)]));
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const userSpecs = [
  ["admin", "uat.management@universal-pergola.example", "UAT Management"],
  ["sales", "uat.sales@universal-pergola.example", "UAT Sales"],
  ["site_team", "uat.site-team@universal-pergola.example", "UAT Site Team"],
  ["accounts", "uat.accounts@universal-pergola.example", "UAT Accounts"],
];
const users = {};

async function requireData(promise, label) {
  const result = await promise;
  assert.ifError(result.error);
  assert(result.data !== null, `${label}: missing data`);
  return result.data;
}

async function findAuthUser(email) {
  for (let page = 1; page <= 10; page += 1) {
    const result = await service.auth.admin.listUsers({ page, perPage: 100 });
    assert.ifError(result.error);
    const found = result.data.users.find((user) => user.email === email);
    if (found) return found;
    if (result.data.users.length < 100) return null;
  }
  throw new Error(`Auth user search exceeded safety limit for ${email}`);
}

for (const [role, email, fullName] of userSpecs) {
  let user = await findAuthUser(email);
  if (!user) {
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, uat_only: true } });
    assert.ifError(created.error);
    user = created.data.user;
  } else {
    const updated = await service.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: { ...user.user_metadata, full_name: fullName, uat_only: true } });
    assert.ifError(updated.error);
    user = updated.data.user;
  }
  assert.ifError((await service.from("profiles").update({ full_name: fullName, role, status: "active" }).eq("id", user.id)).error);
  const signed = await sessions[role].auth.signInWithPassword({ email, password });
  assert.ifError(signed.error);
  users[role] = { id: user.id, email, fullName };
}

const admin = sessions.admin;
const sales = sessions.sales;
const site = sessions.site_team;
const accounts = sessions.accounts;
const marker = "Phase 2H UAT sample";
const existing = await requireData(service.from("customers").select("id").eq("source", marker).limit(1), "existing UAT marker");
if (existing.length) {
  const categories = await requireData(service.from("product_categories").select("id").like("slug", "uat-%").order("created_at"), "retained categories");
  const products = await requireData(service.from("products").select("id").like("product_code", "UAT-%").order("created_at"), "retained products");
  const customers = await requireData(service.from("customers").select("id").eq("source", marker).order("created_at"), "retained customers");
  const customerIds = customers.map((row) => row.id);
  const enquiries = await requireData(service.from("enquiries").select("id").in("customer_id", customerIds).order("created_at"), "retained enquiries");
  const visits = await requireData(service.from("site_visits").select("id").in("customer_id", customerIds).order("created_at"), "retained visits");
  const photos = await requireData(service.from("site_visit_photos").select("id, storage_path").in("site_visit_id", visits.map((row) => row.id)).order("created_at"), "retained photos");
  if (photos[0]) {
    const storedPhoto = await service.storage.from("site-visit-photos").download(photos[0].storage_path);
    if (storedPhoto.error) {
      const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
      assert.ifError((await service.storage.from("site-visit-photos").upload(photos[0].storage_path, pixel, { contentType: "image/png", upsert: false })).error);
    }
  }
  const quotations = await requireData(service.from("quotations").select("id, revision_number, revised_from_id").in("customer_id", customerIds).order("created_at"), "retained quotations");
  const projects = await requireData(service.from("projects").select("id, project_number, project_value, source_quotation_revision, status").in("customer_id", customerIds).order("created_at"), "retained projects");
  assert.equal(categories.length, 3); assert.equal(products.length, 8); assert.equal(customers.length, 4); assert.equal(enquiries.length, 4); assert.equal(visits.length, 2); assert.equal(quotations.length, 3); assert.equal(projects.length, 2);
  const activeProject = projects.find((row) => row.source_quotation_revision === 1);
  const completedProject = projects.find((row) => row.id !== activeProject?.id);
  assert(activeProject && completedProject, "Retained UAT projects are incomplete");
  let projectState = await requireData(admin.from("projects").select("status").eq("id", completedProject.id).single(), "retained completed project state");
  const stages = await requireData(admin.from("project_stages").select("id, stage_key").eq("project_id", completedProject.id).order("sort_order"), "retained project stages");
  for (const stage of projectState.status === "completed" ? [] : stages.filter((item) => item.stage_key !== "completed")) {
    let current = await requireData(admin.from("project_stages").select("status").eq("id", stage.id).single(), `current ${stage.stage_key} stage`);
    if (current.status === "not_started") {
      assert.ifError((await admin.rpc("transition_project_stage", { p_stage_id: stage.id, p_action: "start", p_note: `[UAT] ${stage.stage_key} started` })).error);
      current = await requireData(admin.from("project_stages").select("status").eq("id", stage.id).single(), `started ${stage.stage_key} stage`);
    }
    if (stage.stage_key === "handover") assert.ifError((await admin.rpc("update_project_handover", { p_project_id: completedProject.id, p_status: "completed", p_handover_date: new Date().toISOString().slice(0, 10), p_contact: "UAT Customer Representative", p_notes: marker })).error);
    if (!["completed", "skipped"].includes(current.status)) assert.ifError((await admin.rpc("transition_project_stage", { p_stage_id: stage.id, p_action: "complete", p_note: `[UAT] ${stage.stage_key} completed` })).error);
  }
  projectState = await requireData(admin.from("projects").select("status").eq("id", completedProject.id).single(), "updated completed project state");
  if (projectState.status !== "completed") assert.ifError((await admin.rpc("complete_project", { p_project_id: completedProject.id, p_completion_note: marker })).error);
  let feedbackRows = await requireData(service.from("feedback").select("id, public_token").eq("project_id", completedProject.id).limit(1), "retained feedback");
  let feedback = feedbackRows[0] ?? null;
  let feedbackToken = feedback?.public_token;
  if (!feedback) {
    feedbackToken = await requireData(admin.rpc("request_project_feedback", { p_project_id: completedProject.id, p_expires_at: new Date(Date.now() + 30 * 86400000).toISOString() }), "feedback request");
    const publicClient = createClient(url, publishableKey, clientOptions);
    assert.equal(await requireData(publicClient.rpc("submit_public_feedback", { p_token: feedbackToken, p_rating: 5, p_comment: "[UAT] Clear communication and a tidy installation.", p_permission: true, p_honeypot: "" }), "feedback submission"), "submitted");
    await publicClient.auth.signOut();
    feedback = await requireData(service.from("feedback").select("id, public_token").eq("project_id", completedProject.id).single(), "created feedback");
  }
  const activeMilestones = await requireData(service.from("payment_milestones").select("id").eq("project_id", activeProject.id).order("sort_order"), "active milestones");
  const completedMilestones = await requireData(service.from("payment_milestones").select("id").eq("project_id", completedProject.id).order("sort_order"), "completed milestones");
  const activeReceipts = await requireData(service.from("payments").select("id").eq("project_id", activeProject.id).is("voided_at", null), "active receipts");
  const completedReceipts = await requireData(service.from("payments").select("id").eq("project_id", completedProject.id).is("voided_at", null), "completed receipts");
  const original = quotations.find((row) => row.revision_number === 0 && quotations.some((candidate) => candidate.revised_from_id === row.id));
  const revision = quotations.find((row) => row.revision_number === 1);
  const second = quotations.find((row) => row.revision_number === 0 && row.id !== original?.id);
  const fixture = {
    status: "fixture-ready", environment: "hosted UAT (not Production)", projectRef: "jwyjuhtektmtqffnillj", generatedAt: new Date().toISOString(), password, users,
    categories: categories.map((row) => row.id), products: products.map((row) => row.id), customers: customerIds, enquiries: enquiries.map((row) => row.id), visits: visits.map((row) => row.id), photo: photos[0] ?? null,
    quotations: { original: original?.id, revision: revision?.id, second: second?.id },
    projects: { active: activeProject.id, activeNumber: activeProject.project_number, completed: completedProject.id, completedNumber: completedProject.project_number },
    finance: { active: { milestoneIds: activeMilestones.map((row) => row.id), receipts: activeReceipts.map((row) => row.id) }, completed: { milestoneIds: completedMilestones.map((row) => row.id), receipts: completedReceipts.map((row) => row.id) } },
    feedbackToken,
  };
  await mkdir(".qa-runtime", { recursive: true });
  await writeFile(".qa-runtime/phase2h-uat-access.json", `${JSON.stringify(fixture, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ status: "passed", resumed: true, environment: fixture.environment, userRoles: Object.keys(users), counts: { categories: categories.length, products: products.length, customers: customers.length, enquiries: enquiries.length, visits: visits.length, quotations: quotations.length, projects: projects.length, receipts: activeReceipts.length + completedReceipts.length, feedback: feedback ? 1 : 0 }, projects: fixture.projects, credentials: "stored in ignored .qa-runtime/phase2h-uat-access.json" }, null, 2));
  await Promise.all(Object.values(sessions).map((client) => client.auth.signOut()));
  process.exit(0);
}

const categorySpecs = [
  ["UAT Louvered Pergolas", "uat-louvered-pergolas", "Motorised and manual aluminium louver systems."],
  ["UAT Retractable Systems", "uat-retractable-systems", "Retractable fabric and folding roof systems."],
  ["UAT Accessories", "uat-accessories", "Lighting, screens, drainage, and controls."],
];
const categories = [];
for (const [name, slug, description] of categorySpecs) {
  categories.push(await requireData(admin.from("product_categories").insert({ name, slug, description, created_by: users.admin.id }).select("id, name").single(), `category ${slug}`));
}

const productSpecs = [
  [0, "UAT Motorised Louvered Pergola", "UAT-PG-100", 45000],
  [0, "UAT Manual Louvered Pergola", "UAT-PG-110", 32000],
  [0, "UAT Freestanding Pergola", "UAT-PG-120", 38000],
  [1, "UAT Retractable Fabric Roof", "UAT-RT-200", 27000],
  [1, "UAT Folding Glass Roof", "UAT-RT-210", 52000],
  [2, "UAT Integrated LED Lighting", "UAT-AC-300", 3200],
  [2, "UAT Motorised Side Screen", "UAT-AC-310", 4800],
  [2, "UAT Smart Wind and Rain Sensor", "UAT-AC-320", 1850],
];
const products = [];
for (const [categoryIndex, name, code, price] of productSpecs) {
  const slug = name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  products.push(await requireData(admin.from("products").insert({
    category_id: categories[categoryIndex].id,
    name,
    slug,
    product_code: code,
    short_description: `${name} — labeled UAT catalogue fixture.`,
    full_description: `Representative ${marker.toLowerCase()} for role and workflow acceptance.`,
    pricing_mode: "fixed_price",
    price,
    currency: "AED",
    is_published: true,
    published_at: new Date().toISOString(),
    sort_order: products.length * 10,
    created_by: users.admin.id,
  }).select("id, name, product_code, price").single(), `product ${code}`));
}

const customerSpecs = [
  ["UAT Aisha Al Noor", "uat-aisha@customer.example", "+971500000101", "Dubai Hills", "Website"],
  ["UAT Omar Rahman", "uat-omar@customer.example", "+971500000102", "Arabian Ranches", "Referral"],
  ["UAT Horizon Design LLC", "uat-horizon@customer.example", "+971500000103", "Jumeirah", "Phone"],
  ["UAT Layla Mansoor", "uat-layla@customer.example", "+971500000104", "Nad Al Sheba", "Walk-in"],
];
const customers = [];
for (const [name, email, phone, area] of customerSpecs) {
  customers.push(await requireData(sales.from("customers").insert({
    name,
    customer_type: name.endsWith("LLC") ? "company" : "individual",
    company_name: name.endsWith("LLC") ? name : null,
    phone,
    email,
    address: `[UAT] Villa/site in ${area}, Dubai`,
    area,
    emirate: "Dubai",
    source: marker,
    assigned_to: users.sales.id,
    created_by: users.sales.id,
  }).select("id, name, email").single(), `customer ${email}`));
}

const enquiries = [];
for (let index = 0; index < customers.length; index += 1) {
  enquiries.push(await requireData(sales.from("enquiries").insert({
    customer_id: customers[index].id,
    product_id: products[index].id,
    enquiry_type: "catalogue",
    subject: `[UAT] ${customerSpecs[index][4]} enquiry ${index + 1}`,
    message: `Representative ${marker.toLowerCase()} from ${customerSpecs[index][4]}.`,
    source: customerSpecs[index][4],
    priority: index === 1 ? "high" : "normal",
    status: index < 2 ? "site_visit_required" : "contacted",
    assigned_to: users.sales.id,
    created_by: users.sales.id,
  }).select("id, enquiry_number").single(), `enquiry ${index + 1}`));
}

const visits = [];
for (let index = 0; index < 2; index += 1) {
  const visit = await requireData(admin.from("site_visits").insert({
    customer_id: customers[index].id,
    enquiry_id: enquiries[index].id,
    assigned_to: users.site_team.id,
    scheduled_at: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
    site_address: `[UAT] Villa ${index + 11}, ${customerSpecs[index][3]}, Dubai`,
    area: customerSpecs[index][3],
    emirate: "Dubai",
    contact_person: customers[index].name,
    contact_phone: customerSpecs[index][2],
    notes: marker,
    created_by: users.admin.id,
  }).select("id, visit_number").single(), `site visit ${index + 1}`);
  for (const status of ["confirmed", "in_progress"]) assert.ifError((await site.from("site_visits").update({ status }).eq("id", visit.id)).error);
  const measurement = await requireData(site.from("site_visit_measurements").insert({
    site_visit_id: visit.id,
    label: index === 0 ? "Main pergola footprint" : "Rear terrace footprint",
    width: 5400 + index * 600,
    height: 2900,
    length: 4200 + index * 300,
    unit: "mm",
    quantity: 1,
    notes: `[UAT] Verified clear dimensions ${index + 1}`,
    sort_order: 10,
    created_by: users.site_team.id,
  }).select("id").single(), `measurement ${index + 1}`);
  assert.ifError((await site.from("site_visits").update({ status: "completed", measurement_summary: `[UAT] Footprint ${5400 + index * 600} × ${4200 + index * 300} mm verified.` }).eq("id", visit.id)).error);
  visits.push({ ...visit, measurementId: measurement.id });
}

const photoId = randomUUID();
const photoPath = `${visits[0].id}/${photoId}.png`;
const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
assert.ifError((await site.from("site_visit_photos").insert({ id: photoId, site_visit_id: visits[0].id, storage_path: photoPath, caption: "[UAT] Existing terrace condition", photo_type: "site_condition", mime_type: "image/png", file_size: pixel.length, sort_order: 10, created_by: users.site_team.id })).error);
assert.ifError((await site.storage.from("site-visit-photos").upload(photoPath, pixel, { contentType: "image/png", upsert: false })).error);

function quotePayload(index, { price = 45000, notes = "Initial UAT proposal" } = {}) {
  const issue = new Date().toISOString().slice(0, 10);
  return {
    customer_id: customers[index].id,
    enquiry_id: enquiries[index].id,
    site_visit_id: visits[index].id,
    owner_id: users.sales.id,
    currency: "AED",
    issue_date: issue,
    validity_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    customer_name_snapshot: customers[index].name,
    customer_company_snapshot: "",
    customer_phone_snapshot: customerSpecs[index][2],
    customer_email_snapshot: customers[index].email,
    site_address_snapshot: `[UAT] ${customerSpecs[index][3]}, Dubai`,
    introduction: "[UAT] Design, fabrication, supply, and installation proposal.",
    internal_notes: marker,
    customer_notes: notes,
    terms: "UAT PLACEHOLDER — commercial wording requires stakeholder approval before Production.",
    discount_type: "fixed",
    discount_value: "0",
    vat_rate: "5",
    items: [{
      product_id: products[index].id,
      source_measurement_id: visits[index].measurementId,
      item_name: products[index].name,
      description: "[UAT] Representative aluminium pergola package with installation.",
      quantity: "1",
      unit: "project",
      width: String(5400 + index * 600),
      height: "2900",
      length: String(4200 + index * 300),
      dimensions_details: "Dimensions copied from completed UAT site visit.",
      unit_price: String(price),
      discount_amount: "0",
      taxable: true,
      sort_order: 10,
    }],
  };
}

const quoteOne = await requireData(sales.rpc("save_quotation_draft", { p_quotation_id: null, p_payload: quotePayload(0) }), "first quotation");
assert.ifError((await sales.from("quotations").update({ status: "ready" }).eq("id", quoteOne)).error);
assert.ifError((await sales.from("quotations").update({ status: "sent" }).eq("id", quoteOne)).error);
const revision = await requireData(sales.rpc("create_quotation_revision", { p_quotation_id: quoteOne }), "quotation revision");
assert.equal(await requireData(sales.rpc("save_quotation_draft", { p_quotation_id: revision, p_payload: quotePayload(0, { price: 46500, notes: "[UAT] Revision includes upgraded rain sensor." }) }), "save quotation revision"), revision);
assert.ifError((await sales.from("quotations").update({ status: "ready" }).eq("id", revision)).error);
assert.ifError((await sales.from("quotations").update({ status: "sent" }).eq("id", revision)).error);
assert.ifError((await admin.from("quotations").update({ status: "approved", decision_note: "[UAT] Management approval of revised scope" }).eq("id", revision)).error);
const activeProjectId = await requireData(admin.rpc("convert_approved_quotation_to_project", { p_quotation_id: revision }), "active project conversion");
assert.ifError((await admin.rpc("update_project_details", { p_project_id: activeProjectId, p_status: "active", p_priority: "normal", p_start_date: new Date().toISOString().slice(0, 10), p_target_date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10), p_installation_date: null, p_summary: "[UAT] Active installation project", p_notes: marker })).error);
assert.ifError((await admin.rpc("set_project_assignment", { p_project_id: activeProjectId, p_user_id: users.site_team.id, p_assignment_role: "site_team", p_enabled: true })).error);

const quoteTwo = await requireData(sales.rpc("save_quotation_draft", { p_quotation_id: null, p_payload: quotePayload(1, { price: 32000, notes: "[UAT] Standard completed-project proposal." }) }), "second quotation");
assert.ifError((await sales.from("quotations").update({ status: "ready" }).eq("id", quoteTwo)).error);
assert.ifError((await sales.from("quotations").update({ status: "sent" }).eq("id", quoteTwo)).error);
assert.ifError((await admin.from("quotations").update({ status: "approved", decision_note: "[UAT] Management approval" }).eq("id", quoteTwo)).error);
const completedProjectId = await requireData(admin.rpc("convert_approved_quotation_to_project", { p_quotation_id: quoteTwo }), "completed project conversion");
assert.ifError((await admin.rpc("update_project_details", { p_project_id: completedProjectId, p_status: "active", p_priority: "normal", p_start_date: new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10), p_target_date: new Date().toISOString().slice(0, 10), p_installation_date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), p_summary: "[UAT] Completed pergola installation", p_notes: marker })).error);
assert.ifError((await admin.rpc("set_project_assignment", { p_project_id: completedProjectId, p_user_id: users.site_team.id, p_assignment_role: "site_team", p_enabled: true })).error);

async function addPlan(projectId, projectValue, complete) {
  const first = Math.round(Number(projectValue) * 50) / 100;
  const second = Math.round(Number(projectValue) * 40) / 100;
  const third = Math.round((Number(projectValue) - first - second) * 100) / 100;
  const milestoneIds = [];
  for (const [name, percentage, amount, sort] of [["50% Advance", 50, first, 10], ["40% Before Installation", 40, second, 20], ["10% At Handover", null, third, 30]]) {
    milestoneIds.push(await requireData(accounts.rpc("save_payment_milestone", { p_project_id: projectId, p_milestone_id: null, p_name: name, p_type: percentage ? "percentage" : "fixed", p_percentage: percentage, p_fixed_amount: percentage ? null : amount, p_due_date: new Date().toISOString().slice(0, 10), p_description: `[UAT] ${name}`, p_notes: marker, p_sort_order: sort }), `milestone ${name}`));
  }
  assert.ifError((await accounts.rpc("activate_payment_plan", { p_project_id: projectId })).error);
  const amounts = complete ? [first, second, third] : [Math.round(first / 2 * 100) / 100];
  const receipts = [];
  for (let index = 0; index < amounts.length; index += 1) receipts.push(await requireData(accounts.rpc("record_payment", { p_project_id: projectId, p_milestone_id: milestoneIds[index], p_amount: amounts[index], p_received_date: new Date().toISOString().slice(0, 10), p_method: index === 0 ? "bank_transfer" : "card", p_reference: `UAT-${complete ? "FULL" : "PARTIAL"}-${index + 1}`, p_notes: marker }), `receipt ${index + 1}`));
  return { milestoneIds, receipts };
}

const activeProject = await requireData(service.from("projects").select("project_value, project_number").eq("id", activeProjectId).single(), "active project");
const completedProject = await requireData(service.from("projects").select("project_value, project_number").eq("id", completedProjectId).single(), "completed project");
const activeFinance = await addPlan(activeProjectId, activeProject.project_value, false);
const completedFinance = await addPlan(completedProjectId, completedProject.project_value, true);

const stages = await requireData(admin.from("project_stages").select("id, stage_key").eq("project_id", completedProjectId).order("sort_order"), "completed project stages");
for (const stage of stages.filter((item) => item.stage_key !== "completed")) {
  let current = await requireData(admin.from("project_stages").select("status").eq("id", stage.id).single(), `current ${stage.stage_key} stage`);
  if (current.status === "not_started") {
    assert.ifError((await admin.rpc("transition_project_stage", { p_stage_id: stage.id, p_action: "start", p_note: `[UAT] ${stage.stage_key} started` })).error);
    current = await requireData(admin.from("project_stages").select("status").eq("id", stage.id).single(), `started ${stage.stage_key} stage`);
  }
  if (stage.stage_key === "handover") assert.ifError((await admin.rpc("update_project_handover", { p_project_id: completedProjectId, p_status: "completed", p_handover_date: new Date().toISOString().slice(0, 10), p_contact: "UAT Customer Representative", p_notes: marker })).error);
  if (!["completed", "skipped"].includes(current.status)) assert.ifError((await admin.rpc("transition_project_stage", { p_stage_id: stage.id, p_action: "complete", p_note: `[UAT] ${stage.stage_key} completed` })).error);
}
assert.ifError((await admin.rpc("complete_project", { p_project_id: completedProjectId, p_completion_note: marker })).error);
const feedbackToken = await requireData(admin.rpc("request_project_feedback", { p_project_id: completedProjectId, p_expires_at: new Date(Date.now() + 30 * 86400000).toISOString() }), "feedback request");
const publicClient = createClient(url, publishableKey, clientOptions);
assert.equal(await requireData(publicClient.rpc("submit_public_feedback", { p_token: feedbackToken, p_rating: 5, p_comment: "[UAT] Clear communication and a tidy installation.", p_permission: true, p_honeypot: "" }), "feedback submission"), "submitted");

const fixture = {
  status: "fixture-ready",
  environment: "hosted UAT (not Production)",
  projectRef: "jwyjuhtektmtqffnillj",
  generatedAt: new Date().toISOString(),
  password,
  users,
  categories: categories.map((item) => item.id),
  products: products.map((item) => item.id),
  customers: customers.map((item) => item.id),
  enquiries: enquiries.map((item) => item.id),
  visits: visits.map((item) => item.id),
  photo: { id: photoId, path: photoPath },
  quotations: { original: quoteOne, revision, second: quoteTwo },
  projects: { active: activeProjectId, activeNumber: activeProject.project_number, completed: completedProjectId, completedNumber: completedProject.project_number },
  finance: { active: activeFinance, completed: completedFinance },
  feedbackToken,
};
await mkdir(".qa-runtime", { recursive: true });
await writeFile(".qa-runtime/phase2h-uat-access.json", `${JSON.stringify(fixture, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({
  status: "passed",
  environment: fixture.environment,
  userRoles: Object.keys(users),
  counts: { categories: categories.length, products: products.length, customers: customers.length, enquiries: enquiries.length, visits: visits.length, quotations: 3, projects: 2, receipts: activeFinance.receipts.length + completedFinance.receipts.length, feedback: 1 },
  projects: fixture.projects,
  credentials: "stored in ignored .qa-runtime/phase2h-uat-access.json",
}, null, 2));

await Promise.all([...Object.values(sessions), publicClient].map((client) => client.auth.signOut()));
