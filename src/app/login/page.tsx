import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/auth/login-form";
import { StatusNotice } from "@/components/ui/status-notice";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Staff sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { reason } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <main className="grid min-h-screen bg-limestone lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.72fr)]">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandMark inverse />
        <div className="pointer-events-none absolute inset-y-0 right-28 w-px bg-brass/30" />
        <div className="pointer-events-none absolute right-28 top-[34%] h-px w-24 bg-brass/30" />
        <div className="relative max-w-xl pb-8">
          <p className="text-sm text-[#d4b47f]">Operations workspace</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.02] tracking-[-0.06em]">From first enquiry to final handover.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/55">One protected workspace for catalogue, customers, site work, quotations, projects, and payments.</p>
        </div>
        <p className="text-xs text-white/35">Universal Pergola internal system</p>
      </section>

      <section className="flex min-w-0 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden"><BrandMark /></div>
          <div className="mt-12 lg:mt-0">
            <p className="text-sm font-medium text-brass-dark">Staff portal</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-graphite">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-stone">Sign in with your Universal Pergola staff account.</p>
          </div>
          <div className="mt-6 space-y-3">
            {!configured && <StatusNotice tone="error" title="Setup required"><p>Copy <code>.env.example</code> to <code>.env.local</code> and add the Supabase project settings.</p></StatusNotice>}
            {reason === "profile" && <StatusNotice tone="error" title="Account unavailable"><p>Your staff profile is missing or inactive. Ask an administrator to review the account.</p></StatusNotice>}
          </div>
          <LoginForm disabled={!configured} />
          <Link href="/" className="mt-7 flex min-h-11 items-center justify-center text-sm text-stone hover:text-graphite">Return to catalogue</Link>
        </div>
      </section>
    </main>
  );
}
