import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const baseUrl = (process.env.ACCESS_QA_BASE_URL || "").replace(/\/$/, "");
assert(/^https:\/\/[^/]+\.vercel\.app$/.test(baseUrl), "Set ACCESS_QA_BASE_URL to the UAT Vercel preview");
const fixture = JSON.parse(await readFile(".qa-runtime/partner-uat-access.json", "utf8"));
const token = process.env.VERCEL_OIDC_TOKEN || "";
const shareSecret = process.env.PHASE2J_SHARE_SECRET || "";
const admin = fixture.users.partner1;
const investor = fixture.users.partner2;
const temporaryUsername = `myriam_qa_${randomUUID().slice(0, 6)}`;
const port = 9700 + Math.floor(Math.random() * 200);
const chromeProfile = await mkdtemp(join(tmpdir(), "pergola-access-"));
const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${chromeProfile}`,
  "--no-first-run", "--disable-gpu", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
let sequence = 0;
let usernameChanged = false;
const pending = new Map();
const errors = [];
const networkFailures = [];
const checks = [];
function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function js(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser exception");
  return result.result.value;
}
async function until(expression, label) {
  for (let index = 0; index < 300; index++) {
    if (await js(expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}
async function navigate(path) {
  await send("Page.navigate", { url: `${baseUrl}${path}` });
  await until("document.readyState!=='loading'&&document.body.innerText.length>0", path);
  await sleep(450);
}
async function fill(selector, value) {
  const okay = await js(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)return false;const prototype=element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  assert(okay, `Missing field ${selector}`);
}
async function state() {
  return js("(()=>({url:location.href,text:document.body.innerText,overlay:!!document.querySelector('[data-nextjs-dialog]'),overflow:document.documentElement.scrollWidth>innerWidth}))()");
}
async function checkPage(path, expected, absent = []) {
  await navigate(path);
  await until(`document.body.innerText.includes(${JSON.stringify(expected)})`, expected);
  const page = await state();
  assert.equal(page.overlay, false, `${path}: Next.js overlay`);
  assert.equal(page.overflow, false, `${path}: horizontal overflow`);
  const mainText = await js("document.querySelector('main')?.innerText || ''");
  for (const phrase of absent) {
    if (mainText.includes(phrase)) {
      const lines = mainText.split("\n").filter((line) => line.includes(phrase)).map((line) => line.slice(0, 100));
      throw new Error(`${path}: visible ${phrase} in ${JSON.stringify(lines)}`);
    }
  }
  checks.push(path);
  return page;
}
async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(`.qa-runtime/${name}`, Buffer.from(result.data, "base64"));
}
async function login(username, user) {
  await navigate("/login");
  assert((await state()).text.includes("Username"), "Username login form missing");
  await fill("#username", username);
  await fill("#password", user.password);
  await js("document.querySelector('form').requestSubmit()");
  await until("location.pathname==='/dashboard'&&document.body.innerText.includes('Operations overview')", `login ${username}`);
}
async function logout() {
  const clicked = await js("(()=>{const button=[...document.querySelectorAll('button')].find(item=>/sign out/i.test(item.innerText));if(!button)return false;button.click();return true})()");
  assert(clicked, "Sign out button missing");
  await until("location.pathname==='/'", "sign out");
}
async function changeUsername(username) {
  await checkPage("/dashboard/profile", "Edit profile");
  await fill("#profileUsername", username);
  await js("document.querySelector('form[data-profile-form]').requestSubmit()");
  await until("document.body.innerText.includes('Profile saved.')", "profile saved");
  await send("Page.reload");
  await until(`document.querySelector('#profileUsername')?.value===${JSON.stringify(username)}`, "username persisted");
}

async function restoreUsername() {
  if (!usernameChanged) return;
  const url = process.env.ACCESS_QA_SUPABASE_URL;
  const key = process.env.ACCESS_QA_SUPABASE_KEY;
  assert(url?.includes("jwyjuhtektmtqffnillj") && key, "Cannot restore UAT username without scoped Supabase settings");
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email: admin.email, password: admin.password });
  assert.ifError(signIn.error);
  const restore = await client.from("profiles").update({ username: "myriam" }).eq("id", investor.id);
  assert.ifError(restore.error);
  usernameChanged = false;
}

const result = { passed: false, previewUrl: baseUrl, commit: process.env.ACCESS_QA_COMMIT || null, checks, consoleErrors: errors, networkFailures, timestamp: new Date().toISOString() };
try {
  let pages;
  for (let index = 0; index < 100; index++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) { pages = await response.json(); break; }
    } catch { /* Chrome is starting. */ }
    await sleep(100);
  }
  assert(pages, "Headless Chrome did not start");
  socket = new WebSocket(pages.find((page) => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const promise = pending.get(message.id); pending.delete(message.id);
      if (message.error) promise.reject(new Error(message.error.message)); else promise.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text || "exception");
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push("console.error");
    if (message.method === "Network.responseReceived" && message.params.response.status >= 500) networkFailures.push({ status: message.params.response.status, path: new URL(message.params.response.url).pathname });
  });
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
  if (token) await send("Network.setExtraHTTPHeaders", { headers: { "x-vercel-trusted-oidc-idp-token": token } });
  if (shareSecret) await navigate(`/?_vercel_share=${encodeURIComponent(shareSecret)}`);

  await login("myriam", investor);
  await checkPage("/dashboard", "Operations overview", ["UAT Welding Machine"]);
  assert((await state()).text.includes("Investor view"), "Investor badge missing");
  await screenshot("final-access-investor-dashboard-desktop.png");
  for (const [path, title, absent] of [
    ["/dashboard/products", "Products", ["UAT Motorised"]],
    ["/dashboard/categories", "Categories", ["UAT Accessories"]],
    ["/dashboard/customers", "Customers", ["UAT Aisha Al Noor"]],
    ["/dashboard/enquiries", "Enquiries", ["[UAT] Phase 2J"]],
    ["/dashboard/site-visits", "Site visits", []],
    ["/dashboard/quotations", "Quotations", []],
    ["/dashboard/invoices", "Invoices", []],
    ["/dashboard/projects", "Projects", ["QA Project Customer"]],
    ["/dashboard/payments", "Payments", []],
    ["/dashboard/accounts", "Accounts", ["Phase 2J UAT"]],
    ["/dashboard/assets", "Assets & machinery", ["UAT Welding Machine"]],
    ["/dashboard/tasks", "Reminders", []],
    ["/dashboard/reports", "Management reports", []],
  ]) {
    const page = await checkPage(path, title, absent);
    assert(!/Invalid input: expected string, received undefined/.test(page.text), path);
    const forbiddenControls = await js("[...document.querySelectorAll('main button, main a')].filter(item=>item.getBoundingClientRect().width&&/^(Create quotation|Record payment|New enquiry|Add expense|Upload|Delete|Archive|Approve)$/i.test(item.innerText.trim())).map(item=>item.innerText.trim())");
    assert.deepEqual(forbiddenControls, [], `${path}: mutation controls visible`);
  }
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
  await checkPage("/dashboard", "Operations overview");
  await checkPage("/dashboard/profile", "MYRIAM");
  await screenshot("final-access-investor-profile-mobile.png");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
  await checkPage("/dashboard/profile", "MYRIAM");
  assert.equal(await js("document.querySelector('#profileRole')?.value"), "Investor");
  await fill("#currentPassword", "incorrect-qa-current-password");
  const rejectedPassword = `Qa!${randomUUID()}`;
  await fill("#newPassword", rejectedPassword);
  await fill("#confirmPassword", rejectedPassword);
  await js("document.querySelector('#currentPassword').closest('form').requestSubmit()");
  await until("document.body.innerText.includes('Current password is incorrect.')", "incorrect current password rejected");
  await fill("#profileUsername", "eltho");
  await js("document.querySelector('form[data-profile-form]').requestSubmit()");
  await until("document.body.innerText.includes('already in use')", "duplicate username rejected");
  usernameChanged = true;
  await changeUsername(temporaryUsername);
  await logout();
  await login(temporaryUsername, investor);
  await changeUsername("myriam");
  usernameChanged = false;
  await screenshot("final-access-investor-profile.png");
  await logout();

  await login("eltho", admin);
  await checkPage("/dashboard/profile", "ELTHO");
  assert.equal(await js("document.querySelector('#profileRole')?.value"), "Admin / Management");
  await checkPage("/dashboard/customers/new", "New customer");
  await checkPage("/dashboard/quotations/new", "New quotation", ["Invalid input: expected string, received undefined"]);
  await screenshot("final-access-admin-new-quotation.png");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
  await checkPage("/dashboard", "Operations overview");
  await screenshot("final-access-admin-dashboard-mobile.png");
  await logout();
  await navigate("/dashboard");
  await until("location.pathname==='/'", "anonymous dashboard redirect");
  assert((await state()).text.includes("Username"), "Anonymous dashboard did not show sign-in");
  assert.deepEqual(errors, [], "Browser console errors or exceptions");
  assert.deepEqual(networkFailures, [], "Server errors");
  result.passed = true;
} catch (error) {
  const current = socket ? await state().catch(() => null) : null;
  result.failure = `${error.message}${current ? ` (path: ${new URL(current.url).pathname})` : ""}`;
  throw error;
} finally {
  try { await restoreUsername(); } catch (error) { result.restoreFailure = error.message; }
  result.timestamp = new Date().toISOString();
  await writeFile(".qa-runtime/final-access-uat-result.json", `${JSON.stringify(result, null, 2)}\n`);
  try { socket?.close(); } catch { /* Chrome may have closed. */ }
  chrome.kill();
  await sleep(250);
  await rm(chromeProfile, { recursive: true, force: true });
  console.log(JSON.stringify({ passed: result.passed, previewUrl: result.previewUrl, commit: result.commit, checks: checks.length, consoleErrorCount: errors.length, networkFailureCount: networkFailures.length, failure: result.failure || null, restoreFailure: result.restoreFailure || null }));
}
