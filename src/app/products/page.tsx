import type { Metadata } from "next";
import { CatalogueHeader } from "@/components/public/catalogue-header";
import { ProductGrid } from "@/components/public/product-grid";
import { getPublishedProducts } from "@/lib/catalogue/queries";

export const metadata: Metadata = { title: "Products", description: "Explore published Universal Pergola outdoor systems." };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getPublishedProducts();
  return <main className="min-h-screen bg-limestone"><CatalogueHeader /><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"><h1 className="text-4xl font-semibold tracking-[-0.055em] text-graphite sm:text-5xl">Product catalogue</h1><p className="mt-4 max-w-2xl text-base leading-7 text-stone">Published architectural outdoor systems from Universal Pergola.</p><div className="mt-10"><ProductGrid products={products} /></div></div></main>;
}
