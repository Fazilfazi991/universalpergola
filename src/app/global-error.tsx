"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "sans-serif" }}><div style={{ maxWidth: 420, textAlign: "center" }}><h1>Universal Pergola is temporarily unavailable</h1><p>Reload the application or try again shortly.</p><button type="button" onClick={reset}>Reload</button></div></main></body></html>;
}
