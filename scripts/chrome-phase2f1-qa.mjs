import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const fixture = JSON.parse(await readFile(".qa-runtime/phase2f1-fixture.json", "utf8"));
const roles = JSON.parse(await readFile(".qa-runtime/phase2e-fixture.json", "utf8"));
const financeRoles = JSON.parse(await readFile(".qa-runtime/phase2f-fixture.json", "utf8"));
assert(fixture.quotationId && fixture.receiptId, "Phase 2F.1 hosted fixture is required");
assert(roles.adminEmail && roles.password && financeRoles.accountsEmail, "Disposable QA role credentials are required");
const envText = await readFile(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
  const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1).replace(/^["']|["']$/g, "")];
}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const management = await supabase.auth.signInWithPassword({ email: roles.adminEmail, password: roles.password });
assert.ifError(management.error); assert(management.data.user);
const accountsProbe = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const accountsSignIn = await accountsProbe.auth.signInWithPassword({ email: financeRoles.accountsEmail, password: roles.password });
assert.ifError(accountsSignIn.error); assert(accountsSignIn.data.user); await accountsProbe.auth.signOut();

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profileDir = await mkdtemp(join(tmpdir(), "pergola-phase2f1-chrome-"));
const port = 9337;
const chromeProcess = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "--no-first-run", "--disable-gpu", "--window-size=390,844", "about:blank"], { stdio: "ignore" });
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
async function endpoint(path) {
  for (let i = 0; i < 80; i += 1) { try { const response = await fetch(`http://127.0.0.1:${port}${path}`); if (response.ok) return response.json(); } catch {} await pause(100); }
  throw new Error("Google Chrome DevTools endpoint did not start");
}
let socket;
let sequence = 0;
const pending = new Map();
const consoleErrors = [];
function send(method, params = {}) { const id = ++sequence; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); }
async function evaluate(expression) {
  const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}
async function waitFor(expression, label, attempts = 240) {
  for (let i = 0; i < attempts; i += 1) { if (await evaluate(expression)) return; await pause(100); }
  throw new Error(`Timed out waiting for ${label}`);
}
async function navigate(url) {
  await send("Page.navigate", { url });
  await waitFor(`location.href.startsWith(${JSON.stringify(url)}) && document.readyState!=='loading' && document.body?.innerText?.length>0`, url);
  await waitFor("!document.querySelector('[aria-label^=\"Loading\"], [aria-busy=\"true\"], .animate-pulse')", `${url} settled`);
}
async function setField(selector, value) {
  const changed = await evaluate(`(() => { const field=document.querySelector(${JSON.stringify(selector)}); if(!field)return false; const proto=HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(field,${JSON.stringify(value)}); field.dispatchEvent(new Event('input',{bubbles:true})); field.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
  assert.equal(changed, true, `Missing ${selector}`);
}
async function login(email) {
  await navigate("http://localhost:3000/login");
  await setField("#email", email); await setField("#password", roles.password);
  await evaluate("document.querySelector('form').requestSubmit()");
  await waitFor("location.pathname==='/dashboard'", "dashboard login");
}
async function clearSession() {
  await send("Network.clearBrowserCookies");
  await send("Storage.clearDataForOrigin", { origin: "http://localhost:3000", storageTypes: "all" });
}
async function setViewport(width, height) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
}
async function evidence() {
  return evaluate(`(() => ({ viewport:[innerWidth,innerHeight], overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth, body:document.body.innerText, links:[...document.querySelectorAll('a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href'),target:a.target})), wide:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right})) }))()`);
}
async function pdfFetch(path) {
  return evaluate(`fetch(${JSON.stringify(path)},{cache:'no-store'}).then(async r=>{const b=new Uint8Array(await r.arrayBuffer());return {status:r.status,url:r.url,type:r.headers.get('content-type'),cache:r.headers.get('cache-control'),nosniff:r.headers.get('x-content-type-options'),magic:String.fromCharCode(...b.slice(0,4))}})`);
}
async function screenshot(path) {
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(path, Buffer.from(shot.data, "base64"));
}

try {
  const tabs = await endpoint("/json");
  const target = tabs.find((item) => item.type === "page");
  assert(target?.webSocketDebuggerUrl);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message));
      else item.resolve(message.result);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((arg) => arg.value || arg.description || "").join(" "));
    if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || "Runtime exception");
  };
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await mkdir(".qa-runtime", { recursive: true });

  await setViewport(390, 844);
  await navigate("http://localhost:3000/login");
  const anonymous = await pdfFetch(`/dashboard/payments/${fixture.receiptId}/pdf`);
  assert.notEqual(anonymous.type, "application/pdf");

  await login(roles.adminEmail);
  await navigate(`http://localhost:3000/dashboard/quotations/${fixture.quotationId}`);
  const mobileQuote = await evidence();
  assert.equal(mobileQuote.overflow, false, JSON.stringify(mobileQuote.wide));
  assert(mobileQuote.links.some((link) => link.text === "Download PDF" && link.href?.endsWith("/pdf")));
  const adminQuotePdf = await pdfFetch(`/dashboard/quotations/${fixture.quotationId}/pdf`);
  assert.deepEqual([adminQuotePdf.status, adminQuotePdf.type, adminQuotePdf.magic], [200, "application/pdf", "%PDF"]);
  const adminReceiptPdf = await pdfFetch(`/dashboard/payments/${fixture.receiptId}/pdf`);
  assert.deepEqual([adminReceiptPdf.status, adminReceiptPdf.type, adminReceiptPdf.magic], [200, "application/pdf", "%PDF"]);
  assert.match(adminReceiptPdf.cache, /private, no-store/); assert.equal(adminReceiptPdf.nosniff, "nosniff");
  await screenshot(".qa-runtime/phase2f1-mobile-quotation-390x844.png");

  await clearSession(); await login(financeRoles.accountsEmail);
  await navigate(`http://localhost:3000/dashboard/payments/${fixture.receiptId}`);
  const mobileReceipt = await evidence();
  assert.equal(mobileReceipt.overflow, false, JSON.stringify(mobileReceipt.wide));
  assert(mobileReceipt.links.some((link) => link.text === "View receipt PDF" && link.href?.endsWith("/pdf")));
  const accountsReceiptPdf = await pdfFetch(`/dashboard/payments/${fixture.receiptId}/pdf`);
  assert.deepEqual([accountsReceiptPdf.status, accountsReceiptPdf.type, accountsReceiptPdf.magic], [200, "application/pdf", "%PDF"]);
  await screenshot(".qa-runtime/phase2f1-mobile-receipt-390x844.png");

  await setViewport(1280, 720);
  await navigate("http://localhost:3000/dashboard/payments");
  const desktopPayments = await evidence();
  assert.equal(desktopPayments.overflow, false, JSON.stringify(desktopPayments.wide));
  assert(desktopPayments.links.some((link) => link.href === `/dashboard/payments/${fixture.receiptId}/pdf`));
  await screenshot(".qa-runtime/phase2f1-desktop-payments-1280x720.png");
  await navigate(`http://localhost:3000/dashboard/payments/projects/${fixture.projectId}`);
  const desktopProject = await evidence();
  assert.equal(desktopProject.overflow, false, JSON.stringify(desktopProject.wide));
  assert(desktopProject.links.some((link) => link.href === `/dashboard/payments/${fixture.receiptId}/pdf`));
  await screenshot(".qa-runtime/phase2f1-desktop-project-1280x720.png");

  assert.ifError((await supabase.from("profiles").update({ role: "site_team" }).eq("id", accountsSignIn.data.user.id)).error);
  await clearSession(); await login(financeRoles.accountsEmail);
  await send("Page.navigate", { url: `http://localhost:3000/dashboard/payments/${fixture.receiptId}/pdf` });
  await waitFor("location.pathname!='/dashboard/payments/" + fixture.receiptId + "/pdf'", "Site Team receipt denial");
  const deniedPath = await evaluate("location.pathname+location.search");
  assert.match(deniedPath, /^\/dashboard\?notice=access-denied/);

  assert.equal(consoleErrors.length, 0, consoleErrors.join("\n"));
  console.log(JSON.stringify({
    status: "passed", browser: "Google Chrome", hosted: { quotation: fixture.quotationNumber, receipt: fixture.receiptNumber },
    authorization: { anonymousReceipt: "denied", managementQuotation: "PDF 200", managementReceipt: "PDF 200", accountsReceipt: "PDF 200", siteTeamReceipt: "denied" },
    mobile: { quotationOverflow: mobileQuote.overflow, receiptOverflow: mobileReceipt.overflow, screenshots: [".qa-runtime/phase2f1-mobile-quotation-390x844.png", ".qa-runtime/phase2f1-mobile-receipt-390x844.png"] },
    desktop: { paymentsOverflow: desktopPayments.overflow, projectOverflow: desktopProject.overflow, screenshots: [".qa-runtime/phase2f1-desktop-payments-1280x720.png", ".qa-runtime/phase2f1-desktop-project-1280x720.png"] },
    responseHeaders: { cache: accountsReceiptPdf.cache, nosniff: accountsReceiptPdf.nosniff }, consoleErrors,
  }, null, 2));
} finally {
  try { await supabase.from("profiles").update({ role: "accounts" }).eq("id", accountsSignIn.data.user.id); } catch {}
  try { socket?.close(); } catch {}
  try { chromeProcess.kill(); } catch {}
  await supabase.auth.signOut();
  await rm(profileDir, { recursive: true, force: true });
}
