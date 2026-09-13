"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="font-semibold text-red-900">
        Quotation workspace unavailable
      </h2>
      <p className="mt-2 text-sm text-red-800">
        Try loading the quotation data again.
      </p>
      <button
        onClick={reset}
        className="mt-4 min-h-11 rounded-md bg-red-800 px-4 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
