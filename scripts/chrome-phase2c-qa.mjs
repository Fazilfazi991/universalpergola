import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const email = process.env.QA_EMAIL;
const adminEmail = process.env.QA_ADMIN_EMAIL;
const password = process.env.QA_PASSWORD;
const visitId = process.env.QA_VISIT_ID;
const secondVisitId = process.env.QA_SECOND_VISIT_ID;
assert(email && adminEmail && password && visitId && secondVisitId, "QA_EMAIL, QA_ADMIN_EMAIL, QA_PASSWORD, QA_VISIT_ID, and QA_SECOND_VISIT_ID are required");

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profileDir = await mkdtemp(join(tmpdir(), "pergola-chrome-qa-"));
const port = 9333;
const processHandle = spawn(chrome, [`--headless=new`, `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "--no-first-run", "--disable-gpu", "--window-size=390,844", "about:blank"], { stdio: "ignore" });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function endpoint(path) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}${path}`); if (response.ok) return response.json(); } catch {}
    await pause(100);
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

let socket;
let sequence = 0;
const pending = new Map();
const consoleErrors = [];
function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "Chrome evaluation failed");
  return response.result.value;
}
async function navigate(url) {
  await send("Page.navigate", { url });
  let lastState;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await pause(100);
    lastState = await evaluate(`({ready:document.readyState,url:location.href,text:document.body?.innerText?.length||0})`);
    if (lastState.ready === "complete" && lastState.text > 0 && lastState.url.startsWith(url)) return lastState;
  }
  throw new Error(`Timed out navigating to ${url}: ${JSON.stringify(lastState)}`);
}
async function pageEvidence() {
  return evaluate(`(() => ({
    viewport:{width:innerWidth,height:innerHeight},
    documentWidth:document.documentElement.scrollWidth,
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    overlay:Boolean(document.querySelector('[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay')),
    headings:[...document.querySelectorAll('h1,h2,h3')].map(x=>x.textContent.trim()),
    links:[...document.querySelectorAll('a')].map(x=>x.textContent.trim()).filter(Boolean),
    buttons:[...document.querySelectorAll('button')].map(x=>x.textContent.trim()).filter(Boolean),
    inputMinFont:Math.min(...[...document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="file"]),select,textarea')].map(x=>parseFloat(getComputedStyle(x).fontSize)||999)),
    mobileCards:[...document.querySelectorAll('a')].filter(x=>x.href.includes('/dashboard/site-visits/')&&getComputedStyle(x).display!=='none').length,
    photos:[...document.images].map(x=>({alt:x.alt,complete:x.complete,naturalWidth:x.naturalWidth}))
    ,wideElements:[...document.querySelectorAll('body *')].map(x=>({tag:x.tagName,cls:x.className?.toString?.()||'',text:(x.textContent||'').trim().slice(0,60),left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right,width:x.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,12)
  }))()`);
}

async function login(loginEmail) {
  await navigate("http://localhost:3000/login"); await pause(1200);
  const entered = await evaluate(`(() => { const emailField=document.querySelector('#email'); const passwordField=document.querySelector('#password'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(emailField,${JSON.stringify(loginEmail)}); emailField.dispatchEvent(new Event('input',{bubbles:true})); setter.call(passwordField,${JSON.stringify(password)}); passwordField.dispatchEvent(new Event('input',{bubbles:true})); return Object.fromEntries(new FormData(document.querySelector('form'))); })()`);
  assert.equal(entered.email, loginEmail); assert.equal(entered.password, password); await evaluate(`document.querySelector('form').requestSubmit()`);
  for (let attempt = 0; attempt < 100; attempt += 1) { await pause(100); if ((await evaluate("location.pathname")) === "/dashboard") break; }
  assert.equal(await evaluate("location.pathname"), "/dashboard", `login did not reach dashboard: ${await evaluate("document.body.innerText")}`);
}

try {
  const targets = await endpoint("/json/list");
  const pageTarget = targets.find((target) => target.type === "page" && target.url === "about:blank");
  assert(pageTarget, "Chrome page target was not available");
  socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) { const item = pending.get(message.id); if (!item) return; pending.delete(message.id); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result); return; }
    if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails?.text || "Runtime exception");
    if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry?.level)) consoleErrors.push(message.params.entry.text);
  });
  await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false, screenWidth: 390, screenHeight: 844 });
  await login(email);

  await navigate("http://localhost:3000/dashboard/site-visits");
  const list = await pageEvidence();
  assert.deepEqual(list.viewport, { width: 390, height: 844 }); assert.equal(list.overflow, false, JSON.stringify(list)); assert.equal(list.overlay, false); assert(list.mobileCards > 0); assert(list.headings.includes("Site visits")); assert(list.inputMinFont >= 16);

  await navigate(`http://localhost:3000/dashboard/site-visits/${visitId}`); await pause(700);
  await evaluate(`document.querySelectorAll('h2')[2]?.scrollIntoView()`); await pause(700);
  const detail = await pageEvidence();
  assert.deepEqual(detail.viewport, { width: 390, height: 844 }); assert.equal(detail.overflow, false, JSON.stringify(detail.wideElements)); assert.equal(detail.overlay, false); assert(detail.headings.includes("Measurements")); assert(detail.headings.includes("Site photos")); assert(detail.headings.includes("Activity timeline")); assert(detail.links.includes("Open map")); assert(detail.links.includes("Call")); assert(detail.links.includes("WhatsApp")); assert(detail.buttons.includes("Add measurement")); assert(detail.buttons.includes("Upload selected photos")); assert(detail.buttons.includes("Add follow-up")); assert(detail.inputMinFont >= 16);
  const imageState = await evaluate(`Promise.all([...document.images].map(img => img.decode().catch(()=>null))).then(()=>[...document.images].map(x=>({alt:x.alt,complete:x.complete,naturalWidth:x.naturalWidth})))`);
  assert.equal(imageState.length, 3); assert(imageState.every((image) => image.complete && image.naturalWidth > 0));
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  const screenshotPath = join(process.cwd(), ".qa-runtime", "phase2c-mobile-390x844.png"); await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  await navigate(`http://localhost:3000/dashboard/site-visits/${secondVisitId}`);
  const status = await pageEvidence();
  assert.equal(status.overflow, false); assert(status.buttons.includes("Confirm")); assert(status.buttons.includes("Start visit") === false); assert(status.buttons.includes("No show"));
  await send("Network.clearBrowserCookies");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false, screenWidth: 1280, screenHeight: 720 });
  await login(adminEmail);
  await navigate("http://localhost:3000/dashboard/site-visits"); await pause(1000);
  const desktopList = await pageEvidence();
  assert.deepEqual(desktopList.viewport, { width: 1280, height: 720 }); assert.equal(desktopList.overflow, false); assert.equal(desktopList.overlay, false); assert(desktopList.links.includes("New site visit")); assert(await evaluate(`getComputedStyle(document.querySelector('table')).display !== 'none'`));
  await navigate(`http://localhost:3000/dashboard/site-visits/${secondVisitId}`); await pause(1200);
  const desktopDetail = await pageEvidence();
  assert.deepEqual(desktopDetail.viewport, { width: 1280, height: 720 }); assert.equal(desktopDetail.overflow, false); assert.equal(desktopDetail.overlay, false); assert(desktopDetail.buttons.includes("Save assignment")); assert(desktopDetail.buttons.includes("Save schedule and site")); assert(desktopDetail.buttons.includes("Reschedule")); assert(desktopDetail.buttons.includes("Cancel"));
  const desktopScreenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  const desktopScreenshotPath = join(process.cwd(), ".qa-runtime", "phase2c-desktop-1280x720.png"); await writeFile(desktopScreenshotPath, Buffer.from(desktopScreenshot.data, "base64"));
  assert.equal(consoleErrors.length, 0, `Chrome console errors: ${consoleErrors.join(" | ")}`);
  console.log(JSON.stringify({ status: "passed", browser: "Google Chrome", list, detail: { viewport: detail.viewport, overflow: detail.overflow, inputMinFont: detail.inputMinFont, headings: detail.headings, actions: detail.buttons, links: detail.links, images: imageState }, scheduledActions: status.buttons, desktop: { list: desktopList, detail: desktopDetail, screenshotPath: desktopScreenshotPath }, screenshotPath, consoleErrors }, null, 2));
} finally {
  try { socket?.close(); } catch {}
  processHandle.kill();
  await pause(300);
  await rm(profileDir, { recursive: true, force: true });
}
