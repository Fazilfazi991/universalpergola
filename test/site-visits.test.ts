import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { SITE_VISIT_TRANSITIONS } from "../src/lib/site-visits/constants.ts";
import { isValidSitePhotoPath, MAX_SITE_PHOTO_BYTES, validateSitePhoto } from "../src/lib/site-visits/media.ts";
import { measurementSchema, photoMetadataSchema, siteVisitCreateSchema } from "../src/lib/site-visits/validation.ts";

const visitId = "7d48a004-a6a4-4be2-b46a-0d42fd7ac4aa";
const photoId = "8d48a004-a6a4-4be2-b46a-0d42fd7ac4bb";

test("site visit validation requires a customer, schedule, and useful site address", () => {
  const result = siteVisitCreateSchema.safeParse({ customer_id: visitId, enquiry_id: "", assigned_to: "", scheduled_at: "2026-09-14T09:00", site_address: "Dubai Hills villa 42", area: "Dubai Hills", emirate: "Dubai", location_url: "https://maps.google.com/?q=25,55", contact_person: "Amina", contact_phone: "+971 50 123 4567", notes: "Gate access confirmed", next_action: "", next_action_at: "" });
  assert.equal(result.success, true);
  assert.equal(siteVisitCreateSchema.safeParse({}).success, false);
});

test("structured measurements require at least one positive dimension", () => {
  assert.equal(measurementSchema.safeParse({ label: "Pergola opening", width: "5200", height: "2800", length: "", unit: "mm", quantity: "1", notes: "Finished wall to wall", sort_order: "10" }).success, true);
  assert.equal(measurementSchema.safeParse({ label: "Pergola opening", width: "", height: "", length: "", unit: "mm", quantity: "1", notes: "", sort_order: "10" }).success, false);
  assert.equal(measurementSchema.safeParse({ label: "Pergola opening", width: "-1", height: "", length: "", unit: "mm", quantity: "1", notes: "", sort_order: "10" }).success, false);
});

test("visit status workflow does not reopen terminal records", () => {
  assert.deepEqual(SITE_VISIT_TRANSITIONS.scheduled, ["confirmed", "rescheduled", "cancelled", "no_show"]);
  assert.deepEqual(SITE_VISIT_TRANSITIONS.completed, []);
  assert.deepEqual(SITE_VISIT_TRANSITIONS.cancelled, []);
});

test("photo validation enforces MIME, size, and visit-scoped UUID paths", () => {
  assert.equal(validateSitePhoto({ type: "image/webp", size: 1024 }), null);
  assert.match(validateSitePhoto({ type: "image/svg+xml", size: 1024 }) || "", /JPEG/);
  assert.match(validateSitePhoto({ type: "image/jpeg", size: MAX_SITE_PHOTO_BYTES + 1 }) || "", /10 MB/);
  const path = `${visitId}/${photoId}.jpg`;
  assert.equal(isValidSitePhotoPath(path, visitId), true);
  assert.equal(isValidSitePhotoPath(path, photoId), false);
  assert.equal(photoMetadataSchema.safeParse({ site_visit_id: visitId, storage_path: path, caption: "Front elevation", photo_type: "Existing condition", mime_type: "image/jpeg", file_size: 2048, sort_order: 10 }).success, true);
});

test("Phase 2C migration keeps visit records and private photos role-scoped", () => {
  const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "20260913062913_phase_2c_site_visit_workflow.sql"), "utf8");
  assert.match(migration, /create table public\.site_visit_measurements/i);
  assert.match(migration, /create table public\.site_visit_activities/i);
  assert.match(migration, /private\.can_access_site_visit/i);
  assert.match(migration, /v\.assigned_to = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /bucket_id = 'site-visit-photos'/i);
  assert.match(migration, /authorized staff views registered site photos/i);
  assert.match(migration, /image\/jpeg[\s\S]*image\/png[\s\S]*image\/webp/i);
  assert.doesNotMatch(migration, /grant (?:select|insert|update|delete)[^;]+site_visits[^;]+to anon/i);
});

test("orphan cleanup permits only management or an assigned Site Team owner", () => {
  const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "20260913064827_phase_2c_site_photo_orphan_cleanup.sql"), "utf8");
  assert.match(migration, /owner_id = \(select auth\.uid\(\)::text\)/i);
  assert.match(migration, /v\.assigned_to = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /private\.has_role\(array\['admin'/i);
});

test("final photo deletion requires a registered authorized photo row", () => {
  const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "20260913071601_phase_2c_finalize_registered_photo_deletion.sql"), "utf8");
  assert.match(migration, /exists[\s\S]+site_visit_photos/i);
  assert.match(migration, /p\.storage_path = storage\.objects\.name/i);
  assert.match(migration, /private\.can_access_site_visit/i);
});

test("every Phase 2C Server Action re-authorizes its mutation", () => {
  const source = readFileSync(join(process.cwd(), "src", "app", "dashboard", "site-visits", "actions.ts"), "utf8");
  const exportedActions = [...source.matchAll(/export async function (\w+Action)\([^]*?(?=\nexport async function|$)/g)];
  assert(exportedActions.length >= 10);
  for (const match of exportedActions) assert.match(match[0], /require(?:Role|Management)\(/, `${match[1]} lacks authorization`);
});
