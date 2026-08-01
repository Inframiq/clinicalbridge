import type {
  EarningsPoint,
  SpecialtyBreakdown,
  DayOfWeekBreakdown,
  TimeOfDayBreakdown,
  PerformanceTrend,
  FacilitySummary,
} from "@/types";

export const earningsSeries: EarningsPoint[] = [
  { date: "May 1", earnings: 1200, hours: 16 },
  { date: "May 6", earnings: 3400, hours: 48 },
  { date: "May 11", earnings: 5200, hours: 88 },
  { date: "May 16", earnings: 4600, hours: 112 },
  { date: "May 21", earnings: 7100, hours: 160 },
  { date: "May 26", earnings: 8600, hours: 192 },
  { date: "May 31", earnings: 9640, hours: 208 },
];

export const specialtyBreakdown: SpecialtyBreakdown[] = [
  { specialty: "ER Physician", count: 14 },
  { specialty: "ICU Specialist", count: 6 },
  { specialty: "Pediatrician", count: 4 },
  { specialty: "Hospitalist", count: 3 },
  { specialty: "Other", count: 1 },
];

export const dayOfWeekBreakdown: DayOfWeekBreakdown[] = [
  { day: "Mon", shifts: 4 },
  { day: "Tue", shifts: 6 },
  { day: "Wed", shifts: 5 },
  { day: "Thu", shifts: 7 },
  { day: "Fri", shifts: 6 },
  { day: "Sat", shifts: 5 },
  { day: "Sun", shifts: 3 },
];

export const timeOfDayBreakdown: TimeOfDayBreakdown[] = [
  { segment: "Morning (6AM-12PM)", shifts: 8 },
  { segment: "Afternoon (12PM-6PM)", shifts: 10 },
  { segment: "Evening (6PM-12AM)", shifts: 7 },
  { segment: "Night (12AM-6AM)", shifts: 3 },
];

export const performanceTrends: PerformanceTrend[] = [
  { metric: "Completion Rate", thisMonth: "85.7%", lastMonth: "78.4%", changePct: 7.3 },
  { metric: "On-Time Start Rate", thisMonth: "96.4%", lastMonth: "93.1%", changePct: 3.3 },
  { metric: "Cancellation Rate", thisMonth: "2.8%", lastMonth: "3.9%", changePct: -1.1 },
  { metric: "Average Shift Rating", thisMonth: "4.9", lastMonth: "4.7", changePct: 0.2 },
  { metric: "Rebooking Rate", thisMonth: "82.1%", lastMonth: "76.3%", changePct: 5.8 },
];

export const topFacilities: FacilitySummary[] = [
  { id: "fac-city-medical", name: "City Medical Center", shiftsWorked: 12 },
  { id: "fac-metro-health", name: "Metro Health System", shiftsWorked: 6 },
  { id: "fac-st-marys", name: "St. Mary's Hospital", shiftsWorked: 4 },
  { id: "fac-riverside", name: "Riverside Community Hospital", shiftsWorked: 3 },
  { id: "fac-northside", name: "Northside Medical Center", shiftsWorked: 2 },
];

export const applicationStatusBreakdown = [
  { status: "Accepted", count: 45 },
  { status: "In Review", count: 23 },
  { status: "Rejected", count: 15 },
  { status: "Withdrawn", count: 13 },
];

export const shiftOverviewSeries = [
  { day: "Mon", openShifts: 24, filledShifts: 16 },
  { day: "Tue", openShifts: 20, filledShifts: 14 },
  { day: "Wed", openShifts: 26, filledShifts: 18 },
  { day: "Thu", openShifts: 28, filledShifts: 18 },
  { day: "Fri", openShifts: 22, filledShifts: 17 },
  { day: "Sat", openShifts: 18, filledShifts: 12 },
  { day: "Sun", openShifts: 14, filledShifts: 9 },
];
