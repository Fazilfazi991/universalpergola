"use client";

import { useActionState } from "react";
import { submitPublicFeedbackAction } from "@/app/feedback/[token]/actions";
import { INITIAL_FEEDBACK_ACTION_STATE } from "@/lib/feedback/types";

export function PublicFeedbackForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(submitPublicFeedbackAction, INITIAL_FEEDBACK_ACTION_STATE);
  if (state.status === "success") {
    return <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6" role="status"><h2 className="text-xl font-semibold">Thank you.</h2><p className="mt-2 text-sm leading-6 text-emerald-900">Your feedback has been received and shared with our team.</p></div>;
  }
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      <div className="absolute -left-[10000px]" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {state.message ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</p> : null}
      <fieldset>
        <legend className="text-sm font-semibold">How would you rate your experience?</legend>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {[1,2,3,4,5].map((score) => <label key={score} className="cursor-pointer"><input className="peer sr-only" type="radio" name="rating" value={score} required /><span className="grid min-h-12 place-items-center rounded-md border border-line bg-paper text-sm font-semibold peer-checked:border-brass-dark peer-checked:bg-graphite peer-checked:text-white">{score}</span></label>)}
        </div>
        <p className="mt-2 flex justify-between text-xs text-stone"><span>Needs improvement</span><span>Excellent</span></p>
      </fieldset>
      <label className="grid gap-2 text-sm font-semibold">Tell us about your experience
        <textarea name="comment" maxLength={4000} className="min-h-36 rounded-md border border-line bg-paper p-3 text-base font-normal" placeholder="What worked well, or what could we improve?" />
      </label>
      <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" name="permission" className="mt-1 size-5 shrink-0 accent-brass-dark" /><span>I give Universal Pergola permission to use my comments as a testimonial. This does not publish them automatically.</span></label>
      <button disabled={pending} className="min-h-12 w-full rounded-md bg-brass-dark px-5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Sending…" : "Submit feedback"}</button>
    </form>
  );
}
