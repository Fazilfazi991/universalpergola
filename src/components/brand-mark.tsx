import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = { compact?: boolean; href?: string; inverse?: boolean };

export function BrandMark({ compact = false, href = "/", inverse = false }: BrandMarkProps) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-3 rounded-sm" aria-label="Universal Pergola home">
      <span className={`grid w-12 shrink-0 place-items-start overflow-hidden ${compact ? "h-12" : "h-10"}`} aria-hidden="true">
        <Image
          src="/brand/universal-pergola-logo.png"
          alt=""
          width={512}
          height={512}
          sizes="48px"
          loading="eager"
          className={`size-12 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.18)] ${compact ? "" : "-translate-y-0.5"}`}
        />
      </span>
      {!compact && <span className="leading-tight"><span className={`block text-sm font-semibold tracking-[-0.02em] ${inverse ? "text-white" : "text-graphite"}`}>Universal Pergola</span><span className={`block text-[11px] ${inverse ? "text-white/55" : "text-stone"}`}>Outdoor architecture</span></span>}
    </Link>
  );
}
