import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function isoDateOffset(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
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
