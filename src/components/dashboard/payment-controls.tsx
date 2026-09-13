"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  activatePlanAction,
  cancelMilestoneAction,
  cancelPlanAction,
  finalizePaymentProofAction,
  recordPaymentAction,
  releasePaymentProofAction,
  reservePaymentProofAction,
  saveMilestoneAction,
  voidPaymentAction,
} from "@/app/dashboard/payments/actions";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/payments/constants";
import { PAYMENT_PROOF_BUCKET, validatePaymentProof } from "@/lib/payments/media";
import type { FinanceProjectSummary, MilestoneSummary, PaymentActionState } from "@/lib/payments/types";
import { INITIAL_PAYMENT_ACTION_STATE } from "@/lib/payments/types";
import { createClient } from "@/lib/supabase/client";

const input = "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base";

function Notice({ state }: { state: PaymentActionState }) {
  return state.message ? <p role="status" className={`text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p> : null;
}

export function MilestoneForm({ projectId, milestone, nextOrder = 10 }: { projectId: string; milestone?: MilestoneSummary; nextOrder?: number }) {
  const [type, setType] = useState(milestone?.milestone_type || "percentage");
  const [state, action, pending] = useActionState(saveMilestoneAction, INITIAL_PAYMENT_ACTION_STATE);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Notice state={state} /></div>
      <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="milestone_id" value={milestone?.milestone_id || ""} />
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Milestone name<input name="name" required maxLength={160} defaultValue={milestone?.name || ""} className={input} placeholder="Deposit, fabrication, installation…" /></label>
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Description<textarea name="description" maxLength={2000} defaultValue={milestone?.description || ""} className={`${input} min-h-20 py-3`} placeholder="What this milestone covers" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Amount type<select name="milestone_type" value={type} onChange={(event) => setType(event.target.value)} className={input}><option value="percentage">Percentage of project</option><option value="fixed">Fixed amount</option></select></label>
      {type === "percentage" ? <label className="grid gap-1.5 text-sm font-medium">Percentage<input name="percentage" type="number" min="0.0001" max="100" step="0.0001" required defaultValue={milestone?.percentage || ""} className={input} /></label> : <label className="grid gap-1.5 text-sm font-medium">Fixed amount · AED<input name="fixed_amount" type="number" min="0.01" step="0.01" required defaultValue={milestone?.amount_due || ""} className={input} /></label>}
      <label className="grid gap-1.5 text-sm font-medium">Due date<input name="due_date" type="date" defaultValue={milestone?.due_date || ""} className={input} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Order<input name="sort_order" type="number" min="0" max="10000" defaultValue={milestone?.sort_order ?? nextOrder} className={input} /></label>
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Internal note<textarea name="notes" maxLength={2000} defaultValue={milestone?.notes || ""} className={`${input} min-h-20 py-3`} placeholder="Private context for Accounts and Management" /></label>
      <button disabled={pending} className="min-h-11 justify-self-start rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : milestone ? "Update milestone" : "Add milestone"}</button>
    </form>
  );
}

export function CancelMilestoneForm({ milestoneId, projectId }: { milestoneId: string; projectId: string }) {
  const [state, action, pending] = useActionState(cancelMilestoneAction.bind(null, milestoneId, projectId), INITIAL_PAYMENT_ACTION_STATE);
  return <form action={action} className="mt-4 grid gap-2 border-t border-line pt-4"><Notice state={state} /><label className="grid gap-1 text-xs font-medium">Cancellation reason<input name="reason" required minLength={3} maxLength={1000} className={input} /></label><button disabled={pending} className="min-h-10 justify-self-start text-sm font-semibold text-red-700 disabled:opacity-50">{pending ? "Cancelling…" : "Cancel milestone"}</button></form>;
}

export function PlanControls({ projectId, planStatus, reconciled }: { projectId: string; planStatus: string; reconciled: boolean }) {
  const [activateState, activate, activating] = useActionState(activatePlanAction.bind(null, projectId), INITIAL_PAYMENT_ACTION_STATE);
  const [cancelState, cancel, cancelling] = useActionState(cancelPlanAction.bind(null, projectId), INITIAL_PAYMENT_ACTION_STATE);
  if (planStatus !== "draft" && planStatus !== "active") return null;
  return (
    <div className="space-y-4">
      {planStatus === "draft" ? <form action={activate} className="space-y-3"><Notice state={activateState} /><button disabled={activating || !reconciled} className="min-h-11 w-full rounded-md bg-brass-dark px-4 text-sm font-semibold text-white disabled:opacity-40">{activating ? "Activating…" : "Activate reconciled plan"}</button>{!reconciled ? <p className="text-xs leading-5 text-stone">Activation unlocks only when planned amount equals project value exactly.</p> : null}</form> : null}
      <form action={cancel} className="space-y-2 border-t border-line pt-4"><Notice state={cancelState} /><label className="grid gap-1 text-xs font-medium">Plan cancellation reason<input name="reason" required minLength={3} maxLength={1000} className={input} /></label><button disabled={cancelling} className="min-h-10 text-sm font-semibold text-red-700 disabled:opacity-50">{cancelling ? "Cancelling…" : "Cancel payment plan"}</button></form>
    </div>
  );
}

export function RecordPaymentForm({ projects, initialProjectId = "", milestones = [] }: { projects: FinanceProjectSummary[]; initialProjectId?: string; milestones?: MilestoneSummary[] }) {
  const [state, action, pending] = useActionState(recordPaymentAction, INITIAL_PAYMENT_ACTION_STATE);
  const [projectId, setProjectId] = useState(initialProjectId);
  const available = initialProjectId ? milestones : [];
  return (
    <form action={action} className="space-y-4">
      <Notice state={state} />
      {state.recordId ? <Link href={`/dashboard/payments/${state.recordId}`} className="inline-flex min-h-10 items-center text-sm font-semibold text-brass-dark">Open posted receipt →</Link> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Project<select name="project_id" required value={projectId} onChange={(event) => setProjectId(event.target.value)} className={input}><option value="">Choose active payment plan</option>{projects.filter((project) => project.plan_status === "active").map((project) => <option key={project.project_id} value={project.project_id}>{project.project_number} · {project.customer_name}</option>)}</select></label>
        {initialProjectId ? <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Milestone<select name="milestone_id" required defaultValue="" className={input}><option value="">Choose milestone</option>{available.filter((item) => !item.cancelled_at && item.outstanding > 0).map((item) => <option key={item.milestone_id} value={item.milestone_id}>{item.name} · AED {Number(item.outstanding).toFixed(2)} outstanding</option>)}</select></label> : <p className="sm:col-span-2 text-sm text-stone">Choose a project from its payment workspace to post against an authoritative milestone balance.</p>}
        <label className="grid gap-1.5 text-sm font-medium">Amount · AED<input name="amount" type="number" min="0.01" step="0.01" required className={input} /></label>
        <label className="grid gap-1.5 text-sm font-medium">Received date<input name="received_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={input} /></label>
        <label className="grid gap-1.5 text-sm font-medium">Method<select name="payment_method" defaultValue="bank_transfer" className={input}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-medium">Transaction reference<input name="reference_number" maxLength={160} className={input} /></label>
        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Receipt note<textarea name="notes" maxLength={2000} className={`${input} min-h-24 py-3`} /></label>
      </div>
      <button disabled={pending || !initialProjectId} className="min-h-11 rounded-md bg-graphite px-5 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Posting…" : "Post immutable receipt"}</button>
    </form>
  );
}

export function VoidReceiptForm({ paymentId, projectId }: { paymentId: string; projectId: string }) {
  const [state, action, pending] = useActionState(voidPaymentAction.bind(null, paymentId, projectId), INITIAL_PAYMENT_ACTION_STATE);
  return <form action={action} className="space-y-3"><Notice state={state} /><label className="grid gap-1.5 text-sm font-medium">Void reason<textarea name="reason" required minLength={3} maxLength={1000} className={`${input} min-h-24 py-3`} placeholder="Why this receipt is being reversed" /></label><button disabled={pending} className="min-h-11 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 disabled:opacity-50">{pending ? "Voiding…" : "Void receipt"}</button><p className="text-xs leading-5 text-stone">The receipt number remains permanently reserved. Post a replacement as a new receipt.</p></form>;
}

export function PaymentProofUploader({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload() {
    if (!file) return;
    const invalid = validatePaymentProof(file);
    if (invalid) { setMessage(invalid); return; }
    setBusy(true); setMessage("");
    const reserved = await reservePaymentProofAction({ payment_id: paymentId, file_name: file.name, mime_type: file.type, file_size: file.size });
    if (!reserved.recordId || !reserved.storagePath) { setMessage(reserved.message || "Upload could not be reserved."); setBusy(false); return; }
    const supabase = createClient();
    if (!supabase) { await releasePaymentProofAction(reserved.recordId); setMessage("Supabase is not configured."); setBusy(false); return; }
    const stored = await supabase.storage.from(PAYMENT_PROOF_BUCKET).upload(reserved.storagePath, file, { contentType: file.type, upsert: false });
    if (stored.error) { await releasePaymentProofAction(reserved.recordId); setMessage(stored.error.message); setBusy(false); return; }
    const finalized = await finalizePaymentProofAction(reserved.recordId, paymentId);
    if (finalized.status === "error") {
      await supabase.storage.from(PAYMENT_PROOF_BUCKET).remove([reserved.storagePath]);
      await releasePaymentProofAction(reserved.recordId);
      setMessage(finalized.message || "Upload could not be finalized."); setBusy(false); return;
    }
    setFile(null); setMessage("Payment proof uploaded."); setBusy(false); router.refresh();
  }
  return <div className="space-y-3">{message ? <p role="status" className={`text-sm ${message === "Payment proof uploaded." ? "text-emerald-700" : "text-red-700"}`}>{message}</p> : null}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block min-h-11 w-full text-base file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-limestone file:px-4 file:text-base file:font-medium" /><button type="button" onClick={upload} disabled={!file || busy} className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Uploading…" : "Upload private proof"}</button><p className="text-xs leading-5 text-stone">PDF, JPEG, PNG, or WebP · 10 MB maximum · private signed access.</p></div>;
}
