export default function ProjectsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading projects">
      <div className="h-16 animate-pulse rounded-lg bg-line" />
      <div className="h-28 animate-pulse rounded-lg bg-line" />
      <div className="h-80 animate-pulse rounded-lg bg-line" />
    </div>
  );
}
