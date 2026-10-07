/**
 * A toast queued in sessionStorage instead of shown immediately, so it
 * appears only once the destination page has actually rendered instead of
 * popping up mid-redirect (e.g. "Signed in successfully" firing before the
 * dashboard has even started loading). `AppShell` consumes these once the
 * gated dashboard content becomes visible.
 */
type PendingToast = { type: "success" | "info" | "error"; message: string };

const KEY = "lt-pending-toast";

export function queuePendingToast(message: string, type: PendingToast["type"] = "success") {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ type, message } satisfies PendingToast));
  } catch {
    // sessionStorage unavailable (private mode, disabled storage) - the toast
    // is simply skipped, which is harmless.
  }
}

export function consumePendingToast(): PendingToast | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as PendingToast;
  } catch {
    return null;
  }
}
