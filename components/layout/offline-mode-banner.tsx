"use client";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useHasMounted } from "@/hooks/use-has-mounted";

export function OfflineModeBanner() {
  const mounted = useHasMounted();
  // Lazy initializer (not a setState-in-effect) so SSR/CSR stay consistent: the
  // `useHasMounted` gate returns `null` on the server and first client render
  // regardless, then this already-correct value shows once mounted.
  const [dismissed, setDismissed] = useState(() => {
    // sessionStorage access can throw in some privacy configs (sandboxed
    // iframe, blocked site data); this runs during render, so swallow it.
    try {
      return (
        typeof window !== "undefined" &&
        window.sessionStorage.getItem("cb-offline-banner-dismissed") === "1"
      );
    } catch {
      return false;
    }
  });
  if (isSupabaseConfigured || !mounted || dismissed) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 shadow-sm">
      Offline demo data — Supabase not configured
      <button
        onClick={() => {
          try {
            window.sessionStorage.setItem("cb-offline-banner-dismissed", "1");
          } catch {
            /* storage blocked */
          }
          setDismissed(true);
        }}
        aria-label="Dismiss"
        className="text-amber-700 hover:text-amber-900"
      >
        ✕
      </button>
    </div>
  );
}
