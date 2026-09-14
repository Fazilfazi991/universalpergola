import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixture = JSON.parse(await readFile(".qa-runtime/phase2h-uat-access.json", "utf8"));
assert(fixture.password && fixture.projects.active && fixture.visits[0], "Phase 2H UAT fixture required");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9400 + Math.floor(Math.random() * 300);
const profileDir = await mkdtemp(join(tmpdir(), "pergola-phase2h-chrome-"));
const chrome = spawn(chromePath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "--no-first-run", "--disable-gpu", "--window-size=390,844", "about:blank"], { stdio: "ignore" });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function endpoint(path) { for (let attempt = 0; attempt < 100; attempt += 1) { try { const response = await fetch(`http://127.0.0.1:${port}${path}`); if (response.ok) return response.json(); } catch {} await pause(100); } throw new Error("Chrome DevTools endpoint did not start"); }
let socket; let sequence = 0; const pending = new Map(); const consoleErrors = []; const timings = [];
function send(method, params = {}) { const id = ++sequence; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); }
async function evaluate(expression) { const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text); return response.result.value; }
async function waitFor(expression, label, attempts = 700) { for (let attempt = 0; attempt < attempts; attempt += 1) { if (await evaluate(expression)) return; await pause(100); } throw new Error(`Timed out waiting for ${label}`); }
async function navigate(path) {
  const url = `http://localhost:3000${path}`;
  await send("Page.navigate", { url });
  await waitFor(`document.readyState!=="loading"&&document.body?.innerText?.trim().length>0`, path);
  await waitFor("!document.querySelector('[aria-busy=\"true\"], .animate-pulse')", `${path} settled`);
  await pause(150);
  const perf = await evaluate(`(()=>{const n=performance.getEntriesByType('navigation').at(-1);return n?{responseStart:Math.round(n.responseStart),domContentLoaded:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd||n.duration)}:null})()`);
  timings.push({ path, ...perf });
  return url;
}
async function setViewport(width, height) { await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 }); }
async function screenshot(name) { const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(`.qa-runtime/${name}`, Buffer.from(result.data, "base64")); }
async function assertPage(label, expected = []) {
  const state = await evaluate(`(()=>({body:document.body.innerText,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,overlay:!!document.querySelector('[data-nextjs-dialog]')}))()`);
  assert.equal(state.overlay, false, `${label}: Next.js error overlay`); assert.equal(state.overflow, false, `${label}: horizontal overflow`);
  for (const text of expected) assert.match(state.body, new RegExp(text, "i"), `${label}: missing ${text}`);
  return state.body;
}
async function setField(selector, value) { const ok = await evaluate(`(()=>{const field=document.querySelector(${JSON.stringify(selector)});if(!field)return false;const proto=field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(field,${JSON.stringify(value)});field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));return true})()`); assert(ok, `Missing ${selector}`); }
async function clearSession() { await send("Network.clearBrowserCookies"); await send("Storage.clearDataForOrigin", { origin: "http://localhost:3000", storageTypes: "all" }); }
async function login(role) { await navigate("/login"); await setField("#email", fixture.users[role].email); await setField("#password", fixture.password); await evaluate("document.querySelector('form').requestSubmit()"); await waitFor("location.pathname==='/dashboard'", `${role} dashboard login`, 700); await pause(500); }
async function deniedRoute(path, role) { await navigate(path); await waitFor("location.pathname==='/dashboard'", `${role} denied redirect`, 300); await waitFor("document.body?.innerText?.includes('Access restricted')", `${role} restricted notice`, 300); await assertPage(`${role} denied ${path}`, ["Access restricted"]); }

try {
  const pages = await endpoint("/json/list"); const target = pages.find((item) => item.type === "page" && item.url === "about:blank") || pages.find((item) => item.type === "page");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result); return; } if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.text); if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((arg) => arg.value || arg.description).join(" ")); });
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");

  await setViewport(390, 844);
  await navigate("/"); await assertPage("mobile home", ["Universal Pergola", "View products"]); await screenshot("phase2h-mobile-home-390x844.png");
  await navigate("/products"); await assertPage("mobile catalogue", ["Pergola", "UAT Motorised"]); await navigate("/enquire"); await assertPage("mobile enquiry", ["enquir", "phone"]);

  await clearSession(); await login("admin");
  await navigate("/dashboard/products"); await assertPage("management catalogue", ["Products", "UAT Motorised"]);
  await navigate("/dashboard/reports?range=today"); await assertPage("management reports", ["Management reports", "Finance position"]); await screenshot("phase2h-management-reports-390x844.png");
  await setViewport(1280, 720); await navigate(`/dashboard/projects/${fixture.projects.completed}`); await assertPage("management completed project", [fixture.projects.completedNumber, "Completion", "Customer feedback"]); await screenshot("phase2h-management-project-1280x720.png");

  await clearSession(); await login("sales"); await navigate("/dashboard/customers"); await assertPage("sales customers", ["Customers", "UAT Aisha"]); await navigate("/dashboard/quotations"); await assertPage("sales quotations", ["Quotations"]); await deniedRoute("/dashboard/payments", "sales");

  await clearSession(); await login("site_team"); await setViewport(390, 844); await navigate(`/dashboard/site-visits/${fixture.visits[0]}`); await assertPage("site assigned visit", ["UAT Aisha", "Measurements", "Existing terrace condition"]); await navigate(`/dashboard/projects/${fixture.projects.active}`); await assertPage("site assigned project", [fixture.projects.activeNumber, "Execution ledger"]); await deniedRoute("/dashboard/customers", "site team"); await screenshot("phase2h-site-mobile-390x844.png");

  await clearSession(); await login("accounts"); await setViewport(1440, 900); await navigate("/dashboard/payments"); await assertPage("accounts payments", ["Payments", "Accounts"]); await navigate(`/dashboard/payments/projects/${fixture.projects.active}`); await assertPage("accounts active plan", [fixture.projects.activeNumber, "Plan control", "Outstanding"]); await deniedRoute("/dashboard/reports", "accounts"); await screenshot("phase2h-accounts-1440x900.png");

  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join(" | ")}`);
  const measured = timings.filter((row) => row.load > 0); const maxLoad = Math.max(...measured.map((row) => row.load)); const maxResponse = Math.max(...measured.map((row) => row.responseStart));
  const result = { status: "passed", engine: "Google Chrome", viewports: ["390x844", "1280x720", "1440x900"], routes: timings.length, performance: { maxResponseStartMs: maxResponse, maxLoadMs: maxLoad, samples: timings }, checks: ["public home/catalogue/enquiry", "Management catalogue/reports/completed project", "Sales customers/quotations and finance denial", "Site Team assigned visit/project and CRM denial", "Accounts finance and reports denial", "no horizontal overflow", "no Next.js overlays", "no console errors"], screenshots: ["phase2h-mobile-home-390x844.png", "phase2h-management-reports-390x844.png", "phase2h-management-project-1280x720.png", "phase2h-site-mobile-390x844.png", "phase2h-accounts-1440x900.png"] };
  await writeFile(".qa-runtime/phase2h-browser.json", `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 }); console.log(JSON.stringify(result, null, 2));
} finally { try { socket?.close(); } catch {} chrome.kill(); await pause(500); try { await rm(profileDir, { recursive: true, force: true }); } catch {} }
