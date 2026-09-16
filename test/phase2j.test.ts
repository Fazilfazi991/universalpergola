import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { weightedProgress } from "../src/lib/operations/types.ts";

test("weighted project advancement includes partial stage progress", () => {
  assert.equal(weightedProgress([{ progress: 100, weight: 2, status: "completed" }, { progress: 50, weight: 1, status: "in_progress" }, { progress: 0, weight: 1, status: "not_started" }]), 63);
  assert.equal(weightedProgress([]), 0);
});

test("Phase 2J keeps expenses separate and private", () => {
  const sql = readFileSync("supabase/migrations/20260916143703_phase_2j_operational_costs_assets_advancement.sql", "utf8");
  assert.match(sql, /create table public\.internal_expenses/i);
  assert.match(sql, /create table public\.labour_wages/i);
  assert.match(sql, /create table public\.purchase_bills/i);
  assert.match(sql, /create table public\.assets/i);
  assert.match(sql, /revoke all on public\.internal_expenses[\s\S]*from anon/i);
  assert.match(sql, /values \('internal-documents','internal-documents',false/i);
  assert.doesNotMatch(sql, /alter table public\.payments/i);
});

test("Phase 2J Server Actions re-authorize finance mutations", () => {
  const actions = readFileSync("src/app/dashboard/accounts/actions.ts", "utf8");
  for (const name of ["createExpenseAction", "createWageAction", "createAssetAction", "reservePurchaseBillAction", "removePurchaseBillAction"]) {
    const section = actions.slice(actions.indexOf(`function ${name}`), actions.indexOf("\nexport async function", actions.indexOf(`function ${name}`) + 10) === -1 ? undefined : actions.indexOf("\nexport async function", actions.indexOf(`function ${name}`) + 10));
    assert.match(section, /requireRole\(\["admin", "accounts"\]\)/, `${name} must re-authorize`);
  }
});
