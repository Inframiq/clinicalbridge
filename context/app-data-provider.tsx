"use client";

import * as React from "react";
import { toast } from "sonner";
import type {
  Shift,
  Application,
  PostShiftRecord,
  AppNotification,
  Doctor,
  DoctorKind,
  DoctorVerification,
  ReplacementRequest,
  SavedShift,
  Rating,
  HospitalVerification,
  Department,
  AttendanceRecord,
} from "@/types";
import type { Facility } from "@/lib/supabase/services/facilities";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { useAuthRole } from "@/context/auth-provider";
import {
  getShifts,
  getReplacementRequests,
  getApplications,
  createShiftInSupabase,
  updateShiftStatusInSupabase,
  updateShiftAssignmentInSupabase,
  createReplacementRequestInSupabase,
  updateReplacementRequestStatusInSupabase,
  modifyReplacementRequestInSupabase,
  createApplicationInSupabase,
  updateApplicationStatusInSupabase,
  mapReplacementRequestRow,
  mapApplicationRow,
} from "@/lib/supabase/services/shifts";
import { mapShiftRow, mapRatingRow, mapPayoutRow, mapNotificationRow } from "@/lib/supabase/mappers";
import {
  getDoctors,
  mapDoctorRow,
  updateDoctorVerificationInSupabase,
  updateDoctorProfileInSupabase,
  updateDoctorRegistrationStatusInSupabase,
  updateDoctorDocumentsInSupabase,
  updateDoctorBasicInfoReviewInSupabase,
} from "@/lib/supabase/services/doctors";
import {
  getFacilities,
  mapFacilityRow,
  updateFacilityProfileInSupabase,
  updateFacilityVerificationInSupabase,
  updateFacilityRegistrationStatusInSupabase,
  updateFacilityDocumentsInSupabase,
  updateFacilityBasicInfoReviewInSupabase,
} from "@/lib/supabase/services/facilities";
import type { UploadedFileMetadata, DocumentReviewStatus } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPayouts, updatePayoutStatusInSupabase } from "@/lib/supabase/services/payouts";
import { getRatings, createRatingInSupabase } from "@/lib/supabase/services/ratings";
import {
  getNotifications,
  markNotificationReadInSupabase,
  createNotificationInSupabase,
} from "@/lib/supabase/services/notifications";
import { createSavedShiftInSupabase, deleteSavedShiftInSupabase } from "@/lib/supabase/services/saved-shifts";
import {
  getDepartments,
  mapDepartmentRow,
  createDepartmentInSupabase,
  renameDepartmentInSupabase,
  deleteDepartmentInSupabase,
} from "@/lib/supabase/services/departments";
import {
  getAttendanceRecords,
  mapAttendanceRow,
  checkInInSupabase,
  checkOutInSupabase,
  verifyAttendanceInSupabase,
} from "@/lib/supabase/services/attendance";
import { reportSupabase } from "@/lib/supabase/log";
import type { Tables } from "@/lib/supabase/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Applies one realtime postgres_changes event to a local state slice: upserts
 * the mapped row on INSERT/UPDATE, removes it by id on DELETE. DELETE
 * payloads only carry the primary key under the default replica identity, so
 * `payload.old` is read for `id` only - never mapped as a full row.
 */
function applyRealtimeChange<T extends { id: string }, R extends { id: string }>(
  setter: (updater: T[] | ((prev: T[]) => T[])) => void,
  payload: RealtimePostgresChangesPayload<R>,
  mapRow: (row: R) => T
) {
  if (payload.eventType === "DELETE") {
    const oldId = payload.old?.id;
    if (!oldId) return;
    setter((prev) => prev.filter((item) => item.id !== oldId));
    return;
  }
  const mapped = mapRow(payload.new);
  setter((prev) =>
    prev.some((item) => item.id === mapped.id)
      ? prev.map((item) => (item.id === mapped.id ? mapped : item))
      : [mapped, ...prev]
  );
}

export type NewShiftInput = Pick<
  Shift,
  | "title"
  | "department"
  | "facilityId"
  | "facilityName"
  | "location"
  | "date"
  | "startTime"
  | "endTime"
  | "shiftType"
  | "subSpecialty"
  | "hourlyRate"
  | "doctorsNeeded"
  | "experienceLevel"
  | "description"
  | "codeRed"
>;

export type NewDepartmentInput = Pick<Department, "facilityId" | "name">;

export type NewDoctorInput = Pick<
  Doctor,
  "firstName" | "lastName" | "licenseNumber" | "department" | "yearsOfExperience" | "email" | "phone"
> & { qualification: string };

export type NewSelfDoctorInput = Pick<
  Doctor,
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "specialty"
  | "subSpecialty"
  | "licenseNumber"
  | "licenseExpiry"
  | "npiNumber"
  | "yearsOfExperience"
  | "employmentType"
  | "preferredLocations"
> & { id?: string };

export type NewHospitalInput = Pick<
  Facility,
  "name" | "city" | "registrationNumber" | "governmentLicense" | "hospitalType" | "contactPerson" | "email" | "phone"
> & { id?: string };

export type NewReplacementRequestInput = Pick<
  ReplacementRequest,
  "shiftId" | "requestingDoctorId" | "reason" | "preferredReplacementType" | "hourlyCompensation" | "notes"
>;

export type NewRatingInput = Pick<
  Rating,
  "shiftId" | "direction" | "doctorId" | "facilityId" | "categories" | "overallScore" | "comment"
>;

interface AppDataContextValue {
  shifts: Shift[];
  applications: Application[];
  payments: PostShiftRecord[];
  notifications: AppNotification[];
  doctors: Doctor[];
  replacementRequests: ReplacementRequest[];
  savedShifts: SavedShift[];
  ratings: Rating[];
  facilities: Facility[];
  broadcastShift: (input: NewShiftInput) => Promise<Shift>;
  updateShiftStatus: (id: string, status: Shift["status"]) => Promise<void>;
  updateApplicationStatus: (id: string, status: Application["status"]) => Promise<void>;
  applyToShift: (shiftId: string, doctorId: string) => Promise<void>;
  withdrawApplication: (id: string) => Promise<void>;
  approvePayment: (id: string) => Promise<void>;
  /** Doctor-initiated: moves an "approved" payout to "Payment Processed". Resolves false on failure. */
  withdrawPayout: (id: string) => Promise<boolean>;
  requestPaymentChanges: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  /** Sends a notification to another user (invite, report, etc). Resolves false (and toasts) on failure. */
  createNotification: (
    recipientProfileId: string,
    notification: Pick<AppNotification, "title" | "body" | "type" | "topic">
  ) => Promise<boolean>;
  registerDoctor: (input: NewDoctorInput) => Promise<Doctor>;
  registerSelfDoctor: (input: NewSelfDoctorInput, doctorKind: DoctorKind) => Promise<Doctor>;
  registerHospital: (input: NewHospitalInput) => Promise<Facility>;
  updateDoctorVerification: (id: string, patch: Partial<DoctorVerification>) => Promise<void>;
  /**
   * Records a super admin's approve/reject decision on one uploaded document.
   * A single "rejected" decision also rejects the whole registration; the
   * doctor is only marked verified once every uploaded document is approved.
   */
  reviewDoctorDocument: (
    id: string,
    docKey: string,
    decision: Exclude<DocumentReviewStatus, "pending">,
    /** Required when `decision` is "rejected": why the super admin rejected this document. */
    reason?: string
  ) => Promise<void>;
  /** Records that a super admin opened this document in the full-screen viewer. No-op if already viewed. */
  markDoctorDocumentViewed: (id: string, docKey: string) => Promise<void>;
  /**
   * Records a super admin's approve/reject decision on a doctor's Basic Info
   * section, independent of {@link reviewDoctorDocument}.
   */
  reviewDoctorBasicInfo: (
    id: string,
    decision: Exclude<DocumentReviewStatus, "pending">,
    reason?: string
  ) => Promise<void>;
  updateDoctorProfile: (
    id: string,
    patch: Partial<
      Pick<
        Doctor,
        | "phone"
        | "email"
        | "preferredLocations"
        | "replacementPreferences"
        | "specialty"
        | "subSpecialty"
        | "licenseNumber"
        | "licenseExpiry"
        | "yearsOfExperience"
        | "languages"
      >
    >
  ) => Promise<void>;
  assignDoctorToShift: (shiftId: string, doctorId: string) => Promise<void>;
  respondToShiftAssignment: (shiftId: string, accept: boolean) => Promise<void>;
  /**
   * Local-only "mark available" flag on the shift itself — a scheduling
   * signal, distinct from the real check-in/check-out flow in
   * {@link checkInAttendance}/{@link checkOutAttendance}, which persists to
   * the `attendance_records` table.
   */
  confirmShiftAttendance: (shiftId: string) => void;
  createReplacementRequest: (input: NewReplacementRequestInput) => Promise<ReplacementRequest>;
  updateReplacementRequestStatus: (
    id: string,
    status: ReplacementRequest["status"]
  ) => Promise<void>;
  approveReplacementRequest: (id: string) => Promise<void>;
  modifyReplacementRequest: (
    id: string,
    patch: Partial<Pick<ReplacementRequest, "hourlyCompensation" | "notes">>
  ) => Promise<void>;
  toggleSaveShift: (shiftId: string, doctorId: string) => Promise<void>;
  submitRating: (input: NewRatingInput) => Promise<Rating>;
  updateFacilityVerification: (
    id: string,
    patch: Partial<HospitalVerification>
  ) => Promise<void>;
  updateFacilityProfile: (
    id: string,
    patch: Partial<Pick<Facility, "name" | "address" | "city" | "phone" | "email" | "contactPerson">>
  ) => Promise<void>;
  /** Hospital counterpart of {@link reviewDoctorDocument}. */
  reviewFacilityDocument: (
    id: string,
    docKey: string,
    decision: Exclude<DocumentReviewStatus, "pending">,
    /** Required when `decision` is "rejected": why the super admin rejected this document. */
    reason?: string
  ) => Promise<void>;
  /** Facility counterpart of {@link markDoctorDocumentViewed}. */
  markFacilityDocumentViewed: (id: string, docKey: string) => Promise<void>;
  /** Facility counterpart of {@link reviewDoctorBasicInfo}. */
  reviewFacilityBasicInfo: (
    id: string,
    decision: Exclude<DocumentReviewStatus, "pending">,
    reason?: string
  ) => Promise<void>;
  approveFacilityRegistration: (id: string) => Promise<void>;
  rejectFacilityRegistration: (id: string) => Promise<void>;
  approveDoctorRegistration: (id: string) => Promise<void>;
  rejectDoctorRegistration: (id: string) => Promise<void>;
  departments: Department[];
  createDepartment: (input: NewDepartmentInput) => Promise<Department>;
  renameDepartment: (id: string, name: string) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  attendanceRecords: AttendanceRecord[];
  checkInAttendance: (shiftId: string, doctorId: string) => Promise<void>;
  checkOutAttendance: (id: string) => Promise<void>;
  verifyAttendance: (id: string, verifierProfileId: string) => Promise<void>;
}

const AppDataContext = React.createContext<AppDataContextValue | null>(null);

/**
 * Every slice starts empty so the first paint shows no rows; the sync effect
 * below fills them from Supabase. Defined at module scope so each `seed.*` is
 * a stable reference: `useLocalStorageState`'s `setValue` depends on
 * `initialValue`, and a fresh `[]` per render would churn the setter identity
 * and re-fire the effects below every render.
 */
const seed = {
  shifts: [] as Shift[],
  applications: [] as Application[],
  payments: [] as PostShiftRecord[],
  notifications: [] as AppNotification[],
  doctors: [] as Doctor[],
  replacementRequests: [] as ReplacementRequest[],
  savedShifts: [] as SavedShift[],
  ratings: [] as Rating[],
  facilities: [] as Facility[],
  departments: [] as Department[],
  attendanceRecords: [] as AttendanceRecord[],
};

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthRole();
  const [shifts, setShifts] = useLocalStorageState<Shift[]>("lt-shifts", seed.shifts);
  const [applications, setApplications] = useLocalStorageState<Application[]>(
    "lt-applications",
    seed.applications
  );
  const [payments, setPayments] = useLocalStorageState<PostShiftRecord[]>(
    "lt-payments",
    seed.payments
  );
  const [notifications, setNotifications] = useLocalStorageState<AppNotification[]>(
    "lt-notifications",
    seed.notifications
  );
  const [doctors, setDoctors] = useLocalStorageState<Doctor[]>("lt-doctors", seed.doctors);
  const [replacementRequests, setReplacementRequests] = useLocalStorageState<ReplacementRequest[]>(
    "lt-replacement-requests",
    seed.replacementRequests
  );
  const [savedShifts, setSavedShifts] = useLocalStorageState<SavedShift[]>(
    "lt-saved-shifts",
    seed.savedShifts
  );
  const [ratings, setRatings] = useLocalStorageState<Rating[]>("lt-ratings", seed.ratings);
  const [facilities, setFacilities] = useLocalStorageState<Facility[]>(
    "lt-facilities",
    seed.facilities
  );
  const [departments, setDepartments] = useLocalStorageState<Department[]>(
    "lt-departments",
    seed.departments
  );
  const [attendanceRecords, setAttendanceRecords] = useLocalStorageState<AttendanceRecord[]>(
    "lt-attendance-records",
    seed.attendanceRecords
  );

  React.useEffect(() => {
    // Gated on a signed-in user, not just on credentials: every table below is
    // read-gated by `auth.role() = 'authenticated'`, so an anonymous visitor on
    // `/`, `/login` or `/signup` would fire seven pointless parallel queries and
    // — because RLS returns 0 rows rather than an error — overwrite the cached
    // slices with `[]`. Re-runs on login, when `user?.id` becomes defined.
    if (!isSupabaseConfigured || !user?.id) return;
    let cancelled = false;
    (async () => {
      const [shiftsR, replR, appsR, docsR, facsR, payR, ratR, deptR, attR] = await Promise.all([
        getShifts(),
        getReplacementRequests(),
        getApplications(),
        getDoctors(),
        getFacilities(),
        getPayouts(),
        getRatings(),
        getDepartments(),
        getAttendanceRecords(),
      ]);
      if (cancelled) return;
      // Each slice is set UNCONDITIONALLY when there is no error — including an
      // empty array. A successful query with zero rows means zero real records
      // exist and must replace the empty/optimistic state, not leave stale rows.
      // On error the slice keeps its seed/current value; each `getX` already
      // called `reportSupabase` internally before returning its error string.
      if (!shiftsR.error) setShifts(shiftsR.data);
      if (!replR.error) setReplacementRequests(replR.data);
      if (!appsR.error) setApplications(appsR.data);
      if (!docsR.error) setDoctors(docsR.data);
      if (!facsR.error) setFacilities(facsR.data);
      if (!payR.error) setPayments(payR.data);
      if (!ratR.error) setRatings(ratR.data);
      if (!deptR.error) setDepartments(deptR.data);
      if (!attR.error) setAttendanceRecords(attR.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    setShifts,
    setReplacementRequests,
    setApplications,
    setDoctors,
    setFacilities,
    setPayments,
    setRatings,
    setDepartments,
    setAttendanceRecords,
  ]);

  React.useEffect(() => {
    // Not gated on `user?.id`: RLS already scopes every row this client can
    // receive per table, so this can subscribe as soon as Supabase is
    // configured and simply deliver nothing until a session exists.
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase
      .channel("app-data-sync")
      .on<Tables<"doctors">>("postgres_changes", { event: "*", schema: "public", table: "doctors" }, (payload) =>
        applyRealtimeChange(setDoctors, payload, mapDoctorRow)
      )
      .on<Tables<"facilities">>("postgres_changes", { event: "*", schema: "public", table: "facilities" }, (payload) =>
        applyRealtimeChange(setFacilities, payload, mapFacilityRow)
      )
      .on<Tables<"shifts">>("postgres_changes", { event: "*", schema: "public", table: "shifts" }, (payload) =>
        applyRealtimeChange(setShifts, payload, mapShiftRow)
      )
      .on<Tables<"applications">>("postgres_changes", { event: "*", schema: "public", table: "applications" }, (payload) =>
        applyRealtimeChange(setApplications, payload, mapApplicationRow)
      )
      .on<Tables<"replacement_requests">>(
        "postgres_changes",
        { event: "*", schema: "public", table: "replacement_requests" },
        (payload) => applyRealtimeChange(setReplacementRequests, payload, mapReplacementRequestRow)
      )
      .on<Tables<"payouts">>("postgres_changes", { event: "*", schema: "public", table: "payouts" }, (payload) =>
        applyRealtimeChange(setPayments, payload, mapPayoutRow)
      )
      .on<Tables<"ratings">>("postgres_changes", { event: "*", schema: "public", table: "ratings" }, (payload) =>
        applyRealtimeChange(setRatings, payload, mapRatingRow)
      )
      .on<Tables<"departments">>("postgres_changes", { event: "*", schema: "public", table: "departments" }, (payload) =>
        applyRealtimeChange(setDepartments, payload, mapDepartmentRow)
      )
      .on<Tables<"attendance_records">>(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_records" },
        (payload) => applyRealtimeChange(setAttendanceRecords, payload, mapAttendanceRow)
      )
      .on<Tables<"notifications">>("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload) =>
        applyRealtimeChange(setNotifications, payload, mapNotificationRow)
      )
      .subscribe((status, err) => {
        if (status !== "SUBSCRIBED" && status !== "CLOSED")
          reportSupabase("AppDataProvider.realtime", err ?? `channel status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    setDoctors,
    setFacilities,
    setShifts,
    setApplications,
    setReplacementRequests,
    setPayments,
    setRatings,
    setDepartments,
    setAttendanceRecords,
    setNotifications,
  ]);

  React.useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;
    getNotifications(user.id).then(({ data, error }) => {
      if (error) reportSupabase("AppDataProvider.notifications", error);
      else setNotifications(data);
    });
  }, [user?.id, setNotifications]);

  // Every mutation below follows the same shape: apply the change optimistically
  // (capturing the pre-change slice via the synchronous `setValue` updater), await
  // the writer, and on `error` restore the captured slice and surface a toast.
  // Offline this is a no-op path: the writers short-circuit to
  // `{ data: null, error: null }` when Supabase is not configured, so nothing
  // rolls back and nothing reconciles — the optimistic state simply stands.

  const broadcastShift = React.useCallback(
    async (input: NewShiftInput): Promise<Shift> => {
      const newShift: Shift = {
        id: crypto.randomUUID(),
        status: "open",
        ...input,
        matchStats: {
          targetDoctors: 48,
          avgMatchScorePct: 95,
          estResponseMinutes: [5, 10],
        },
      };
      let prevShifts: Shift[] = [];
      setShifts((prev) => {
        prevShifts = prev;
        return [newShift, ...prev];
      });
      const { data, error } = await createShiftInSupabase(newShift);
      if (error) {
        setShifts(prevShifts);
        toast.error(`Couldn't post shift: ${error}`);
        throw new Error(error);
      }
      if (data) {
        const persisted = mapShiftRow(data);
        setShifts((prev) => prev.map((s) => (s.id === newShift.id ? persisted : s)));
      }
      return newShift;
    },
    [setShifts]
  );

  const updateShiftStatus = React.useCallback(
    async (id: string, status: Shift["status"]) => {
      let prevShifts: Shift[] = [];
      setShifts((prev) => {
        prevShifts = prev;
        return prev.map((s) => (s.id === id ? { ...s, status } : s));
      });
      const { error } = await updateShiftStatusInSupabase(id, status);
      if (error) {
        setShifts(prevShifts);
        toast.error(`Couldn't update shift: ${error}`);
      }
    },
    [setShifts]
  );

  const updateApplicationStatus = React.useCallback(
    async (id: string, status: Application["status"]) => {
      let prevApplications: Application[] = [];
      setApplications((prev) => {
        prevApplications = prev;
        return prev.map((a) => (a.id === id ? { ...a, status } : a));
      });
      const { error } = await updateApplicationStatusInSupabase(id, status);
      if (error) {
        setApplications(prevApplications);
        toast.error(`Couldn't update application: ${error}`);
      }
    },
    [setApplications]
  );

  const applyToShift = React.useCallback(
    async (shiftId: string, doctorId: string) => {
      const newApp: Application = {
        id: crypto.randomUUID(),
        shiftId,
        doctorId,
        status: "in_review" as const,
        appliedAt: new Date().toISOString(),
        matchScorePct: 90,
      };
      let prevApplications: Application[] = [];
      setApplications((prev) => {
        prevApplications = prev;
        return [newApp, ...prev];
      });
      const { data, error } = await createApplicationInSupabase(newApp);
      if (error) {
        setApplications(prevApplications);
        toast.error(`Couldn't apply to shift: ${error}`);
        return;
      }
      if (data) {
        const persisted = mapApplicationRow(data);
        setApplications((prev) => prev.map((a) => (a.id === newApp.id ? persisted : a)));
      }
    },
    [setApplications]
  );

  const withdrawApplication = React.useCallback(
    async (id: string) => {
      let prevApplications: Application[] = [];
      setApplications((prev) => {
        prevApplications = prev;
        return prev.map((a) => (a.id === id ? { ...a, status: "withdrawn" } : a));
      });
      const { error } = await updateApplicationStatusInSupabase(id, "withdrawn");
      if (error) {
        setApplications(prevApplications);
        toast.error(`Couldn't withdraw application: ${error}`);
      }
    },
    [setApplications]
  );

  // Hospital-side: marks a payout ready to pay - funds move from "Pending
  // Approval" into the doctor's available balance. This is deliberately not
  // also "processed" - the doctor still has to withdraw it (see
  // `withdrawPayout` below), matching the "Approved" vs "Payment Processed"
  // distinction the Wallet & Payouts / Post Shift pages already draw.
  const approvePayment = React.useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      let prevPayments: PostShiftRecord[] = [];
      setPayments((prev) => {
        prevPayments = prev;
        return prev.map((p) => (p.id === id ? { ...p, status: "approved", approvedAt: now } : p));
      });
      const { error } = await updatePayoutStatusInSupabase(id, {
        status: "approved",
        approvedAt: now,
      });
      if (error) {
        setPayments(prevPayments);
        toast.error(`Couldn't approve payment: ${error}`);
      }
    },
    [setPayments]
  );

  // Doctor-side: moves an already-approved payout to "Payment Processed"
  // (paid out). This is what the Wallet & Payouts "Withdraw to Bank" button
  // actually calls - only "approved" payouts are eligible, and RLS (the
  // doctor owns the row via `doctors.profile_id = auth.uid()`) already
  // allows this without any hospital action.
  const withdrawPayout = React.useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      let prevPayments: PostShiftRecord[] = [];
      setPayments((prev) => {
        prevPayments = prev;
        return prev.map((p) => (p.id === id ? { ...p, status: "payment_processed", paidAt: now } : p));
      });
      const { error } = await updatePayoutStatusInSupabase(id, {
        status: "payment_processed",
        paidAt: now,
      });
      if (error) {
        setPayments(prevPayments);
        toast.error(`Couldn't process withdrawal: ${error}`);
      }
      return !error;
    },
    [setPayments]
  );

  const requestPaymentChanges = React.useCallback(
    async (id: string) => {
      let prevPayments: PostShiftRecord[] = [];
      setPayments((prev) => {
        prevPayments = prev;
        return prev.map((p) => (p.id === id ? { ...p, status: "disputed" } : p));
      });
      const { error } = await updatePayoutStatusInSupabase(id, { status: "disputed" });
      if (error) {
        setPayments(prevPayments);
        toast.error(`Couldn't request payment changes: ${error}`);
      }
    },
    [setPayments]
  );

  const markNotificationRead = React.useCallback(
    async (id: string) => {
      let prevNotifications: AppNotification[] = [];
      setNotifications((prev) => {
        prevNotifications = prev;
        return prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      });
      const { error } = await markNotificationReadInSupabase(id);
      if (error) {
        setNotifications(prevNotifications);
        toast.error(`Couldn't mark notification read: ${error}`);
      }
    },
    [setNotifications]
  );

  // Sends a notification to another user (an invite, a break/issue report,
  // etc). Deliberately no optimistic update to the local `notifications`
  // slice - that slice is this signed-in user's own inbox, and the
  // recipient here is someone else entirely.
  const createNotification = React.useCallback(
    async (recipientProfileId: string, notification: Pick<AppNotification, "title" | "body" | "type" | "topic">) => {
      const { error } = await createNotificationInSupabase(recipientProfileId, {
        id: crypto.randomUUID(),
        ...notification,
      });
      if (error) {
        toast.error(`Couldn't send notification: ${error}`);
        return false;
      }
      return true;
    },
    []
  );

  // `registerDoctor` / `registerSelfDoctor` / `registerHospital` have no writer:
  // the `doctors` / `facilities` rows are inserted by the onboarding wizards
  // (which own the auth user id) and replayed here by the realtime effect. They
  // are async so the context contract is uniform with the other create-style
  // mutations and can await a writer once one exists.
  const registerDoctor = React.useCallback(
    async (input: NewDoctorInput): Promise<Doctor> => {
      const newDoctor: Doctor = {
        id: crypto.randomUUID(),
        avatarUrl: undefined,
        specialty: input.qualification,
        rating: 0,
        reviewCount: 0,
        licenseNumber: input.licenseNumber,
        licenseExpiry: "",
        npiNumber: "",
        yearsOfExperience: input.yearsOfExperience,
        employmentType: "W2 Contract",
        preferredLocations: [],
        verified: false,
        status: "onboarding",
        doctorKind: "working",
        verification: {
          medicalCouncil: false,
          degree: false,
          identity: false,
          hospitalApproval: false,
        },
        basicInfoStatus: "pending",
        firstName: input.firstName,
        lastName: input.lastName,
        department: input.department,
        email: input.email,
        phone: input.phone,
      };
      setDoctors((prev) => [newDoctor, ...prev]);
      return newDoctor;
    },
    [setDoctors]
  );

  const registerSelfDoctor = React.useCallback(
    async (input: NewSelfDoctorInput, doctorKind: DoctorKind): Promise<Doctor> => {
      const newDoctor: Doctor = {
        avatarUrl: undefined,
        rating: 0,
        reviewCount: 0,
        verified: false,
        status: "onboarding",
        doctorKind,
        verification: {
          medicalCouncil: false,
          degree: false,
          identity: false,
          hospitalApproval: false,
        },
        basicInfoStatus: "pending",
        ...input,
        id: input.id ?? crypto.randomUUID(),
      };
      // A resubmission after "Needs Changes" reuses the existing doctor id, so
      // replace that entry in place rather than prepending a second copy.
      setDoctors((prev) => [newDoctor, ...prev.filter((d) => d.id !== newDoctor.id)]);
      return newDoctor;
    },
    [setDoctors]
  );

  const registerHospital = React.useCallback(
    async (input: NewHospitalInput): Promise<Facility> => {
      const newFacility: Facility = {
        status: "pending",
        verification: {
          governmentRegistration: false,
          medicalLicense: false,
          taxRegistration: false,
          accreditation: false,
          authorizedSignatory: false,
        },
        basicInfoStatus: "pending",
        ...input,
        id: input.id ?? crypto.randomUUID(),
      };
      // Same reasoning as registerSelfDoctor: don't duplicate a resubmission.
      setFacilities((prev) => [newFacility, ...prev.filter((f) => f.id !== newFacility.id)]);
      return newFacility;
    },
    [setFacilities]
  );

  const updateDoctorVerification = React.useCallback(
    async (id: string, patch: Partial<DoctorVerification>) => {
      let nextVerification: DoctorVerification | null = null;
      let nextVerified = false;
      let prevDoctors: Doctor[] = [];
      setDoctors((prev) => {
        prevDoctors = prev;
        return prev.map((d) => {
          if (d.id !== id) return d;
          const verification: DoctorVerification = {
            medicalCouncil: false,
            degree: false,
            identity: false,
            hospitalApproval: false,
            ...d.verification,
            ...patch,
          };
          const allVerified = Object.values(verification).every(Boolean);
          nextVerification = verification;
          nextVerified = allVerified;
          return {
            ...d,
            verification,
            verified: allVerified,
            status: allVerified ? "active" : d.status,
          };
        });
      });
      if (nextVerification) {
        const { error } = await updateDoctorVerificationInSupabase(
          id,
          nextVerification,
          nextVerified
        );
        if (error) {
          setDoctors(prevDoctors);
          toast.error(`Couldn't update verification: ${error}`);
        }
      }
    },
    [setDoctors]
  );

  const reviewDoctorDocument = React.useCallback(
    async (id: string, docKey: string, decision: "approved" | "rejected", reason?: string) => {
      let prevDoctors: Doctor[] = [];
      let profileId: string | undefined;
      let nextDocuments: Record<string, UploadedFileMetadata> | null = null;
      setDoctors((prev) => {
        prevDoctors = prev;
        return prev.map((d) => {
          if (d.id !== id) return d;
          profileId = d.profileId;
          const docs = d.uploadedDocuments ?? {};
          const current = docs[docKey];
          if (!current) return d;
          const updatedDocs: Record<string, UploadedFileMetadata> = {
            ...docs,
            [docKey]: {
              ...current,
              status: decision,
              reviewedAt: new Date().toISOString(),
              rejectionReason: decision === "rejected" ? reason : undefined,
            },
          };
          nextDocuments = updatedDocs;
          const entries = Object.values(updatedDocs);
          const allApproved = entries.length > 0 && entries.every((f) => f.status === "approved");
          return {
            ...d,
            uploadedDocuments: updatedDocs,
            verified: decision === "rejected" ? false : allApproved ? true : d.verified,
            status: decision === "rejected" ? d.status : allApproved ? "active" : d.status,
            // Rejecting one document should send the applicant back to fix just
            // that document ("Needs Changes" -> Resume Onboarding), not
            // permanently reject the whole application. "Rejected" is reserved
            // for the explicit reject-the-whole-registration action below.
            registrationStatus: decision === "rejected" ? "Needs Changes" : d.registrationStatus,
          };
        });
      });

      // `nextDocuments` is assigned inside the synchronous updater; re-widen it
      // so the guard below is a real check rather than TypeScript's narrowing.
      const docsToWrite: Record<string, UploadedFileMetadata> | null = nextDocuments;
      if (!docsToWrite) {
        toast.error("Couldn't find that document to review.");
        return;
      }
      toast.success(
        decision === "approved"
          ? "Document approved."
          : "Document rejected. The applicant can now resume onboarding to fix it."
      );

      const writes: Promise<{ data: unknown; error: string | null }>[] = [
        updateDoctorDocumentsInSupabase(id, docsToWrite),
      ];
      if (decision === "rejected") {
        writes.push(updateDoctorRegistrationStatusInSupabase(profileId, "Needs Changes"));
      }
      const results = await Promise.all(writes);
      const error = results.find((r) => r.error)?.error ?? null;
      if (error) {
        setDoctors(prevDoctors);
        toast.error(`Couldn't save the decision: ${error}`);
      }
    },
    [setDoctors]
  );

  const markDoctorDocumentViewed = React.useCallback(
    async (id: string, docKey: string) => {
      let prevDoctors: Doctor[] = [];
      let nextDocuments: Record<string, UploadedFileMetadata> | null = null;
      setDoctors((prev) => {
        prevDoctors = prev;
        return prev.map((d) => {
          if (d.id !== id) return d;
          const docs = d.uploadedDocuments ?? {};
          const current = docs[docKey];
          if (!current || current.viewedAt) return d;
          const updatedDocs: Record<string, UploadedFileMetadata> = {
            ...docs,
            [docKey]: { ...current, viewedAt: new Date().toISOString() },
          };
          nextDocuments = updatedDocs;
          return { ...d, uploadedDocuments: updatedDocs };
        });
      });

      const docsToWrite: Record<string, UploadedFileMetadata> | null = nextDocuments;
      if (!docsToWrite) return; // already viewed, or the document no longer exists

      const { error } = await updateDoctorDocumentsInSupabase(id, docsToWrite);
      if (error) {
        setDoctors(prevDoctors);
        reportSupabase(`markDoctorDocumentViewed(${id})`, error);
      }
    },
    [setDoctors]
  );

  const reviewDoctorBasicInfo = React.useCallback(
    async (id: string, decision: Exclude<DocumentReviewStatus, "pending">, reason?: string) => {
      let prevDoctors: Doctor[] = [];
      setDoctors((prev) => {
        prevDoctors = prev;
        return prev.map((d) =>
          d.id === id
            ? {
                ...d,
                basicInfoStatus: decision,
                basicInfoReviewedAt: new Date().toISOString(),
                basicInfoRejectionReason: decision === "rejected" ? reason : undefined,
              }
            : d
        );
      });

      toast.success(decision === "approved" ? "Basic info approved." : "Basic info rejected.");

      const { error } = await updateDoctorBasicInfoReviewInSupabase(id, decision, reason);
      if (error) {
        setDoctors(prevDoctors);
        toast.error(`Couldn't save the decision: ${error}`);
      }
    },
    [setDoctors]
  );

  const assignDoctorToShift = React.useCallback(
    async (shiftId: string, doctorId: string) => {
      let prevShifts: Shift[] = [];
      setShifts((prev) => {
        prevShifts = prev;
        return prev.map((s) =>
          s.id === shiftId ? { ...s, assignedDoctorId: doctorId, status: "pending" } : s
        );
      });
      const { error } = await updateShiftAssignmentInSupabase(shiftId, {
        assignedDoctorId: doctorId,
        status: "pending",
      });
      if (error) {
        setShifts(prevShifts);
        toast.error(`Couldn't assign doctor: ${error}`);
      }
    },
    [setShifts]
  );

  const respondToShiftAssignment = React.useCallback(
    async (shiftId: string, accept: boolean) => {
      let prevShifts: Shift[] = [];
      setShifts((prev) => {
        prevShifts = prev;
        return prev.map((s) =>
          s.id === shiftId
            ? accept
              ? { ...s, status: "confirmed" }
              : { ...s, status: "open", assignedDoctorId: undefined }
            : s
        );
      });
      const { error } = await updateShiftAssignmentInSupabase(
        shiftId,
        accept ? { status: "confirmed" } : { status: "open", assignedDoctorId: null }
      );
      if (error) {
        setShifts(prevShifts);
        toast.error(`Couldn't update shift assignment: ${error}`);
      }
    },
    [setShifts]
  );

  // local-only: no attendance table in the schema yet
  const confirmShiftAttendance = React.useCallback(
    (shiftId: string) => {
      setShifts((prev) =>
        prev.map((s) => (s.id === shiftId ? { ...s, attendanceConfirmed: true } : s))
      );
    },
    [setShifts]
  );

  const updateDoctorProfile = React.useCallback(
    async (
      id: string,
      patch: Partial<Pick<Doctor, "phone" | "email" | "preferredLocations" | "replacementPreferences">>
    ) => {
      let prevDoctors: Doctor[] = [];
      setDoctors((prev) => {
        prevDoctors = prev;
        return prev.map((d) => (d.id === id ? { ...d, ...patch } : d));
      });
      const { error } = await updateDoctorProfileInSupabase(id, patch);
      if (error) {
        setDoctors(prevDoctors);
        toast.error(`Couldn't update profile: ${error}`);
      }
    },
    [setDoctors]
  );

  const updateFacilityProfile = React.useCallback(
    async (
      id: string,
      patch: Partial<Pick<Facility, "name" | "address" | "city" | "phone" | "email" | "contactPerson">>
    ) => {
      let prevFacilities: Facility[] = [];
      setFacilities((prev) => {
        prevFacilities = prev;
        return prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
      });
      const { error } = await updateFacilityProfileInSupabase(id, patch);
      if (error) {
        setFacilities(prevFacilities);
        toast.error(`Couldn't update organization profile: ${error}`);
      }
    },
    [setFacilities]
  );

  const createReplacementRequest = React.useCallback(
    async (input: NewReplacementRequestInput): Promise<ReplacementRequest> => {
      const newRequest: ReplacementRequest = {
        id: crypto.randomUUID(),
        status: "pending",
        requestedAt: new Date().toISOString(),
        ...input,
      };
      let prevRequests: ReplacementRequest[] = [];
      setReplacementRequests((prev) => {
        prevRequests = prev;
        return [newRequest, ...prev];
      });
      const { data, error } = await createReplacementRequestInSupabase(newRequest);
      if (error) {
        setReplacementRequests(prevRequests);
        toast.error(`Couldn't submit replacement request: ${error}`);
        throw new Error(error);
      }
      if (data) {
        const persisted = mapReplacementRequestRow(data);
        setReplacementRequests((prev) =>
          prev.map((r) => (r.id === newRequest.id ? persisted : r))
        );
      }
      return newRequest;
    },
    [setReplacementRequests]
  );

  const updateReplacementRequestStatus = React.useCallback(
    async (id: string, status: ReplacementRequest["status"]) => {
      let prevRequests: ReplacementRequest[] = [];
      let prevNotifications: AppNotification[] = [];
      setReplacementRequests((prev) => {
        prevRequests = prev;
        return prev.map((r) =>
          r.id === id ? { ...r, status, reviewedAt: new Date().toISOString() } : r
        );
      });
      if (status === "filled") {
        setNotifications((prev) => {
          prevNotifications = prev;
          return [
            {
              id: crypto.randomUUID(),
              title: "Replacement Confirmed",
              body: "A replacement doctor has been confirmed for the shift.",
              timestamp: "Just now",
              read: false,
              type: "success",
            },
            ...prev,
          ];
        });
      }
      const { error } = await updateReplacementRequestStatusInSupabase(id, status);
      if (error) {
        setReplacementRequests(prevRequests);
        if (status === "filled") setNotifications(prevNotifications);
        toast.error(`Couldn't update replacement request: ${error}`);
      }
    },
    [setReplacementRequests, setNotifications]
  );

  const approveReplacementRequest = React.useCallback(
    async (id: string) => {
      let shiftTitle = "the shift";
      let shiftId: string | null = null;
      let prevRequests: ReplacementRequest[] = [];
      let prevShifts: Shift[] = [];
      let prevNotifications: AppNotification[] = [];
      setReplacementRequests((prev) => {
        prevRequests = prev;
        return prev.map((r) => {
          if (r.id !== id) return r;
          return { ...r, status: "approved", reviewedAt: new Date().toISOString() };
        });
      });
      setShifts((prev) => {
        prevShifts = prev;
        return prev.map((s) => {
          const request = replacementRequests.find((r) => r.id === id);
          if (!request || s.id !== request.shiftId) return s;
          shiftTitle = s.title;
          shiftId = s.id;
          return { ...s, status: "open", assignedDoctorId: undefined };
        });
      });
      setNotifications((prev) => {
        prevNotifications = prev;
        return [
          {
            id: crypto.randomUUID(),
            title: "New Replacement Opportunity",
            body: `${shiftTitle} was published to Locum Tenens doctors.`,
            timestamp: "Just now",
            read: false,
            type: "info",
          },
          ...prev,
        ];
      });
      // Two writes, one rollback: the request status and the shift's re-opened
      // assignment must land together, so either error reverts both slices.
      const targetShiftId: string | null = shiftId;
      const [statusResult, assignmentResult] = await Promise.all([
        updateReplacementRequestStatusInSupabase(id, "approved"),
        targetShiftId
          ? updateShiftAssignmentInSupabase(targetShiftId, {
              status: "open",
              assignedDoctorId: null,
            })
          : Promise.resolve({ data: null, error: null }),
      ]);
      const error = statusResult.error ?? assignmentResult.error;
      if (error) {
        setReplacementRequests(prevRequests);
        setShifts(prevShifts);
        setNotifications(prevNotifications);
        toast.error(`Couldn't approve replacement request: ${error}`);
      }
    },
    [setReplacementRequests, setShifts, setNotifications, replacementRequests]
  );

  const modifyReplacementRequest = React.useCallback(
    async (
      id: string,
      patch: Partial<Pick<ReplacementRequest, "hourlyCompensation" | "notes">>
    ) => {
      let prevRequests: ReplacementRequest[] = [];
      setReplacementRequests((prev) => {
        prevRequests = prev;
        return prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      });
      const { error } = await modifyReplacementRequestInSupabase(id, patch);
      if (error) {
        setReplacementRequests(prevRequests);
        toast.error(`Couldn't modify replacement request: ${error}`);
      }
    },
    [setReplacementRequests]
  );

  const toggleSaveShift = React.useCallback(
    async (shiftId: string, doctorId: string) => {
      let prevSaved: SavedShift[] = [];
      let created: SavedShift | null = null;
      setSavedShifts((prev) => {
        prevSaved = prev;
        const existing = prev.find((s) => s.shiftId === shiftId && s.doctorId === doctorId);
        if (existing) return prev.filter((s) => s.id !== existing.id);
        const next: SavedShift = {
          id: crypto.randomUUID(),
          shiftId,
          doctorId,
          savedAt: new Date().toISOString(),
        };
        created = next;
        return [next, ...prev];
      });
      // `created` is set inside the (synchronous) updater; re-widen it so the
      // branch below is a real check rather than TypeScript's `null` narrowing.
      const savedShift: SavedShift | null = created;
      const { error } = savedShift
        ? await createSavedShiftInSupabase(savedShift)
        : await deleteSavedShiftInSupabase(doctorId, shiftId);
      if (error) {
        setSavedShifts(prevSaved);
        toast.error(`Couldn't update saved shift: ${error}`);
      }
    },
    [setSavedShifts]
  );

  const submitRating = React.useCallback(
    async (input: NewRatingInput): Promise<Rating> => {
      const newRating: Rating = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...input,
      };
      let prevRatings: Rating[] = [];
      setRatings((prev) => {
        prevRatings = prev;
        return [newRating, ...prev];
      });
      const { data, error } = await createRatingInSupabase(newRating);
      if (error) {
        setRatings(prevRatings);
        toast.error(`Couldn't submit rating: ${error}`);
        throw new Error(error);
      }
      if (data) {
        const persisted = mapRatingRow(data);
        setRatings((prev) => prev.map((r) => (r.id === newRating.id ? persisted : r)));
      }
      return newRating;
    },
    [setRatings]
  );

  const updateFacilityVerification = React.useCallback(
    async (id: string, patch: Partial<HospitalVerification>) => {
      let nextVerification: HospitalVerification | null = null;
      let prevFacilities: Facility[] = [];
      setFacilities((prev) => {
        prevFacilities = prev;
        return prev.map((f) => {
          if (f.id !== id) return f;
          const verification: HospitalVerification = { ...f.verification, ...patch };
          const allVerified = Object.values(verification).every(Boolean);
          nextVerification = verification;
          return {
            ...f,
            verification,
            status: allVerified ? "verified" : "pending",
          };
        });
      });
      if (nextVerification) {
        const { error } = await updateFacilityVerificationInSupabase(id, nextVerification);
        if (error) {
          setFacilities(prevFacilities);
          toast.error(`Couldn't update facility verification: ${error}`);
        }
      }
    },
    [setFacilities]
  );

  const reviewFacilityDocument = React.useCallback(
    async (id: string, docKey: string, decision: "approved" | "rejected", reason?: string) => {
      let prevFacilities: Facility[] = [];
      let profileId: string | undefined;
      let nextDocuments: Record<string, UploadedFileMetadata> | null = null;
      setFacilities((prev) => {
        prevFacilities = prev;
        return prev.map((f) => {
          if (f.id !== id) return f;
          profileId = f.profileId;
          const docs = f.uploadedDocuments ?? {};
          const current = docs[docKey];
          if (!current) return f;
          const updatedDocs: Record<string, UploadedFileMetadata> = {
            ...docs,
            [docKey]: {
              ...current,
              status: decision,
              reviewedAt: new Date().toISOString(),
              rejectionReason: decision === "rejected" ? reason : undefined,
            },
          };
          nextDocuments = updatedDocs;
          const entries = Object.values(updatedDocs);
          const allApproved = entries.length > 0 && entries.every((doc) => doc.status === "approved");
          return {
            ...f,
            uploadedDocuments: updatedDocs,
            status: decision === "rejected" ? "pending" : allApproved ? "verified" : f.status,
            // Same reasoning as reviewDoctorDocument: a per-document rejection
            // routes the applicant back to fix it, it doesn't terminate the
            // whole registration.
            registrationStatus: decision === "rejected" ? "Needs Changes" : f.registrationStatus,
          };
        });
      });

      const docsToWrite: Record<string, UploadedFileMetadata> | null = nextDocuments;
      if (!docsToWrite) {
        toast.error("Couldn't find that document to review.");
        return;
      }
      toast.success(
        decision === "approved"
          ? "Document approved."
          : "Document rejected. The applicant can now resume onboarding to fix it."
      );

      const writes: Promise<{ data: unknown; error: string | null }>[] = [
        updateFacilityDocumentsInSupabase(id, docsToWrite),
      ];
      if (decision === "rejected") {
        writes.push(updateFacilityRegistrationStatusInSupabase(profileId, "Needs Changes"));
      }
      const results = await Promise.all(writes);
      const error = results.find((r) => r.error)?.error ?? null;
      if (error) {
        setFacilities(prevFacilities);
        toast.error(`Couldn't save the decision: ${error}`);
      }
    },
    [setFacilities]
  );

  const markFacilityDocumentViewed = React.useCallback(
    async (id: string, docKey: string) => {
      let prevFacilities: Facility[] = [];
      let nextDocuments: Record<string, UploadedFileMetadata> | null = null;
      setFacilities((prev) => {
        prevFacilities = prev;
        return prev.map((f) => {
          if (f.id !== id) return f;
          const docs = f.uploadedDocuments ?? {};
          const current = docs[docKey];
          if (!current || current.viewedAt) return f;
          const updatedDocs: Record<string, UploadedFileMetadata> = {
            ...docs,
            [docKey]: { ...current, viewedAt: new Date().toISOString() },
          };
          nextDocuments = updatedDocs;
          return { ...f, uploadedDocuments: updatedDocs };
        });
      });

      const docsToWrite: Record<string, UploadedFileMetadata> | null = nextDocuments;
      if (!docsToWrite) return; // already viewed, or the document no longer exists

      const { error } = await updateFacilityDocumentsInSupabase(id, docsToWrite);
      if (error) {
        setFacilities(prevFacilities);
        reportSupabase(`markFacilityDocumentViewed(${id})`, error);
      }
    },
    [setFacilities]
  );

  const reviewFacilityBasicInfo = React.useCallback(
    async (id: string, decision: Exclude<DocumentReviewStatus, "pending">, reason?: string) => {
      let prevFacilities: Facility[] = [];
      setFacilities((prev) => {
        prevFacilities = prev;
        return prev.map((f) =>
          f.id === id
            ? {
                ...f,
                basicInfoStatus: decision,
                basicInfoReviewedAt: new Date().toISOString(),
                basicInfoRejectionReason: decision === "rejected" ? reason : undefined,
              }
            : f
        );
      });

      toast.success(decision === "approved" ? "Basic info approved." : "Basic info rejected.");

      const { error } = await updateFacilityBasicInfoReviewInSupabase(id, decision, reason);
      if (error) {
        setFacilities(prevFacilities);
        toast.error(`Couldn't save the decision: ${error}`);
      }
    },
    [setFacilities]
  );

  const approveFacilityRegistration = React.useCallback(
    async (id: string) => {
      const fullyVerified: HospitalVerification = {
        governmentRegistration: true,
        medicalLicense: true,
        taxRegistration: true,
        accreditation: true,
        authorizedSignatory: true,
      };
      let profileId: string | undefined;
      let prevFacilities: Facility[] = [];
      setFacilities((prev) => {
        prevFacilities = prev;
        return prev.map((f) => {
          if (f.id !== id) return f;
          profileId = f.profileId;
          return { ...f, verification: fullyVerified, status: "verified", registrationStatus: "Approved" };
        });
      });
      // Verification checklist and registration status are one approval: if
      // either write fails the whole optimistic facility row is restored.
      const [verificationResult, statusResult] = await Promise.all([
        updateFacilityVerificationInSupabase(id, fullyVerified),
        updateFacilityRegistrationStatusInSupabase(profileId, "Approved"),
      ]);
      const error = verificationResult.error ?? statusResult.error;
      if (error) {
        setFacilities(prevFacilities);
        toast.error(`Couldn't approve hospital: ${error}`);
      }
    },
    [setFacilities]
  );

  const rejectFacilityRegistration = React.useCallback(
    async (id: string) => {
      let profileId: string | undefined;
      let prevFacilities: Facility[] = [];
      setFacilities((prev) => {
        prevFacilities = prev;
        return prev.map((f) => {
          if (f.id !== id) return f;
          profileId = f.profileId;
          return { ...f, registrationStatus: "Rejected" };
        });
      });
      const { error } = await updateFacilityRegistrationStatusInSupabase(profileId, "Rejected");
      if (error) {
        setFacilities(prevFacilities);
        toast.error(`Couldn't reject hospital: ${error}`);
      }
    },
    [setFacilities]
  );

  const approveDoctorRegistration = React.useCallback(
    async (id: string) => {
      const fullyVerified: DoctorVerification = {
        medicalCouncil: true,
        degree: true,
        identity: true,
        hospitalApproval: true,
      };
      let profileId: string | undefined;
      let prevDoctors: Doctor[] = [];
      setDoctors((prev) => {
        prevDoctors = prev;
        return prev.map((d) => {
          if (d.id !== id) return d;
          profileId = d.profileId;
          return { ...d, verification: fullyVerified, verified: true, status: "active", registrationStatus: "Approved" };
        });
      });
      // Same two-write approval as the facility path: either failure restores
      // the doctor slice and toasts once.
      const [verificationResult, statusResult] = await Promise.all([
        updateDoctorVerificationInSupabase(id, fullyVerified, true),
        updateDoctorRegistrationStatusInSupabase(profileId, "Approved"),
      ]);
      const error = verificationResult.error ?? statusResult.error;
      if (error) {
        setDoctors(prevDoctors);
        toast.error(`Couldn't approve doctor: ${error}`);
      }
    },
    [setDoctors]
  );

  const rejectDoctorRegistration = React.useCallback(
    async (id: string) => {
      let profileId: string | undefined;
      let prevDoctors: Doctor[] = [];
      setDoctors((prev) => {
        prevDoctors = prev;
        return prev.map((d) => {
          if (d.id !== id) return d;
          profileId = d.profileId;
          return { ...d, registrationStatus: "Rejected" };
        });
      });
      const { error } = await updateDoctorRegistrationStatusInSupabase(profileId, "Rejected");
      if (error) {
        setDoctors(prevDoctors);
        toast.error(`Couldn't reject doctor: ${error}`);
      }
    },
    [setDoctors]
  );

  const createDepartment = React.useCallback(
    async (input: NewDepartmentInput): Promise<Department> => {
      const newDepartment: Department = { id: crypto.randomUUID(), ...input };
      let prevDepartments: Department[] = [];
      setDepartments((prev) => {
        prevDepartments = prev;
        return [...prev, newDepartment];
      });
      const { error } = await createDepartmentInSupabase(newDepartment);
      if (error) {
        setDepartments(prevDepartments);
        toast.error(`Couldn't create department: ${error}`);
        throw new Error(error);
      }
      return newDepartment;
    },
    [setDepartments]
  );

  const renameDepartment = React.useCallback(
    async (id: string, name: string) => {
      let prevDepartments: Department[] = [];
      setDepartments((prev) => {
        prevDepartments = prev;
        return prev.map((d) => (d.id === id ? { ...d, name } : d));
      });
      const { error } = await renameDepartmentInSupabase(id, name);
      if (error) {
        setDepartments(prevDepartments);
        toast.error(`Couldn't rename department: ${error}`);
      }
    },
    [setDepartments]
  );

  const deleteDepartment = React.useCallback(
    async (id: string) => {
      let prevDepartments: Department[] = [];
      setDepartments((prev) => {
        prevDepartments = prev;
        return prev.filter((d) => d.id !== id);
      });
      const { error } = await deleteDepartmentInSupabase(id);
      if (error) {
        setDepartments(prevDepartments);
        toast.error(`Couldn't delete department: ${error}`);
      }
    },
    [setDepartments]
  );

  const checkInAttendance = React.useCallback(
    async (shiftId: string, doctorId: string) => {
      const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        shiftId,
        doctorId,
        checkInTime: new Date().toISOString(),
        status: "checked_in",
      };
      let prevRecords: AttendanceRecord[] = [];
      setAttendanceRecords((prev) => {
        prevRecords = prev;
        return [newRecord, ...prev];
      });
      const { error } = await checkInInSupabase(newRecord);
      if (error) {
        setAttendanceRecords(prevRecords);
        toast.error(`Couldn't check in: ${error}`);
      }
    },
    [setAttendanceRecords]
  );

  const checkOutAttendance = React.useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      let prevRecords: AttendanceRecord[] = [];
      setAttendanceRecords((prev) => {
        prevRecords = prev;
        return prev.map((r) => (r.id === id ? { ...r, checkOutTime: now, status: "checked_out" } : r));
      });
      const { error } = await checkOutInSupabase(id, now);
      if (error) {
        setAttendanceRecords(prevRecords);
        toast.error(`Couldn't check out: ${error}`);
      }
    },
    [setAttendanceRecords]
  );

  const verifyAttendance = React.useCallback(
    async (id: string, verifierProfileId: string) => {
      const now = new Date().toISOString();
      let prevRecords: AttendanceRecord[] = [];
      setAttendanceRecords((prev) => {
        prevRecords = prev;
        return prev.map((r) =>
          r.id === id
            ? { ...r, status: "verified", verifiedByProfileId: verifierProfileId, verifiedAt: now }
            : r
        );
      });
      const { error } = await verifyAttendanceInSupabase(id, verifierProfileId);
      if (error) {
        setAttendanceRecords(prevRecords);
        toast.error(`Couldn't verify attendance: ${error}`);
      }
    },
    [setAttendanceRecords]
  );

  const value = React.useMemo(
    () => ({
      shifts,
      applications,
      payments,
      notifications,
      doctors,
      replacementRequests,
      savedShifts,
      ratings,
      facilities,
      broadcastShift,
      updateShiftStatus,
      updateApplicationStatus,
      applyToShift,
      withdrawApplication,
      approvePayment,
      withdrawPayout,
      requestPaymentChanges,
      markNotificationRead,
      createNotification,
      registerDoctor,
      registerSelfDoctor,
      registerHospital,
      updateDoctorVerification,
      reviewDoctorDocument,
      markDoctorDocumentViewed,
      reviewDoctorBasicInfo,
      updateDoctorProfile,
      assignDoctorToShift,
      respondToShiftAssignment,
      confirmShiftAttendance,
      createReplacementRequest,
      updateReplacementRequestStatus,
      approveReplacementRequest,
      modifyReplacementRequest,
      toggleSaveShift,
      submitRating,
      updateFacilityVerification,
      updateFacilityProfile,
      reviewFacilityDocument,
      markFacilityDocumentViewed,
      reviewFacilityBasicInfo,
      approveFacilityRegistration,
      rejectFacilityRegistration,
      approveDoctorRegistration,
      rejectDoctorRegistration,
      departments,
      createDepartment,
      renameDepartment,
      deleteDepartment,
      attendanceRecords,
      checkInAttendance,
      checkOutAttendance,
      verifyAttendance,
    }),
    [
      shifts,
      applications,
      payments,
      notifications,
      doctors,
      replacementRequests,
      savedShifts,
      ratings,
      facilities,
      broadcastShift,
      updateShiftStatus,
      updateApplicationStatus,
      applyToShift,
      withdrawApplication,
      approvePayment,
      withdrawPayout,
      requestPaymentChanges,
      markNotificationRead,
      createNotification,
      registerDoctor,
      registerSelfDoctor,
      registerHospital,
      updateDoctorVerification,
      reviewDoctorDocument,
      markDoctorDocumentViewed,
      reviewDoctorBasicInfo,
      updateDoctorProfile,
      assignDoctorToShift,
      respondToShiftAssignment,
      confirmShiftAttendance,
      createReplacementRequest,
      updateReplacementRequestStatus,
      approveReplacementRequest,
      modifyReplacementRequest,
      toggleSaveShift,
      submitRating,
      updateFacilityVerification,
      updateFacilityProfile,
      reviewFacilityDocument,
      markFacilityDocumentViewed,
      reviewFacilityBasicInfo,
      approveFacilityRegistration,
      rejectFacilityRegistration,
      approveDoctorRegistration,
      rejectDoctorRegistration,
      departments,
      createDepartment,
      renameDepartment,
      deleteDepartment,
      attendanceRecords,
      checkInAttendance,
      checkOutAttendance,
      verifyAttendance,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = React.useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
