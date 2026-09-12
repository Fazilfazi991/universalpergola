import type { Metadata } from "next";
import Link from "next/link";
import { CatalogueHeader } from "@/components/public/catalogue-header";
import { StatusNotice } from "@/components/ui/status-notice";

export const metadata: Metadata = { title: "Enquire" };

export default function EnquirePage() {
  return <main className="min-h-screen bg-limestone"><CatalogueHeader /><div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20"><p className="text-sm text-brass-dark">Project enquiry</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-graphite sm:text-5xl">Tell us about your space.</h1><p className="mt-5 max-w-xl text-base leading-7 text-stone">The public enquiry workflow will be connected in Phase 2 after form fields and routing rules are confirmed.</p><div className="mt-8"><StatusNotice title="Foundation route ready"><p>No customer information is collected by this placeholder.</p></StatusNotice></div><Link href="/products" className="mt-8 inline-flex min-h-11 items-center rounded-md border border-line bg-paper px-5 text-sm font-medium text-graphite">Browse products</Link></div></main>;
}
