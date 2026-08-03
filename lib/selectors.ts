import type { Shift, PostShiftRecord, Application } from "@/types";
import { doctors } from "@/lib/mock-data/doctors";
import { getShiftById } from "@/lib/mock-data/shifts";

export interface JoinedPostShiftRecord extends PostShiftRecord {
  shift?: Shift;
}

export function joinPostShiftRecords(
  payments: PostShiftRecord[],
  shifts: Shift[]
): JoinedPostShiftRecord[] {
  return payments.map((p) => ({
    ...p,
    shift: shifts.find((s) => s.id === p.shiftId) ?? getShiftById(p.shiftId),
  }));
}

export function getDoctorById(id?: string) {
  return doctors.find((d) => d.id === id);
}

export function getDoctorName(id?: string) {
  const doctor = getDoctorById(id);
  return doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : "Unassigned";
}

export function getActiveShifts(shifts: Shift[]) {
  return shifts.filter((s) => s.status === "active");
}

export function getOpenShifts(shifts: Shift[]) {
  return shifts.filter((s) => s.status === "open");
}

export function getUpcomingShifts(shifts: Shift[]) {
  return shifts.filter((s) => s.status === "confirmed" || s.status === "pending");
}

export function getCompletedShifts(shifts: Shift[]) {
  return shifts.filter((s) => s.status === "completed");
}

export function computeEscrowBalance(payments: PostShiftRecord[]) {
  return payments
    .filter((p) => p.status !== "payment_processed")
    .reduce((sum, p) => sum + p.netPayout, 0);
}

export function computeTotalPaidOut(payments: PostShiftRecord[]) {
  return payments
    .filter((p) => p.status === "payment_processed")
    .reduce((sum, p) => sum + p.netPayout, 0);
}

export function getPendingApplications(applications: Application[]) {
  return applications.filter((a) => a.status === "in_review");
}

export function getTopMatchesForSpecialty(specialty: string, excludeIds: string[] = []) {
  return doctors
    .filter((d) => d.specialty === specialty && !excludeIds.includes(d.id))
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
}
