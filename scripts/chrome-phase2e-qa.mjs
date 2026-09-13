import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const fixture = JSON.parse(await readFile(".qa-runtime/phase2e-fixture.json", "utf8"));
assert(fixture.adminEmail && fixture.password && fixture.projectId, "Phase 2E retained fixture is required");

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profileDir = await mkdtemp(join(tmpdir(), "pergola-phase2e-chrome-"));
const port = 9335;
const chromeProcess = spawn(chrome, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--disable-gpu",
  "--window-size=390,844",
  "about:blank",
], { stdio: "ignore" });
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

async function endpoint(path) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      if (response.ok) return response.json();
    } catch {}
    await pause(100);
  }
  throw new Error("Google Chrome DevTools endpoint did not start");
}

let socket;
let sequence = 0;
const pending = new Map();
const consoleErrors = [];
function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolvePromise, reject) => pending.set(id, { resolve: resolvePromise, reject }));
}
async function evaluate(expression) {
  const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || "Chrome evaluation failed");
  return response.result.value;
}
async function navigate(url) {
  await send("Page.navigate", { url });
  let state;
  for (let attempt = 0; attempt < 150; attempt += 1) {
    await pause(100);
    state = await evaluate(`({ready:document.readyState,url:location.href,text:document.body?.innerText?.length||0})`);
    if (state.url.startsWith(url) && state.text > 0) return state;
  }
  throw new Error(`Timed out navigating to ${url}: ${JSON.stringify(state)}`);
}
async function waitFor(expression, label, attempts = 150) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(expression)) return;
    await pause(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}
async function pageEvidence() {
  return evaluate(`(() => {
    const fields=[...document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]),select,textarea')];
    const bounds=[...document.querySelectorAll('body *')].map(x=>({tag:x.tagName,text:(x.textContent||'').trim().slice(0,60),left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right}));
    return {
      viewport:{width:innerWidth,height:innerHeight},
      documentWidth:document.documentElement.scrollWidth,
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
      overlay:Boolean(document.querySelector('[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay')),
      headings:[...document.querySelectorAll('h1,h2,h3')].map(x=>x.textContent.trim()),
      buttons:[...document.querySelectorAll('button')].map(x=>x.textContent.trim()).filter(Boolean),
      minInputFont:fields.length?Math.min(...fields.map(x=>parseFloat(getComputedStyle(x).fontSize)||999)):null,
      wideElements:bounds.filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,10),
      bodyText:document.body.innerText.slice(0,12000)
    };
  })()`);
}
async function screenshot(name) {
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  const path = join(process.cwd(), ".qa-runtime", name);
  await writeFile(path, Buffer.from(shot.data, "base64"));
  return path;
}
async function login() {
  await navigate("http://localhost:3000/login");
  await evaluate(`(() => {
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    const email=document.querySelector('#email'), password=document.querySelector('#password');
    setter.call(email,${JSON.stringify(fixture.adminEmail)}); email.dispatchEvent(new Event('input',{bubbles:true}));
    setter.call(password,${JSON.stringify(fixture.password)}); password.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('form').requestSubmit(); return true;
  })()`);
  await waitFor(`location.pathname==='/dashboard'`, "authenticated dashboard");
}
async function setField(selector, value) {
  const changed = await evaluate(`(() => {
    const field=document.querySelector(${JSON.stringify(selector)}); if(!field) return false;
    const proto=field instanceof HTMLSelectElement?HTMLSelectElement.prototype:field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(field,${JSON.stringify(value)});
    field.dispatchEvent(new Event('input',{bubbles:true})); field.dispatchEvent(new Event('change',{bubbles:true})); return true;
  })()`);
  assert.equal(changed, true, `Missing field ${selector}`);
}
async function clickText(text, scope = "document") {
  const clicked = await evaluate(`(() => {
    const root=${scope}; const button=[...root.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)} && !x.disabled);
    if(!button) return false; button.click(); return true;
  })()`);
  assert.equal(clicked, true, `Missing enabled button ${text}`);
}
async function clickStage(stage, action) {
  const clicked = await evaluate(`(() => {
    const heading=[...document.querySelectorAll('h3')].find(x=>x.textContent.trim()===${JSON.stringify(stage)});
    const root=heading?.closest('li'); const button=[...(root?.querySelectorAll('button')||[])].find(x=>x.textContent.trim()===${JSON.stringify(action)} && !x.disabled);
    if(!button) return false; button.click(); return true;
  })()`);
  assert.equal(clicked, true, `Missing ${action} for ${stage}`);
  await waitFor(`(() => { const h=[...document.querySelectorAll('h3')].find(x=>x.textContent.trim()===${JSON.stringify(stage)}); return h?.closest('li')?.innerText.includes('Completed') })()`, `${stage} completion`);
}
async function setHandoverStatus(value) {
  const changed = await evaluate(`(() => {
    const field=[...document.querySelectorAll('select[name="status"]')].find(x=>[...x.options].some(option=>option.value==='ready')); if(!field)return false;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(field,${JSON.stringify(value)});
    field.dispatchEvent(new Event('input',{bubbles:true})); field.dispatchEvent(new Event('change',{bubbles:true})); return true;
  })()`);
  assert.equal(changed, true, "Handover status field missing");
}

try {
  await mkdir(".qa-runtime", { recursive: true });
  const uploadPath = resolve(".qa-runtime", "browser-installation.png");
  await writeFile(uploadPath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
  const targets = await endpoint("/json/list");
  const pageTarget = targets.find((target) => target.type === "page" && target.url === "about:blank");
  assert(pageTarget, "Chrome page target was not available");
  socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id); if (!item) return; pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result); return;
    }
    if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || "Runtime exception");
    if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") consoleErrors.push(message.params.entry.text);
  });
  await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable"); await send("DOM.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false, screenWidth: 390, screenHeight: 844 });
  await login();

  await navigate("http://localhost:3000/dashboard/projects"); await waitFor(`document.body.innerText.includes('Approved work moving through planning')`, "project list");
  const mobileList = await pageEvidence();
  assert.deepEqual(mobileList.viewport, { width: 390, height: 844 });
  assert.equal(mobileList.overflow, false, JSON.stringify(mobileList.wideElements));
  assert.equal(mobileList.overlay, false); assert(mobileList.headings.includes("Projects")); assert(mobileList.bodyText.includes(fixture.projectNumber)); assert(mobileList.minInputFont >= 16);

  const detailUrl = `http://localhost:3000/dashboard/projects/${fixture.projectId}`;
  await navigate(detailUrl); await waitFor(`document.body.innerText.includes('Execution ledger')`, "project workspace");
  let mobileDetail = await pageEvidence();
  for (const heading of ["Execution ledger", "Tasks", "Operational updates", "Files & photos", "Activity timeline", "Commercial handoff", "Handover"]) assert(mobileDetail.headings.includes(heading), `Missing ${heading}`);
  assert.equal(mobileDetail.overflow, false, JSON.stringify(mobileDetail.wideElements)); assert.equal(mobileDetail.overlay, false); assert(mobileDetail.minInputFont >= 16);

  const taskTitle = `Browser installation check ${fixture.runId}`;
  await setField('input[name="title"]', taskTitle); await setField('textarea[name="description"]', "Verify mobile task workflow"); await setField('select[name="project_stage_id"]', await evaluate(`([...document.querySelector('select[name="project_stage_id"]').options].find(x=>x.textContent==='Installation')).value`));
  await clickText("Add task"); await waitFor(`document.body.innerText.includes(${JSON.stringify(taskTitle)})`, "created task");
  const taskCompleted = await evaluate(`(() => { const article=[...document.querySelectorAll('article')].find(x=>x.innerText.includes(${JSON.stringify(taskTitle)})); const button=[...(article?.querySelectorAll('button')||[])].find(x=>x.textContent.trim()==='Complete'); if(!button)return false; button.click(); return true; })()`);
  assert.equal(taskCompleted, true); await waitFor(`(() => { const article=[...document.querySelectorAll('article')].find(x=>x.innerText.includes(${JSON.stringify(taskTitle)})); return article?.innerText.includes('Completed') })()`, "task completion");

  const updateNote = `Chrome mobile update ${fixture.runId}`;
  await setField('select[name="update_type"]', "progress"); await setField('input[aria-label="Observed progress"]', "96"); await setField('textarea[name="note"]', updateNote); await clickText("Add update"); await waitFor(`document.body.innerText.includes(${JSON.stringify(updateNote)})`, "project update");

  const documentNode = await send("DOM.getDocument", { depth: -1, pierce: true });
  const fileNode = await send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: 'input[type="file"]' });
  assert(fileNode.nodeId, "Project file input missing"); await send("DOM.setFileInputFiles", { nodeId: fileNode.nodeId, files: [uploadPath] });
  await waitFor(`!document.querySelector('button') || [...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='Upload private file'&&!x.disabled)`, "enabled upload button");
  await setField('input[name="caption"]', "Chrome mobile installation evidence"); await clickText("Upload private file"); await waitFor(`document.body.innerText.includes('browser-installation.png')`, "uploaded project photo", 250);

  await clickStage("Manufacturing", "Complete"); await clickStage("Installation", "Complete");
  await setField('input[name="handover_date"]', new Date().toISOString().slice(0, 10));
  await setHandoverStatus("ready"); await clickText("Save handover"); await pause(400); await waitFor(`[...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='Save handover'&&!x.disabled)`, "handover ready");
  await setHandoverStatus("completed"); await clickText("Save handover"); await pause(400); await waitFor(`[...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='Save handover'&&!x.disabled)`, "handover completed");
  await clickStage("Handover", "Complete");
  await waitFor(`[...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='Complete project'&&!x.disabled)`, "project completion control");
  await setField('textarea[placeholder="Optional completion note"]', "Chrome Phase 2E acceptance"); await clickText("Complete project"); await waitFor(`document.body.innerText.includes('Completed') && document.body.innerText.includes('Reopen project')`, "completed project");
  await send("Page.reload", { ignoreCache: true }); await waitFor(`document.body.innerText.includes(${JSON.stringify(fixture.projectNumber)}) && document.body.innerText.includes('Reopen project')`, "session-preserving refresh");
  mobileDetail = await pageEvidence(); assert.equal(mobileDetail.overflow, false, JSON.stringify(mobileDetail.wideElements));
  const mobileScreenshot = await screenshot("phase2e-mobile-detail-390x844.png");

  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false, screenWidth: 1280, screenHeight: 720 });
  await navigate("http://localhost:3000/dashboard/projects"); await waitFor(`document.body.innerText.includes('Approved work moving through planning')`, "desktop project list");
  const desktopList = await pageEvidence(); assert.deepEqual(desktopList.viewport, { width: 1280, height: 720 }); assert.equal(desktopList.overflow, false, JSON.stringify(desktopList.wideElements)); assert.equal(desktopList.overlay, false); assert.equal(await evaluate(`getComputedStyle(document.querySelector('table')).display!=='none'`), true);
  await navigate(detailUrl); await waitFor(`document.body.innerText.includes('Execution ledger')`, "desktop project detail");
  const desktopDetail = await pageEvidence(); assert.equal(desktopDetail.overflow, false, JSON.stringify(desktopDetail.wideElements)); assert.equal(desktopDetail.overlay, false);
  const desktopScreenshot = await screenshot("phase2e-desktop-detail-1280x720.png");

  await send("Network.clearBrowserCookies"); await send("Page.navigate", { url: detailUrl }); await waitFor(`location.pathname==='/login'`, "direct-route authorization");
  assert.equal(consoleErrors.length, 0, consoleErrors.join(" | "));
  console.log(JSON.stringify({ status: "passed", browser: "Google Chrome", interactions: ["project list/detail", "vertical stage timeline", "task create/complete", "project update", "private photo upload", "manufacturing", "installation", "handover", "completion", "activity", "refresh/session", "direct-route authorization"], mobile: { viewport: mobileList.viewport, listOverflow: mobileList.overflow, detailOverflow: mobileDetail.overflow, minInputFont: Math.min(mobileList.minInputFont, mobileDetail.minInputFont), screenshot: mobileScreenshot }, desktop: { viewport: desktopList.viewport, listOverflow: desktopList.overflow, detailOverflow: desktopDetail.overflow, screenshot: desktopScreenshot }, consoleErrors }, null, 2));
} finally {
  try { socket?.close(); } catch {}
  chromeProcess.kill(); await pause(300); await rm(profileDir, { recursive: true, force: true });
}
