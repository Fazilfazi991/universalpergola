import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const fixture=JSON.parse(await readFile(".qa-runtime/phase2g-fixture.json","utf8"));
const envText=await readFile(".env.local","utf8");
const env=Object.fromEntries(envText.split(/\r?\n/).filter((line)=>line&&!line.startsWith("#")).map((line)=>{const at=line.indexOf("=");return[line.slice(0,at),line.slice(at+1).replace(/^["']|["']$/g,"")];}));
assert(fixture.adminEmail&&fixture.siteEmail&&fixture.accountsEmail&&fixture.password&&fixture.projectId,"Phase 2G hosted fixture required");
const management=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
assert.ifError((await management.auth.signInWithPassword({email:fixture.adminEmail,password:fixture.password})).error);
assert.ifError((await management.from("feedback").delete().eq("project_id",fixture.projectId)).error);
const fresh=await management.rpc("request_project_feedback",{p_project_id:fixture.projectId,p_expires_at:new Date(Date.now()+30*86400000).toISOString()});assert.ifError(fresh.error);const token=fresh.data;

const chrome="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", port=9400+Math.floor(Math.random()*300);
const profileDir=await mkdtemp(join(tmpdir(),"pergola-phase2g-chrome-"));
const chromeProcess=spawn(chrome,["--headless=new",`--remote-debugging-port=${port}`,`--user-data-dir=${profileDir}`,"--no-first-run","--disable-gpu","--window-size=390,844","about:blank"],{stdio:"ignore"});
const pause=(ms)=>new Promise((done)=>setTimeout(done,ms));
async function endpoint(path){for(let i=0;i<80;i++){try{const response=await fetch(`http://127.0.0.1:${port}${path}`);if(response.ok)return response.json();}catch{}await pause(100);}throw new Error("Chrome DevTools endpoint did not start");}
let socket,sequence=0;const pending=new Map(),consoleErrors=[];
function send(method,params={}){const id=++sequence;socket.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));}
async function evaluate(expression){const response=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;}
async function waitFor(expression,label,attempts=240){for(let i=0;i<attempts;i++){if(await evaluate(expression))return;await pause(100);}throw new Error(`Timed out waiting for ${label}`);}
async function navigate(url){await send("Page.navigate",{url});await waitFor(`location.href.startsWith(${JSON.stringify(url)})&&document.readyState!=="loading"&&document.body?.innerText?.trim().length>0`,url);await waitFor("!document.querySelector('[aria-busy=\"true\"], .animate-pulse')",`${url} settled`);assert.equal(await evaluate("document.querySelector('[data-nextjs-dialog]')===null"),true,`Next.js error overlay on ${url}`);}
async function navigateWithRedirect(url){await send("Page.navigate",{url});await waitFor("location.pathname==='/dashboard'&&document.readyState!=='loading'&&document.body?.innerText?.trim().length>0","redirected page",700);await pause(750);}
async function setViewport(width,height){await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<600});}
async function screenshot(name){const result=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await writeFile(`.qa-runtime/${name}`,Buffer.from(result.data,"base64"));}
async function assertPage(label,required=[]){const state=await evaluate(`(()=>({body:document.body.innerText,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,blank:!document.body.innerText.trim(),overlay:!!document.querySelector('[data-nextjs-dialog]')}))()`);assert.equal(state.blank,false,`${label} blank`);assert.equal(state.overlay,false,`${label} error overlay`);assert.equal(state.overflow,false,`${label} horizontal overflow`);for(const text of required)assert.match(state.body,new RegExp(text,"i"),`${label} missing ${text}`);return state.body;}
async function setField(selector,value){const ok=await evaluate(`(()=>{const field=document.querySelector(${JSON.stringify(selector)});if(!field)return false;const proto=field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(field,${JSON.stringify(value)});field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);assert.equal(ok,true,`Missing ${selector}`);}
async function clearSession(){await send("Network.clearBrowserCookies");await send("Storage.clearDataForOrigin",{origin:"http://localhost:3000",storageTypes:"all"});}
async function login(email){await navigate("http://localhost:3000/login");await setField("#email",email);await setField("#password",fixture.password);await evaluate("document.querySelector('form').requestSubmit()");await waitFor("location.pathname==='/dashboard'","dashboard login");}

await mkdir(".qa-runtime",{recursive:true});
try{
  const pages=await endpoint("/json/list");const pageTarget=pages.find((item)=>item.type==="page"&&item.url==="about:blank")||pages.find((item)=>item.type==="page")||pages[0];socket=new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
  socket.addEventListener("message",(event)=>{const msg=JSON.parse(event.data);if(msg.id&&pending.has(msg.id)){const item=pending.get(msg.id);pending.delete(msg.id);if(msg.error){item.reject(new Error(msg.error.message));}else{item.resolve(msg.result);}return;}if(msg.method==="Runtime.exceptionThrown")consoleErrors.push(msg.params.exceptionDetails.text);if(msg.method==="Runtime.consoleAPICalled"&&msg.params.type==="error")consoleErrors.push(msg.params.args.map((arg)=>arg.value||arg.description).join(" "));});
  await send("Page.enable");await send("Runtime.enable");await send("Network.enable");await setViewport(390,844);
  await navigate(`http://localhost:3000/feedback/${token}`);await assertPage("mobile public feedback",["Your perspective matters","Project reference",fixture.projectNumber]);await screenshot("phase2g-mobile-feedback-390x844.png");
  assert.equal(await evaluate("(()=>{document.querySelector('input[name=\"rating\"][value=\"5\"]').click();document.querySelector('input[name=\"permission\"]').click();return true})()"),true);await setField("textarea[name=comment]","Chrome QA confirms a clear and professional handover.");await evaluate("document.querySelector('form').requestSubmit()");await waitFor("document.body.innerText.includes('Thank you.')","public feedback success");await assertPage("public feedback success",["Thank you","received"]);await screenshot("phase2g-mobile-feedback-success-390x844.png");
  await navigate(`http://localhost:3000/feedback/${token}`);await assertPage("duplicate-safe feedback reload",["Feedback already received"]);
  await navigate(`http://localhost:3000/feedback/11111111-1111-4111-8111-111111111111`);await assertPage("invalid feedback token",["link is not available"]);
  await clearSession();await login(fixture.adminEmail);await setViewport(390,844);
  await navigate(`http://localhost:3000/dashboard/projects/${fixture.projectId}`);const mobileProject=await assertPage("mobile completion summary",["Completion summary","Completion checklist","8/8","Customer feedback","Outstanding"]);assert.match(mobileProject,/Chrome QA confirms/i);await screenshot("phase2g-mobile-project-390x844.png");
  await navigate("http://localhost:3000/dashboard/reports?range=today");const mobileReport=await assertPage("mobile reports",["Management reports","Conversion","Project delivery","Finance position","Customer satisfaction"]);assert.match(mobileReport,new RegExp(`Enquiries\\s+${fixture.expected.enquiries}`,"i"));await screenshot("phase2g-mobile-reports-390x844.png");
  await navigate("http://localhost:3000/dashboard/feedback?status=received");await assertPage("mobile feedback queue",["Customer feedback",fixture.projectNumber,"5 / 5","Chrome QA confirms"]);await screenshot("phase2g-mobile-feedback-queue-390x844.png");
  await setViewport(1280,720);await navigate("http://localhost:3000/dashboard/reports?range=today");await assertPage("desktop reports",["Management reports","Lead sources","Delayed projects","Collections trend"]);await screenshot("phase2g-desktop-reports-1280x720.png");
  await navigate(`http://localhost:3000/dashboard/projects/${fixture.projectId}`);await assertPage("desktop project",["Completion summary","Completion checklist","Activity timeline"]);await screenshot("phase2g-desktop-project-1280x720.png");
  await clearSession();await login(fixture.siteEmail);await navigateWithRedirect("http://localhost:3000/dashboard/reports");assert.equal(await evaluate("location.pathname"),"/dashboard");await assertPage("Site Team report denial",["Access restricted"]);
  await clearSession();await login(fixture.accountsEmail);await navigateWithRedirect("http://localhost:3000/dashboard/reports");assert.equal(await evaluate("location.pathname"),"/dashboard");await assertPage("Accounts report denial",["Access restricted"]);
  assert.deepEqual(consoleErrors,[],`Browser console errors: ${consoleErrors.join(" | ")}`);
  console.log(JSON.stringify({status:"passed",engine:"Google Chrome",viewports:["390x844","1280x720"],checks:["public feedback form and success","invalid and reused tokens","completion summary and 8/8 checklist","feedback queue","management reports and authority count","Site Team report denial","Accounts report denial","no console errors","no error overlays","no horizontal overflow"],screenshots:["phase2g-mobile-feedback-390x844.png","phase2g-mobile-feedback-success-390x844.png","phase2g-mobile-project-390x844.png","phase2g-mobile-reports-390x844.png","phase2g-mobile-feedback-queue-390x844.png","phase2g-desktop-reports-1280x720.png","phase2g-desktop-project-1280x720.png"]},null,2));
}finally{try{socket?.close();}catch{}chromeProcess.kill();await pause(750);try{await rm(profileDir,{recursive:true,force:true});}catch{}await management.auth.signOut();}
