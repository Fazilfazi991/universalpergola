import type { Metadata } from "next";
import { CatalogueHeader } from "@/components/public/catalogue-header";
import { ProductGrid } from "@/components/public/product-grid";
import { ConfigurationState } from "@/components/ui/configuration-state";
import { getActiveCategories, getPublishedProducts } from "@/lib/catalogue/queries";

export const metadata: Metadata = { title: "Products", description: "Explore published Universal Pergola outdoor systems." };
export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.slice(0, 100) : "";
  const category = typeof params.category === "string" ? params.category.slice(0, 96) : "";
  const [productResult, categoryResult] = await Promise.all([getPublishedProducts({ search, category }), getActiveCategories()]);
  return <main className="min-h-screen bg-limestone"><CatalogueHeader /><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"><div className="max-w-3xl"><h1 className="text-4xl font-semibold tracking-[-0.055em] text-graphite sm:text-5xl">Product catalogue</h1><p className="mt-4 max-w-2xl text-base leading-7 text-stone">Architectural outdoor systems, maintained directly by the Universal Pergola team.</p></div><form className="mt-8 grid gap-3 border-y border-line bg-paper py-4 sm:rounded-lg sm:border sm:p-4 md:grid-cols-[minmax(12rem,1fr)_14rem_auto]"><input name="search" defaultValue={search} aria-label="Search catalogue" placeholder="Search products or SKU" className="min-h-12 rounded-md border border-line px-3 text-base" /><select name="category" defaultValue={category} aria-label="Filter catalogue by category" className="min-h-12 rounded-md border border-line bg-paper px-3 text-base"><option value="">All categories</option>{categoryResult.data.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select><button className="min-h-12 rounded-md bg-graphite px-6 text-sm font-semibold text-white">Show products</button></form><div className="mt-8">{!productResult.configured ? <ConfigurationState /> : productResult.error ? <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">The catalogue could not be loaded. Try again shortly.</div> : <ProductGrid products={productResult.data} />}</div></div></main>;
}
