import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function CatalogueHeader() {
  return (
    <header className="border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandMark inverse />
        <nav className="flex items-center gap-1 text-sm" aria-label="Catalogue navigation">
          <Link href="/products" className="flex min-h-11 items-center rounded-md px-3 text-white/72 hover:text-white">Products</Link>
          <Link href="/enquire" className="flex min-h-11 items-center rounded-md border border-brass/60 px-4 font-medium text-[#e2c28e] hover:border-brass hover:text-white">Enquire</Link>
        </nav>
      </div>
    </header>
  );
}
