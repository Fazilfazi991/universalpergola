import { notFound } from "next/navigation";
import { CatalogueHeader } from "@/components/public/catalogue-header";
import { ProductGrid } from "@/components/public/product-grid";
import { getPublishedProductsByCategory } from "@/lib/catalogue/queries";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const { category, products } = await getPublishedProductsByCategory(slug);
  if (!category) notFound();
  return <main className="min-h-screen bg-limestone"><CatalogueHeader /><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"><p className="text-sm text-brass-dark">Product category</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-graphite sm:text-5xl">{category.name}</h1>{category.description && <p className="mt-4 max-w-2xl text-base leading-7 text-stone">{category.description}</p>}<div className="mt-10"><ProductGrid products={products} /></div></div></main>;
}
