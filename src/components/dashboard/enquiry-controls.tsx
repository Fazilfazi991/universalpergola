"use client";

import { useActionState } from "react";
import { addEnquiryNoteAction, createFollowUpAction, updateEnquiryAction } from "@/app/dashboard/enquiries/actions";
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS, LEAD_PRIORITIES, PRIORITY_LABELS } from "@/lib/crm/constants";
import type { EnquiryDetail } from "@/lib/crm/queries";
import { INITIAL_CRM_ACTION_STATE, type StaffSummary } from "@/lib/crm/types";
import type { AppRole } from "@/lib/auth/permissions";

const input = "min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base";

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const dubai = new Date(date.getTime() + 4 * 60 * 60 * 1000);
  return dubai.toISOString().slice(0, 16);
}

export function EnquiryEditor({ enquiry, role }: { enquiry: EnquiryDetail; role: AppRole }) {
  const [state, action, pending] = useActionState(updateEnquiryAction.bind(null, enquiry.id), INITIAL_CRM_ACTION_STATE);
  return <form action={action} className="space-y-4">
    {state.message && <p className={`text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`} role="status">{state.message}</p>}
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Status<select className={input} name="status" defaultValue={enquiry.status}>{ENQUIRY_STATUSES.map((item) => <option key={item} value={item}>{ENQUIRY_STATUS_LABELS[item]}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Priority<select className={input} name="priority" defaultValue={enquiry.priority}>{LEAD_PRIORITIES.map((item) => <option key={item} value={item}>{PRIORITY_LABELS[item]}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Source<select className={input} name="source" defaultValue={enquiry.source || "Other"}>{ENQUIRY_SOURCES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Follow-up date<input className={input} name="follow_up_at" type="datetime-local" defaultValue={localDateTime(enquiry.follow_up_at)} /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">Next action<input className={input} name="next_action" defaultValue={enquiry.next_action || ""} maxLength={300} /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">Internal notes<textarea className={`${input} min-h-28 py-3`} name="internal_notes" defaultValue={enquiry.internal_notes || ""} maxLength={6000} /></label></div><input type="hidden" name="assigned_to" value={enquiry.assigned_to || ""} /><button disabled={pending} className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save enquiry"}</button>{role === "sales" && <p className="text-xs text-stone">Management controls salesperson assignment.</p>}
  </form>;
}

export function EnquiryNoteForm({ enquiryId }: { enquiryId: string }) {
  const [state, action, pending] = useActionState(addEnquiryNoteAction.bind(null, enquiryId), INITIAL_CRM_ACTION_STATE);
  return <form action={action} className="space-y-3"><label className="grid gap-2 text-sm font-medium">Add internal note<textarea className={`${input} min-h-24 py-3`} name="note" required maxLength={4000} /></label>{state.message && <p className={`text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}<button disabled={pending} className="min-h-11 rounded-md border border-line bg-paper px-4 text-sm font-medium">{pending ? "Adding…" : "Add note"}</button></form>;
}

export function FollowUpForm({ enquiryId, customerId, staff, role, defaultAssignee, currentUserId }: { enquiryId: string; customerId: string | null; staff: StaffSummary[]; role: AppRole; defaultAssignee: string | null; currentUserId: string }) {
  const [state, action, pending] = useActionState(createFollowUpAction.bind(null, enquiryId, customerId), INITIAL_CRM_ACTION_STATE);
  return <form action={action} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Due<input className={input} name="due_at" type="datetime-local" required /></label><label className="grid gap-2 text-sm font-medium">Assigned to<select className={input} name="assigned_to" defaultValue={role === "sales" ? currentUserId : defaultAssignee || ""} disabled={role === "sales"}><option value="">Choose salesperson</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select>{role === "sales" && <input type="hidden" name="assigned_to" value={currentUserId} />}</label><label className="grid gap-2 text-sm font-medium sm:col-span-2">Next action<input className={input} name="next_action" required maxLength={200} placeholder="Call customer" /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">Notes<textarea className={`${input} min-h-20 py-3`} name="notes" maxLength={2000} /></label></div>{state.message && <p className={`text-sm ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}<button disabled={pending} className="min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white">{pending ? "Adding…" : "Add follow-up"}</button></form>;
}
