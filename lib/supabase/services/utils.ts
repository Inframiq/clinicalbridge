const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Local state can still contain legacy mock ids (e.g. "doc-sarah-johnson")
 * that were never created through the real signup flow and therefore have no
 * DB row. Writes on those ids would violate the UUID column type, so callers
 * check this before hitting Supabase and just keep the change local-only.
 */
export function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

/**
 * Supabase's PostgrestError/AuthError classes extend Error, so `.message` is a
 * non-enumerable own property. Generic serialization (JSON.stringify, and
 * whatever Next's dev-overlay uses for console.error args) silently drops it,
 * printing "{}" for an error that actually has a real message/code/details.
 * Pull the fields out explicitly so logs and toasts show the real reason.
 */
export function describeSupabaseError(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  const parts = [e.message || "Unknown error"];
  if (e.code) parts.push(`code: ${e.code}`);
  if (e.details) parts.push(`details: ${e.details}`);
  if (e.hint) parts.push(`hint: ${e.hint}`);
  return parts.join(" | ");
}
