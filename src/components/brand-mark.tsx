import Link from "next/link";

type BrandMarkProps = { compact?: boolean; href?: string; inverse?: boolean };

export function BrandMark({ compact = false, href = "/", inverse = false }: BrandMarkProps) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-3 rounded-sm" aria-label="Universal Pergola home">
      <span className="relative grid size-9 shrink-0 place-items-center" aria-hidden="true">
        <span className={`absolute inset-x-0 top-1 h-px ${inverse ? "bg-brass" : "bg-brass-dark"}`} />
        <span className={`absolute bottom-1 left-1 top-1 w-px ${inverse ? "bg-white/55" : "bg-graphite/45"}`} />
        <span className={`absolute bottom-1 right-1 top-1 w-px ${inverse ? "bg-white/55" : "bg-graphite/45"}`} />
        <span className={`mt-1 text-sm font-semibold tracking-[-0.08em] ${inverse ? "text-white" : "text-graphite"}`}>UP</span>
      </span>
      {!compact && <span className="leading-tight"><span className={`block text-sm font-semibold tracking-[-0.02em] ${inverse ? "text-white" : "text-graphite"}`}>Universal Pergola</span><span className={`block text-[11px] ${inverse ? "text-white/55" : "text-stone"}`}>Outdoor architecture</span></span>}
    </Link>
  );
}
