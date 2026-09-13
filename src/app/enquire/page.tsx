import type { Metadata } from "next";
import Link from "next/link";
import { CatalogueHeader } from "@/components/public/catalogue-header";
import { PublicEnquiryForm } from "@/components/public/enquiry-form";
import { getPublishedProduct } from "@/lib/catalogue/queries";

export const metadata: Metadata = { title: "Enquire" };

export default async function EnquirePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestedId = typeof params.productId === "string" && /^[0-9a-f-]{36}$/i.test(params.productId) ? params.productId : "";
  const requestedSlug = typeof params.productSlug === "string" ? params.productSlug.slice(0, 96).replace(/[^a-z0-9-]/g, "") : "";
  const requestedName = typeof params.productName === "string" ? params.productName.trim().slice(0, 160) : "";
  const result = requestedSlug ? await getPublishedProduct(requestedSlug) : null;
  const selectedProduct = result?.data && result.data.id === requestedId && result.data.name === requestedName ? result.data : null;
  return <main className="min-h-screen bg-limestone"><CatalogueHeader /><div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16"><p className="text-sm text-brass-dark">Project enquiry</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-graphite sm:text-5xl">Tell us about your space.</h1>{selectedProduct ? <div className="mt-7 rounded-lg border border-line bg-paper p-5"><p className="text-xs text-stone">Product selected</p><p className="mt-1 text-lg font-semibold">{selectedProduct.name}</p><p className="mt-1 text-sm text-stone">Our team will receive the verified catalogue product with your enquiry.</p></div> : <p className="mt-5 max-w-xl text-base leading-7 text-stone">A few practical details are enough for our team to start the conversation.</p>}<PublicEnquiryForm product={selectedProduct ? { id: selectedProduct.id, slug: selectedProduct.slug, name: selectedProduct.name } : null} /><Link href="/products" className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-stone">Browse products</Link></div></main>;
}
