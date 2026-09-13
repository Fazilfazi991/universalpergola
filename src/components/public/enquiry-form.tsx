"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitPublicEnquiryAction } from "@/app/enquire/actions";
import { INITIAL_CRM_ACTION_STATE } from "@/lib/crm/types";

const field = "min-h-12 w-full rounded-md border border-line bg-paper px-3 text-base text-graphite placeholder:text-stone/60";

function ErrorLine({ messages }: { messages?: string[] }) { return messages?.[0] ? <span className="text-sm text-red-700">{messages[0]}</span> : null; }

export function PublicEnquiryForm({ product }: { product?: { id: string; slug: string; name: string } | null }) {
  const [state, action, pending] = useActionState(submitPublicEnquiryAction, INITIAL_CRM_ACTION_STATE);
  if (state.status === "success") return <div className="mt-8 border-y border-line bg-paper py-8 sm:rounded-lg sm:border sm:p-8" role="status"><CheckCircle2 className="text-emerald-700" size={28} /><h2 className="mt-4 text-2xl font-semibold tracking-[-0.035em]">Enquiry received</h2><p className="mt-2 max-w-lg text-sm leading-6 text-stone">{state.message}</p><p className="mt-5 text-sm"><span className="text-stone">Reference</span> <strong className="ml-2">{state.reference}</strong></p></div>;
  return <form action={action} className="mt-8 space-y-5 border-y border-line bg-paper py-6 sm:rounded-lg sm:border sm:p-7">
    {product && <><input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="product_slug" value={product.slug} /></>}
    <label className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {state.message && <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{state.message}</p>}
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">Name<input className={field} name="name" autoComplete="name" required maxLength={160} /><ErrorLine messages={state.fieldErrors?.name} /></label>
      <label className="grid gap-2 text-sm font-medium">Phone<input className={field} name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} placeholder="+971 …" /><ErrorLine messages={state.fieldErrors?.phone} /></label>
      <label className="grid gap-2 text-sm font-medium">WhatsApp <span className="font-normal text-stone">if different</span><input className={field} name="whatsapp_number" type="tel" inputMode="tel" maxLength={40} placeholder="+971 …" /><ErrorLine messages={state.fieldErrors?.whatsapp_number} /></label>
      <label className="grid gap-2 text-sm font-medium">Email <span className="font-normal text-stone">optional</span><input className={field} name="email" type="email" autoComplete="email" maxLength={254} /><ErrorLine messages={state.fieldErrors?.email} /></label>
      <label className="grid gap-2 text-sm font-medium">Emirate <span className="font-normal text-stone">optional</span><select className={field} name="emirate" defaultValue=""><option value="">Choose emirate</option>{["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">What would you like to discuss?<textarea className={`${field} min-h-32 py-3`} name="message" required maxLength={4000} placeholder={product ? `Tell us about your space and requirements for ${product.name}.` : "Tell us about the space, approximate size, and what you need."} /><ErrorLine messages={state.fieldErrors?.message} /></label>
    </div>
    <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-md text-xs leading-5 text-stone">We use these details only to respond to this project enquiry.</p><button disabled={pending} className="min-h-12 rounded-md bg-graphite px-6 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Sending…" : "Send enquiry"}</button></div>
  </form>;
}
