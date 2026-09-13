import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
assert(
  url && publishableKey && secretKey,
  "Hosted Supabase URL, publishable key, and secret key are required",
);

const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};
const service = createClient(url, secretKey, options);
const anonymous = createClient(url, publishableKey, options);
const runId = randomUUID().slice(0, 8);
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const users = new Map();
const created = {
  categoryIds: [],
  productIds: [],
  customerIds: [],
  enquiryIds: [],
  visitIds: [],
  measurementIds: [],
  quotationIds: [],
  projectIds: [],
};
const checks = [];

function pass(name, evidence = "pass") {
  checks.push({ name, evidence });
}
function client() {
  return createClient(url, publishableKey, options);
}
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
  const roles = [
    ["admin", "admin"],
    ["sales1", "sales"],
    ["sales2", "sales"],
    ["site", "site_team"],
    ["accounts", "accounts"],
  ];
  for (const [key, role] of roles) {
    const email = `qa-phase2d-${runId}-${key}@example.com`;
    const made = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `QA Phase 2D ${key}` },
    });
    assert.ifError(made.error);
    assert(made.data.user);
    assert.ifError(
      (
        await service
          .from("profiles")
          .update({ role, status: "active" })
          .eq("id", made.data.user.id)
      ).error,
    );
    const session = client();
    assert.ifError(
      (await session.auth.signInWithPassword({ email, password })).error,
    );
    users.set(key, { id: made.data.user.id, email, client: session });
  }
  pass(
    "Disposable role sessions",
    "Management, two Sales users, Site Team, and Accounts authenticated",
  );
}

async function createSourceContext() {
  const admin = users.get("admin"),
    sales1 = users.get("sales1"),
    site = users.get("site");
  const customer = await requireData(
    admin.client
      .from("customers")
      .insert({
        name: `QA Quotation Customer ${runId}`,
        customer_type: "company",
        company_name: "Pergola QA Developments",
        phone: "+971501112233",
        email: `buyer-${runId}@example.com`,
        address: "Villa 17, Dubai Hills Estate",
        area: "Dubai Hills",
        emirate: "Dubai",
        source: "Phase 2D hosted QA",
        assigned_to: sales1.id,
        created_by: admin.id,
      })
      .select("id")
      .single(),
    "customer",
  );
  created.customerIds.push(customer.id);

  const enquiry = await requireData(
    admin.client
      .from("enquiries")
      .insert({
        customer_id: customer.id,
        subject: "Louvered pergola quotation",
        message:
          "Measured outdoor living project requiring a formal quotation.",
        source: "Phase 2D hosted QA",
        status: "site_visit_required",
        assigned_to: sales1.id,
        created_by: admin.id,
      })
      .select("id, enquiry_number")
      .single(),
    "enquiry",
  );
  created.enquiryIds.push(enquiry.id);

  const visit = await requireData(
    admin.client
      .from("site_visits")
      .insert({
        customer_id: customer.id,
        enquiry_id: enquiry.id,
        assigned_to: site.id,
        scheduled_at: new Date(Date.now() - 3600000).toISOString(),
        site_address: "Villa 17, Dubai Hills Estate",
        area: "Dubai Hills",
        emirate: "Dubai",
        contact_person: "QA Buyer",
        contact_phone: "+971501112233",
        created_by: admin.id,
      })
      .select("id, visit_number")
      .single(),
    "site visit",
  );
  created.visitIds.push(visit.id);
  for (const status of ["confirmed", "in_progress"]) {
    assert.ifError(
      (
        await site.client
          .from("site_visits")
          .update({ status })
          .eq("id", visit.id)
      ).error,
    );
  }
  const measurement = await requireData(
    site.client
      .from("site_visit_measurements")
      .insert({
        site_visit_id: visit.id,
        label: "Main pergola footprint",
        width: 5250.5,
        height: 2850,
        length: 4125.25,
        unit: "mm",
        quantity: 1,
        notes: "Finished surface dimensions; allow for drainage fall.",
        sort_order: 10,
        created_by: site.id,
      })
      .select("id")
      .single(),
    "measurement",
  );
  created.measurementIds.push(measurement.id);
  assert.ifError(
    (
      await site.client
        .from("site_visits")
        .update({
          status: "completed",
          measurement_summary:
            "Main footprint verified on site at 5250.5 × 4125.25 mm.",
        })
        .eq("id", visit.id)
    ).error,
  );

  const productLookup = await service
    .from("products")
    .select("id, name, product_code, price")
    .is("archived_at", null)
    .eq("is_published", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  assert.ifError(productLookup.error);
  let product = productLookup.data;
  if (!product) {
    const category = await requireData(
      service
        .from("product_categories")
        .insert({
          name: `QA Phase 2D ${runId}`,
          slug: `qa-phase2d-${runId}`,
          description: "Disposable hosted quotation acceptance category",
          created_by: admin.id,
        })
        .select("id")
        .single(),
      "temporary product category",
    );
    created.categoryIds.push(category.id);
    product = await requireData(
      service
        .from("products")
        .insert({
          category_id: category.id,
          name: "QA Motorised Louvered Pergola",
          slug: `qa-motorised-louvered-pergola-${runId}`,
          product_code: `QA-P2D-${runId.toUpperCase()}`,
          short_description:
            "Disposable catalogue product for hosted quotation acceptance.",
          full_description:
            "Commercial product snapshot source used only during Phase 2D verification.",
          pricing_mode: "fixed_price",
          price: 1000.25,
          currency: "AED",
          is_published: true,
          published_at: new Date().toISOString(),
          created_by: admin.id,
        })
        .select("id, name, product_code, price")
        .single(),
      "temporary catalogue product",
    );
    created.productIds.push(product.id);
  }

  pass(
    "Site visit source context",
    `Customer, ENQ-${enquiry.enquiry_number}, SV-${visit.visit_number}, and structured measurement linked`,
  );
  return { customer, enquiry, visit, measurement, product };
}

function draftPayload(context, { long = false, fixed = false } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const valid = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const longDescription =
    "Motorised aluminium louvered pergola fabricated to the verified site dimensions. Includes concealed drainage, powder-coated structural profiles, coordinated electrical preparation, installation allowances, protection of adjacent finishes, commissioning, and a documented handover. ";
  const items = [
    {
      product_id: context.product.id,
      source_measurement_id: context.measurement.id,
      item_name: context.product.name,
      description: long
        ? longDescription.repeat(4)
        : "Catalogue pergola copied as a commercial snapshot from the selected product.",
      quantity: "2.5",
      unit: "set",
      width: "5250.5",
      height: "2850",
      length: "4125.25",
      dimensions_details:
        "Main footprint; measurements copied at quotation time.",
      unit_price: long ? "12500.25" : "1000.25",
      discount_amount: "100.13",
      taxable: true,
      sort_order: 10,
    },
    {
      product_id: null,
      source_measurement_id: null,
      item_name: "Custom access preparation",
      description: long
        ? `${longDescription}Custom fabricated work; not linked to the live catalogue.`
        : "Manual custom fabrication line with an independent commercial description.",
      quantity: "1",
      unit: "lot",
      width: "",
      height: "",
      length: "",
      dimensions_details: "Site-specific access and protection",
      unit_price: long ? "1800.40" : "800.40",
      discount_amount: "0",
      taxable: false,
      sort_order: 20,
    },
  ];
  if (long) {
    for (let index = 0; index < 14; index += 1) {
      items.push({
        product_id: null,
        source_measurement_id: null,
        item_name: `Detailed custom scope ${String(index + 1).padStart(2, "0")}`,
        description: `${longDescription}Sequence ${index + 1}; coordination note retained in the issued revision snapshot.`,
        quantity: String((index % 3) + 1),
        unit: "item",
        width: "",
        height: "",
        length: "",
        dimensions_details: "Refer to coordinated setting-out drawing",
        unit_price: String(250.15 + index * 17.25),
        discount_amount: index % 4 === 0 ? "10.05" : "0",
        taxable: index % 5 !== 0,
        sort_order: 30 + index * 10,
      });
    }
  }
  return {
    customer_id: context.customer.id,
    enquiry_id: context.enquiry.id,
    site_visit_id: context.visit.id,
    owner_id: users.get("sales1").id,
    currency: "AED",
    issue_date: today,
    validity_date: valid,
    customer_name_snapshot: `QA Quotation Customer ${runId}`,
    customer_company_snapshot: "Pergola QA Developments",
    customer_phone_snapshot: "+971501112233",
    customer_email_snapshot: `buyer-${runId}@example.com`,
    site_address_snapshot: "Villa 17, Dubai Hills Estate",
    introduction:
      "A structured commercial proposal based on the completed site visit.",
    internal_notes: "Disposable hosted acceptance fixture.",
    customer_notes:
      "Pricing is based on the documented dimensions and stated scope.",
    terms:
      "DEVELOPMENT PLACEHOLDER — replace with approved Universal Pergola terms before production use.\nValidity and execution remain subject to final technical review.",
    discount_type: fixed ? "fixed" : "percentage",
    discount_value: fixed ? "125.55" : "7.5",
    vat_rate: "5",
    items,
  };
}

async function quotationLifecycle(context) {
  const sales1 = users.get("sales1"),
    sales2 = users.get("sales2"),
    admin = users.get("admin");
  const initialPayload = draftPayload(context);
  const salesProfile = await requireData(
    sales1.client
      .from("profiles")
      .select("id, role, status")
      .eq("id", sales1.id)
      .single(),
    "Sales profile preflight",
  );
  assert.deepEqual(
    { role: salesProfile.role, status: salesProfile.status },
    { role: "sales", status: "active" },
  );
  for (const [table, id] of [
    ["customers", context.customer.id],
    ["products", context.product.id],
    ["site_visit_measurements", context.measurement.id],
  ]) {
    const visible = await requireData(
      sales1.client.from(table).select("id").eq("id", id),
      `Sales ${table} preflight`,
    );
    assert.equal(
      visible.length,
      1,
      `Sales cannot read required ${table} source`,
    );
  }
  const directProbe = await sales1.client
    .from("quotations")
    .insert({
      quotation_number: "AUTO",
      customer_id: context.customer.id,
      enquiry_id: context.enquiry.id,
      site_visit_id: context.visit.id,
      owner_id: sales1.id,
      currency: initialPayload.currency,
      issue_date: initialPayload.issue_date,
      validity_date: initialPayload.validity_date,
      customer_name_snapshot: initialPayload.customer_name_snapshot,
      discount_type: initialPayload.discount_type,
      discount_value: initialPayload.discount_value,
      vat_rate: initialPayload.vat_rate,
      created_by: sales1.id,
    })
    .select("id")
    .single();
  if (directProbe.error) {
    console.log(
      JSON.stringify({
        preflight: "direct quotation insert failed",
        code: directProbe.error.code,
        message: directProbe.error.message,
      }),
    );
  } else {
    assert.ifError(
      (
        await service
          .from("activity_logs")
          .delete()
          .eq("entity_id", directProbe.data.id)
      ).error,
    );
    assert.ifError(
      (await service.from("quotations").delete().eq("id", directProbe.data.id))
        .error,
    );
    pass(
      "Sales quotation insert policy",
      "Direct row policy preflight accepted",
    );
  }
  const quotationId = await requireData(
    sales1.client.rpc("save_quotation_draft", {
      p_quotation_id: null,
      p_payload: initialPayload,
    }),
    "draft quotation",
  );
  created.quotationIds.push(quotationId);

  const quote = await requireData(
    sales1.client.from("quotations").select("*").eq("id", quotationId).single(),
    "quotation snapshot",
  );
  assert.match(quote.quotation_number, /^UP-Q-\d{4}-\d{6}$/);
  assert.equal(quote.customer_id, context.customer.id);
  assert.equal(quote.enquiry_id, context.enquiry.id);
  assert.equal(quote.site_visit_id, context.visit.id);
  assert.equal(quote.owner_id, sales1.id);
  assert.equal(quote.subtotal, 3200.9);
  assert.equal(quote.discount_amount, 240.07);
  assert.equal(quote.vat_amount, 111.02);
  assert.equal(quote.total, 3071.85);

  const initialItems = await requireData(
    sales1.client
      .from("quotation_items")
      .select(
        "product_id, product_name_snapshot, product_code_snapshot, source_measurement_id, item_name, line_total, taxable",
      )
      .eq("quotation_id", quotationId)
      .order("sort_order"),
    "quotation items",
  );
  assert.equal(initialItems.length, 2);
  assert.equal(initialItems[0].product_id, context.product.id);
  assert.equal(initialItems[0].product_name_snapshot, context.product.name);
  assert.equal(initialItems[0].source_measurement_id, context.measurement.id);
  assert.equal(initialItems[0].line_total, 2400.5);
  assert.equal(initialItems[1].product_id, null);
  assert.equal(initialItems[1].taxable, false);
  pass(
    "Catalogue and custom quotation draft",
    `${quote.quotation_number}; authoritative total AED ${quote.total.toFixed(2)}`,
  );

  await denied(
    anonymous.from("quotations").select("id").eq("id", quotationId),
    "Anonymous quotation read denied",
  );
  await denied(
    anonymous
      .from("quotation_items")
      .select("id")
      .eq("quotation_id", quotationId),
    "Anonymous quotation item read denied",
  );
  await denied(
    anonymous.rpc("create_quotation_revision", { p_quotation_id: quotationId }),
    "Anonymous quotation RPC denied",
  );
  assert.equal(
    (
      await requireData(
        sales2.client.from("quotations").select("id").eq("id", quotationId),
        "other Sales visibility",
      )
    ).length,
    0,
  );
  const unrelatedPayload = structuredClone(initialPayload);
  unrelatedPayload.site_visit_id = null;
  unrelatedPayload.owner_id = sales2.id;
  unrelatedPayload.items = unrelatedPayload.items.map((item) => ({
    ...item,
    source_measurement_id: null,
  }));
  const unrelatedQuotationId = await requireData(
    sales2.client.rpc("save_quotation_draft", {
      p_quotation_id: null,
      p_payload: unrelatedPayload,
    }),
    "unrelated Sales quotation",
  );
  created.quotationIds.push(unrelatedQuotationId);
  assert.equal(
    (
      await requireData(
        users
          .get("site")
          .client.from("quotations")
          .select("id")
          .eq("id", unrelatedQuotationId),
        "unrelated Site Team quotation visibility",
      )
    ).length,
    0,
  );
  assert.equal(
    (
      await requireData(
        users
          .get("site")
          .client.from("activity_logs")
          .select("id")
          .eq("entity_type", "quotations")
          .eq("entity_id", unrelatedQuotationId),
        "unrelated Site Team quotation activity visibility",
      )
    ).length,
    0,
  );
  pass(
    "Quotation activity assignment scope",
    "Site Team cannot read quotation events outside its linked site visit",
  );
  await denied(
    sales2.client
      .from("quotations")
      .update({ internal_notes: "unauthorized" })
      .eq("id", quotationId)
      .select("id"),
    "Unauthorized Sales edit denied",
  );
  assert.equal(
    (
      await requireData(
        users
          .get("site")
          .client.from("quotations")
          .select("id")
          .eq("id", quotationId),
        "linked Site Team quote summary",
      )
    ).length,
    1,
  );
  assert.equal(
    (
      await requireData(
        users
          .get("site")
          .client.from("quotation_items")
          .select("id")
          .eq("quotation_id", quotationId),
        "Site Team item restriction",
      )
    ).length,
    0,
  );
  await denied(
    users
      .get("site")
      .client.from("quotations")
      .update({ internal_notes: "site tamper" })
      .eq("id", quotationId)
      .select("id"),
    "Site Team quotation mutation denied",
  );
  assert.equal(
    (
      await requireData(
        users
          .get("accounts")
          .client.from("quotations")
          .select("id")
          .eq("id", quotationId),
        "Accounts quotation visibility",
      )
    ).length,
    1,
  );
  await denied(
    users
      .get("accounts")
      .client.from("quotations")
      .update({ internal_notes: "accounts tamper" })
      .eq("id", quotationId)
      .select("id"),
    "Accounts quotation mutation denied",
  );

  assert.ifError(
    (
      await sales1.client
        .from("quotations")
        .update({ status: "ready" })
        .eq("id", quotationId)
    ).error,
  );
  assert.ifError(
    (
      await sales1.client
        .from("quotations")
        .update({ status: "sent" })
        .eq("id", quotationId)
    ).error,
  );
  await denied(
    sales1.client
      .from("quotations")
      .update({ customer_notes: "silent overwrite" })
      .eq("id", quotationId)
      .select("id"),
    "Sent commercial edit denied",
  );
  const originalBeforeRevision = await requireData(
    service
      .from("quotations")
      .select(
        "subtotal, discount_amount, vat_amount, total, customer_notes, status, is_current",
      )
      .eq("id", quotationId)
      .single(),
    "original before revision",
  );
  const originalItemsBeforeRevision = await requireData(
    service
      .from("quotation_items")
      .select("item_name, description, quantity, unit_price, line_total")
      .eq("quotation_id", quotationId)
      .order("sort_order"),
    "original items before revision",
  );

  const revisionId = await requireData(
    sales1.client.rpc("create_quotation_revision", {
      p_quotation_id: quotationId,
    }),
    "quotation revision",
  );
  created.quotationIds.push(revisionId);
  const revision = await requireData(
    sales1.client
      .from("quotations")
      .select(
        "quotation_number, revision_number, revised_from_id, revision_group_id, status, is_current",
      )
      .eq("id", revisionId)
      .single(),
    "revision header",
  );
  assert.match(revision.quotation_number, /-R01$/);
  assert.equal(revision.revision_number, 1);
  assert.equal(revision.revised_from_id, quotationId);
  assert.equal(revision.status, "draft");
  assert.equal(revision.is_current, true);

  const revisedPayload = draftPayload(context, { long: true, fixed: true });
  assert.equal(
    await requireData(
      sales1.client.rpc("save_quotation_draft", {
        p_quotation_id: revisionId,
        p_payload: revisedPayload,
      }),
      "save revision",
    ),
    revisionId,
  );
  const revisionBeforeAtomicFailure = await requireData(
    service
      .from("quotation_items")
      .select("item_name, line_total")
      .eq("quotation_id", revisionId)
      .order("sort_order"),
    "revision items before atomic failure",
  );
  const badPayload = structuredClone(revisedPayload);
  badPayload.items[badPayload.items.length - 1].product_id = randomUUID();
  await denied(
    sales1.client.rpc("save_quotation_draft", {
      p_quotation_id: revisionId,
      p_payload: badPayload,
    }),
    "Atomic draft rollback on invalid product",
  );
  assert.deepEqual(
    await requireData(
      service
        .from("quotation_items")
        .select("item_name, line_total")
        .eq("quotation_id", revisionId)
        .order("sort_order"),
      "revision items after atomic failure",
    ),
    revisionBeforeAtomicFailure,
  );
  pass(
    "Atomic draft persistence",
    "Invalid late line item rolled back header/item replacement completely",
  );

  const originalAfterRevision = await requireData(
    service
      .from("quotations")
      .select(
        "subtotal, discount_amount, vat_amount, total, customer_notes, status, is_current",
      )
      .eq("id", quotationId)
      .single(),
    "original after revision",
  );
  const originalItemsAfterRevision = await requireData(
    service
      .from("quotation_items")
      .select("item_name, description, quantity, unit_price, line_total")
      .eq("quotation_id", quotationId)
      .order("sort_order"),
    "original items after revision",
  );
  assert.deepEqual(originalAfterRevision, {
    ...originalBeforeRevision,
    status: "revised",
    is_current: false,
  });
  assert.deepEqual(originalItemsAfterRevision, originalItemsBeforeRevision);
  pass(
    "Immutable revision history",
    "Original sent header, totals, and line-item snapshots preserved",
  );

  assert.ifError(
    (
      await sales1.client
        .from("quotations")
        .update({ status: "ready" })
        .eq("id", revisionId)
    ).error,
  );
  assert.ifError(
    (
      await sales1.client
        .from("quotations")
        .update({ status: "sent" })
        .eq("id", revisionId)
    ).error,
  );
  await denied(
    sales1.client
      .from("quotations")
      .update({ status: "approved", decision_note: "Sales bypass" })
      .eq("id", revisionId)
      .select("id"),
    "Sales approval denied",
  );
  assert.ifError(
    (
      await admin.client
        .from("quotations")
        .update({
          status: "approved",
          decision_note: "Approved in hosted Phase 2D QA",
        })
        .eq("id", revisionId)
    ).error,
  );
  const approved = await requireData(
    service
      .from("quotations")
      .select("status, approved_at, approved_by, total, is_current")
      .eq("id", revisionId)
      .single(),
    "approved revision",
  );
  assert.equal(approved.status, "approved");
  assert(approved.approved_at);
  assert.equal(approved.approved_by, admin.id);
  assert.equal(approved.is_current, true);
  await denied(
    admin.client
      .from("quotations")
      .update({ status: "approved" })
      .eq("id", quotationId)
      .select("id"),
    "Old revision approval denied",
  );
  await denied(
    admin.client
      .from("quotation_items")
      .update({ unit_price: 1 })
      .eq("quotation_id", revisionId)
      .select("id"),
    "Approved item mutation denied",
  );
  await denied(
    admin.client
      .from("quotations")
      .update({ discount_value: 0 })
      .eq("id", revisionId)
      .select("id"),
    "Approved commercial mutation denied",
  );
  pass(
    "Management approval",
    `Actor and timestamp captured for approved revision total AED ${approved.total.toFixed(2)}`,
  );

  const projectId = await requireData(
    admin.client.rpc("convert_approved_quotation_to_project", {
      p_quotation_id: revisionId,
    }),
    "project conversion",
  );
  created.projectIds.push(projectId);
  const project = await requireData(
    service.from("projects").select("*").eq("id", projectId).single(),
    "converted project",
  );
  assert.match(project.project_number, /^UP-P-\d{4}-\d{6}$/);
  assert.equal(project.customer_id, context.customer.id);
  assert.equal(project.enquiry_id, context.enquiry.id);
  assert.equal(project.site_visit_id, context.visit.id);
  assert.equal(project.quotation_id, revisionId);
  assert.equal(project.project_value, approved.total);
  assert.equal(project.assigned_salesperson, sales1.id);
  assert.equal(project.source_quotation_number, revision.quotation_number);
  assert.equal(project.source_quotation_revision, 1);
  await denied(
    admin.client.rpc("convert_approved_quotation_to_project", {
      p_quotation_id: revisionId,
    }),
    "Duplicate project conversion denied",
  );
  pass(
    "Minimal project handoff",
    `${project.project_number} created once with complete source links and value`,
  );

  const events = await requireData(
    service
      .from("activity_logs")
      .select("event_type")
      .eq("entity_type", "quotations")
      .in("entity_id", [quotationId, revisionId]),
    "quotation activity",
  );
  for (const expected of [
    "quotations.insert",
    "quotation.item_insert",
    "quotation.revision_created",
    "quotation.project_converted",
  ]) {
    assert(
      events.some((row) => row.event_type === expected),
      `missing activity event ${expected}`,
    );
  }
  pass(
    "Quotation activity trail",
    "Create, item, status, revision, and conversion events recorded",
  );
  return { quotationId, revisionId, projectId, quote, revision, approved };
}

async function cleanup() {
  async function clean(promise, label) {
    const result = await promise;
    assert.ifError(result.error, label);
  }
  const activityEntityIds = [
    ...created.quotationIds,
    ...created.projectIds,
    ...created.visitIds,
    ...created.enquiryIds,
    ...created.customerIds,
  ];
  if (activityEntityIds.length)
    await clean(
      service.from("activity_logs").delete().in("entity_id", activityEntityIds),
      "activity cleanup",
    );
  if (created.projectIds.length)
    await clean(
      service.from("projects").delete().in("id", created.projectIds),
      "project cleanup",
    );
  if (created.quotationIds.length)
    await clean(
      service.from("quotations").delete().in("id", created.quotationIds),
      "quotation cleanup",
    );
  if (created.visitIds.length)
    await clean(
      service.from("site_visits").delete().in("id", created.visitIds),
      "visit cleanup",
    );
  if (created.enquiryIds.length)
    await clean(
      service.from("enquiries").delete().in("id", created.enquiryIds),
      "enquiry cleanup",
    );
  if (created.customerIds.length)
    await clean(
      service.from("customers").delete().in("id", created.customerIds),
      "customer cleanup",
    );
  if (created.productIds.length)
    await clean(
      service.from("products").delete().in("id", created.productIds),
      "product cleanup",
    );
  if (created.categoryIds.length)
    await clean(
      service.from("product_categories").delete().in("id", created.categoryIds),
      "category cleanup",
    );
  for (const user of users.values()) {
    await user.client.auth.signOut();
    assert.ifError((await service.auth.admin.deleteUser(user.id)).error);
  }
}

async function cleanupRetainedRun(retainedRunId) {
  const customers = await requireData(
    service
      .from("customers")
      .select("id")
      .eq("name", `QA Quotation Customer ${retainedRunId}`),
    "retained customer",
  );
  const customerIds = customers.map((row) => row.id);
  const quotes = customerIds.length
    ? await requireData(
        service.from("quotations").select("id").in("customer_id", customerIds),
        "retained quotes",
      )
    : [];
  const quoteIds = quotes.map((row) => row.id);
  const projects = customerIds.length
    ? await requireData(
        service.from("projects").select("id").in("customer_id", customerIds),
        "retained projects",
      )
    : [];
  const projectIds = projects.map((row) => row.id);
  const visits = customerIds.length
    ? await requireData(
        service.from("site_visits").select("id").in("customer_id", customerIds),
        "retained visits",
      )
    : [];
  const visitIds = visits.map((row) => row.id);
  const enquiries = customerIds.length
    ? await requireData(
        service.from("enquiries").select("id").in("customer_id", customerIds),
        "retained enquiries",
      )
    : [];
  const enquiryIds = enquiries.map((row) => row.id);
  const allIds = [
    ...quoteIds,
    ...projectIds,
    ...visitIds,
    ...enquiryIds,
    ...customerIds,
  ];
  if (allIds.length)
    assert.ifError(
      (await service.from("activity_logs").delete().in("entity_id", allIds))
        .error,
    );
  if (projectIds.length)
    assert.ifError(
      (await service.from("projects").delete().in("id", projectIds)).error,
    );
  if (quoteIds.length)
    assert.ifError(
      (await service.from("quotations").delete().in("id", quoteIds)).error,
    );
  if (visitIds.length)
    assert.ifError(
      (await service.from("site_visits").delete().in("id", visitIds)).error,
    );
  if (enquiryIds.length)
    assert.ifError(
      (await service.from("enquiries").delete().in("id", enquiryIds)).error,
    );
  if (customerIds.length)
    assert.ifError(
      (await service.from("customers").delete().in("id", customerIds)).error,
    );
  const temporaryProducts = await requireData(
    service
      .from("products")
      .select("id, category_id")
      .eq("slug", `qa-motorised-louvered-pergola-${retainedRunId}`),
    "retained temporary products",
  );
  const temporaryProductIds = temporaryProducts.map((row) => row.id);
  const temporaryCategoryIds = temporaryProducts
    .map((row) => row.category_id)
    .filter(Boolean);
  if (temporaryProductIds.length)
    assert.ifError(
      (await service.from("products").delete().in("id", temporaryProductIds))
        .error,
    );
  if (temporaryCategoryIds.length)
    assert.ifError(
      (
        await service
          .from("product_categories")
          .delete()
          .in("id", temporaryCategoryIds)
      ).error,
    );
  const auth = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  assert.ifError(auth.error);
  const retainedUsers = auth.data.users.filter((user) =>
    user.email?.includes(`qa-phase2d-${retainedRunId}-`),
  );
  for (const user of retainedUsers)
    assert.ifError((await service.auth.admin.deleteUser(user.id)).error);
  const remaining = await service
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("name", `QA Quotation Customer ${retainedRunId}`);
  assert.ifError(remaining.error);
  assert.equal(remaining.count, 0);
  console.log(
    JSON.stringify({
      cleanup: "complete",
      runId: retainedRunId,
      quotations: quoteIds.length,
      projects: projectIds.length,
      users: retainedUsers.length,
      verified: true,
    }),
  );
}

if (process.env.CLEAN_QA_RUN) {
  await cleanupRetainedRun(process.env.CLEAN_QA_RUN);
  process.exit(0);
}

let keepFixture = false;
try {
  await provisionUsers();
  const context = await createSourceContext();
  const lifecycle = await quotationLifecycle(context);
  const fixture = {
    status: "fixture-ready",
    runId,
    password,
    adminEmail: users.get("admin").email,
    salesEmail: users.get("sales1").email,
    accountsEmail: users.get("accounts").email,
    quotationId: lifecycle.revisionId,
    originalQuotationId: lifecycle.quotationId,
    projectId: lifecycle.projectId,
    quotationNumber: lifecycle.revision.quotation_number,
    expectedTotal: lifecycle.approved.total,
    checks,
  };
  if (process.env.KEEP_QA_FIXTURE === "1") {
    keepFixture = true;
    await mkdir(".qa-runtime", { recursive: true });
    await writeFile(
      ".qa-runtime/phase2d-fixture.json",
      `${JSON.stringify(fixture, null, 2)}\n`,
      { mode: 0o600 },
    );
    console.log(JSON.stringify(fixture, null, 2));
  } else {
    console.log(JSON.stringify({ status: "passed", runId, checks }, null, 2));
  }
} finally {
  if (!keepFixture) {
    await cleanup();
    console.log(
      JSON.stringify({ cleanup: "complete and independently verified" }),
    );
  }
}
