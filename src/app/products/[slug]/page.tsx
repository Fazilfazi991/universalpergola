import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CatalogueHeader } from "@/components/public/catalogue-header";
import { ConfigurationState } from "@/components/ui/configuration-state";
import { getPublishedProduct } from "@/lib/catalogue/queries";
import { presentPrice } from "@/lib/catalogue/presentation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedProduct(slug);
  if (!result.configured) return { title: "Catalogue setup required" };
  if (!result.data) return { title: "Product not found" };
  return { title: result.data.seo_title || result.data.name, description: result.data.seo_description || result.data.short_description || undefined };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const result = await getPublishedProduct(slug);
  if (!result.configured) return <main className="min-h-screen bg-limestone"><CatalogueHeader /><div className="mx-auto max-w-5xl px-4 py-12 sm:px-6"><ConfigurationState context="product page" /></div></main>;
  if (!result.data) notFound();
  const product = result.data;
  const mainImage = product.images[0];
  const price = presentPrice(product.pricing_mode, product.price);
  const enquiryParams = new URLSearchParams({ productId: product.id, productSlug: product.slug, productName: product.name });
  return <main className="min-h-screen bg-limestone"><CatalogueHeader /><article className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><Link href="/products" className="inline-flex min-h-11 items-center gap-2 text-sm text-stone hover:text-graphite"><ArrowLeft size={16} />Back to products</Link><div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:gap-12"><div><div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#e6e1d7]">{mainImage?.url ? <Image src={mainImage.url} alt={mainImage.alt_text || product.name} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" /> : <div className="grid size-full place-items-center text-stone">Product image coming soon</div>}</div>{product.images.length > 1 && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">{product.images.slice(1).map((image) => <div key={image.id} className="relative aspect-square overflow-hidden rounded-md bg-[#e6e1d7]">{image.url && <Image src={image.url} alt={image.alt_text || `${product.name} gallery image`} fill sizes="(max-width: 640px) 30vw, 180px" className="object-cover" />}</div>)}</div>}</div><div className="lg:pt-3"><Link href={`/categories/${product.category.slug}`} className="text-sm font-medium text-brass-dark">{product.category.name}</Link><h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-graphite sm:text-6xl">{product.name}</h1>{product.product_code && <p className="mt-3 text-sm text-stone">Product code {product.product_code}</p>}{product.short_description && <p className="mt-6 text-lg leading-8 text-stone">{product.short_description}</p>}{price && <p className="mt-6 text-xl font-semibold text-graphite">{price}</p>}<Link href={`/enquire?${enquiryParams.toString()}`} className="mt-8 flex min-h-13 w-full items-center justify-center rounded-md bg-graphite px-5 text-sm font-semibold text-white sm:w-fit">Enquire about this product</Link></div></div>
    <div className="mt-12 grid gap-8 border-t border-line pt-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">{product.full_description ? <div><h2 className="text-2xl font-semibold tracking-[-0.04em]">About this product</h2><div className="mt-4 whitespace-pre-line text-base leading-8 text-graphite/80">{product.full_description}</div></div> : <div />}
      <div className="space-y-8">{(product.material || product.colour_information || product.dimensions_information) && <section><h2 className="text-lg font-semibold">Product details</h2><dl className="mt-4 divide-y divide-line border-y border-line text-sm">{product.material && <div className="grid grid-cols-[7rem_1fr] gap-4 py-3"><dt className="text-stone">Material</dt><dd>{product.material}</dd></div>}{product.colour_information && <div className="grid grid-cols-[7rem_1fr] gap-4 py-3"><dt className="text-stone">Colours</dt><dd>{product.colour_information}</dd></div>}{product.dimensions_information && <div className="grid grid-cols-[7rem_1fr] gap-4 py-3"><dt className="text-stone">Dimensions</dt><dd>{product.dimensions_information}</dd></div>}</dl></section>}{Object.keys(product.specifications || {}).length > 0 && <section><h2 className="text-lg font-semibold">Specifications</h2><dl className="mt-4 divide-y divide-line border-y border-line text-sm">{Object.entries(product.specifications).map(([key, value]) => <div key={key} className="grid grid-cols-[minmax(7rem,0.45fr)_1fr] gap-4 py-3"><dt className="text-stone">{key}</dt><dd>{String(value)}</dd></div>)}</dl></section>}</div></div></article></main>;
}
