const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Parses a "HH:MM AM/PM" shift start time (see Shift.startTime) into a 24-hour hour. */
export function startHour24(startTime: string): number {
  const [time, period] = startTime.split(" ");
  const [hStr] = time.split(":");
  let h = parseInt(hStr, 10) || 0;
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h;
}

/** Buckets a 24-hour hour into Morning/Afternoon/Evening/Night (indices 0-3). */
export function timeSegmentFor(hour24: number): number {
  if (hour24 >= 6 && hour24 < 12) return 0;
  if (hour24 >= 12 && hour24 < 18) return 1;
  if (hour24 >= 18 && hour24 < 24) return 2;
  return 3;
}

/** Counts ISO dates by day of week, returned in Sun-Sat order. */
export function dayOfWeekBuckets(dates: string[]): { day: string; shifts: number }[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const date of dates) {
    const dayIndex = new Date(date).getDay();
    if (!Number.isNaN(dayIndex)) counts[dayIndex] += 1;
  }
  return DAY_LABELS.map((day, i) => ({ day, shifts: counts[i] }));
}
