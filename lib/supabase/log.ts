/**
 * PostgrestError / AuthError extend Error, so `.message` is a non-enumerable own
 * property that generic serialization (and Next's dev overlay) silently drops,
 * printing "{}". Pull the useful fields out explicitly.
 */
export function describeSupabaseError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error && !("code" in err) && !("details" in err)) return err.message;
  if (!err || typeof err !== "object") return String(err);
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  const parts = [e.message || "Unknown error"];
  if (e.code) parts.push(`code: ${e.code}`);
  if (e.details) parts.push(`details: ${e.details}`);
  if (e.hint) parts.push(`hint: ${e.hint}`);
  return parts.join(" | ");
}

/**
 * The ONLY place Supabase failures get logged. Emits a single formatted string —
 * never a raw error object, which is what Next.js 16 escalates to a full-screen
 * overlay. Default level is "warn" (an expected fallback / handled outcome);
 * reserve "error" for genuine invariant violations.
 */
export function reportSupabase(
  context: string,
  err: unknown,
  opts: { level?: "warn" | "error" } = {}
): void {
  const line = `[supabase] ${context}: ${describeSupabaseError(err)}`;
  if (opts.level === "error") console.error(line);
  else console.warn(line);
}
