"use client";

import * as React from "react";
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
} from "@/lib/supabase/services/shifts";
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
  broadcastShift: (input: NewShiftInput) => Shift;
  updateShiftStatus: (id: string, status: Shift["status"]) => void;
  updateApplicationStatus: (id: string, status: Application["status"]) => void;
  applyToShift: (shiftId: string, doctorId: string) => void;
  withdrawApplication: (id: string) => void;
  approveAndProcessPayment: (id: string) => void;
  requestPaymentChanges: (id: string) => void;
  markNotificationRead: (id: string) => void;
  registerDoctor: (input: NewDoctorInput) => Doctor;
  registerSelfDoctor: (input: NewSelfDoctorInput, doctorKind: DoctorKind) => Doctor;
  registerHospital: (input: NewHospitalInput) => Facility;
  updateDoctorVerification: (id: string, patch: Partial<DoctorVerification>) => void;
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
  ) => void;
  assignDoctorToShift: (shiftId: string, doctorId: string) => void;
  respondToShiftAssignment: (shiftId: string, accept: boolean) => void;
  confirmShiftAttendance: (shiftId: string) => void;
  createReplacementRequest: (input: NewReplacementRequestInput) => ReplacementRequest;
  updateReplacementRequestStatus: (id: string, status: ReplacementRequest["status"]) => void;
  approveReplacementRequest: (id: string) => void;
  modifyReplacementRequest: (
    id: string,
    patch: Partial<Pick<ReplacementRequest, "hourlyCompensation" | "notes">>
  ) => void;
  toggleSaveShift: (shiftId: string, doctorId: string) => void;
  submitRating: (input: NewRatingInput) => Rating;
  updateFacilityVerification: (id: string, patch: Partial<HospitalVerification>) => void;
  approveFacilityRegistration: (id: string) => void;
  rejectFacilityRegistration: (id: string) => void;
  approveDoctorRegistration: (id: string) => void;
  rejectDoctorRegistration: (id: string) => void;
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
      try {
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
        if (shiftsR.error) reportSupabase("AppDataProvider.sync", shiftsR.error);
        else setShifts(shiftsR.data);
        if (replR.error) reportSupabase("AppDataProvider.sync", replR.error);
        else setReplacementRequests(replR.data);
        if (appsR.error) reportSupabase("AppDataProvider.sync", appsR.error);
        else setApplications(appsR.data);
        if (docsR.error) reportSupabase("AppDataProvider.sync", docsR.error);
        else setDoctors(docsR.data);
        if (facsR.error) reportSupabase("AppDataProvider.sync", facsR.error);
        else setFacilities(facsR.data);
        if (payR.error) reportSupabase("AppDataProvider.sync", payR.error);
        else setPayments(payR.data);
        if (ratR.error) reportSupabase("AppDataProvider.sync", ratR.error);
        else setRatings(ratR.data);
      } catch (err) {
        reportSupabase("AppDataProvider.sync", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setShifts, setReplacementRequests, setApplications, setDoctors, setFacilities, setPayments, setRatings]);

  React.useEffect(() => {
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
      .subscribe();

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

  const broadcastShift = React.useCallback(
    (input: NewShiftInput) => {
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
      setShifts((prev) => [newShift, ...prev]);
      createShiftInSupabase(newShift);
      return newShift;
    },
    [setShifts]
  );

  const updateShiftStatus = React.useCallback(
    (id: string, status: Shift["status"]) => {
      setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      updateShiftStatusInSupabase(id, status);
    },
    [setShifts]
  );

  const updateApplicationStatus = React.useCallback(
    (id: string, status: Application["status"]) => {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      updateApplicationStatusInSupabase(id, status);
    },
    [setApplications]
  );

  const applyToShift = React.useCallback(
    (shiftId: string, doctorId: string) => {
      const newApp = {
        id: crypto.randomUUID(),
        shiftId,
        doctorId,
        status: "in_review" as const,
        appliedAt: new Date().toISOString(),
        matchScorePct: 90,
      };
      setApplications((prev) => [newApp, ...prev]);
      createApplicationInSupabase(newApp);
    },
    [setApplications]
  );

  const withdrawApplication = React.useCallback(
    (id: string) => {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "withdrawn" } : a))
      );
      updateApplicationStatusInSupabase(id, "withdrawn");
    },
    [setApplications]
  );

  const approveAndProcessPayment = React.useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setPayments((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "payment_processed", approvedAt: p.approvedAt ?? now, paidAt: now }
            : p
        )
      );
      updatePayoutStatusInSupabase(id, { status: "payment_processed", paidAt: now });
    },
    [setPayments]
  );

  const requestPaymentChanges = React.useCallback(
    (id: string) => {
      setPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "disputed" } : p))
      );
      updatePayoutStatusInSupabase(id, { status: "disputed" });
    },
    [setPayments]
  );

  const markNotificationRead = React.useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      markNotificationReadInSupabase(id);
    },
    [setNotifications]
  );

  const registerDoctor = React.useCallback(
    (input: NewDoctorInput) => {
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
    (input: NewSelfDoctorInput, doctorKind: DoctorKind) => {
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
    (input: NewHospitalInput) => {
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
    (id: string, patch: Partial<DoctorVerification>) => {
      let nextVerification: DoctorVerification | null = null;
      let nextVerified = false;
      setDoctors((prev) =>
        prev.map((d) => {
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
        })
      );
      if (nextVerification) updateDoctorVerificationInSupabase(id, nextVerification, nextVerified);
    },
    [setDoctors]
  );

  const assignDoctorToShift = React.useCallback(
    (shiftId: string, doctorId: string) => {
      setShifts((prev) =>
        prev.map((s) => (s.id === shiftId ? { ...s, assignedDoctorId: doctorId, status: "pending" } : s))
      );
      updateShiftAssignmentInSupabase(shiftId, { assignedDoctorId: doctorId, status: "pending" });
    },
    [setShifts]
  );

  const respondToShiftAssignment = React.useCallback(
    (shiftId: string, accept: boolean) => {
      setShifts((prev) =>
        prev.map((s) =>
          s.id === shiftId
            ? accept
              ? { ...s, status: "confirmed" }
              : { ...s, status: "open", assignedDoctorId: undefined }
            : s
        )
      );
      updateShiftAssignmentInSupabase(
        shiftId,
        accept ? { status: "confirmed" } : { status: "open", assignedDoctorId: null }
      );
    },
    [setShifts]
  );

  const confirmShiftAttendance = React.useCallback(
    (shiftId: string) => {
      setShifts((prev) =>
        prev.map((s) => (s.id === shiftId ? { ...s, attendanceConfirmed: true } : s))
      );
    },
    [setShifts]
  );

  const updateDoctorProfile = React.useCallback(
    (
      id: string,
      patch: Partial<Pick<Doctor, "phone" | "email" | "preferredLocations" | "replacementPreferences">>
    ) => {
      setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
      updateDoctorProfileInSupabase(id, patch);
    },
    [setDoctors]
  );

  const createReplacementRequest = React.useCallback(
    (input: NewReplacementRequestInput) => {
      const newRequest: ReplacementRequest = {
        id: crypto.randomUUID(),
        status: "pending",
        requestedAt: new Date().toISOString(),
        ...input,
      };
      setReplacementRequests((prev) => [newRequest, ...prev]);
      createReplacementRequestInSupabase(newRequest);
      return newRequest;
    },
    [setReplacementRequests]
  );

  const updateReplacementRequestStatus = React.useCallback(
    (id: string, status: ReplacementRequest["status"]) => {
      setReplacementRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status, reviewedAt: new Date().toISOString() } : r
        )
      );
      if (status === "filled") {
        setNotifications((prev) => [
          {
            id: crypto.randomUUID(),
            title: "Replacement Confirmed",
            body: "A replacement doctor has been confirmed for the shift.",
            timestamp: "Just now",
            read: false,
            type: "success",
          },
          ...prev,
        ]);
      }
    },
    [setReplacementRequests, setNotifications]
  );

  const approveReplacementRequest = React.useCallback(
    (id: string) => {
      let shiftTitle = "the shift";
      let shiftId: string | null = null;
      setReplacementRequests((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          return { ...r, status: "approved", reviewedAt: new Date().toISOString() };
        })
      );
      setShifts((prev) =>
        prev.map((s) => {
          const request = replacementRequests.find((r) => r.id === id);
          if (!request || s.id !== request.shiftId) return s;
          shiftTitle = s.title;
          shiftId = s.id;
          return { ...s, status: "open", assignedDoctorId: undefined };
        })
      );
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: "New Replacement Opportunity",
          body: `${shiftTitle} was published to Locum Tenens doctors.`,
          timestamp: "Just now",
          read: false,
          type: "info",
        },
        ...prev,
      ]);
      updateReplacementRequestStatusInSupabase(id, "approved");
      if (shiftId) updateShiftAssignmentInSupabase(shiftId, { status: "open", assignedDoctorId: null });
    },
    [setReplacementRequests, setShifts, setNotifications, replacementRequests]
  );

  const modifyReplacementRequest = React.useCallback(
    (
      id: string,
      patch: Partial<Pick<ReplacementRequest, "hourlyCompensation" | "notes">>
    ) => {
      setReplacementRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
      modifyReplacementRequestInSupabase(id, patch);
    },
    [setReplacementRequests]
  );

  const toggleSaveShift = React.useCallback(
    (shiftId: string, doctorId: string) => {
      setSavedShifts((prev) => {
        const existing = prev.find((s) => s.shiftId === shiftId && s.doctorId === doctorId);
        if (existing) {
          deleteSavedShiftInSupabase(doctorId, shiftId);
          return prev.filter((s) => s.id !== existing.id);
        }
        const newSavedShift = { id: crypto.randomUUID(), shiftId, doctorId, savedAt: new Date().toISOString() };
        createSavedShiftInSupabase(newSavedShift);
        return [newSavedShift, ...prev];
      });
    },
    [setSavedShifts]
  );

  const submitRating = React.useCallback(
    (input: NewRatingInput) => {
      const newRating: Rating = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...input,
      };
      setRatings((prev) => [newRating, ...prev]);
      createRatingInSupabase(newRating);
      return newRating;
    },
    [setRatings]
  );

  const updateFacilityVerification = React.useCallback(
    (id: string, patch: Partial<HospitalVerification>) => {
      let nextVerification: HospitalVerification | null = null;
      setFacilities((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          const verification: HospitalVerification = { ...f.verification, ...patch };
          const allVerified = Object.values(verification).every(Boolean);
          nextVerification = verification;
          return {
            ...f,
            verification,
            status: allVerified ? "verified" : "pending",
          };
        })
      );
      if (nextVerification) updateFacilityVerificationInSupabase(id, nextVerification);
    },
    [setFacilities]
  );

  const approveFacilityRegistration = React.useCallback(
    (id: string) => {
      const fullyVerified: HospitalVerification = {
        governmentRegistration: true,
        medicalLicense: true,
        taxRegistration: true,
        accreditation: true,
        authorizedSignatory: true,
      };
      let profileId: string | undefined;
      setFacilities((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          profileId = f.profileId;
          return { ...f, verification: fullyVerified, status: "verified", registrationStatus: "Approved" };
        })
      );
      updateFacilityVerificationInSupabase(id, fullyVerified);
      updateFacilityRegistrationStatusInSupabase(profileId, "Approved");
    },
    [setFacilities]
  );

  const rejectFacilityRegistration = React.useCallback(
    (id: string) => {
      let profileId: string | undefined;
      setFacilities((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          profileId = f.profileId;
          return { ...f, registrationStatus: "Rejected" };
        })
      );
      updateFacilityRegistrationStatusInSupabase(profileId, "Rejected");
    },
    [setFacilities]
  );

  const approveDoctorRegistration = React.useCallback(
    (id: string) => {
      const fullyVerified: DoctorVerification = {
        medicalCouncil: true,
        degree: true,
        identity: true,
        hospitalApproval: true,
      };
      let profileId: string | undefined;
      setDoctors((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          profileId = d.profileId;
          return { ...d, verification: fullyVerified, verified: true, status: "active", registrationStatus: "Approved" };
        })
      );
      updateDoctorVerificationInSupabase(id, fullyVerified, true);
      updateDoctorRegistrationStatusInSupabase(profileId, "Approved");
    },
    [setDoctors]
  );

  const rejectDoctorRegistration = React.useCallback(
    (id: string) => {
      let profileId: string | undefined;
      setDoctors((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          profileId = d.profileId;
          return { ...d, registrationStatus: "Rejected" };
        })
      );
      updateDoctorRegistrationStatusInSupabase(profileId, "Rejected");
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

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = React.useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
