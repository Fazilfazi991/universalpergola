import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixture = JSON.parse(
  await readFile(".qa-runtime/phase2d-fixture.json", "utf8"),
);
assert(
  fixture.salesEmail && fixture.password && fixture.quotationId,
  "Phase 2D retained fixture is required",
);

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profileDir = await mkdtemp(join(tmpdir(), "pergola-phase2d-chrome-"));
const port = 9334;
const processHandle = spawn(
  chrome,
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--disable-gpu",
    "--window-size=390,844",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails)
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text ||
        "Chrome evaluation failed",
    );
  return response.result.value;
}
async function navigate(url) {
  await send("Page.navigate", { url });
  let lastState;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await pause(100);
    lastState = await evaluate(
      `({ready:document.readyState,url:location.href,text:document.body?.innerText?.length||0})`,
    );
    if (
      lastState.ready === "complete" &&
      lastState.text > 0 &&
      lastState.url.startsWith(url)
    )
      return lastState;
  }
  throw new Error(
    `Timed out navigating to ${url}: ${JSON.stringify(lastState)}`,
  );
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
      links:[...document.querySelectorAll('a')].map(x=>({text:x.textContent.trim(),href:x.href})).filter(x=>x.text),
      buttons:[...document.querySelectorAll('button')].map(x=>x.textContent.trim()).filter(Boolean),
      inputs:fields.map(x=>({name:x.getAttribute('name'),label:x.getAttribute('aria-label'),fieldLabel:(x.closest('label')?.innerText||'').trim().split('\\n')[0],font:parseFloat(getComputedStyle(x).fontSize)||0})),
      minInputFont:fields.length?Math.min(...fields.map(x=>parseFloat(getComputedStyle(x).fontSize)||999)):null,
      wideElements:bounds.filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,10),
      bodyText:document.body.innerText.slice(0,4000)
    };
  })()`);
}
async function login(email) {
  await navigate("http://localhost:3000/login");
  await pause(500);
  const entered = await evaluate(`(() => {
    const emailField=document.querySelector('#email');
    const passwordField=document.querySelector('#password');
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    setter.call(emailField,${JSON.stringify(email)});
    emailField.dispatchEvent(new Event('input',{bubbles:true}));
    setter.call(passwordField,${JSON.stringify(fixture.password)});
    passwordField.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('form').requestSubmit();
    return true;
  })()`);
  assert.equal(entered, true);
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await pause(100);
    if ((await evaluate("location.pathname")) === "/dashboard") return;
  }
  throw new Error(
    `Login did not reach dashboard: ${await evaluate("document.body.innerText")}`,
  );
}
async function screenshot(name) {
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  const path = join(process.cwd(), ".qa-runtime", name);
  await writeFile(path, Buffer.from(shot.data, "base64"));
  return path;
}

try {
  await mkdir(".qa-runtime", { recursive: true });
  await mkdir(join("output", "pdf"), { recursive: true });
  const targets = await endpoint("/json/list");
  const pageTarget = targets.find(
    (target) => target.type === "page" && target.url === "about:blank",
  );
  assert(pageTarget, "Chrome page target was not available");
  socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message));
      else item.resolve(message.result);
      return;
    }
    if (message.method === "Runtime.exceptionThrown")
      consoleErrors.push(
        message.params.exceptionDetails?.exception?.description ||
          message.params.exceptionDetails?.text ||
          "Runtime exception",
      );
    if (
      message.method === "Log.entryAdded" &&
      message.params.entry?.level === "error"
    )
      consoleErrors.push(message.params.entry.text);
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: 390,
    screenHeight: 844,
  });
  await login(fixture.salesEmail);

  await navigate("http://localhost:3000/dashboard/quotations");
  await pause(700);
  const mobileList = await pageEvidence();
  assert.deepEqual(mobileList.viewport, { width: 390, height: 844 });
  assert.equal(
    mobileList.overflow,
    false,
    JSON.stringify(mobileList.wideElements),
  );
  assert.equal(mobileList.overlay, false);
  assert(mobileList.headings.includes("Quotations"));
  assert(mobileList.bodyText.includes(fixture.quotationNumber));
  assert(mobileList.links.some((link) => link.text === "New quotation"));
  assert(mobileList.minInputFont >= 16);

  await navigate(
    `http://localhost:3000/dashboard/quotations/${fixture.quotationId}`,
  );
  await pause(900);
  const mobileDetail = await pageEvidence();
  assert.equal(
    mobileDetail.overflow,
    false,
    JSON.stringify(mobileDetail.wideElements),
  );
  assert.equal(mobileDetail.overlay, false);
  for (const heading of [
    "Quotation summary",
    "Line items",
    "Pricing",
    "Revision history",
    "Approval",
    "Project handoff",
  ])
    assert(mobileDetail.headings.includes(heading), `Missing ${heading}`);
  assert(mobileDetail.links.some((link) => link.text === "Download PDF"));
  const detailTextChecks = await evaluate(`({
    total:document.body.innerText.includes('Grand total'),
    revision0:document.body.innerText.includes('Revision 0'),
    revision1:document.body.innerText.includes('Revision 1'),
    project:document.body.innerText.includes('UP-P-2026-')
  })`);
  assert(
    Object.values(detailTextChecks).every(Boolean),
    JSON.stringify(detailTextChecks),
  );
  assert(!mobileDetail.buttons.includes("Approve"));
  assert(!mobileDetail.buttons.includes("Edit"));
  const mobileDetailScreenshot = await screenshot(
    "phase2d-mobile-detail-390x844.png",
  );

  const pdfResult =
    await evaluate(`fetch(${JSON.stringify(`/dashboard/quotations/${fixture.quotationId}/pdf`)},{cache:'no-store'}).then(async response=>{
    const bytes=new Uint8Array(await response.arrayBuffer());
    let binary='';
    for(let offset=0;offset<bytes.length;offset+=8192) binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
    return {ok:response.ok,status:response.status,type:response.headers.get('content-type'),cache:response.headers.get('cache-control'),disposition:response.headers.get('content-disposition'),base64:btoa(binary),size:bytes.length};
  })`);
  assert.equal(pdfResult.ok, true);
  assert.equal(pdfResult.type, "application/pdf");
  assert.match(pdfResult.cache, /private/);
  assert.match(pdfResult.cache, /no-store/);
  assert(pdfResult.size > 10000);
  const repeatedPdfResult =
    await evaluate(`fetch(${JSON.stringify(`/dashboard/quotations/${fixture.quotationId}/pdf`)},{cache:'no-store'}).then(async response=>{
    const bytes=new Uint8Array(await response.arrayBuffer());
    let binary='';
    for(let offset=0;offset<bytes.length;offset+=8192) binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
    return {ok:response.ok,base64:btoa(binary),size:bytes.length};
  })`);
  assert.equal(repeatedPdfResult.ok, true);
  assert.equal(
    repeatedPdfResult.base64,
    pdfResult.base64,
    "The same immutable quotation snapshot must generate identical PDF bytes",
  );
  const pdfPath = join(
    process.cwd(),
    "output",
    "pdf",
    "phase2d-quotation-sample.pdf",
  );
  await writeFile(pdfPath, Buffer.from(pdfResult.base64, "base64"));

  const siteLink = mobileDetail.links.find((link) =>
    /\/dashboard\/site-visits\/[0-9a-f-]+$/.test(new URL(link.href).pathname),
  );
  assert(siteLink, "Linked site visit route missing");
  await navigate(siteLink.href);
  await pause(500);
  const createFromVisitLink = await evaluate(`(() => {
    const link=[...document.querySelectorAll('a')].find(x=>x.pathname==='/dashboard/quotations/new'&&new URL(x.href).searchParams.has('visit'));
    return link?.href||null;
  })()`);
  assert(
    createFromVisitLink,
    "Create quotation from site visit action missing",
  );
  await navigate(createFromVisitLink);
  await pause(700);
  const builderBefore = await pageEvidence();
  assert.equal(
    builderBefore.overflow,
    false,
    JSON.stringify(builderBefore.wideElements),
  );
  assert.equal(builderBefore.overlay, false);
  assert(builderBefore.headings.includes("New quotation"));
  assert(builderBefore.headings.includes("Quotation items"));
  assert(builderBefore.headings.includes("Pricing summary"));
  assert(builderBefore.bodyText.includes("Main pergola footprint"));
  assert(builderBefore.minInputFont >= 16);
  assert(builderBefore.buttons.includes("Custom item"));
  await evaluate(
    `([...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Custom item')).click()`,
  );
  await pause(250);
  const builderAfter = await pageEvidence();
  assert.equal(
    builderAfter.overflow,
    false,
    JSON.stringify(builderAfter.wideElements),
  );
  assert(
    builderAfter.inputs.some((field) => field.fieldLabel === "Unit price"),
  );
  assert(
    builderAfter.inputs
      .filter((field) => field.fieldLabel === "Unit price")
      .every((field) => field.font >= 16),
  );
  assert(builderAfter.buttons.includes("Create quotation"));
  const mobileBuilderScreenshot = await screenshot(
    "phase2d-mobile-builder-390x844.png",
  );

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: 1280,
    screenHeight: 720,
  });
  await navigate("http://localhost:3000/dashboard/quotations");
  await pause(700);
  const desktopList = await pageEvidence();
  assert.deepEqual(desktopList.viewport, { width: 1280, height: 720 });
  assert.equal(
    desktopList.overflow,
    false,
    JSON.stringify(desktopList.wideElements),
  );
  assert.equal(desktopList.overlay, false);
  assert.equal(
    await evaluate(
      `getComputedStyle(document.querySelector('table')).display !== 'none'`,
    ),
    true,
  );
  await navigate(
    `http://localhost:3000/dashboard/quotations/${fixture.quotationId}`,
  );
  await pause(700);
  const desktopDetail = await pageEvidence();
  assert.equal(
    desktopDetail.overflow,
    false,
    JSON.stringify(desktopDetail.wideElements),
  );
  assert.equal(desktopDetail.overlay, false);
  assert.equal(
    await evaluate(
      `getComputedStyle(document.querySelector('table')).display !== 'none'`,
    ),
    true,
  );
  const desktopScreenshot = await screenshot(
    "phase2d-desktop-detail-1280x720.png",
  );

  await send("Network.clearBrowserCookies");
  const anonymousPdf = await evaluate(
    `fetch(${JSON.stringify(`/dashboard/quotations/${fixture.quotationId}/pdf`)},{cache:'no-store'}).then(async response=>({status:response.status,url:response.url,type:response.headers.get('content-type'),text:(await response.text()).slice(0,120)}))`,
  );
  assert(!anonymousPdf.type?.includes("application/pdf"));
  assert(
    anonymousPdf.url.includes("/login") ||
      [401, 403, 404].includes(anonymousPdf.status),
    JSON.stringify(anonymousPdf),
  );
  assert.equal(consoleErrors.length, 0, consoleErrors.join(" | "));

  console.log(
    JSON.stringify(
      {
        status: "passed",
        browser: "Google Chrome",
        mobile: {
          viewport: mobileList.viewport,
          listOverflow: mobileList.overflow,
          detailOverflow: mobileDetail.overflow,
          builderOverflow: builderAfter.overflow,
          minInputFont: Math.min(
            mobileList.minInputFont,
            builderBefore.minInputFont,
            builderAfter.minInputFont,
          ),
          screenshots: [mobileDetailScreenshot, mobileBuilderScreenshot],
        },
        desktop: {
          viewport: desktopList.viewport,
          listOverflow: desktopList.overflow,
          detailOverflow: desktopDetail.overflow,
          screenshot: desktopScreenshot,
        },
        pdf: {
          path: pdfPath,
          bytes: pdfResult.size,
          contentType: pdfResult.type,
          cacheControl: pdfResult.cache,
        },
        anonymousPdf,
        consoleErrors,
      },
      null,
      2,
    ),
  );
} finally {
  try {
    socket?.close();
  } catch {}
  processHandle.kill();
  await pause(300);
  await rm(profileDir, { recursive: true, force: true });
}
