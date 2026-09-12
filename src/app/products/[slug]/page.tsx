import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CatalogueHeader } from "@/components/public/catalogue-header";
import { getPublishedProduct } from "@/lib/catalogue/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) return { title: "Product not found" };
  return { title: product.seo_title || product.name, description: product.seo_description || product.short_description || undefined };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) notFound();
  return <main className="min-h-screen bg-limestone"><CatalogueHeader /><article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16"><Link href="/products" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone hover:text-graphite"><ArrowLeft size={16} />Back to products</Link><div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]"><div><p className="text-sm text-brass-dark">{product.category?.name || "Universal Pergola"}{product.product_code ? ` · ${product.product_code}` : ""}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-graphite sm:text-6xl">{product.name}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-stone">{product.short_description || "Full product information is available on request."}</p>{product.full_description && <div className="mt-10 whitespace-pre-line border-t border-line pt-8 text-base leading-8 text-graphite/80">{product.full_description}</div>}</div><aside className="rounded-xl border border-line bg-paper p-5"><h2 className="text-sm font-semibold">Product details</h2><dl className="mt-5 space-y-4 text-sm">{product.material && <div><dt className="text-stone">Material</dt><dd className="mt-1 text-graphite">{product.material}</dd></div>}{product.colour_information && <div><dt className="text-stone">Colours</dt><dd className="mt-1 text-graphite">{product.colour_information}</dd></div>}{product.dimensions_information && <div><dt className="text-stone">Dimensions</dt><dd className="mt-1 text-graphite">{product.dimensions_information}</dd></div>}</dl><Link href={`/enquire?product=${encodeURIComponent(product.slug)}`} className="mt-7 flex min-h-12 items-center justify-center rounded-md bg-graphite px-4 text-sm font-semibold text-white">Enquire about this product</Link></aside></div></article></main>;
}
