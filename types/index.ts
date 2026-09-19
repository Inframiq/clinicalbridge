import type { DocumentReviewStatus, UploadedFileMetadata } from "@/lib/supabase/storage";

export type ShiftStatus =
  | "open"
  | "active"
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type ExperienceLevel = "Entry Level" | "Mid Level+" | "Senior" | "Expert";

export type EmploymentType = "Independent / Locum" | "W2 Contract" | "Full-Time";

export interface GeoLocation {
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export type DoctorKind = "working" | "locum_tenens";

export interface DoctorVerification {
  medicalCouncil: boolean;
  degree: boolean;
  identity: boolean;
  hospitalApproval: boolean;
}

export interface HospitalVerification {
  governmentRegistration: boolean;
  medicalLicense: boolean;
  taxRegistration: boolean;
  accreditation: boolean;
  authorizedSignatory: boolean;
}

export interface ReplacementPreferences {
  preferredTravelDistanceMiles?: number;
  preferredDepartments?: string[];
  maxHoursPerWeek?: number;
  availableDays?: string[];
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  specialty: string;
  subSpecialty?: string;
  rating: number;
  reviewCount: number;
  licenseNumber: string;
  licenseExpiry: string;
  npiNumber: string;
  yearsOfExperience: string;
  employmentType: EmploymentType;
  preferredLocations: string[];
  verified: boolean;
  email: string;
  phone: string;
  status: "active" | "onboarding" | "inactive";
  distanceMiles?: number;
  matchScore?: number;
  doctorKind?: DoctorKind;
  department?: string;
  verification?: DoctorVerification;
  replacementPreferences?: ReplacementPreferences;
  languages?: string[];
  uploadedDocuments?: Record<string, UploadedFileMetadata>;
  profileId?: string;
  /** Account-level registration status from `profiles.verification_status` (e.g. "Submitted", "Approved", "Rejected"). */
  registrationStatus?: string;
  /** Super admin's review of the Basic Info section, independent of the per-document statuses. */
  basicInfoStatus: DocumentReviewStatus;
  basicInfoReviewedAt?: string;
  basicInfoRejectionReason?: string;
}

export type ShiftType =
  | "Emergency (Level 1)"
  | "Critical Care"
  | "General"
  | "Elective"
  | "Night Coverage";

export interface MatchStats {
  targetDoctors: number;
  avgMatchScorePct: number;
  estResponseMinutes: [number, number];
}

export interface Shift {
  id: string;
  title: string;
  department: string;
  facilityName: string;
  facilityId: string;
  location: GeoLocation;
  date: string; // ISO date
  startTime: string; // "08:00 AM"
  endTime: string; // "04:00 PM"
  shiftType: ShiftType;
  subSpecialty?: string;
  hourlyRate: number;
  doctorsNeeded: number;
  experienceLevel: ExperienceLevel;
  description: string;
  status: ShiftStatus;
  codeRed: boolean;
  assignedDoctorId?: string;
  progressPct?: number;
  elapsedMinutes?: number;
  totalMinutes?: number;
  breakMinutes?: number;
  matchStats?: MatchStats;
  attendanceConfirmed?: boolean;
  applicationDeadline?: string;
  requiredQualification?: string;
  supervisorName?: string;
  emergencyContact?: string;
}

export type ApplicationStatus =
  | "accepted"
  | "in_review"
  | "rejected"
  | "withdrawn";

export interface Application {
  id: string;
  shiftId: string;
  doctorId: string;
  status: ApplicationStatus;
  appliedAt: string; // ISO datetime
  matchScorePct: number;
}

export type PayoutStatus =
  | "pending_approval"
  | "approved"
  | "payment_processed"
  | "disputed";

export interface PostShiftRecord {
  id: string;
  shiftId: string;
  doctorId: string;
  hours: number;
  hourlyRate: number;
  grossPay: number;
  platformFeePct: number;
  netPayout: number;
  status: PayoutStatus;
  submittedAt: string;
  approvedAt?: string;
  paidAt?: string;
  hasTimesheet: boolean;
  hasClinicalNotes: boolean;
}

export type TimelineEventStatus = "done" | "current" | "upcoming" | "alert";

export interface TimelineEvent {
  id: string;
  label: string;
  description?: string;
  timestamp: string;
  status: TimelineEventStatus;
}

export interface ActivityFeedItem {
  id: string;
  actorName: string;
  actorAvatarUrl?: string;
  action: string;
  timestamp: string;
  icon: "applied" | "checked-in" | "completed" | "new" | "message";
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: "info" | "success" | "warning" | "danger";
}

export interface Patient {
  id: string;
  name: string;
  mrn: string;
  bedRoom: string;
  status: "in_progress" | "pending" | "completed";
  lastUpdate: string;
}

export type UserRole =
  | "hospital"
  | "working_doctor"
  | "locum_tenens"
  | "super_admin";

export interface EarningsPoint {
  date: string;
  earnings: number;
  hours: number;
}

export interface SpecialtyBreakdown {
  specialty: string;
  count: number;
}

export interface DayOfWeekBreakdown {
  day: string;
  shifts: number;
}

export interface TimeOfDayBreakdown {
  segment: string;
  shifts: number;
}

export interface PerformanceTrend {
  metric: string;
  thisMonth: string;
  lastMonth: string;
  changePct: number;
}

export interface FacilitySummary {
  id: string;
  name: string;
  shiftsWorked: number;
}

export type PreferredReplacementType = "Locum Tenens";

export type ReplacementRequestStatus = "pending" | "approved" | "rejected" | "filled";

export interface ReplacementRequest {
  id: string;
  shiftId: string;
  requestingDoctorId: string;
  reason: string;
  preferredReplacementType: PreferredReplacementType;
  hourlyCompensation: number;
  notes?: string;
  status: ReplacementRequestStatus;
  requestedAt: string;
  reviewedAt?: string;
}

export interface SavedShift {
  id: string;
  shiftId: string;
  doctorId: string;
  savedAt: string;
}

export type RatingDirection = "hospital_to_doctor" | "doctor_to_hospital";

export interface Rating {
  id: string;
  shiftId: string;
  direction: RatingDirection;
  doctorId: string;
  facilityId: string;
  categories: Record<string, number>;
  overallScore: number;
  comment?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  facilityId: string;
  name: string;
}

export type AttendanceStatus = "checked_in" | "checked_out" | "verified";

export interface AttendanceRecord {
  id: string;
  shiftId: string;
  doctorId: string;
  checkInTime?: string;
  checkOutTime?: string;
  verifiedByProfileId?: string;
  verifiedAt?: string;
  status: AttendanceStatus;
}

export interface MessageThread {
  id: string;
  participantOne: string;
  participantTwo: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  read: boolean;
  createdAt: string;
}
