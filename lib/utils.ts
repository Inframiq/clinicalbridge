import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats a Date as "YYYY-MM-DD" in the user's local timezone. Unlike
 * `toISOString()`, this doesn't shift the day for timezones ahead of UTC (e.g. IST). */
export function toLocalIsoDate(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Parses a "YYYY-MM-DD" string as local midnight. `new Date("YYYY-MM-DD")` parses
 * as UTC midnight, which lands on the previous day in timezones behind UTC. */
export function parseLocalIsoDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function isoDateOffset(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return toLocalIsoDate(d);
}

/** Bounds for native `<input type="date">` fields, since browsers otherwise let the
 * year segment be typed with 5-6 digits (e.g. "202599") when no min/max is set. */
export function todayIsoDate() {
  return isoDateOffset(0);
}

export function isoDateYearsAgo(years: number) {
  return isoDateOffset(-years);
}

export function isoDateYearsFromNow(years: number) {
  return isoDateOffset(years);
}
