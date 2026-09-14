import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envText = await readFile(".env.local", "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [
        line.slice(0, separator),
        line.slice(separator + 1).replace(/^["']|["']$/g, ""),
      ];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
assert(url && secret, "Hosted URL and SUPABASE_SECRET_KEY are required");

const service = createClient(url, secret, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

let recordedFixtureIds = [];
try {
  const fixture = JSON.parse(
    await readFile(".qa-runtime/phase2g-fixture.json", "utf8"),
  );
  recordedFixtureIds = [
    ...Object.values(fixture.createdFixture ?? {}),
    fixture.feedbackId,
  ].filter(
    (value) =>
      typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
} catch {
  // Discovery by QA markers remains sufficient when no browser fixture exists.
}

async function rows(promise, label) {
  const result = await promise;
  assert.ifError(result.error);
  assert(result.data !== null, `${label}: missing data`);
  return result.data;
}

async function removeByIds(table, ids) {
  if (ids.length === 0) return 0;
  const result = await service.from(table).delete().in("id", ids).select("id");
  assert.ifError(result.error);
  return result.data?.length ?? 0;
}

async function removeActivities(entityIds) {
  if (entityIds.length === 0) return 0;
  const result = await service
    .from("activity_logs")
    .delete()
    .in("entity_id", entityIds)
    .select("id");
  assert.ifError(result.error);
  return result.data?.length ?? 0;
}

const customers = await rows(
  service.from("customers").select("id").eq("source", "Phase 2G hosted QA"),
  "QA customers",
);
const customerIds = customers.map(({ id }) => id);

const [projects, quotations, visits, enquiries, products, categories] =
  await Promise.all([
    customerIds.length
      ? rows(
          service.from("projects").select("id").in("customer_id", customerIds),
          "QA projects",
        )
      : [],
    customerIds.length
      ? rows(
          service.from("quotations").select("id").in("customer_id", customerIds),
          "QA quotations",
        )
      : [],
    customerIds.length
      ? rows(
          service.from("site_visits").select("id").in("customer_id", customerIds),
          "QA site visits",
        )
      : [],
    rows(
      service.from("enquiries").select("id").eq("source", "Phase 2G hosted QA"),
      "QA enquiries",
    ),
    rows(
      service.from("products").select("id").like("slug", "phase-2g-pergola-%"),
      "QA products",
    ),
    rows(
      service.from("product_categories").select("id").like("slug", "phase-2g-%"),
      "QA categories",
    ),
  ]);

const projectIds = projects.map(({ id }) => id);
const feedback = projectIds.length
  ? await rows(
      service.from("feedback").select("id").in("project_id", projectIds),
      "QA feedback",
    )
  : [];
const feedbackIds = feedback.map(({ id }) => id);
const quotationIds = quotations.map(({ id }) => id);
const visitIds = visits.map(({ id }) => id);
const enquiryIds = enquiries.map(({ id }) => id);
const productIds = products.map(({ id }) => id);
const categoryIds = categories.map(({ id }) => id);
const activityEntityIds = [
  ...recordedFixtureIds,
  ...feedbackIds,
  ...projectIds,
  ...quotationIds,
  ...visitIds,
  ...enquiryIds,
  ...customerIds,
  ...productIds,
  ...categoryIds,
];

const deleted = {};
deleted.projects = await removeByIds("projects", projectIds);
deleted.quotations = await removeByIds("quotations", quotationIds);
deleted.siteVisits = await removeByIds("site_visits", visitIds);
deleted.enquiries = await removeByIds("enquiries", enquiryIds);
deleted.customers = await removeByIds("customers", customerIds);
deleted.products = await removeByIds("products", productIds);
deleted.categories = await removeByIds("product_categories", categoryIds);
deleted.activityLogs = await removeActivities(activityEntityIds);

let page = 1;
let authUsersDeleted = 0;
while (true) {
  const result = await service.auth.admin.listUsers({ page, perPage: 1000 });
  assert.ifError(result.error);
  const users = result.data.users;
  for (const user of users) {
    if (user.email?.startsWith("qa-phase2g-")) {
      const removal = await service.auth.admin.deleteUser(user.id);
      assert.ifError(removal.error);
      authUsersDeleted += 1;
    }
  }
  if (users.length < 1000) break;
  page += 1;
}
deleted.authUsers = authUsersDeleted;

const remaining = await rows(
  service
    .from("customers")
    .select("id")
    .eq("source", "Phase 2G hosted QA"),
  "remaining QA customers",
);
assert.equal(remaining.length, 0, "Phase 2G QA customer data remains");

console.log(JSON.stringify({ status: "clean", deleted }, null, 2));
