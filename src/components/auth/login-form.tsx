"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm({ disabled = false }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-graphite">Work email</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required disabled={disabled || pending} className="min-h-12 w-full rounded-lg border border-line bg-white px-4 text-base text-graphite shadow-[0_1px_0_rgba(0,0,0,0.03)] placeholder:text-stone/60 disabled:cursor-not-allowed disabled:bg-stone/5" placeholder="name@universalpergola.com" aria-describedby={state.fieldErrors?.email ? "email-error" : undefined} />
        {state.fieldErrors?.email && <p id="email-error" className="mt-1.5 text-sm text-red-700">{state.fieldErrors.email[0]}</p>}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-medium text-graphite">Password</label><span className="text-xs text-stone">Staff access</span></div>
        <input id="password" name="password" type="password" autoComplete="current-password" required disabled={disabled || pending} className="min-h-12 w-full rounded-lg border border-line bg-white px-4 text-base text-graphite shadow-[0_1px_0_rgba(0,0,0,0.03)] placeholder:text-stone/60 disabled:cursor-not-allowed disabled:bg-stone/5" placeholder="Enter your password" aria-describedby={state.fieldErrors?.password ? "password-error" : undefined} />
        {state.fieldErrors?.password && <p id="password-error" className="mt-1.5 text-sm text-red-700">{state.fieldErrors.password[0]}</p>}
      </div>
      {state.message && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800" role="alert">{state.message}</div>}
      <button type="submit" disabled={disabled || pending} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-graphite px-5 text-sm font-semibold text-white hover:bg-ink disabled:cursor-not-allowed disabled:opacity-55">
        {pending ? <><LoaderCircle size={17} className="animate-spin" />Signing in</> : <>Sign in <ArrowRight size={17} /></>}
      </button>
      <p className="flex items-center justify-center gap-2 text-xs text-stone"><LockKeyhole size={13} />Protected by Supabase Auth</p>
    </form>
  );
}
