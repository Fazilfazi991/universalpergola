import type { LucideIcon } from "lucide-react";

type EmptyStateProps = { icon: LucideIcon; title: string; description: string; action?: React.ReactNode };

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <section className="grid min-h-64 place-items-center rounded-xl border border-dashed border-line bg-paper px-5 py-10 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-4 grid size-11 place-items-center rounded-full border border-line bg-limestone text-brass-dark"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
        <h2 className="text-base font-semibold tracking-[-0.02em] text-graphite">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-stone">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </section>
  );
}
