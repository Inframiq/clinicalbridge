import { formatDistance } from "date-fns";
import type { Shift, PostShiftRecord, Rating, AppNotification } from "@/types";

export { mapDoctorRow } from "./services/doctors";
export { mapFacilityRow } from "./services/facilities";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapShiftRow(item: Record<string, any>): Shift {
  return {
    id: item.id,
    title: item.title,
    department: item.department_name,
    facilityName: item.facility_name,
    facilityId: item.facility_id,
    location: item.location || { address: "", city: "", state: "", lat: 0, lng: 0 },
    date: item.date,
    startTime: item.start_time,
    endTime: item.end_time,
    shiftType: item.shift_type,
    subSpecialty: item.sub_specialty,
    hourlyRate: Number(item.hourly_rate),
    doctorsNeeded: item.doctors_needed,
    experienceLevel: item.experience_level,
    description: item.description || "",
    status: item.status,
    codeRed: Boolean(item.code_red),
    assignedDoctorId: item.assigned_doctor_id,
    requiredQualification: item.required_qualification,
    supervisorName: item.supervisor_name,
    emergencyContact: item.emergency_contact,
    applicationDeadline: item.application_deadline,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPayoutRow(item: Record<string, any>): PostShiftRecord {
  return {
    id: item.id,
    shiftId: item.shift_id,
    doctorId: item.doctor_id,
    hours: Number(item.hours),
    hourlyRate: Number(item.hourly_rate),
    grossPay: Number(item.gross_pay),
    platformFeePct: Number(item.platform_fee_pct),
    netPayout: Number(item.net_payout),
    status: item.status,
    submittedAt: item.submitted_at,
    approvedAt: item.approved_at ?? undefined,
    paidAt: item.paid_at ?? undefined,
    hasTimesheet: Boolean(item.has_timesheet),
    hasClinicalNotes: Boolean(item.has_clinical_notes),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRatingRow(item: Record<string, any>): Rating {
  return {
    id: item.id,
    shiftId: item.shift_id,
    direction: item.direction,
    doctorId: item.doctor_id,
    facilityId: item.facility_id,
    categories: item.categories || {},
    overallScore: Number(item.overall_score),
    comment: item.comment ?? undefined,
    createdAt: item.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapNotificationRow(item: Record<string, any>, now: Date = new Date()): AppNotification {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    timestamp: formatDistance(new Date(item.created_at), now, { addSuffix: true }),
    read: Boolean(item.read),
    type: item.type,
  };
}
