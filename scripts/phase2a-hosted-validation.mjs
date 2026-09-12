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
const uploaded = { "product-images": [], "category-images": [] };
let categoryId;
let productId;
let completed = false;

const checks = [];
function pass(name, evidence = "pass") {
  checks.push({ name, evidence });
}

function clientForKey(key) {
  return createClient(url, key, options);
}

async function requireData(query, label) {
  const { data, error } = await query;
  assert.ifError(error);
  assert(data !== null, `${label}: expected data`);
  return data;
}

async function requireDenied(query, label) {
  const { data, error } = await query;
  assert(error || (Array.isArray(data) && data.length === 0), `${label}: operation unexpectedly succeeded`);
  pass(label, error?.code || error?.message || "zero rows affected");
}

async function visibleProduct(client, slug) {
  return requireData(client.from("products").select("id, name, short_description, is_published").eq("slug", slug), "visible product query");
}

async function createQaUsers() {
  for (const role of roles) {
    const email = `qa-phase2a-${runId}-${role}@example.com`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `QA ${role}` },
    });
    assert.ifError(error);
    assert(data.user, `Auth user was not created for ${role}`);
    users.set(role, { id: data.user.id, email });

    const { error: profileError } = await service
      .from("profiles")
      .update({ role, status: "active" })
      .eq("id", data.user.id);
    assert.ifError(profileError);
  }
  pass("QA users and linked profiles", "four disposable roles created");
}

async function signInQaUsers() {
  for (const role of roles) {
    const record = users.get(role);
    const client = clientForKey(publishableKey);
    const { data, error } = await client.auth.signInWithPassword({ email: record.email, password });
    assert.ifError(error);
    assert(data.session && data.user?.id === record.id, `${role}: login failed`);
    record.client = client;

    const profile = await requireData(
      client.from("profiles").select("id, role, status").eq("id", record.id).single(),
      `${role} profile`,
    );
    assert.equal(profile.role, role);
    assert.equal(profile.status, "active");
  }

  const admin = users.get("admin");
  const { data: refresh, error: refreshError } = await admin.client.auth.refreshSession();
  assert.ifError(refreshError);
  assert(refresh.session, "management refresh did not return a session");

  const logoutClient = clientForKey(publishableKey);
  assert.ifError((await logoutClient.auth.signInWithPassword({ email: admin.email, password })).error);
  assert.ifError((await logoutClient.auth.signOut()).error);
  assert.equal((await logoutClient.auth.getSession()).data.session, null);

  const missing = clientForKey(publishableKey);
  assert.equal((await missing.auth.getSession()).data.session, null);
  const invalid = await missing.auth.getUser("invalid.jwt.value");
  assert(invalid.error && !invalid.data.user, "invalid access token was unexpectedly accepted");
  pass("Auth login, refresh, logout, missing and invalid sessions");
}

async function testRoleBoundaries() {
  const admin = users.get("admin");
  const sales = users.get("sales");
  const site = users.get("site_team");
  const accounts = users.get("accounts");

  const operational = await anonymous.from("customers").select("id").limit(1);
  assert(operational.error, "anonymous operational-table access was unexpectedly allowed");
  pass("Anonymous operational tables denied", operational.error.code || operational.error.message);

  categoryId = randomUUID();
  const slug = `qa-category-${runId}`;
  const category = await requireData(
    admin.client
      .from("product_categories")
      .insert({
        id: categoryId,
        name: `QA Category ${runId}`,
        slug,
        description: "Initial QA description",
        long_description: "Hosted acceptance category",
        is_active: true,
        sort_order: 9000,
        seo_title: "QA category",
        seo_description: "Disposable hosted validation record",
        created_by: admin.id,
      })
      .select("id, slug")
      .single(),
    "management category create",
  );
  assert.equal(category.id, categoryId);

  await requireDenied(
    sales.client.from("product_categories").insert({ name: "Blocked Sales Category", slug: `blocked-sales-${runId}` }),
    "Sales category mutation denied",
  );
  await requireDenied(
    site.client.from("product_categories").insert({ name: "Blocked Site Category", slug: `blocked-site-${runId}` }),
    "Site Team category mutation denied",
  );
  await requireDenied(
    accounts.client.from("product_categories").insert({ name: "Blocked Accounts Category", slug: `blocked-accounts-${runId}` }),
    "Accounts category mutation denied",
  );
  await requireDenied(
    anonymous.from("product_categories").insert({ name: "Blocked Anonymous Category", slug: `blocked-anon-${runId}` }),
    "Anonymous catalogue mutation denied",
  );

  const staffRead = await requireData(sales.client.from("product_categories").select("id").eq("id", categoryId), "sales read category");
  assert.equal(staffRead.length, 1);
  pass("Implemented staff catalogue read policy");

  await requireData(admin.client.from("product_categories").update({ description: "Edited QA description" }).eq("id", categoryId).select("id"), "category edit");
  await requireData(admin.client.from("product_categories").update({ sort_order: 9001 }).eq("id", categoryId).select("id"), "category reorder");
  await requireData(admin.client.from("product_categories").update({ is_active: false }).eq("id", categoryId).select("id"), "category deactivate");
  await requireData(admin.client.from("product_categories").update({ is_active: true }).eq("id", categoryId).select("id"), "category reactivate");

  const duplicate = await admin.client.from("product_categories").insert({ name: "Duplicate", slug });
  assert.equal(duplicate.error?.code, "23505");
  pass("Duplicate category slug rejected", duplicate.error.code);

  const inactiveUpdate = await service.from("profiles").update({ status: "inactive" }).eq("id", site.id);
  assert.ifError(inactiveUpdate.error);
  const inactiveRead = await site.client.from("product_categories").select("id").eq("id", categoryId);
  assert.ifError(inactiveRead.error);
  assert.equal(inactiveRead.data.length, 0, "inactive profile retained staff catalogue access");
  assert.ifError((await service.from("profiles").update({ status: "active" }).eq("id", site.id)).error);
  pass("Inactive profile loses role-backed data access");
}

async function createAndValidateProduct() {
  const admin = users.get("admin");
  const sales = users.get("sales");
  const site = users.get("site_team");
  const accounts = users.get("accounts");
  const slug = `qa-product-${runId}`;
  productId = randomUUID();

  const product = await requireData(
    admin.client
      .from("products")
      .insert({
        id: productId,
        category_id: categoryId,
        name: `QA Product ${runId}`,
        slug,
        product_code: `QA-${runId}`,
        short_description: "Unpublished hosted QA product",
        full_description: "Disposable product used to prove catalogue synchronization.",
        specifications: { Finish: "Powder coated", Operation: "Motorized" },
        material: "Aluminium",
        colour_information: "Charcoal",
        dimensions_information: "4 m × 4 m",
        pricing_mode: "hidden",
        price: null,
        currency: "AED",
        is_featured: false,
        is_published: false,
        sort_order: 9000,
        seo_title: "QA product",
        seo_description: "Disposable hosted validation product",
        created_by: admin.id,
      })
      .select("id, slug")
      .single(),
    "management product create",
  );
  assert.equal(product.id, productId);

  await requireDenied(
    sales.client.from("products").insert({ category_id: categoryId, name: "Blocked Sales Product", slug: `blocked-sales-product-${runId}` }),
    "Sales product mutation denied",
  );
  await requireDenied(
    site.client.from("products").insert({ category_id: categoryId, name: "Blocked Site Product", slug: `blocked-site-product-${runId}` }),
    "Site Team product mutation denied",
  );
  await requireDenied(
    accounts.client.from("products").insert({ category_id: categoryId, name: "Blocked Accounts Product", slug: `blocked-accounts-product-${runId}` }),
    "Accounts product mutation denied",
  );

  const missingCategory = await admin.client.from("products").insert({ name: "Missing category", slug: `missing-category-${runId}` });
  assert.equal(missingCategory.error?.code, "23502");
  pass("Missing product category rejected", missingCategory.error.code);

  const invalidPrice = await admin.client.from("products").insert({
    category_id: categoryId,
    name: "Invalid price",
    slug: `invalid-price-${runId}`,
    pricing_mode: "fixed_price",
    price: null,
  });
  assert.equal(invalidPrice.error?.code, "23514");
  pass("Invalid pricing combination rejected", invalidPrice.error.code);

  for (const [pricing_mode, price] of [
    ["price_on_request", null],
    ["starting_price", 12500],
    ["fixed_price", 18000],
    ["hidden", null],
  ]) {
    const updated = await admin.client.from("products").update({ pricing_mode, price }).eq("id", productId).select("id");
    assert.ifError(updated.error);
    assert.equal(updated.data.length, 1);
  }
  pass("All four pricing modes persisted");

  return { slug };
}

async function testStorage() {
  const admin = users.get("admin");
  const sales = users.get("sales");
  const imageIds = { jpeg: randomUUID(), png: randomUUID(), webp: randomUUID() };
  const paths = {
    jpeg: `${productId}/${imageIds.jpeg}.jpg`,
    png: `${productId}/${imageIds.png}.png`,
    webp: `${productId}/${imageIds.webp}.webp`,
  };
  const payloads = {
    jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    png: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
    webp: Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/vuUAAA=", "base64"),
  };

  for (const [kind, path] of Object.entries(paths)) {
    const result = await admin.client.storage.from("product-images").upload(path, payloads[kind], {
      contentType: `image/${kind === "jpg" ? "jpeg" : kind}`,
      upsert: false,
    });
    assert.ifError(result.error);
    uploaded["product-images"].push(path);
  }
  pass("JPEG, PNG and WebP uploads");

  const rows = Object.entries(paths).map(([kind, storage_path], index) => ({
    id: imageIds[kind],
    product_id: productId,
    storage_path,
    alt_text: `QA ${kind} image`,
    is_primary: index === 0,
    sort_order: index,
    created_by: admin.id,
  }));
  assert.ifError((await admin.client.from("product_images").insert(rows)).error);

  const invalidMimePath = `${productId}/${randomUUID()}.gif`;
  const invalidMime = await admin.client.storage.from("product-images").upload(invalidMimePath, Buffer.from("gif"), { contentType: "image/gif" });
  assert(invalidMime.error, "invalid MIME upload unexpectedly succeeded");
  pass("Invalid MIME rejected", invalidMime.error.message);

  const invalidPath = await admin.client.storage.from("product-images").upload("original-file.jpg", payloads.jpeg, { contentType: "image/jpeg" });
  assert(invalidPath.error, "invalid media path unexpectedly succeeded");
  pass("Invalid UUID path rejected", invalidPath.error.message);

  const orphanPath = `${randomUUID()}/${randomUUID()}.jpg`;
  const orphan = await admin.client.storage.from("product-images").upload(orphanPath, payloads.jpeg, { contentType: "image/jpeg" });
  assert(orphan.error, "orphan media upload unexpectedly succeeded");
  pass("Orphan media path rejected", orphan.error.message);

  const oversizedPath = `${productId}/${randomUUID()}.jpg`;
  const oversized = await admin.client.storage.from("product-images").upload(oversizedPath, Buffer.alloc(10485761), { contentType: "image/jpeg" });
  assert(oversized.error, "oversized image unexpectedly succeeded");
  pass("Image over 10 MB rejected", oversized.error.message);

  const salesPath = `${productId}/${randomUUID()}.jpg`;
  const salesUpload = await sales.client.storage.from("product-images").upload(salesPath, payloads.jpeg, { contentType: "image/jpeg" });
  assert(salesUpload.error, "unauthorized Storage upload unexpectedly succeeded");
  pass("Unauthorized Storage upload denied", salesUpload.error.message);

  const salesDelete = await sales.client.storage.from("product-images").remove([paths.jpeg]);
  assert(salesDelete.error || salesDelete.data.length === 0, "unauthorized Storage delete unexpectedly removed data");
  pass("Unauthorized Storage delete denied", salesDelete.error?.message || "zero objects removed");

  const draftSigned = await anonymous.storage.from("product-images").createSignedUrl(paths.jpeg, 60);
  assert(draftSigned.error || !draftSigned.data?.signedUrl, "draft media received an anonymous signed URL");
  pass("Draft media signed URL denied", draftSigned.error?.message || "no signed URL");

  const categoryImagePath = `${categoryId}/${randomUUID()}.png`;
  const categoryUpload = await admin.client.storage.from("category-images").upload(categoryImagePath, payloads.png, { contentType: "image/png" });
  assert.ifError(categoryUpload.error);
  uploaded["category-images"].push(categoryImagePath);
  assert.ifError((await admin.client.from("product_categories").update({ image_storage_path: categoryImagePath, image_alt_text: "QA category" }).eq("id", categoryId)).error);
  pass("Category media upload and metadata link");

  return { paths, imageIds };
}

async function testCatalogueSync(slug, paths, imageIds) {
  const admin = users.get("admin");

  assert.equal((await visibleProduct(anonymous, slug)).length, 0);
  assert.equal((await anonymous.from("product_images").select("id").eq("product_id", productId)).data?.length, 0);
  pass("Draft absent from anonymous list, detail and media metadata");

  const published = await admin.client.from("products").update({ is_published: true, published_at: new Date().toISOString() }).eq("id", productId).select("id");
  assert.ifError(published.error);
  assert.equal(published.data.length, 1);
  const publicAfterPublish = await visibleProduct(anonymous, slug);
  assert.equal(publicAfterPublish.length, 1);
  assert.equal(publicAfterPublish[0].id, productId);
  assert.equal((await requireData(anonymous.from("product_categories").select("id").eq("id", categoryId), "public category after publish")).length, 1);
  assert.equal((await requireData(anonymous.from("product_images").select("id").eq("product_id", productId), "public images after publish")).length, 3);

  const signed = await anonymous.storage.from("product-images").createSignedUrl(paths.jpeg, 60);
  assert.ifError(signed.error);
  assert(signed.data?.signedUrl);
  const imageResponse = await fetch(signed.data.signedUrl);
  assert.equal(imageResponse.status, 200);
  pass("Published media signed URL and download", "HTTP 200");

  const editedName = `QA Product Edited ${runId}`;
  const edited = await admin.client
    .from("products")
    .update({ name: editedName, short_description: "Edited public description", is_featured: true })
    .eq("id", productId)
    .select("id");
  assert.ifError(edited.error);
  assert.equal(edited.data.length, 1);

  assert.ifError((await admin.client.from("product_images").update({ is_primary: false }).eq("id", imageIds.jpeg)).error);
  assert.ifError((await admin.client.from("product_images").update({ is_primary: true, sort_order: 0, alt_text: "Updated cover" }).eq("id", imageIds.webp)).error);
  const editedPublic = await visibleProduct(anonymous, slug);
  assert.equal(editedPublic[0].id, productId);
  assert.equal(editedPublic[0].name, editedName);
  assert.equal(editedPublic[0].short_description, "Edited public description");
  pass("Public catalogue reflects edits and same database record", productId);

  assert.ifError((await admin.client.from("product_categories").update({ is_active: false }).eq("id", categoryId)).error);
  assert.equal((await visibleProduct(anonymous, slug)).length, 0);
  assert.ifError((await admin.client.from("product_categories").update({ is_active: true }).eq("id", categoryId)).error);
  assert.equal((await visibleProduct(anonymous, slug)).length, 1);
  pass("Category deactivate/reactivate synchronizes public visibility");

  assert.ifError((await admin.client.from("products").update({ is_published: false, published_at: null }).eq("id", productId)).error);
  assert.equal((await visibleProduct(anonymous, slug)).length, 0);
  pass("Unpublish synchronizes public visibility");

  assert.ifError((await admin.client.from("products").update({ archived_at: new Date().toISOString() }).eq("id", productId)).error);
  assert.ifError((await admin.client.from("product_categories").update({ archived_at: new Date().toISOString() }).eq("id", categoryId)).error);
}

async function testActivityLog() {
  const admin = users.get("admin");
  const events = await requireData(
    admin.client
      .from("activity_logs")
      .select("actor_id, event_type, entity_id")
      .in("entity_id", [categoryId, productId]),
    "catalogue activity log",
  );
  const names = new Set(events.map((event) => event.event_type));
  for (const expected of [
    "category.created",
    "category.updated",
    "category.deactivated",
    "category.activated",
    "category.archived",
    "product.created",
    "product.updated",
    "product.published",
    "product.unpublished",
    "product.archived",
  ]) {
    assert(names.has(expected), `missing activity event ${expected}`);
  }
  assert(events.every((event) => event.actor_id === admin.id), "catalogue activity actor was not the management user");
  pass("Catalogue activity events and actor identity", `${events.length} events`);
}

async function cleanup() {
  for (const [bucket, paths] of Object.entries(uploaded)) {
    if (paths.length) await service.storage.from(bucket).remove(paths);
  }
  if (productId) {
    await service.from("product_images").delete().eq("product_id", productId);
    await service.from("activity_logs").delete().eq("entity_id", productId);
    await service.from("products").delete().eq("id", productId);
    await service.from("activity_logs").delete().eq("entity_id", productId);
  }
  if (categoryId) {
    await service.from("activity_logs").delete().eq("entity_id", categoryId);
    await service.from("product_categories").delete().eq("id", categoryId);
    await service.from("activity_logs").delete().eq("entity_id", categoryId);
  }
  for (const record of users.values()) {
    if (record.client) await record.client.auth.signOut();
    await service.auth.admin.deleteUser(record.id);
  }
}

try {
  await createQaUsers();
  await signInQaUsers();
  await testRoleBoundaries();
  const { slug } = await createAndValidateProduct();
  const { paths, imageIds } = await testStorage();
  await testCatalogueSync(slug, paths, imageIds);
  await testActivityLog();
  completed = true;
} finally {
  await cleanup();
}

assert(completed, "hosted validation did not complete");
console.log(JSON.stringify({ project: new URL(url).hostname.split(".")[0], checks, cleanup: "complete" }, null, 2));
