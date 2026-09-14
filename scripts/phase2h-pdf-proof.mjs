import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { generatePaymentReceiptPdf } from "../src/lib/payments/pdf.ts";
import { generateQuotationPdf } from "../src/lib/quotations/pdf.ts";

const envText = await readFile(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1).replace(/^["']|["']$/g, "")]; }));
const fixture = JSON.parse(await readFile(".qa-runtime/phase2h-uat-access.json", "utf8"));
const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const sales = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
const accounts = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
assert.ifError((await sales.auth.signInWithPassword({ email: fixture.users.sales.email, password: fixture.password })).error);
assert.ifError((await accounts.auth.signInWithPassword({ email: fixture.users.accounts.email, password: fixture.password })).error);
async function data(promise, label) { const result = await promise; assert.ifError(result.error); assert(result.data !== null, `${label}: missing data`); return result.data; }

try {
  const quotation = await data(sales.from("quotations").select("*").eq("id", fixture.quotations.revision).single(), "UAT quotation");
  const quotationItems = await data(sales.from("quotation_items").select("*").eq("quotation_id", quotation.id).order("sort_order"), "UAT quotation items");
  const receiptId = fixture.finance.active.receipts[0];
  const receipt = await data(accounts.from("payments").select("id, receipt_number, project_id, customer_id, milestone_id, amount_received, received_date, payment_method, reference_number, notes, voided_at, void_reason, created_at, creator:profiles!payments_created_by_fkey(id, full_name), voider:profiles!payments_voided_by_fkey(id, full_name), milestone:payment_milestones!payments_milestone_id_fkey(id, name, description, amount_due), project:projects!payments_project_id_fkey(id, project_number, currency, project_value, source_quotation_number), customer:customers!payments_customer_id_fkey(id, name, phone), proofs:payment_proofs(id, payment_id, storage_path, file_name, mime_type, file_size, created_at)").eq("id", receiptId).single(), "UAT receipt");
  const finance = (await data(accounts.rpc("get_project_finance_summary", { p_project_id: receipt.project_id }), "UAT finance summary"))[0];
  const [quotationBytes, receiptBytes] = await Promise.all([generateQuotationPdf(quotation, quotationItems), generatePaymentReceiptPdf(receipt, finance)]);
  await mkdir("output/pdf", { recursive: true });
  const quotationPath = "output/pdf/phase2h-uat-quotation.pdf";
  const receiptPath = "output/pdf/phase2h-uat-payment-receipt.pdf";
  await Promise.all([writeFile(quotationPath, quotationBytes), writeFile(receiptPath, receiptBytes)]);
  const result = { status: "passed", quotation: { number: quotation.quotation_number, total: quotation.total, path: quotationPath, bytes: quotationBytes.length }, receipt: { number: receipt.receipt_number, amount: receipt.amount_received, outstanding: finance.outstanding, path: receiptPath, bytes: receiptBytes.length } };
  await writeFile(".qa-runtime/phase2h-pdf.json", `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 }); console.log(JSON.stringify(result, null, 2));
} finally { await Promise.all([sales.auth.signOut(), accounts.auth.signOut()]); }
