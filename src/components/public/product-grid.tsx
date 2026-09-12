import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CatalogueProduct } from "@/lib/catalogue/types";
import { presentPrice } from "@/lib/catalogue/presentation";

export function ProductGrid({ products }: { products: CatalogueProduct[] }) {
  if (products.length === 0) return <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-line bg-paper px-6 text-center"><div><p className="font-medium">No matching products</p><p className="mt-2 text-sm text-stone">Try another category or search term.</p></div></div>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => {
    const image = product.images[0];
    const price = presentPrice(product.pricing_mode, product.price);
    return <article key={product.id} className="group overflow-hidden rounded-lg border border-line bg-paper"><Link href={`/products/${product.slug}`} className="block focus-visible:outline-offset-[-2px]"><div className="relative aspect-[4/3] overflow-hidden bg-[#e6e1d7]">{image?.url ? <Image src={image.url} alt={image.alt_text || product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" /> : <div className="grid size-full place-items-center px-6 text-center text-sm text-stone">Image coming soon</div>}{product.is_featured && <span className="absolute left-3 top-3 rounded-sm bg-ink/90 px-2.5 py-1 text-xs font-medium text-white">Featured</span>}</div><div className="p-5"><p className="text-xs text-stone">{product.category.name}{product.product_code ? ` · ${product.product_code}` : ""}</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-graphite">{product.name}</h2>{product.short_description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone">{product.short_description}</p>}<div className="mt-5 flex min-h-6 items-center justify-between gap-3">{price ? <p className="text-sm font-medium text-graphite">{price}</p> : <span />}<span className="inline-flex items-center gap-1 text-sm font-medium text-brass-dark">View product <ArrowUpRight size={15} /></span></div></div></Link></article>;
  })}</div>;
}
