import Link from "next/link";
import { ArrowUpRight, Ruler, ShieldCheck, Workflow } from "lucide-react";
import { CatalogueHeader } from "@/components/public/catalogue-header";
import { getPublishedProducts } from "@/lib/catalogue/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getPublishedProducts(3);

  return (
    <main className="min-h-screen bg-ink text-white">
      <CatalogueHeader />
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-y-0 right-[12%] hidden w-px bg-brass/35 lg:block" />
        <div className="pointer-events-none absolute right-[12%] top-36 hidden h-px w-28 bg-brass/35 lg:block" />
        <div className="mx-auto grid min-h-[68vh] max-w-7xl content-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm text-[#d4b47f]">Outdoor systems, precisely managed.</p>
            <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-7xl">Architectural shade for considered spaces.</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/60 sm:text-lg">Browse Universal Pergola systems and send a project enquiry. Published products are managed from the same operational platform used by our team.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/products" className="inline-flex min-h-12 items-center gap-2 rounded-md bg-brass px-5 text-sm font-semibold text-ink hover:bg-[#c39a58]">View products <ArrowUpRight size={17} aria-hidden="true" /></Link>
              <Link href="/enquire" className="inline-flex min-h-12 items-center rounded-md border border-white/20 px-5 text-sm font-medium text-white hover:border-white/45">Discuss a project</Link>
            </div>
          </div>
          <div className="self-end border-l border-white/14 pl-6 text-sm text-white/48">
            <p className="max-w-64 leading-6">Catalogue content is live from the Universal Pergola operations database.</p>
            <div className="mt-8 flex items-center gap-3 text-white/70"><Ruler size={18} className="text-brass" />Measured on site</div>
            <div className="mt-4 flex items-center gap-3 text-white/70"><Workflow size={18} className="text-brass" />Managed end to end</div>
            <div className="mt-4 flex items-center gap-3 text-white/70"><ShieldCheck size={18} className="text-brass" />Built for handover</div>
          </div>
        </div>
      </section>

      <section className="bg-limestone text-graphite">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 border-b border-line pb-5">
            <div><h2 className="text-2xl font-semibold tracking-[-0.04em]">Product catalogue</h2><p className="mt-1 text-sm text-stone">Only published products appear here.</p></div>
            <Link href="/products" className="hidden min-h-11 items-center text-sm font-medium text-brass-dark sm:flex">View all</Link>
          </div>
          {products.length > 0 ? (
            <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`} className="group min-h-52 bg-paper p-6 hover:bg-white">
                  <p className="text-xs text-stone">{product.category?.name || "Uncategorised"}</p>
                  <h3 className="mt-10 text-xl font-semibold tracking-[-0.035em]">{product.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone">{product.short_description || "Product details available on request."}</p>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brass-dark">View details <ArrowUpRight size={15} /></span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-line bg-paper px-6 text-center">
              <div><p className="font-medium">The catalogue is ready for products.</p><p className="mt-2 text-sm text-stone">Published items will appear here automatically after Supabase is connected.</p></div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
