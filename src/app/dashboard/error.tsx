"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="grid min-h-[60vh] place-items-center text-center"><div className="max-w-sm"><AlertTriangle className="mx-auto text-brass-dark" size={28} /><h1 className="mt-4 text-xl font-semibold">Dashboard data could not load</h1><p className="mt-2 text-sm leading-6 text-stone">Check the connection and try the request again.</p><button type="button" onClick={reset} className="mt-5 min-h-11 rounded-md bg-graphite px-5 text-sm font-semibold text-white">Try again</button></div></div>;
}
