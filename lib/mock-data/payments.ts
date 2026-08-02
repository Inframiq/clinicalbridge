import type { PostShiftRecord } from "@/types";

function derive(
  id: string,
  shiftId: string,
  doctorId: string,
  hours: number,
  hourlyRate: number,
  status: PostShiftRecord["status"],
  submittedAt: string,
  approvedAt?: string,
  paidAt?: string
): PostShiftRecord {
  const grossPay = hours * hourlyRate;
  const platformFeePct = 5;
  const netPayout = Math.round(grossPay * (1 - platformFeePct / 100));
  return {
    id,
    shiftId,
    doctorId,
    hours,
    hourlyRate,
    grossPay,
    platformFeePct,
    netPayout,
    status,
    submittedAt,
    approvedAt,
    paidAt,
    hasTimesheet: true,
    hasClinicalNotes: status !== "pending_approval",
  };
}

export const postShiftRecords: PostShiftRecord[] = [
  derive(
    "ps-001",
    "shift-er-001",
    "doc-sarah-johnson",
    8,
    120,
    "pending_approval",
    "2025-05-25T04:15:00"
  ),
  derive(
    "ps-002",
    "shift-icu-002",
    "doc-michael-lee",
    12,
    130,
    "approved",
    "2025-05-25T08:30:00",
    "2025-05-25T08:30:00"
  ),
  derive(
    "ps-003",
    "shift-ped-010",
    "doc-priya-shah",
    8,
    110,
    "payment_processed",
    "2025-05-26T20:10:00",
    "2025-05-27T10:20:00",
    "2025-05-27T10:20:00"
  ),
  derive(
    "ps-004",
    "shift-ortho-009",
    "doc-james-wilson",
    8,
    130,
    "payment_processed",
    "2025-05-22T18:15:00",
    "2025-05-23T09:15:00",
    "2025-05-23T09:15:00"
  ),
  derive(
    "ps-005",
    "shift-er-night-008",
    "doc-daniel-kim",
    12,
    120,
    "disputed",
    "2025-05-21T19:00:00"
  ),
  derive(
    "ps-006",
    "shift-er-past-012",
    "doc-sarah-johnson",
    8,
    120,
    "payment_processed",
    "2025-05-18T16:15:00",
    "2025-05-19T09:00:00",
    "2025-05-19T09:00:00"
  ),
  derive(
    "ps-007",
    "shift-gen-past-014",
    "doc-alex-nguyen",
    8,
    100,
    "payment_processed",
    "2025-05-16T16:15:00",
    "2025-05-17T09:00:00",
    "2025-05-17T09:00:00"
  ),
];

export function getPaymentForShift(shiftId: string) {
  return postShiftRecords.find((p) => p.shiftId === shiftId);
}

export function getPaymentsForDoctor(doctorId: string) {
  return postShiftRecords.filter((p) => p.doctorId === doctorId);
}
