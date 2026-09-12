import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createMediaPath, isValidMediaPath, MAX_IMAGE_BYTES, validateImageFile } from "../src/lib/catalogue/media.ts";
import { presentPrice } from "../src/lib/catalogue/presentation.ts";
import { categorySchema, productSchema, slugify } from "../src/lib/catalogue/validation.ts";

const productInput = {
  name: "Louvered Pergola", slug: "louvered-pergola", product_code: "UP-01",
  category_id: "550e8400-e29b-41d4-a716-446655440000", short_description: "", full_description: "",
  material: "Aluminium", colour_information: "", dimensions_information: "", specifications: "{\"Finish\":\"Powder coated\"}",
  pricing_mode: "price_on_request", price: "", is_featured: false, is_published: false,
  sort_order: "10", seo_title: "", seo_description: "",
};

test("slugify creates a safe catalogue slug", () => {
  assert.equal(slugify("  Café Shade / 4×4  "), "cafe-shade-4-4");
});

test("category validation rejects unsafe slugs", () => {
  const result = categorySchema.safeParse({ name: "Pergolas", slug: "Pergolas / UAE", description: "", long_description: "", image_alt_text: "", is_active: true, sort_order: 0, seo_title: "", seo_description: "" });
  assert.equal(result.success, false);
});

test("pricing validation requires an amount only for numeric pricing modes", () => {
  assert.equal(productSchema.safeParse(productInput).success, true);
  assert.equal(productSchema.safeParse({ ...productInput, pricing_mode: "fixed_price" }).success, false);
  assert.equal(productSchema.safeParse({ ...productInput, pricing_mode: "starting_price", price: "2500" }).success, true);
});

test("specifications are converted to a staff-safe string record", () => {
  const result = productSchema.parse(productInput);
  assert.deepEqual(result.specifications, { Finish: "Powder coated" });
});

test("product media validation and UUID paths are deterministic in shape", () => {
  assert.equal(validateImageFile({ type: "image/webp", size: MAX_IMAGE_BYTES }), null);
  assert.match(validateImageFile({ type: "image/svg+xml", size: 100 }) || "", /JPEG, PNG, or WebP/);
  assert.match(validateImageFile({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 }) || "", /10 MB/);
  const path = createMediaPath("550e8400-e29b-41d4-a716-446655440000", "image/jpeg");
  assert.equal(isValidMediaPath(path), true);
  assert.equal(isValidMediaPath("drafts/original-file.jpg"), false);
});

test("public pricing presentation follows all four modes", () => {
  assert.equal(presentPrice("hidden", 500), null);
  assert.equal(presentPrice("price_on_request", null), "Price on request");
  assert.match(presentPrice("starting_price", 1250) || "", /^From AED/);
  assert.match(presentPrice("fixed_price", 1250) || "", /^AED/);
});

test("Phase 2A migration statically contains the required access boundaries", () => {
  const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "20260912191120_phase_2a_catalogue_hardening.sql"), "utf8");
  assert.match(migration, /join public\.product_categories c on c\.id = p\.category_id/);
  assert.match(migration, /c\.is_active/);
  assert.match(migration, /c\.archived_at is null/);
  assert.match(migration, /set public = false/);
  assert.match(migration, /i\.storage_path = storage\.objects\.name/);
  assert.match(migration, /storage\.foldername\(storage\.objects\.name\)/);
  assert.doesNotMatch(migration, /(?:storage_path|image_storage_path) = name/);
  for (const eventName of ["category.created", "category.activated", "category.deactivated", "category.archived", "product.created", "product.published", "product.unpublished", "product.archived"]) assert.match(migration, new RegExp(eventName.replace(".", "\\.")));
});

test("hosted validation migration aligns required category and media limits", () => {
  const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "20260912202631_phase_2a_hosted_validation_fixes.sql"), "utf8");
  assert.match(migration, /alter column category_id set not null/);
  assert.match(migration, /file_size_limit = 10485760/);
  assert.doesNotMatch(migration, /for all to authenticated/);
});

test("trusted administrative provisioning can execute the private profile guard", () => {
  const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "20260912203338_phase_2a_service_role_profile_guard.sql"), "utf8");
  assert.match(migration, /grant usage on schema private to service_role/);
  assert.match(migration, /grant execute on function private\.has_role\(public\.app_role\[\]\) to service_role/);
});

test("every catalogue mutation module invokes the management guard", () => {
  for (const path of [join("src", "app", "dashboard", "categories", "actions.ts"), join("src", "app", "dashboard", "products", "actions.ts")]) {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    const exportedActions = source.match(/export async function /g) || [];
    const guards = source.match(/await requireManagement\(\)/g) || [];
    assert.equal(guards.length, exportedActions.length, `${path} must guard every exported action`);
  }
});

test("client code never references a service-role key", () => {
  const sources = [
    readFileSync(join(process.cwd(), "src", "lib", "supabase", "client.ts"), "utf8"),
    readFileSync(join(process.cwd(), ".env.example"), "utf8"),
  ].join("\n");
  assert.doesNotMatch(sources, /service[_-]?role/i);
});
