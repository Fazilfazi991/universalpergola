import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envText = await readFile(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line)=>line&&!line.startsWith("#")).map((line)=>{const at=line.indexOf("=");return [line.slice(0,at),line.slice(at+1).replace(/^["']|["']$/g,"")];}));
const url=env.NEXT_PUBLIC_SUPABASE_URL, key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, secret=process.env.SUPABASE_SECRET_KEY;
assert(url&&key&&secret,"Hosted public configuration and SUPABASE_SECRET_KEY are required");
const options={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
const make=()=>createClient(url,key,options);
const service=createClient(url,secret,options);
const admin=make(), site=make(), accounts=make(), anonymous=make();
const checks=[]; const pass=(name,evidence="pass")=>checks.push({name,evidence});
const runId=randomUUID().slice(0,8), password=`${randomBytes(24).toString("base64url")}aA1!`;
const qaUsers={};
async function provision(role,client){const email=`qa-phase2g-${runId}-${role}@example.com`;const made=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`QA Phase 2G ${role}`}});assert.ifError(made.error);assert(made.data.user);assert.ifError((await service.from("profiles").update({role,status:"active"}).eq("id",made.data.user.id)).error);const signed=await client.auth.signInWithPassword({email,password});assert.ifError(signed.error);qaUsers[role]={id:made.data.user.id,email};return made.data.user;}
async function data(promise,label){const result=await promise;assert.ifError(result.error);assert(result.data!==null,`${label}: missing data`);return result.data;}
async function denied(promise,label){const result=await promise;const empty=Array.isArray(result.data)&&result.data.length===0;assert(result.error||empty,`${label}: unexpectedly succeeded`);pass(label,result.error?.message||"zero rows");}

const adminUser=await provision("admin",admin);
const siteUser=await provision("site_team",site); await provision("accounts",accounts);
let createdFixture=null;
  const category=await data(admin.from("product_categories").insert({name:`Phase 2G QA ${runId}`,slug:`phase-2g-${runId}`,description:"Disposable hosted acceptance category",created_by:adminUser.id}).select("id").single(),"QA category");
  const product=await data(admin.from("products").insert({category_id:category.id,name:`Phase 2G Pergola ${runId}`,slug:`phase-2g-pergola-${runId}`,product_code:`P2G-${runId.toUpperCase()}`,short_description:"Disposable Phase 2G workflow product",full_description:"Hosted acceptance product for the complete customer journey.",pricing_mode:"fixed_price",price:45000,currency:"AED",is_published:true,published_at:new Date().toISOString(),created_by:adminUser.id}).select("id").single(),"QA product");
  const customer=await data(admin.from("customers").insert({name:`Phase 2G Customer ${runId}`,customer_type:"individual",phone:"+971501234567",email:`phase2g-${runId}@example.com`,address:"QA Villa, Dubai",area:"Dubai Hills",emirate:"Dubai",source:"Phase 2G hosted QA",assigned_to:adminUser.id,created_by:adminUser.id}).select("id").single(),"QA customer");
  const enquiry=await data(admin.from("enquiries").insert({customer_id:customer.id,product_id:product.id,enquiry_type:"catalogue",subject:"Phase 2G complete journey",message:"Disposable hosted acceptance enquiry",source:"Phase 2G hosted QA",priority:"normal",status:"site_visit_required",assigned_to:adminUser.id,created_by:adminUser.id}).select("id,enquiry_number").single(),"QA enquiry");
  const visit=await data(admin.from("site_visits").insert({customer_id:customer.id,enquiry_id:enquiry.id,assigned_to:siteUser.id,scheduled_at:new Date(Date.now()-3600000).toISOString(),site_address:"QA Villa, Dubai Hills",area:"Dubai Hills",emirate:"Dubai",contact_person:"QA Customer",created_by:adminUser.id}).select("id,visit_number").single(),"QA site visit");
  for(const status of ["confirmed","in_progress","completed"])assert.ifError((await site.from("site_visits").update(status==="completed"?{status,measurement_summary:"Verified 5.4m × 4.2m installation area."}:{status}).eq("id",visit.id)).error);
  const issue=new Date().toISOString().slice(0,10), validity=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  const quotationId=await data(admin.rpc("save_quotation_draft",{p_quotation_id:null,p_payload:{customer_id:customer.id,enquiry_id:enquiry.id,site_visit_id:visit.id,owner_id:adminUser.id,currency:"AED",issue_date:issue,validity_date:validity,customer_name_snapshot:`Phase 2G Customer ${runId}`,customer_company_snapshot:"",customer_phone_snapshot:"+971501234567",customer_email_snapshot:`phase2g-${runId}@example.com`,site_address_snapshot:"QA Villa, Dubai Hills",introduction:"Phase 2G end-to-end acceptance.",internal_notes:"Disposable hosted QA",customer_notes:"Approved scope",terms:"DEVELOPMENT PLACEHOLDER — QA only.",discount_type:"fixed",discount_value:"0",vat_rate:"5",items:[{product_id:product.id,source_measurement_id:null,item_name:`Phase 2G Pergola ${runId}`,description:"Motorised louvered pergola",quantity:"1",unit:"project",width:"5400",height:"2900",length:"4200",dimensions_details:"Verified site dimensions",unit_price:"45000",discount_amount:"0",taxable:true,sort_order:10}]}}),"QA quotation");
  assert.ifError((await admin.from("quotations").update({status:"ready"}).eq("id",quotationId)).error);assert.ifError((await admin.from("quotations").update({status:"sent"}).eq("id",quotationId)).error);assert.ifError((await admin.from("quotations").update({status:"approved",decision_note:"Phase 2G approval"}).eq("id",quotationId)).error);
  const projectId=await data(admin.rpc("convert_approved_quotation_to_project",{p_quotation_id:quotationId}),"QA project conversion");
  const project=await data(admin.from("projects").select("id,project_number,status,handover_status,project_value,currency,customer_id").eq("id",projectId).single(),"QA project");
  createdFixture={runId,categoryId:category.id,productId:product.id,customerId:customer.id,enquiryId:enquiry.id,visitId:visit.id,quotationId,projectId};
  pass("Complete journey source","Published product, enquiry, customer, completed site visit, approved quotation, and converted project created");

const stages=await data(admin.from("project_stages").select("id,stage_key,status").eq("project_id",project.id).order("sort_order"),"project stages");
const byKey=Object.fromEntries(stages.map((row)=>[row.stage_key,row]));
assert.ifError((await admin.rpc("set_project_assignment",{p_project_id:project.id,p_user_id:siteUser.id,p_assignment_role:"site_team",p_enabled:true})).error);
if(project.status==="planned")assert.ifError((await admin.rpc("update_project_details",{p_project_id:project.id,p_status:"active",p_priority:"normal",p_start_date:new Date().toISOString().slice(0,10),p_target_date:new Date(Date.now()+30*86400000).toISOString().slice(0,10),p_installation_date:new Date().toISOString().slice(0,10),p_summary:"Phase 2G hosted workflow",p_notes:"Disposable QA project"})).error);
const today=new Date().toISOString().slice(0,10);
for(const keyName of ["design","planning_approval","manufacturing","installation","handover"]){
  const stage=byKey[keyName];
  const actor=["design","planning_approval"].includes(keyName)?admin:site;
  const current=await data(actor.from("project_stages").select("status").eq("id",stage.id).single(),`${keyName} state`);
  if(current.status==="completed"||current.status==="skipped")continue;
  if(current.status==="not_started")assert.ifError((await actor.rpc("transition_project_stage",{p_stage_id:stage.id,p_action:"start",p_note:`Phase 2G ${keyName} start`})).error);
  if(keyName==="handover")assert.ifError((await site.rpc("update_project_handover",{p_project_id:project.id,p_status:"completed",p_handover_date:today,p_contact:"QA Customer Representative",p_notes:"Phase 2G final handover accepted"})).error);
  assert.ifError((await actor.rpc("transition_project_stage",{p_stage_id:stage.id,p_action:"complete",p_note:`Phase 2G ${keyName} sign-off`})).error);
}
if(project.status!=="completed")assert.ifError((await admin.rpc("complete_project",{p_project_id:project.id,p_completion_note:"Phase 2G completion and feedback acceptance"})).error);
const finance=await data(admin.rpc("get_project_finance_summary",{p_project_id:project.id}),"project finance");
assert(finance.length===1&&Number(finance[0].outstanding)>0,"Retained project should verify non-blocking outstanding balance");
pass("Completion with outstanding balance",`${project.project_number} completed while ${finance[0].currency} ${Number(finance[0].outstanding).toFixed(2)} remained visible`);

for(const keyName of ["installation_complete","site_cleaned","final_testing_complete","customer_handover_complete","handover_documents_provided","completion_photos_uploaded","snag_items_reviewed"])
  assert.ifError((await admin.rpc("update_completion_checklist",{p_project_id:project.id,p_key:keyName,p_completed:true,p_note:`QA ${keyName.replaceAll("_"," ")}`})).error);
const initialChecklist=await data(admin.from("tasks").select("completion_checklist_key,status,completed_at,completed_by").eq("project_id",project.id).not("completion_checklist_key","is",null),"completion checklist");
assert.equal(initialChecklist.length,8); assert(initialChecklist.every((row)=>row.completed_by===adminUser.id||row.completion_checklist_key==="feedback_requested"));

const expires=new Date(Date.now()+30*86400000).toISOString();
const token=await data(admin.rpc("request_project_feedback",{p_project_id:project.id,p_expires_at:expires}),"feedback token");
assert.match(token,/^[0-9a-f-]{36}$/); const repeatedToken=await data(admin.rpc("request_project_feedback",{p_project_id:project.id,p_expires_at:expires}),"idempotent request"); assert.equal(repeatedToken,token);
const context=await data(anonymous.rpc("get_public_feedback_context",{p_token:token}),"public feedback context");
assert.deepEqual(Object.keys(context[0]).sort(),["expires_at","feedback_state","project_reference"]); assert.equal(context[0].project_reference,project.project_number);
pass("Scoped public context","Only project reference, feedback state, and expiry returned");
await denied(anonymous.from("feedback").select("*"),"Anonymous raw feedback read denied");
await denied(anonymous.from("projects").select("*"),"Anonymous project read denied");
await denied(anonymous.from("customers").select("*"),"Anonymous customer read denied");
const submission=await data(anonymous.rpc("submit_public_feedback",{p_token:token,p_rating:5,p_comment:"Excellent installation and a clear handover.",p_permission:true,p_honeypot:""}),"public feedback submission"); assert.equal(submission,"submitted");
const duplicate=await data(anonymous.rpc("submit_public_feedback",{p_token:token,p_rating:1,p_comment:"Duplicate must not overwrite",p_permission:false,p_honeypot:""}),"duplicate submission"); assert.equal(duplicate,"already_submitted");
const stored=await data(admin.from("feedback").select("id,project_id,status,customer_rating,customer_comments,permission_to_publish_testimonial,source").eq("project_id",project.id).single(),"stored feedback");
assert.equal(stored.project_id,project.id);assert.equal(stored.customer_rating,5);assert.equal(stored.customer_comments,"Excellent installation and a clear handover.");assert.equal(stored.permission_to_publish_testimonial,true);assert.equal(stored.source,"public_link");
await denied(anonymous.rpc("submit_public_feedback",{p_token:randomUUID(),p_rating:5,p_comment:"Guess",p_permission:false,p_honeypot:""}),"Guessed feedback token denied");
await denied(site.from("feedback").select("id").eq("project_id",project.id),"Site Team private feedback denied");
await denied(accounts.from("feedback").select("id").eq("project_id",project.id),"Accounts private feedback denied");
await denied(site.rpc("request_project_feedback",{p_project_id:project.id,p_expires_at:expires}),"Site Team feedback request RPC denied");
await denied(accounts.rpc("update_feedback_review",{p_feedback_id:stored.id,p_status:"reviewed",p_internal_notes:"Bypass"}),"Accounts review RPC denied");
assert.ifError((await admin.rpc("update_feedback_review",{p_feedback_id:stored.id,p_status:"reviewed",p_internal_notes:"Verified customer consent and completion record."})).error);
const finalized=await data(admin.from("feedback").select("status,customer_rating,reviewed_at,reviewed_by").eq("id",stored.id).single(),"reviewed feedback");assert.equal(finalized.status,"reviewed");assert(finalized.reviewed_at);assert.equal(finalized.reviewed_by,adminUser.id);
const checklist=await data(admin.from("tasks").select("status").eq("project_id",project.id).not("completion_checklist_key","is",null),"final checklist");assert(checklist.every((row)=>row.status==="completed"));
const events=await data(admin.from("activity_logs").select("event_type").eq("entity_type","projects").eq("entity_id",project.id),"project events");
for(const event of ["project.completed","completion_checklist.updated","feedback.requested","feedback.submitted","feedback.reviewed","feedback.testimonial_permission_recorded"])assert(events.some((row)=>row.event_type===event),`Missing ${event}`);
pass("Feedback lifecycle","Request, minimal public context, one-time submission, testimonial consent, review, and activity events verified");
pass("Role and RLS acceptance","Anonymous, Site Team, and Accounts bypasses denied; Management workflow succeeded");

const [enquiries,quotes,projects,receipts,feedbackRows]=await Promise.all([
  data(admin.from("enquiries").select("id").gte("created_at",`${today}T00:00:00+04:00`).lte("created_at",`${today}T23:59:59+04:00`).is("archived_at",null),"enquiry records"),
  data(admin.from("quotations").select("id,total,status").gte("created_at",`${today}T00:00:00+04:00`).lte("created_at",`${today}T23:59:59+04:00`).is("archived_at",null),"quotation records"),
  data(admin.from("projects").select("id,status,project_value").is("archived_at",null),"project records"),
  data(admin.from("payments").select("amount_received").gte("received_date",today).lte("received_date",today).is("voided_at",null).is("archived_at",null),"receipt records"),
  data(admin.from("feedback").select("customer_rating").gte("submitted_at",`${today}T00:00:00+04:00`).lte("submitted_at",`${today}T23:59:59+04:00`),"feedback records"),
]);
const expected={date:today,enquiries:enquiries.length,quotations:quotes.length,approvedValue:quotes.filter((row)=>row.status==="approved").reduce((sum,row)=>sum+Number(row.total),0),projects:projects.length,received:receipts.reduce((sum,row)=>sum+Number(row.amount_received),0),feedbackReceived:feedbackRows.length,feedbackAverage:feedbackRows.length?feedbackRows.reduce((sum,row)=>sum+Number(row.customer_rating),0)/feedbackRows.length:null};
pass("Report authority snapshot",JSON.stringify(expected));
const fixture={status:"passed",projectId:project.id,projectNumber:project.project_number,feedbackId:stored.id,token,adminEmail:qaUsers.admin.email,siteEmail:qaUsers.site_team.email,accountsEmail:qaUsers.accounts.email,password,expected,createdFixture,checks,userIds:Object.values(qaUsers).map((item)=>item.id)};
await mkdir(".qa-runtime",{recursive:true}); await writeFile(".qa-runtime/phase2g-fixture.json",`${JSON.stringify(fixture,null,2)}\n`,{mode:0o600});
console.log(JSON.stringify({status:"passed",project:project.project_number,expected,checks},null,2));
