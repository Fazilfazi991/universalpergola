import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const runIds = process.argv.slice(2);
assert(url && key && runIds.length, "SUPABASE_URL, SUPABASE_SECRET_KEY, and at least one run ID are required");
const service = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

for (const runId of runIds) {
  const customers = await service.from("customers").select("id").eq("name", `QA Project Customer ${runId}`);
  assert.ifError(customers.error);
  const customerIds = (customers.data || []).map((row) => row.id);
  const projects = customerIds.length ? await service.from("projects").select("id").in("customer_id", customerIds) : { data: [], error: null };
  assert.ifError(projects.error);
  const projectIds = (projects.data || []).map((row) => row.id);
  const timestamp = new Date().toISOString();
  if (projectIds.length) {
    const payments = await service.from("payments").select("id").in("project_id", projectIds);
    assert.ifError(payments.error);
    const paymentIds = (payments.data || []).map((row) => row.id);
    if (paymentIds.length) assert.ifError((await service.from("payment_proofs").update({ archived_at: timestamp }).in("payment_id", paymentIds)).error);
    assert.ifError((await service.from("payments").update({ archived_at: timestamp }).in("project_id", projectIds)).error);
    assert.ifError((await service.from("payment_milestones").update({ archived_at: timestamp }).in("project_id", projectIds)).error);
    assert.ifError((await service.from("projects").update({ archived_at: timestamp }).in("id", projectIds)).error);
  }
  if (customerIds.length) {
    await service.from("quotations").update({ archived_at: timestamp }).in("customer_id", customerIds);
    await service.from("site_visits").update({ archived_at: timestamp }).in("customer_id", customerIds);
    await service.from("enquiries").update({ archived_at: timestamp }).in("customer_id", customerIds);
    await service.from("customers").update({ archived_at: timestamp }).in("id", customerIds);
  }
  const listed = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.ifError(listed.error);
  const users = listed.data.users.filter((user) => user.email?.includes(`qa-phase2e-${runId}-`));
  if (users.length) assert.ifError((await service.from("profiles").update({ status: "inactive" }).in("id", users.map((user) => user.id))).error);
  console.log(JSON.stringify({ runId, archivedProjects: projectIds.length, archivedCustomers: customerIds.length, deactivatedUsers: users.length }));
}
