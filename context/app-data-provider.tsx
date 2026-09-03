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
} from "@/types";
import {
  shifts as seedShifts,
  applications as seedApplications,
  postShiftRecords as seedPayments,
  notifications as seedNotifications,
  doctors as seedDoctors,
  replacementRequests as seedReplacementRequests,
  ratings as seedRatings,
} from "@/lib/mock-data";
import { facilities as seedFacilities, type Facility } from "@/lib/mock-data/organizations";
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
import { mapShiftRow, mapRatingRow } from "@/lib/supabase/mappers";
import {
  getDoctors,
  mapDoctorRow,
  updateDoctorVerificationInSupabase,
  updateDoctorProfileInSupabase,
  updateDoctorRegistrationStatusInSupabase,
} from "@/lib/supabase/services/doctors";
import {
  getFacilities,
  mapFacilityRow,
  updateFacilityVerificationInSupabase,
  updateFacilityRegistrationStatusInSupabase,
} from "@/lib/supabase/services/facilities";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPayouts, updatePayoutStatusInSupabase } from "@/lib/supabase/services/payouts";
import { getRatings, createRatingInSupabase } from "@/lib/supabase/services/ratings";
import { getNotifications, markNotificationReadInSupabase } from "@/lib/supabase/services/notifications";
import { createSavedShiftInSupabase, deleteSavedShiftInSupabase } from "@/lib/supabase/services/saved-shifts";
import { reportSupabase } from "@/lib/supabase/log";
import { OfflineModeBanner } from "@/components/layout/offline-mode-banner";

export type NewShiftInput = Pick<
  Shift,
  | "title"
  | "department"
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
  approveAndProcessPayment: (id: string) => Promise<void>;
  requestPaymentChanges: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  registerDoctor: (input: NewDoctorInput) => Promise<Doctor>;
  registerSelfDoctor: (input: NewSelfDoctorInput, doctorKind: DoctorKind) => Promise<Doctor>;
  registerHospital: (input: NewHospitalInput) => Promise<Facility>;
  updateDoctorVerification: (id: string, patch: Partial<DoctorVerification>) => Promise<void>;
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
  /** Local-only: there is no attendance table in the schema yet, so this never awaits a write. */
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
  approveFacilityRegistration: (id: string) => Promise<void>;
  rejectFacilityRegistration: (id: string) => Promise<void>;
  approveDoctorRegistration: (id: string) => Promise<void>;
  rejectDoctorRegistration: (id: string) => Promise<void>;
}

const AppDataContext = React.createContext<AppDataContextValue | null>(null);

const CITY_MEDICAL = {
  facilityName: "City Medical Center",
  facilityId: "fac-city-medical",
  location: {
    address: "123 Health St",
    city: "New York",
    state: "NY",
    lat: 40.7608,
    lng: -73.9918,
  },
};

/**
 * Env-aware initial values. In online mode every slice starts empty so the first
 * paint shows no mock rows — the sync effect fills them from Supabase. Offline
 * (no Supabase creds) the mock-data arrays seed the demo. Defined at module
 * scope so each `seed.*` is a stable reference: `useLocalStorageState`'s
 * `setValue` depends on `initialValue`, and a fresh `[]` per render would churn
 * the setter identity and re-fire the effects below every render.
 */
const seed = isSupabaseConfigured
  ? {
      shifts: [] as Shift[],
      applications: [] as Application[],
      payments: [] as PostShiftRecord[],
      notifications: [] as AppNotification[],
      doctors: [] as Doctor[],
      replacementRequests: [] as ReplacementRequest[],
      savedShifts: [] as SavedShift[],
      ratings: [] as Rating[],
      facilities: [] as Facility[],
    }
  : {
      shifts: seedShifts,
      applications: seedApplications,
      payments: seedPayments,
      notifications: seedNotifications,
      doctors: seedDoctors,
      replacementRequests: seedReplacementRequests,
      savedShifts: [] as SavedShift[],
      ratings: seedRatings,
      facilities: seedFacilities,
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

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      const [shiftsR, replR, appsR, docsR, facsR, payR, ratR] = await Promise.all([
        getShifts(),
        getReplacementRequests(),
        getApplications(),
        getDoctors(),
        getFacilities(),
        getPayouts(),
        getRatings(),
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
    })();
    return () => {
      cancelled = true;
    };
  }, [setShifts, setReplacementRequests, setApplications, setDoctors, setFacilities, setPayments, setRatings]);

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase
      .channel("super-admin-approvals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "doctors" },
        (payload) => {
          const mapped = mapDoctorRow(payload.new as Record<string, unknown>);
          setDoctors((prev) =>
            prev.some((d) => d.id === mapped.id)
              ? prev.map((d) => (d.id === mapped.id ? mapped : d))
              : [mapped, ...prev]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        (payload) => {
          const mapped = mapFacilityRow(payload.new as Record<string, unknown>);
          setFacilities((prev) =>
            prev.some((f) => f.id === mapped.id)
              ? prev.map((f) => (f.id === mapped.id ? mapped : f))
              : [mapped, ...prev]
          );
        }
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED" && status !== "CLOSED")
          reportSupabase("AppDataProvider.realtime", `channel status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        ...CITY_MEDICAL,
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
        const persisted = mapShiftRow(data as Record<string, unknown>);
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
        const persisted = mapApplicationRow(data as Record<string, unknown>);
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

  const approveAndProcessPayment = React.useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      let prevPayments: PostShiftRecord[] = [];
      setPayments((prev) => {
        prevPayments = prev;
        return prev.map((p) =>
          p.id === id
            ? { ...p, status: "payment_processed", approvedAt: p.approvedAt ?? now, paidAt: now }
            : p
        );
      });
      const { error } = await updatePayoutStatusInSupabase(id, {
        status: "payment_processed",
        paidAt: now,
      });
      if (error) {
        setPayments(prevPayments);
        toast.error(`Couldn't process payment: ${error}`);
      }
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
        ...input,
        id: input.id ?? crypto.randomUUID(),
      };
      setDoctors((prev) => [newDoctor, ...prev]);
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
        ...input,
        id: input.id ?? crypto.randomUUID(),
      };
      setFacilities((prev) => [newFacility, ...prev]);
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
        const persisted = mapReplacementRequestRow(data as Record<string, unknown>);
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
        const persisted = mapRatingRow(data as Record<string, unknown>);
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
      approveAndProcessPayment,
      requestPaymentChanges,
      markNotificationRead,
      registerDoctor,
      registerSelfDoctor,
      registerHospital,
      updateDoctorVerification,
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
      approveFacilityRegistration,
      rejectFacilityRegistration,
      approveDoctorRegistration,
      rejectDoctorRegistration,
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
      approveAndProcessPayment,
      requestPaymentChanges,
      markNotificationRead,
      registerDoctor,
      registerSelfDoctor,
      registerHospital,
      updateDoctorVerification,
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
      approveFacilityRegistration,
      rejectFacilityRegistration,
      approveDoctorRegistration,
      rejectDoctorRegistration,
    ]
  );

  return (
    <AppDataContext.Provider value={value}>
      {children}
      <OfflineModeBanner />
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = React.useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
