import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const fixture = JSON.parse(await readFile(".qa-runtime/phase2f-fixture.json", "utf8"));
assert(fixture.accountsEmail && fixture.siteEmail && fixture.password && fixture.projectId, "Phase 2F fixture is required");
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profileDir = await mkdtemp(join(tmpdir(), "pergola-phase2f-chrome-"));
const port = 9336;
const chromeProcess = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "--no-first-run", "--disable-gpu", "--window-size=390,844", "about:blank"], { stdio: "ignore" });
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
async function endpoint(path) {
  for (let i = 0; i < 60; i += 1) { try { const response = await fetch(`http://127.0.0.1:${port}${path}`); if (response.ok) return response.json(); } catch {} await pause(100); }
  throw new Error("Google Chrome DevTools endpoint did not start");
}
let socket, sequence = 0;
const pending = new Map(), consoleErrors = [];
function send(method, params = {}) { const id = ++sequence; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolvePromise, reject) => pending.set(id, { resolve: resolvePromise, reject })); }
async function evaluate(expression) {
  const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}
async function waitFor(expression, label, attempts = 220) {
  for (let i = 0; i < attempts; i += 1) { if (await evaluate(expression)) return; await pause(100); }
  throw new Error(`Timed out waiting for ${label}`);
}
async function navigate(url) {
  await send("Page.navigate", { url });
  await waitFor(`location.href.startsWith(${JSON.stringify(url)}) && document.readyState!=='loading' && document.body?.innerText?.length>0`, url);
}
async function setField(selector, value) {
  const changed = await evaluate(`(() => { const field=document.querySelector(${JSON.stringify(selector)}); if(!field)return false; const proto=field instanceof HTMLSelectElement?HTMLSelectElement.prototype:field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(field,${JSON.stringify(value)}); field.dispatchEvent(new Event('input',{bubbles:true})); field.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
  assert.equal(changed, true, `Missing ${selector}`);
}
async function clickText(text) {
  const clicked = await evaluate(`(() => { const item=[...document.querySelectorAll('button,a')].find(x=>x.textContent.trim()===${JSON.stringify(text)}&&!x.disabled); if(!item)return false; item.click(); return true; })()`);
  assert.equal(clicked, true, `Missing enabled ${text}`);
}
async function login(email) {
  await navigate("http://localhost:3000/login");
  await setField("#email", email); await setField("#password", fixture.password);
  await evaluate("document.querySelector('form').requestSubmit()");
  await waitFor("location.pathname==='/dashboard'", "dashboard login");
}
async function clearSession() {
  await send("Network.clearBrowserCookies");
  await send("Storage.clearDataForOrigin", { origin: "http://localhost:3000", storageTypes: "all" });
}
async function evidence() {
  return evaluate(`(() => { const fields=[...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]),select,textarea')]; const bounds=[...document.querySelectorAll('body *')].map(x=>({tag:x.tagName,text:(x.textContent||'').trim().slice(0,50),left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right})); return {viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,overlay:Boolean(document.querySelector('[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay')),headings:[...document.querySelectorAll('h1,h2,h3')].map(x=>x.textContent.trim()),minInputFont:fields.length?Math.min(...fields.map(x=>parseFloat(getComputedStyle(x).fontSize)||999)):null,wideElements:bounds.filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,8),bodyText:document.body.innerText.slice(0,18000)}; })()`);
}
async function screenshot(name) {
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  const path = join(process.cwd(), ".qa-runtime", name); await writeFile(path, Buffer.from(shot.data, "base64")); return path;
}

try {
  await mkdir(".qa-runtime", { recursive: true });
  const uploadPath = resolve(".qa-runtime", "browser-payment-proof.png");
  await writeFile(uploadPath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
  const targets = await endpoint("/json/list");
  const pageTarget = targets.find((target) => target.type === "page");
  assert(pageTarget);
  socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => { socket.addEventListener("open", resolvePromise, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) { const item = pending.get(message.id); if (!item) return; pending.delete(message.id); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result); return; }
    if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || "Runtime exception");
    if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") consoleErrors.push(message.params.entry.text);
  });
  await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable"); await send("DOM.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false, screenWidth: 390, screenHeight: 844 });
  await login(fixture.accountsEmail);

  await navigate("http://localhost:3000/dashboard/payments");
  await waitFor("document.body.innerText.includes('Project balances') && document.body.innerText.includes('Milestone queue') && document.body.innerText.includes('Payment history')", "payments dashboard");
  const mobileList = await evidence();
  assert.deepEqual(mobileList.viewport, { width: 390, height: 844 }); assert.equal(mobileList.overflow, false, JSON.stringify(mobileList.wideElements)); assert.equal(mobileList.overlay, false);
  assert(mobileList.headings.includes("Payments")); assert(mobileList.bodyText.includes(fixture.projectNumber)); assert.equal(await evaluate("document.body.textContent.includes('Received this month')"), true); assert(mobileList.minInputFont >= 16);
  assert.equal(await evaluate("Boolean(document.querySelector('select[name=project]') && document.querySelector('select[name=customer]') && document.querySelector('select[name=method]') && document.querySelector('select[name=recorded_by]') && document.querySelector('input[name=from]') && document.querySelector('input[name=to]'))"), true);
  const mobileDashboardScreenshot = await screenshot("phase2f-mobile-dashboard-390x844.png");
  await navigate(`http://localhost:3000/dashboard/payments?search=${encodeURIComponent(fixture.receiptNumber)}`);
  await waitFor(`document.body.innerText.includes(${JSON.stringify(fixture.receiptNumber)}) && document.body.innerText.includes('1 result')`, "receipt register filter");

  const projectUrl = `http://localhost:3000/dashboard/payments/projects/${fixture.projectId}`;
  await navigate(projectUrl); await waitFor("document.body.innerText.includes('Milestone ledger')", "payment project");
  const mobileProject = await evidence();
  for (const heading of ["Milestone ledger","Receipt history","Plan control","Next financial action"]) assert(mobileProject.headings.includes(heading), `Missing ${heading}`);
  assert.equal(mobileProject.overflow, false, JSON.stringify(mobileProject.wideElements)); assert(mobileProject.bodyText.includes("Completed project has an outstanding balance"));

  await navigate(`http://localhost:3000/dashboard/payments/new?project=${fixture.projectId}`); await waitFor("document.body.innerText.includes('Post immutable receipt')", "new receipt form");
  const milestoneId = await evaluate(`document.querySelector('select[name=milestone_id] option[value]:not([value=""])')?.value`);
  assert(milestoneId); await setField("select[name=milestone_id]", milestoneId); await setField("input[name=amount]", "1.00"); await setField("select[name=payment_method]", "card"); await setField("input[name=reference_number]", "CHROME-P2F");
  await clickText("Post immutable receipt"); await waitFor("document.body.innerText.includes('Open posted receipt')", "posted receipt link"); await clickText("Open posted receipt →");
  await waitFor("location.pathname.startsWith('/dashboard/payments/') && document.body.innerText.includes('Immutable receipt')", "receipt detail");
  const receiptPath = await evaluate("location.pathname");
  const newReceiptId = receiptPath.split("/").at(-1);
  assert(newReceiptId && newReceiptId !== "new");

  const documentNode = await send("DOM.getDocument", { depth: -1, pierce: true });
  const fileNode = await send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: 'input[type="file"]' });
  assert(fileNode.nodeId); await send("DOM.setFileInputFiles", { nodeId: fileNode.nodeId, files: [uploadPath] });
  await clickText("Upload private proof"); await waitFor("document.body.innerText.includes('browser-payment-proof.png')", "uploaded proof", 300);
  const mobileReceipt = await evidence(); assert.equal(mobileReceipt.overflow, false, JSON.stringify(mobileReceipt.wideElements)); assert.equal(mobileReceipt.overlay, false); assert(mobileReceipt.minInputFont >= 16);
  const mobileScreenshot = await screenshot("phase2f-mobile-receipt-390x844.png");
  await setField("textarea[name=reason]", "Chrome acceptance reversal"); await clickText("Void receipt"); await waitFor("document.body.innerText.includes('This receipt is void')", "void receipt", 300);
  await send("Page.reload", { ignoreCache: true }); await waitFor("document.body.innerText.includes('This receipt is void')", "void persists");

  await navigate(`http://localhost:3000/dashboard/projects/${fixture.projectId}`); await pause(1200);
  const projectEvidence = await evidence();
  assert(projectEvidence.bodyText.includes("Payments") && projectEvidence.bodyText.includes("Outstanding"), JSON.stringify({ url: await evaluate("location.href"), body: projectEvidence.bodyText.slice(0, 1200) }));
  assert.equal(projectEvidence.overflow, false, JSON.stringify(projectEvidence.wideElements));
  await clearSession(); await login(fixture.adminEmail);
  await send("Page.navigate", { url: `http://localhost:3000/dashboard/projects/${fixture.projectId}` });
  await waitFor("document.readyState!=='loading' && document.body?.innerText?.length>0", "Management project page");
  await waitFor("document.body.innerText.includes('remains outstanding') && document.body.innerText.includes('does not block operational completion')", "Management completion warning");

  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false, screenWidth: 1280, screenHeight: 720 });
  await navigate("http://localhost:3000/dashboard/payments"); await waitFor("document.querySelector('table') && document.body.innerText.includes('Project balances')", "desktop payment dashboard");
  const desktopList = await evidence(); assert.deepEqual(desktopList.viewport, { width: 1280, height: 720 }); assert.equal(desktopList.overflow, false, JSON.stringify(desktopList.wideElements)); assert.equal(desktopList.overlay, false);
  const desktopDashboardScreenshot = await screenshot("phase2f-desktop-dashboard-1280x720.png");
  await navigate(projectUrl); await waitFor("document.body.innerText.includes('Milestone ledger')", "desktop payment project");
  const desktopProject = await evidence(); assert.equal(desktopProject.overflow, false, JSON.stringify(desktopProject.wideElements)); assert.equal(desktopProject.overlay, false);
  const desktopScreenshot = await screenshot("phase2f-desktop-project-1280x720.png");

  await clearSession(); await login(fixture.siteEmail);
  await send("Page.navigate", { url: "http://localhost:3000/dashboard/payments" });
  await waitFor("location.pathname==='/dashboard' && document.body.innerText.includes('Access restricted')", "Site Team route denial");
  assert.equal(consoleErrors.length, 0, consoleErrors.join(" | "));
  console.log(JSON.stringify({ status: "passed", browser: "Google Chrome", interactions: ["Accounts dashboard metrics", "milestone queue", "full receipt register and filters", "project payment ledger", "completed-project outstanding warning", "post immutable receipt", "private proof upload", "receipt detail", "void and refresh persistence", "project finance summary", "Site Team direct-route denial"], receiptId: newReceiptId, mobile: { viewport: mobileList.viewport, listOverflow: mobileList.overflow, projectOverflow: mobileProject.overflow, receiptOverflow: mobileReceipt.overflow, minInputFont: Math.min(mobileList.minInputFont, mobileReceipt.minInputFont), dashboardScreenshot: mobileDashboardScreenshot, receiptScreenshot: mobileScreenshot }, desktop: { viewport: desktopList.viewport, listOverflow: desktopList.overflow, projectOverflow: desktopProject.overflow, dashboardScreenshot: desktopDashboardScreenshot, projectScreenshot: desktopScreenshot }, consoleErrors }, null, 2));
} finally {
  try { socket?.close(); } catch {}
  chromeProcess.kill(); await pause(300); await rm(profileDir, { recursive: true, force: true });
}
