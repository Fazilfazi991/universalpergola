"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-limestone px-4 text-center"><div className="max-w-sm"><h1 className="text-2xl font-semibold tracking-[-0.04em]">This page could not load</h1><p className="mt-3 text-sm leading-6 text-stone">The request failed before the page was ready. Try it again.</p><button type="button" onClick={reset} className="mt-6 min-h-11 rounded-md bg-graphite px-5 text-sm font-semibold text-white">Try again</button></div></main>;
}
