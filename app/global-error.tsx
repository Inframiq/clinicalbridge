"use client";

import { useEffect } from "react";

/**
 * Only rendered if the root layout itself throws (so it must supply its own
 * <html>/<body> and cannot depend on any provider from app/layout.tsx).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            height: "100dvh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            padding: "0 1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Something went wrong</h1>
            <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#666" }}>
              An unexpected error occurred while loading the app.
            </p>
          </div>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              background: "#111",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
