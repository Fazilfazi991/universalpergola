import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-mode-server";
import type { AppRole } from "@/lib/auth/permissions";
import { DEMO_FINANCE, DEMO_FEEDBACK, DEMO_PROJECTS } from "@/lib/demo/data";

type Range = { from: string; to: string; fromTimestamp: string; toTimestamp: string };
type Person = { id: string; full_name: string } | null;

function money(value: unknown) { return Number(value || 0); }
function percent(numerator: number, denominator: number) { return denominator ? Math.round((numerator / denominator) * 1000) / 10 : null; }

export async function getManagementReport(range: Range, role: AppRole) {
  if (isDemoMode()) return { crm: { total: 18, newCount: 4, bySource: [["Website", 7], ["Referral", 5], ["Phone", 3], ["Instagram", 3]], trend: [["2026-09-13", 4], ["2026-09-14", 5], ["2026-09-15", 3], ["2026-09-16", 4], ["2026-09-17", 2]], byStatus: [["new", 4], ["contacted", 5], ["site_visit_required", 5], ["quotation", 3], ["approved", 1]], salesperson: [{ name: "Jordan Lee", total: 12, newCount: 2 }, { name: "Alex Morgan", total: 4, newCount: 1 }, { name: "Unassigned", total: 2, newCount: 1 }], dueFollowUps: 2, overdueFollowUps: 1 }, conversion: { enquiryToVisit: { numerator: 8, denominator: 18, rate: 44.4 }, visitToQuote: { numerator: 6, denominator: 8, rate: 75 }, quoteApproval: { numerator: 4, denominator: 6, rate: 66.7 }, approvedToProject: { numerator: 3, denominator: 4, rate: 75 } }, projects: { active: 2, completed: 1, delayed: 0, upcomingInstallations: 2, pendingHandovers: 1, byStage: [["manufacturing", 1], ["installation", 1]], delayedRows: [] }, finance: { projectValue: DEMO_FINANCE.project_value, approvedValue: 161225, received: DEMO_FINANCE.received, outstanding: DEMO_FINANCE.outstanding, overdue: DEMO_FINANCE.overdue, dueNext7: DEMO_FINANCE.due_soon, collectionTrend: [["2026-09-13", 24500], ["2026-09-14", 38200], ["2026-09-15", 27600], ["2026-09-16", 18600]], outstandingProjects: DEMO_PROJECTS.slice(0, 2).map((project) => ({ project_id: project.id, project_number: project.project_number, customer_name: project.customer?.name || "Customer", outstanding: 20400, currency: project.currency })) }, customer: { completedProjects: 5, feedbackReceived: 9, averageRating: 4.7, awaitingReview: DEMO_FEEDBACK.filter((item) => item.status === "received").length, distribution: [["5", 6], ["4", 2], ["3", 1], ["2", 0], ["1", 0]], reviewRows: DEMO_FEEDBACK.filter((item) => item.status === "received") } } as never;
  if (role !== "admin") throw new Error("Management report access is restricted.");
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());
  const next7 = new Date(`${today}T00:00:00+04:00`); next7.setDate(next7.getDate() + 7);
  const next7Date = next7.toISOString().slice(0, 10);

  const [enquiriesResult, visitsResult, quotesResult, projectsResult, followUpsResult, paymentsResult, financeResult, milestonesResult, feedbackResult, feedbackReviewResult] = await Promise.all([
    supabase.from("enquiries").select("id, status, source, assigned_to, created_at, assigned:profiles!enquiries_assigned_to_fkey(id, full_name)").gte("created_at", range.fromTimestamp).lte("created_at", range.toTimestamp).is("archived_at", null).limit(2000),
    supabase.from("site_visits").select("id, enquiry_id, scheduled_at, created_at, status").gte("created_at", range.fromTimestamp).lte("created_at", range.toTimestamp).is("archived_at", null).limit(2000),
    supabase.from("quotations").select("id, site_visit_id, status, total, currency, created_at, approved_at").gte("created_at", range.fromTimestamp).lte("created_at", range.toTimestamp).is("archived_at", null).limit(2000),
    supabase.from("projects").select("id, quotation_id, project_number, status, project_value, currency, created_at, actual_completion_date, expected_completion_date, installation_date, handover_status, customer:customers!projects_customer_id_fkey(id, name), current_stage:project_stages!projects_current_stage_id_fkey(stage_key, name)").is("archived_at", null).limit(1000),
    supabase.from("tasks").select("id, due_at, status, assigned:profiles!tasks_assigned_to_fkey(id, full_name)").eq("kind", "enquiry_follow_up").in("status", ["open", "in_progress", "blocked"]).not("due_at", "is", null).is("archived_at", null).limit(2000),
    supabase.from("payments").select("id, amount_received, received_date, voided_at, archived_at").gte("received_date", range.from).lte("received_date", range.to).is("voided_at", null).is("archived_at", null).limit(3000),
    supabase.rpc("get_finance_project_summaries"),
    supabase.rpc("get_finance_milestone_queue"),
    supabase.from("feedback").select("id, status, customer_rating, submitted_at, updated_at, project:projects!feedback_project_id_fkey(id, project_number, customer:customers!projects_customer_id_fkey(id, name))").gte("submitted_at", range.fromTimestamp).lte("submitted_at", range.toTimestamp).limit(1000),
    supabase.from("feedback").select("id, status, customer_rating, submitted_at, updated_at, project:projects!feedback_project_id_fkey(id, project_number, customer:customers!projects_customer_id_fkey(id, name))").eq("status", "received").order("submitted_at", { ascending:false }).limit(50),
  ]);
  const failures = [enquiriesResult, visitsResult, quotesResult, projectsResult, followUpsResult, paymentsResult, financeResult, milestonesResult, feedbackResult, feedbackReviewResult].filter((result) => result.error);
  if (failures.length) throw new Error(`Unable to load management report: ${failures[0].error?.message}`);

  const enquiries = (enquiriesResult.data || []) as { id:string; status:string; source:string|null; assigned_to:string|null; created_at:string; assigned:Person }[];
  const visits = visitsResult.data || [];
  const quotes = quotesResult.data || [];
  const projects = projectsResult.data || [];
  const followUps = followUpsResult.data || [];
  const payments = paymentsResult.data || [];
  const finance = financeResult.data || [];
  const milestones = milestonesResult.data || [];
  const feedback = feedbackResult.data || [];
  const feedbackReview = feedbackReviewResult.data || [];
  const enquiryIds = new Set(enquiries.map((item) => item.id));
  const visitsWithEligibleEnquiry = new Set(visits.filter((item) => item.enquiry_id && enquiryIds.has(item.enquiry_id)).map((item) => item.enquiry_id!));
  const visitIds = new Set(visits.map((item) => item.id));
  const quotedVisitIds = new Set(quotes.filter((item) => item.site_visit_id && visitIds.has(item.site_visit_id)).map((item) => item.site_visit_id!));
  const customerFacingQuotes = quotes.filter((item) => ["sent", "approved", "rejected"].includes(item.status));
  const approvedQuotes = quotes.filter((item) => item.status === "approved");
  const approvedIds = new Set(approvedQuotes.map((item) => item.id));
  const convertedQuoteIds = new Set(projects.filter((item) => item.quotation_id && approvedIds.has(item.quotation_id)).map((item) => item.quotation_id!));
  const activeProjects = projects.filter((item) => ["planned", "active", "on_hold"].includes(item.status));
  const completedProjects = projects.filter((item) => item.actual_completion_date && item.actual_completion_date >= range.from && item.actual_completion_date <= range.to && item.status === "completed");
  const delayedProjects = activeProjects.filter((item) => item.expected_completion_date && item.expected_completion_date < today);
  const upcomingInstallations = activeProjects.filter((item) => item.installation_date && item.installation_date >= today && item.installation_date <= next7Date);
  const pendingHandovers = activeProjects.filter((item) => item.handover_status !== "completed");
  const receivedFeedback = feedback.filter((item) => item.customer_rating && item.submitted_at);
  const ratings = receivedFeedback.map((item) => Number(item.customer_rating));
  const by = <T,>(items: T[], key: (item:T)=>string) => [...items.reduce((map, item) => { const label=key(item)||"Unspecified"; map.set(label,(map.get(label)||0)+1); return map; }, new Map<string,number>())].sort((a,b)=>b[1]-a[1]);
  const enquiryTrend = by(enquiries, (item) => item.created_at.slice(0,10)).sort((a,b)=>a[0].localeCompare(b[0]));
  const collectionTrend = [...payments.reduce((map,item)=>{ const key=item.received_date; map.set(key,(map.get(key)||0)+money(item.amount_received)); return map; },new Map<string,number>())].sort((a,b)=>a[0].localeCompare(b[0]));
  const stageRows = by(activeProjects, (item) => ((item.current_stage as unknown as {name:string}|null)?.name || "Unstaged"));
  const ratingDistribution = [5,4,3,2,1].map((rating) => [String(rating), ratings.filter((value)=>value===rating).length] as [string,number]);
  const salesperson = [...enquiries.reduce((map,item)=>{ const name=item.assigned?.full_name||"Unassigned"; const row=map.get(name)||{name,total:0,newCount:0}; row.total++; if(item.status==="new")row.newCount++; map.set(name,row); return map; },new Map<string,{name:string;total:number;newCount:number}>()).values()].sort((a,b)=>b.total-a.total);
  const feedbackReviewRows = feedbackReview.slice(0,8).map((item)=>({
    id:item.id, rating:Number(item.customer_rating||0), submitted_at:item.submitted_at,
    project:item.project as unknown as {id:string;project_number:string;customer:{id:string;name:string}|null}|null,
  }));
  return {
    range,
    crm: { total: enquiries.length, newCount: enquiries.filter((item)=>item.status==="new").length, bySource: by(enquiries,(item)=>item.source||"Unspecified"), byStatus: by(enquiries,(item)=>item.status), salesperson, dueFollowUps: followUps.filter((item)=>item.due_at && item.due_at.slice(0,10)===today).length, overdueFollowUps: followUps.filter((item)=>item.due_at && item.due_at.slice(0,10)<today).length, trend: enquiryTrend },
    conversion: {
      enquiryToVisit: { numerator: visitsWithEligibleEnquiry.size, denominator: enquiries.length, rate: percent(visitsWithEligibleEnquiry.size,enquiries.length) },
      visitToQuote: { numerator: quotedVisitIds.size, denominator: visits.length, rate: percent(quotedVisitIds.size,visits.length) },
      quoteApproval: { numerator: approvedQuotes.length, denominator: customerFacingQuotes.length, rate: percent(approvedQuotes.length,customerFacingQuotes.length) },
      approvedToProject: { numerator: convertedQuoteIds.size, denominator: approvedQuotes.length, rate: percent(convertedQuoteIds.size,approvedQuotes.length) },
    },
    projects: { active: activeProjects.length, completed: completedProjects.length, delayed: delayedProjects.length, upcomingInstallations: upcomingInstallations.length, pendingHandovers: pendingHandovers.length, byStage: stageRows, delayedRows: delayedProjects.sort((a,b)=>(a.expected_completion_date||"").localeCompare(b.expected_completion_date||"")).slice(0,10), recentCompleted: completedProjects.sort((a,b)=>(b.actual_completion_date||"").localeCompare(a.actual_completion_date||"")).slice(0,10) },
    finance: { approvedValue: approvedQuotes.reduce((sum,item)=>sum+money(item.total),0), projectValue: finance.reduce((sum,item)=>sum+money(item.project_value),0), received: payments.reduce((sum,item)=>sum+money(item.amount_received),0), outstanding: finance.reduce((sum,item)=>sum+money(item.outstanding),0), overdue: finance.reduce((sum,item)=>sum+money(item.overdue),0), dueNext7: milestones.filter((item)=>item.due_date && item.due_date>=today && item.due_date<=next7Date && money(item.outstanding)>0).reduce((sum,item)=>sum+money(item.outstanding),0), collectionTrend, upcomingMilestones: milestones.filter((item)=>item.due_date && item.due_date>=today && money(item.outstanding)>0).slice(0,10), outstandingProjects: [...finance].filter((item)=>money(item.outstanding)>0).sort((a,b)=>money(b.outstanding)-money(a.outstanding)).slice(0,10) },
    customer: { completedProjects: completedProjects.length, feedbackReceived: receivedFeedback.length, averageRating: ratings.length ? Math.round((ratings.reduce((a,b)=>a+b,0)/ratings.length)*10)/10 : null, distribution: ratingDistribution, awaitingReview: feedbackReview.length, reviewRows: feedbackReviewRows },
  };
}
