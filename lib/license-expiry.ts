/** Days of warning before a licence expiry date. */
export const LICENSE_WARNING_DAYS = 60;

export type LicenseExpiryState = "expired" | "expiring" | "ok" | "unknown";

/**
 * Classifies a licence expiry date (`YYYY-MM-DD`). The date is read as a
 * local calendar day, not UTC midnight, so it never shifts by a day in
 * timezones west of UTC. A licence is valid through its expiry date.
 */
export function licenseExpiryStatus(
  expiry: string | null | undefined,
  now: Date = new Date()
): { state: LicenseExpiryState; daysLeft: number | null } {
  const match = expiry?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return { state: "unknown", daysLeft: null };
  const expiryDay = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.round((expiryDay.getTime() - today.getTime()) / 86_400_000);
  if (daysLeft < 0) return { state: "expired", daysLeft };
  if (daysLeft <= LICENSE_WARNING_DAYS) return { state: "expiring", daysLeft };
  return { state: "ok", daysLeft };
}
