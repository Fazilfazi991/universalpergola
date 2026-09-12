export default function DashboardLoading() {
  return <div className="animate-pulse space-y-7" aria-label="Loading dashboard"><div className="h-9 w-64 rounded bg-line" /><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 rounded-lg bg-line/70" />)}</div><div className="h-72 rounded-xl bg-line/70" /></div>;
}
