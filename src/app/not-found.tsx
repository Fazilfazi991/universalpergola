import Link from "next/link";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-limestone px-4 text-center"><div><p className="text-sm text-brass-dark">404</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Page not found</h1><p className="mt-3 text-sm text-stone">The requested page does not exist or is no longer available.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-graphite px-5 text-sm font-semibold text-white">Return home</Link></div></main>;
}
