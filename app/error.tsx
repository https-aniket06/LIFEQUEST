"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production, send this to an error-tracking service (Sentry, etc).
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-pixel text-2xl text-vitality">⚠</p>
      <h1 className="mt-4 text-lg text-ink-text">Something went wrong.</h1>
      <p className="mt-2 text-sm text-muted-text">
        Your progress is safe — it lives in the database, not this screen. Try again.
      </p>
      <button onClick={reset} className="pixel-button mt-6">
        TRY AGAIN
      </button>
    </main>
  );
}
