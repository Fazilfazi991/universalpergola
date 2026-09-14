export default function ReportsLoading() {
  return <div className="space-y-5" aria-busy="true"><div className="h-16 animate-pulse rounded-lg bg-paper" /><div className="h-28 animate-pulse rounded-lg bg-graphite/10" /><div className="grid gap-3 sm:grid-cols-2"><div className="h-48 animate-pulse rounded-lg bg-paper" /><div className="h-48 animate-pulse rounded-lg bg-paper" /></div></div>;
}
