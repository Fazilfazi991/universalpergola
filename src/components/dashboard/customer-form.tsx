"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createCustomerAction, updateCustomerAction } from "@/app/dashboard/customers/actions";
import type { CustomerDetail } from "@/lib/crm/queries";
import type { StaffSummary } from "@/lib/crm/types";
import { INITIAL_CRM_ACTION_STATE } from "@/lib/crm/types";
import type { AppRole } from "@/lib/auth/permissions";

const input = "min-h-12 w-full rounded-md border border-line bg-paper px-3 text-base";
const label = "grid gap-2 text-sm font-medium";
function ErrorLine({ messages }: { messages?: string[] }) { return messages?.[0] ? <span className="font-normal text-red-700">{messages[0]}</span> : null; }

export function CustomerForm({ customer, staff, role }: { customer?: CustomerDetail; staff: StaffSummary[]; role: AppRole }) {
  const action = customer ? updateCustomerAction.bind(null, customer.id) : createCustomerAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_CRM_ACTION_STATE);
  return <form action={formAction} className="space-y-6">
    {state.message && <div role={state.status === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{state.message}</div>}
    {state.duplicates?.length ? <div className="border-l-2 border-brass bg-paper px-4 py-3"><p className="text-sm font-semibold">Possible existing customers</p><div className="mt-2 space-y-2">{state.duplicates.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm"><span>{item.name} · {item.phone || item.email || "Contact on file"}</span><Link className="font-medium text-brass-dark" href={`/dashboard/customers/${item.id}`}>Open</Link></div>)}</div><button name="allow_duplicate" value="true" className="mt-3 min-h-10 text-sm font-medium text-red-700">Create a separate customer anyway</button></div> : null}
    <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6"><h2 className="text-lg font-semibold tracking-[-0.025em]">Customer information</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>Full name<input className={input} name="name" defaultValue={customer?.name || ""} required maxLength={160} /><ErrorLine messages={state.fieldErrors?.name} /></label>
      <label className={label}>Customer type<select className={input} name="customer_type" defaultValue={customer?.customer_type || "individual"}><option value="individual">Individual</option><option value="company">Company</option></select></label>
      <label className={label}>Company<input className={input} name="company_name" defaultValue={customer?.company_name || ""} maxLength={160} /><ErrorLine messages={state.fieldErrors?.company_name} /></label>
      <label className={label}>Phone<input className={input} name="phone" type="tel" defaultValue={customer?.phone || ""} maxLength={40} placeholder="+971 …" /><ErrorLine messages={state.fieldErrors?.phone} /></label>
      <label className={label}>WhatsApp<input className={input} name="whatsapp_number" type="tel" defaultValue={customer?.whatsapp_number || ""} maxLength={40} placeholder="+971 …" /><ErrorLine messages={state.fieldErrors?.whatsapp_number} /></label>
      <label className={label}>Email<input className={input} name="email" type="email" defaultValue={customer?.email || ""} maxLength={254} /><ErrorLine messages={state.fieldErrors?.email} /></label>
      <label className={label}>Lead source<input className={input} name="source" defaultValue={customer?.source || ""} maxLength={80} placeholder="Phone, referral, walk-in…" /></label>
    </div></section>
    <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6"><h2 className="text-lg font-semibold tracking-[-0.025em]">Location and ownership</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>Address<textarea className={`${input} min-h-24 py-3`} name="address" defaultValue={customer?.address || ""} maxLength={500} /></label>
      <label className={label}>Area<input className={input} name="area" defaultValue={customer?.area || ""} maxLength={120} /></label>
      <label className={label}>Emirate<input className={input} name="emirate" defaultValue={customer?.emirate || ""} maxLength={80} /></label>
      {role === "admin" && !customer ? <label className={`${label} sm:col-span-2`}>Assigned salesperson<select className={input} name="assigned_to" defaultValue=""><option value="">Unassigned</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select></label> : <input type="hidden" name="assigned_to" value={customer?.assigned_to || ""} />}
    </div></section>
    <section className="border-y border-line bg-paper px-4 py-5 sm:rounded-lg sm:border sm:p-6"><h2 className="text-lg font-semibold tracking-[-0.025em]">Internal notes</h2><textarea className={`${input} mt-5 min-h-36 py-3`} name="notes" defaultValue={customer?.notes || ""} maxLength={6000} placeholder="Preferences, access details, or relationship context for staff." /></section>
    <div className="sticky bottom-16 z-10 flex items-center justify-end border border-line bg-paper/95 px-4 py-3 shadow-lg backdrop-blur sm:rounded-lg lg:bottom-4"><button disabled={pending} className="min-h-12 rounded-md bg-graphite px-6 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : customer ? "Save changes" : "Create customer"}</button></div>
  </form>;
}
