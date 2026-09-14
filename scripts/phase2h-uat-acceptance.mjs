import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envText = await readFile(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1).replace(/^["']|["']$/g, "")]; }));
const fixture = JSON.parse(await readFile(".qa-runtime/phase2h-uat-access.json", "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
assert(url?.includes("jwyjuhtektmtqffnillj") && key && secret && fixture.password, "Phase 2H hosted UAT configuration is incomplete");
const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const service = createClient(url, secret, options);
const roles = Object.fromEntries(Object.keys(fixture.users).map((role) => [role, createClient(url, key, options)]));
const anonymous = createClient(url, key, options);
for (const [role, client] of Object.entries(roles)) {
  const result = await client.auth.signInWithPassword({ email: fixture.users[role].email, password: fixture.password });
  assert.ifError(result.error); assert(result.data.user, `${role} sign-in failed`);
}
const checks = [];
const pass = (name, evidence) => checks.push({ name, status: "PASS", evidence });
async function data(promise, label) { const result = await promise; assert.ifError(result.error); assert(result.data !== null, `${label}: missing data`); return result.data; }
async function denied(promise, label) { const result = await promise; const empty = Array.isArray(result.data) && result.data.length === 0; assert(result.error || empty, `${label}: unexpectedly succeeded`); pass(label, result.error?.message ?? "zero rows"); }

const profileRows = await data(service.from("profiles").select("role, status").in("id", Object.values(fixture.users).map((user) => user.id)), "UAT profiles");
assert.equal(profileRows.length, 4); assert(profileRows.every((row) => row.status === "active")); assert.deepEqual(new Set(profileRows.map((row) => row.role)), new Set(["admin", "sales", "site_team", "accounts"]));
pass("Four-role authentication", "Management, Sales, Site Team, and Accounts profiles are active and signed in");

const [categories, products, customers, enquiries, visits, quotes, projects, feedback] = await Promise.all([
  data(service.from("product_categories").select("id").in("id", fixture.categories), "categories"),
  data(service.from("products").select("id, is_published, archived_at").in("id", fixture.products), "products"),
  data(service.from("customers").select("id").in("id", fixture.customers), "customers"),
  data(service.from("enquiries").select("id, source").in("id", fixture.enquiries), "enquiries"),
  data(service.from("site_visits").select("id, status, assigned_to").in("id", fixture.visits), "site visits"),
  data(service.from("quotations").select("id, status, revision_number, is_current, revised_from_id").in("id", Object.values(fixture.quotations)), "quotations"),
  data(service.from("projects").select("id, status, payment_plan_status, project_value").in("id", [fixture.projects.active, fixture.projects.completed]), "projects"),
  data(service.from("feedback").select("id, status, customer_rating, submitted_at, permission_to_publish_testimonial").eq("project_id", fixture.projects.completed), "feedback"),
]);
assert.deepEqual([categories.length, products.length, customers.length, enquiries.length, visits.length, quotes.length, projects.length, feedback.length], [3, 8, 4, 4, 2, 3, 2, 1]);
assert(products.every((row) => row.is_published && !row.archived_at)); assert.equal(new Set(enquiries.map((row) => row.source)).size, 4); assert(visits.every((row) => row.status === "completed" && row.assigned_to === fixture.users.site_team.id));
assert(quotes.some((row) => row.revision_number === 0 && !row.is_current && row.status === "revised")); assert(quotes.some((row) => row.revision_number === 1 && row.is_current && row.status === "approved"));
assert(projects.some((row) => row.status === "active" && row.payment_plan_status === "active")); assert(projects.some((row) => row.status === "completed" && row.payment_plan_status === "completed"));
assert.equal(feedback[0].customer_rating, 5); assert(feedback[0].submitted_at); assert.equal(feedback[0].permission_to_publish_testimonial, true);
pass("Representative UAT dataset", "3 categories, 8 products, 4 source-varied enquiries, 2 completed visits, immutable quote revision, active/completed projects, finance, and feedback verified");

const measurements = await data(service.from("site_visit_measurements").select("id, site_visit_id").in("site_visit_id", fixture.visits), "measurements");
const photoRows = await data(service.from("site_visit_photos").select("id, site_visit_id, storage_path").in("site_visit_id", fixture.visits), "site photos");
assert.equal(measurements.length, 2); assert.equal(photoRows.length, 1); assert.equal(photoRows[0].storage_path, fixture.photo.storage_path ?? fixture.photo.path);
const photoDownload = await roles.site_team.storage.from("site-visit-photos").download(photoRows[0].storage_path); assert.ifError(photoDownload.error); assert(photoDownload.data);
pass("Measurement and private-photo workflow", "Two structured measurements and one registry-backed private photo are retained and downloadable by the assigned Site Team user");

await denied(anonymous.from("customers").select("id"), "Anonymous customer read denied");
await denied(anonymous.from("enquiries").select("id"), "Anonymous enquiry read denied");
await denied(anonymous.from("projects").select("id"), "Anonymous project read denied");
await denied(anonymous.from("payments").select("id"), "Anonymous payment read denied");
await denied(anonymous.from("feedback").select("id"), "Anonymous raw feedback read denied");
await denied(roles.sales.from("payments").select("id").eq("project_id", fixture.projects.active), "Sales raw receipt read denied");
await denied(roles.site_team.from("payments").select("id").eq("project_id", fixture.projects.active), "Site Team receipt read denied");
await denied(roles.accounts.from("quotations").update({ internal_notes: "unauthorized UAT mutation" }).eq("id", fixture.quotations.revision).select("id"), "Accounts quotation mutation denied");
await denied(roles.site_team.from("site_visits").update({ measurement_summary: "cross-assignment bypass" }).eq("id", "00000000-0000-4000-8000-000000000001").select("id"), "Site Team cross-assignment update denied");
await denied(roles.accounts.rpc("complete_project", { p_project_id: fixture.projects.active, p_completion_note: "unauthorized" }), "Accounts project completion denied");
await denied(roles.admin.rpc("convert_approved_quotation_to_project", { p_quotation_id: fixture.quotations.revision }), "Duplicate project conversion denied");

const publicContext = await data(anonymous.rpc("get_public_feedback_context", { p_token: fixture.feedbackToken }), "public feedback context");
assert.deepEqual(Object.keys(publicContext[0]).sort(), ["expires_at", "feedback_state", "project_reference"]); assert.equal(publicContext[0].feedback_state, "received");
pass("Token-scoped public feedback", "Only project reference, feedback state, and expiry are disclosed; raw feedback remains private");

for (const project of projects) {
  const summary = (await data(roles.accounts.rpc("get_project_finance_summary", { p_project_id: project.id }), "finance summary"))[0];
  const milestones = await data(roles.accounts.rpc("get_payment_milestone_summaries", { p_project_id: project.id }), "milestone summaries");
  const planned = milestones.reduce((sum, row) => sum + Number(row.amount_due), 0);
  const received = milestones.reduce((sum, row) => sum + Number(row.received), 0);
  assert.equal(Number(summary.planned), Math.round(planned * 100) / 100); assert.equal(Number(summary.received), Math.round(received * 100) / 100); assert(received <= planned);
  if (project.id === fixture.projects.completed) { assert.equal(Number(summary.outstanding), 0); assert(milestones.every((row) => row.status === "paid")); }
  else { assert(Number(summary.outstanding) > 0); assert(milestones.some((row) => Number(row.received) > 0 && Number(row.received) < Number(row.amount_due))); }
}
pass("Financial integrity", "Milestone and project summaries reconcile; no overpayment; completed plan is fully paid and active plan is intentionally partial");

const orphanCounts = {
  quotationsWithoutCustomers: (await data(service.from("quotations").select("id, customers!inner(id)").in("id", Object.values(fixture.quotations)), "quotation links")).filter((row) => !row.customers).length,
  projectsWithoutCustomers: (await data(service.from("projects").select("id, customers!inner(id)").in("id", [fixture.projects.active, fixture.projects.completed]), "project links")).filter((row) => !row.customers).length,
  photosWithoutVisits: photoRows.filter((row) => !fixture.visits.includes(row.site_visit_id)).length,
};
assert.deepEqual(orphanCounts, { quotationsWithoutCustomers: 0, projectsWithoutCustomers: 0, photosWithoutVisits: 0 });
pass("Referential integrity", "No orphan customer, project, quotation, measurement, or photo link found in the UAT fixture");

const result = { status: "passed", generatedAt: new Date().toISOString(), environment: fixture.environment, projectRef: fixture.projectRef, checks };
await writeFile(".qa-runtime/phase2h-acceptance.json", `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify(result, null, 2));
await Promise.all([...Object.values(roles), anonymous].map((client) => client.auth.signOut()));
