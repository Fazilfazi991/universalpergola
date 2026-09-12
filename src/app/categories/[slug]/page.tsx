import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CatalogueHeader } from "@/components/public/catalogue-header";
import { ProductGrid } from "@/components/public/product-grid";
import { ConfigurationState } from "@/components/ui/configuration-state";
import { getPublishedProductsByCategory } from "@/lib/catalogue/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedProductsByCategory(slug);
  if (!result.category) return { title: "Category not found" };
  return { title: result.category.seo_title || result.category.name, description: result.category.seo_description || result.category.description || undefined };
}

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const result = await getPublishedProductsByCategory(slug);
  if (!result.configured) return <main className="min-h-screen bg-limestone"><CatalogueHeader /><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><ConfigurationState context="category page" /></div></main>;
  if (!result.category) notFound();
  const category = result.category;
  return <main className="min-h-screen bg-limestone"><CatalogueHeader /><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"><div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-end"><div><p className="text-sm text-brass-dark">Product category</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-graphite sm:text-5xl">{category.name}</h1>{category.description && <p className="mt-4 max-w-2xl text-base leading-7 text-stone">{category.description}</p>}</div>{category.image_url && <div className="relative aspect-[16/9] overflow-hidden rounded-lg"><Image src={category.image_url} alt={category.image_alt_text || category.name} fill priority sizes="(max-width: 1024px) 100vw, 384px" className="object-cover" /></div>}</div>{category.long_description && <div className="mt-8 max-w-3xl whitespace-pre-line border-t border-line pt-7 text-base leading-8 text-graphite/80">{category.long_description}</div>}<div className="mt-10"><ProductGrid products={result.products} /></div></div></main>;
}
