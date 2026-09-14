import Link from "next/link";
import { Archive, ExternalLink, MessageSquareText, ShieldCheck, Star } from "lucide-react";
import { requestFeedbackAction, revokeFeedbackLinkAction, reviewFeedbackAction, saveStaffFeedbackAction } from "./actions";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusNotice } from "@/components/ui/status-notice";
import { requireModuleAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/crm/presentation";
import { FEEDBACK_STATUS_LABELS, feedbackStatusClass, ratingLabel } from "@/lib/feedback/presentation";
import { getCompletedProjectsForFeedback, getFeedbackQueue } from "@/lib/feedback/queries";

const input = "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base";

function futureDate(days: number) {
  const date = new Date(Date.now() + days * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(date);
}

export default async function FeedbackAdminPage({ searchParams }: PageProps<"/dashboard/feedback">) {
  const [profile, query] = await Promise.all([requireModuleAccess("feedback"), searchParams]);
  const status = typeof query.status === "string" ? query.status : "";
  const [rows, projects] = await Promise.all([getFeedbackQueue(status), getCompletedProjectsForFeedback()]);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const totals = {
    requested: rows.filter((item) => item.status === "requested").length,
    received: rows.filter((item) => item.status === "received").length,
    reviewed: rows.filter((item) => item.status === "reviewed").length,
  };
  return (
    <div className="space-y-7">
      <PageHeading title="Customer feedback" description="Request, record, and review project-specific customer feedback without exposing internal records." />
      {typeof query.notice === "string" ? <StatusNotice tone="success" title="Feedback updated"><p>{query.notice}</p></StatusNotice> : null}
      {typeof query.error === "string" ? <StatusNotice tone="error" title="Feedback action failed"><p>{query.error}</p></StatusNotice> : null}
      <section className="grid grid-cols-3 gap-2" aria-label="Feedback summary">
        {[["Links open", totals.requested], ["Awaiting review", totals.received], ["Reviewed", totals.reviewed]].map(([label, value]) => <article key={String(label)} className="rounded-lg border border-line bg-paper p-4"><strong className="text-2xl tracking-[-0.04em]">{value}</strong><p className="mt-3 text-xs text-stone">{label}</p></article>)}
      </section>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Feedback status filters">
        {[['', 'Active'], ['requested','Requested'], ['received','Received'], ['reviewed','Reviewed'], ['archived','Archived']].map(([key,label]) => <Link key={key} href={key ? `/dashboard/feedback?status=${key}` : "/dashboard/feedback"} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${status === key ? "border-graphite bg-graphite text-white" : "border-line bg-paper"}`}>{label}</Link>)}
      </div>
      <details className="rounded-lg border border-line bg-paper" open={!rows.length}>
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 text-sm font-semibold"><span>Start a feedback request</span><ShieldCheck size={17} className="text-brass-dark" /></summary>
        <div className="border-t border-line p-5">
          <form action={requestFeedbackAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-medium">Completed project<select name="project_id" required defaultValue="" className={input}><option value="" disabled>Choose project</option>{projects.map((project) => { const customer = project.customer as unknown as { name: string } | null; return <option key={project.id} value={project.id}>{project.project_number} · {customer?.name || "Customer"}</option>; })}</select></label>
            <label className="grid gap-2 text-sm font-medium">Link expires<input name="expires_at" type="date" required min={futureDate(1)} max={futureDate(90)} defaultValue={futureDate(30)} className={input} /></label>
            <button className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white">Create secure link</button>
          </form>
        </div>
      </details>
      <details className="rounded-lg border border-line bg-paper">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 text-sm font-semibold"><span>Record feedback received offline</span><MessageSquareText size={17} className="text-brass-dark" /></summary>
        <form action={saveStaffFeedbackAction} className="grid gap-3 border-t border-line p-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium sm:col-span-2">Completed project<select name="project_id" required defaultValue="" className={input}><option value="" disabled>Choose project</option>{projects.map((project) => { const customer = project.customer as unknown as { name: string } | null; return <option key={project.id} value={project.id}>{project.project_number} · {customer?.name || "Customer"}</option>; })}</select></label>
          <label className="grid gap-2 text-sm font-medium">Rating<select name="rating" required defaultValue="5" className={input}>{[5,4,3,2,1].map((score)=><option key={score} value={score}>{score} / 5</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium">Source<select name="source" defaultValue="phone" className={input}><option value="phone">Phone</option><option value="email">Email</option><option value="in_person">In person</option><option value="other">Other</option></select></label>
          <textarea name="comment" maxLength={4000} className={`${input} min-h-24 py-3 sm:col-span-2`} placeholder="Customer comments" />
          <textarea name="internal_notes" maxLength={8000} className={`${input} min-h-20 py-3 sm:col-span-2`} placeholder="Private internal notes" />
          <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" name="permission" className="size-5 accent-brass-dark" />Customer gave testimonial permission</label>
          <button className="min-h-11 justify-self-start rounded-md bg-graphite px-4 text-sm font-semibold text-white">Record feedback</button>
        </form>
      </details>
      <section className="space-y-3">
        {rows.length ? rows.map((item) => {
          const project = item.project;
          const publicUrl = `${baseUrl}/feedback/${item.public_token}`;
          return <article key={item.id} className="overflow-hidden rounded-lg border border-line bg-paper">
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link href={`/dashboard/projects/${item.project_id}`} className="font-semibold text-brass-dark">{project?.project_number || "Project"}</Link><span className={`rounded-sm border px-2 py-1 text-xs ${feedbackStatusClass(item.status)}`}>{FEEDBACK_STATUS_LABELS[item.status]}</span></div><p className="mt-1 text-sm text-stone">{project?.customer?.name || "Customer"} · updated {formatDate(item.updated_at, true)}</p></div>
              <div className="flex items-center gap-2 sm:text-right"><Star size={17} className="text-brass-dark" /><strong>{ratingLabel(item.customer_rating)}</strong></div>
            </div>
            {item.customer_comments ? <blockquote className="border-y border-line bg-limestone/60 px-4 py-4 text-sm leading-6 sm:px-5">“{item.customer_comments}”</blockquote> : null}
            <div className="grid gap-4 px-4 py-4 text-xs text-stone sm:grid-cols-3 sm:px-5"><p>Source<br /><strong className="text-graphite">{item.source || "—"}</strong></p><p>Requested<br /><strong className="text-graphite">{formatDate(item.requested_at, true)}</strong></p><p>Testimonial permission<br /><strong className="text-graphite">{item.permission_to_publish_testimonial ? "Recorded" : "Not given"}</strong></p></div>
            {item.status === "requested" && !item.token_revoked_at ? <div className="border-t border-line px-4 py-4 sm:px-5"><p className="break-all text-xs text-stone">{publicUrl}</p><div className="mt-3 flex flex-wrap gap-4"><a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brass-dark"><ExternalLink size={15} />Open link</a><form action={revokeFeedbackLinkAction}><input type="hidden" name="project_id" value={item.project_id} /><button className="min-h-10 text-sm font-medium text-red-700">Revoke link</button></form></div></div> : null}
            {item.submitted_at && profile.role === "admin" ? <details className="border-t border-line"><summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold sm:px-5"><MessageSquareText size={15} />Management review</summary><form action={reviewFeedbackAction} className="grid gap-3 border-t border-line p-4 sm:p-5"><input type="hidden" name="feedback_id" value={item.id} /><input type="hidden" name="project_id" value={item.project_id} /><textarea name="internal_notes" maxLength={8000} defaultValue={item.internal_notes || ""} className={`${input} min-h-24 py-3`} placeholder="Private management notes" /><div className="flex flex-wrap gap-3"><button name="status" value="reviewed" className="min-h-10 rounded-md bg-graphite px-4 text-sm font-semibold text-white">Mark reviewed</button><button name="status" value="archived" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-red-700"><Archive size={15} />Archive</button></div></form></details> : null}
            {!item.submitted_at ? <details className="border-t border-line"><summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold sm:px-5">Enter feedback received offline</summary><form action={saveStaffFeedbackAction} className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 sm:p-5"><input type="hidden" name="project_id" value={item.project_id} /><label className="grid gap-2 text-sm font-medium">Rating<select name="rating" required defaultValue="5" className={input}>{[5,4,3,2,1].map((score) => <option key={score} value={score}>{score} / 5</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Source<select name="source" defaultValue="phone" className={input}><option value="phone">Phone</option><option value="email">Email</option><option value="in_person">In person</option><option value="other">Other</option></select></label><textarea name="comment" maxLength={4000} className={`${input} min-h-24 py-3 sm:col-span-2`} placeholder="Customer comments" /><textarea name="internal_notes" maxLength={8000} className={`${input} min-h-20 py-3 sm:col-span-2`} placeholder="Private internal notes" /><label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" name="permission" className="size-5 accent-brass-dark" />Customer gave testimonial permission</label><button className="min-h-11 justify-self-start rounded-md bg-graphite px-4 text-sm font-semibold text-white">Record feedback</button></form></details> : null}
          </article>;
        }) : <div className="rounded-lg border border-dashed border-line bg-paper px-5 py-12 text-center"><MessageSquareText className="mx-auto text-brass-dark" /><h2 className="mt-4 font-semibold">No feedback in this view</h2><p className="mt-2 text-sm text-stone">Create a secure request for a completed project, or change the status filter.</p></div>}
      </section>
    </div>
  );
}
