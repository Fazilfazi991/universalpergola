import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CatalogueProduct } from "@/lib/catalogue/queries";

export function ProductGrid({ products }: { products: CatalogueProduct[] }) {
  if (products.length === 0) return <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-line bg-paper px-6 text-center"><div><p className="font-medium">No published products yet</p><p className="mt-2 text-sm text-stone">Products will appear after they are published in the staff dashboard.</p></div></div>;
  return <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <Link key={product.id} href={`/products/${product.slug}`} className="min-h-56 bg-paper p-6 hover:bg-white"><p className="text-xs text-stone">{product.category?.name || "Uncategorised"}{product.product_code ? ` · ${product.product_code}` : ""}</p><h2 className="mt-12 text-xl font-semibold tracking-[-0.035em]">{product.name}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-stone">{product.short_description || "Product details available on request."}</p><span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brass-dark">View product <ArrowUpRight size={15} /></span></Link>)}</div>;
}
