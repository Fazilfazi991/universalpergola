import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { checklistSchema, publicFeedbackSchema, staffFeedbackSchema } from "../src/lib/feedback/validation.ts";
import { projectActivityLabel } from "../src/lib/projects/presentation.ts";
import { resolveReportRange } from "../src/lib/reports/ranges.ts";

const projectId = "11111111-1111-4111-8111-111111111111";
const token = "22222222-2222-4222-8222-222222222222";

test("feedback validation constrains rating, token, text, and honeypot input", () => {
  assert.equal(publicFeedbackSchema.safeParse({ token, rating: 5, comment: "Excellent handover", permission: true, website: "" }).success, true);
  assert.equal(publicFeedbackSchema.safeParse({ token, rating: 6, comment: "", permission: false, website: "" }).success, false);
  assert.equal(publicFeedbackSchema.safeParse({ token: "guess", rating: 4, comment: "", permission: false, website: "" }).success, false);
  assert.equal(staffFeedbackSchema.safeParse({ project_id: projectId, rating: 4, comment: "Helpful team", source: "phone", permission: false, internal_notes: "Called customer" }).success, true);
});

test("completion checklist is fixed, lightweight, and note bounded", () => {
  assert.equal(checklistSchema.safeParse({ project_id: projectId, key: "site_cleaned", completed: true, note: "Signed off" }).success, true);
  assert.equal(checklistSchema.safeParse({ project_id: projectId, key: "invented_item", completed: true, note: "" }).success, false);
  assert.equal(checklistSchema.safeParse({ project_id: projectId, key: "site_cleaned", completed: true, note: "x".repeat(2001) }).success, false);
});

test("report ranges normalize presets and inverted custom dates", () => {
  const month = resolveReportRange({ range: "month" });
  assert.match(month.from, /^\d{4}-\d{2}-01$/);
  assert.ok(month.from <= month.to);
  const custom = resolveReportRange({ range: "custom", from: "2026-09-30", to: "2026-09-01" });
  assert.equal(custom.from, "2026-09-01");
  assert.equal(custom.to, "2026-09-30");
});

test("Phase 2G SQL keeps anonymous access narrow and duplicate-safe", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260914103000_phase_2g_completion_feedback.sql"), "utf8");
  assert.match(sql, /grant execute on function public\.get_public_feedback_context\(uuid\)[\s\S]*to anon, authenticated/);
  assert.match(sql, /revoke all on function public\.request_project_feedback\(uuid,timestamptz\) from public, anon/);
  assert.match(sql, /if feedback_row\.submitted_at is not null then return 'already_submitted'/);
  assert.match(sql, /p_honeypot/);
  assert.match(sql, /token_expires_at/);
  assert.match(sql, /token_revoked_at/);
  const feedbackPolicies = sql
    .split(";")
    .filter(
      (statement) =>
        /create policy/i.test(statement) &&
        /on public\.feedback/i.test(statement),
    );
  assert(feedbackPolicies.length > 0);
  assert(feedbackPolicies.every((statement) => !/to anon/i.test(statement)));
});

test("new project activity labels are human readable", () => {
  assert.equal(projectActivityLabel("feedback.submitted", {}), "Customer feedback submitted");
  assert.equal(projectActivityLabel("completion_checklist.updated", {}), "Completion checklist updated");
});
