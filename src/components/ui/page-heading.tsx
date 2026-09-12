type PageHeadingProps = { title: string; description: string; action?: React.ReactNode };

export function PageHeading({ title, description, action }: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-[-0.045em] text-graphite sm:text-3xl">{title}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-stone">{description}</p></div>
      {action}
    </div>
  );
}
