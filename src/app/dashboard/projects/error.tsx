"use client";

export default function ProjectsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-red-900">Project workspace could not be loaded</h1>
      <p className="mt-2 text-sm text-red-800">Try the request again. Your project data has not been changed.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 min-h-11 rounded-md bg-graphite px-4 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
