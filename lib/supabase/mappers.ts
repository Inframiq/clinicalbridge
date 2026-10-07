import { formatDistance } from "date-fns";
import type {
  Shift,
  ShiftType,
  ExperienceLevel,
  GeoLocation,
  PostShiftRecord,
  Rating,
  RatingDirection,
  AppNotification,
} from "@/types";
import type { Tables } from "./types";

export { mapDoctorRow } from "./services/doctors";
export { mapFacilityRow } from "./services/facilities";

// Fallbacks below mirror the column defaults in supabase/migrations/001_initial_schema.sql.
// Free-text columns (shift_type, experience_level, direction, type) are trusted to hold
// the values the app writes, so they are narrowed with a cast.

export function mapShiftRow(item: Tables<"shifts">): Shift {
  return {
    id: item.id,
    title: item.title,
    department: item.department_name,
    facilityName: item.facility_name,
    facilityId: item.facility_id,
    location: (item.location as GeoLocation | null) || { address: "", city: "", state: "", lat: 0, lng: 0 },
    date: item.date,
    startTime: item.start_time,
    endTime: item.end_time,
    shiftType: item.shift_type as ShiftType,
    subSpecialty: item.sub_specialty ?? undefined,
    hourlyRate: Number(item.hourly_rate),
    doctorsNeeded: item.doctors_needed ?? 1,
    experienceLevel: (item.experience_level ?? "Mid Level+") as ExperienceLevel,
    description: item.description || "",
    status: item.status ?? "open",
    codeRed: Boolean(item.code_red),
    assignedDoctorId: item.assigned_doctor_id ?? undefined,
    requiredQualification: item.required_qualification ?? undefined,
    supervisorName: item.supervisor_name ?? undefined,
    emergencyContact: item.emergency_contact ?? undefined,
    applicationDeadline: item.application_deadline ?? undefined,
  };
}

export function mapPayoutRow(item: Tables<"payouts">): PostShiftRecord {
  return {
    id: item.id,
    shiftId: item.shift_id,
    doctorId: item.doctor_id,
    hours: Number(item.hours),
    hourlyRate: Number(item.hourly_rate),
    grossPay: Number(item.gross_pay),
    platformFeePct: Number(item.platform_fee_pct),
    netPayout: Number(item.net_payout),
    status: item.status ?? "pending_approval",
    submittedAt: item.submitted_at ?? "",
    approvedAt: item.approved_at ?? undefined,
    paidAt: item.paid_at ?? undefined,
    hasTimesheet: Boolean(item.has_timesheet),
    hasClinicalNotes: Boolean(item.has_clinical_notes),
  };
}

export function mapRatingRow(item: Tables<"ratings">): Rating {
  return {
    id: item.id,
    shiftId: item.shift_id,
    direction: item.direction as RatingDirection,
    doctorId: item.doctor_id,
    facilityId: item.facility_id,
    categories: (item.categories as Record<string, number> | null) || {},
    overallScore: Number(item.overall_score),
    comment: item.comment ?? undefined,
    createdAt: item.created_at ?? "",
  };
}

export function mapNotificationRow(item: Tables<"notifications">, now: Date = new Date()): AppNotification {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    timestamp: formatDistance(item.created_at ? new Date(item.created_at) : now, now, { addSuffix: true }),
    read: Boolean(item.read),
    type: (item.type ?? "info") as AppNotification["type"],
    topic: item.topic ?? undefined,
  };
}
