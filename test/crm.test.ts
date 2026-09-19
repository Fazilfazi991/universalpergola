import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { enquiryReference } from "../src/lib/crm/presentation.ts";
import { customerSchema, normalizePhone, publicEnquirySchema, staffEnquirySchema } from "../src/lib/crm/validation.ts";

test("phone normalization supports practical formatted numbers", () => {
  assert.equal(normalizePhone("+971 (50) 123-4567"), "971501234567");
});
test("public enquiry keeps the form short and validates server-side", () => {
  const valid = publicEnquirySchema.safeParse({ name: "Amina", phone: "+971 50 123 4567", whatsapp_number: "", email: "", emirate: "Dubai", message: "I would like a pergola proposal.", product_id: "", product_slug: "", website: "" });
  assert.equal(valid.success, true);
  const bot = publicEnquirySchema.safeParse({ name: "Bot", phone: "+971501234567", whatsapp_number: "", email: "", emirate: "", message: "Spam request", product_id: "", product_slug: "", website: "filled" });
  assert.equal(bot.success, false);
});

test("customer validation requires one practical contact method", () => {
  const result = customerSchema.safeParse({ name: "Customer", customer_type: "individual", phone: "", whatsapp_number: "", email: "", company_name: "", address: "", area: "", emirate: "", notes: "", source: "", assigned_to: "" });
  assert.equal(result.success, false);
});

test("manual enquiry accepts an existing customer without duplicate contact fields", () => {
  const result = staffEnquirySchema.safeParse({ customer_id: "7d48a004-a6a4-4be2-b46a-0d42fd7ac4aa", customer_name: "", phone: "", whatsapp_number: "", email: "", company_name: "", customer_type: "individual", address: "", area: "", emirate: "", source: "Phone Call", lead_source: "Phone Call", referred_by: "", lead_source_detail: "", product_id: "", subject: "Phone lead", message: "Customer requested a callback.", priority: "normal", assigned_to: "", follow_up_at: "", next_action: "Call tomorrow", internal_notes: "" });
  assert.equal(result.success, true);
});

test("referral and other lead sources require their supporting details", () => {
  const base = { customer_id: "7d48a004-a6a4-4be2-b46a-0d42fd7ac4aa", customer_name: "", phone: "", whatsapp_number: "", email: "", company_name: "", customer_type: "individual", address: "", area: "", emirate: "", source: "Referral Person", product_id: "", subject: "Referral", message: "Customer requested a callback.", priority: "normal", assigned_to: "", follow_up_at: "", next_action: "", internal_notes: "" };
  assert.equal(staffEnquirySchema.safeParse({ ...base, lead_source: "Referral Person", referred_by: "", lead_source_detail: "" }).success, false);
  assert.equal(staffEnquirySchema.safeParse({ ...base, lead_source: "Referral Person", referred_by: "Sample Referrer", lead_source_detail: "" }).success, true);
  assert.equal(staffEnquirySchema.safeParse({ ...base, source: "Other", lead_source: "Other", referred_by: "", lead_source_detail: "" }).success, false);
});

test("enquiry references remain compact and stable", () => {
  assert.equal(enquiryReference(1001), "ENQ-001001");
});

test("Phase 2B migration exposes one narrow public write path and no anonymous CRM tables", () => {
  const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "20260913013050_phase_2b_crm_workflow.sql"), "utf8");
  assert.match(migration, /grant execute on function public\.submit_public_enquiry[\s\S]+to anon/);
  assert.match(migration, /revoke all on function public\.submit_public_enquiry[\s\S]+from public, authenticated/);
  assert.doesNotMatch(migration, /grant (?:select|insert|update|delete)[^;]+customers[^;]+to anon/i);
  assert.doesNotMatch(migration, /grant (?:select|insert|update|delete)[^;]+enquiries[^;]+to anon/i);
  assert.match(migration, /security definer\s+set search_path = ''/);
  assert.match(migration, /Please wait before sending another enquiry/);
});

test("CRM Server Actions re-authorize every mutation entry point", () => {
  for (const file of [
    join("src", "app", "dashboard", "customers", "actions.ts"),
    join("src", "app", "dashboard", "enquiries", "actions.ts"),
  ]) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    const exportedActions = [...source.matchAll(/export async function (\w+Action)\([^]*?(?=\nexport async function|\nexport \{|$)/g)];
    assert(exportedActions.length > 0);
    for (const match of exportedActions) assert.match(match[0], /require(?:Role|Management)\(/, `${match[1]} lacks authorization`);
  }
});
