import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Phase 2L adds attribution and reminders without replacing private site photos", () => {
  const migration = readFileSync("supabase/migrations/20260919090000_phase_2l_lead_sources_and_reminders.sql", "utf8");
  const photoMedia = readFileSync("src/lib/site-visits/media.ts", "utf8");
  assert.match(migration, /add column if not exists lead_source/i);
  assert.match(migration, /add column if not exists reminder_type/i);
  assert.match(migration, /tasks_reminder_activity/i);
  assert.match(photoMedia, /SITE_PHOTO_BUCKET = "site-visit-photos"/);
  assert.doesNotMatch(migration, /create table public\.site_visit_photos|insert into storage\.buckets/i);
});

test("Phase 2L reminder actions re-authorize every mutation", () => {
  const source = readFileSync("src/app/dashboard/tasks/actions.ts", "utf8");
  for (const name of ["createReminderAction", "completeReminderAction", "rescheduleReminderAction"]) {
    const section = source.slice(source.indexOf(`function ${name}`), source.indexOf("\nexport async function", source.indexOf(`function ${name}`) + 10) || undefined);
    assert.match(section, /requireRole\(\["admin", "sales"\]\)/);
  }
});
