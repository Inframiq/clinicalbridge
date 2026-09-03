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
