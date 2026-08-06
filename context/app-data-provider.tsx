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
import {
  getShifts,
  getReplacementRequests,
  getApplications,
  createShiftInSupabase,
  updateShiftStatusInSupabase,
  createReplacementRequestInSupabase,
  updateReplacementRequestStatusInSupabase,
  createApplicationInSupabase,
} from "@/lib/supabase/services/shifts";

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
>;

export type NewHospitalInput = Pick<
  Facility,
  "name" | "city" | "registrationNumber" | "governmentLicense" | "hospitalType" | "contactPerson" | "email" | "phone"
>;

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
  escalateReplacementRequestToInterns: (id: string) => void;
  modifyReplacementRequest: (
    id: string,
    patch: Partial<Pick<ReplacementRequest, "preferredReplacementType" | "hourlyCompensation" | "notes">>
  ) => void;
  toggleSaveShift: (shiftId: string, doctorId: string) => void;
  submitRating: (input: NewRatingInput) => Rating;
  updateFacilityVerification: (id: string, patch: Partial<HospitalVerification>) => void;
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

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [shifts, setShifts] = useLocalStorageState<Shift[]>("lt-shifts", seedShifts);
  const [applications, setApplications] = useLocalStorageState<Application[]>(
    "lt-applications",
    seedApplications
  );
  const [payments, setPayments] = useLocalStorageState<PostShiftRecord[]>(
    "lt-payments",
    seedPayments
  );
  const [notifications, setNotifications] = useLocalStorageState<AppNotification[]>(
    "lt-notifications",
    seedNotifications
  );
  const [doctors, setDoctors] = useLocalStorageState<Doctor[]>("lt-doctors", seedDoctors);
  const [replacementRequests, setReplacementRequests] = useLocalStorageState<ReplacementRequest[]>(
    "lt-replacement-requests",
    seedReplacementRequests
  );
  const [savedShifts, setSavedShifts] = useLocalStorageState<SavedShift[]>("lt-saved-shifts", []);
  const [ratings, setRatings] = useLocalStorageState<Rating[]>("lt-ratings", seedRatings);
  const [facilities, setFacilities] = useLocalStorageState<Facility[]>("lt-facilities", seedFacilities);

  React.useEffect(() => {
    async function syncSupabaseData() {
      try {
        const [fetchedShifts, fetchedReplacements, fetchedApps] = await Promise.all([
          getShifts(),
          getReplacementRequests(),
          getApplications(),
        ]);
        if (fetchedShifts.length > 0) setShifts(fetchedShifts);
        if (fetchedReplacements.length > 0) setReplacementRequests(fetchedReplacements);
        if (fetchedApps.length > 0) setApplications(fetchedApps);
      } catch (err) {
        console.warn("Supabase initial sync error:", err);
      }
    }
    syncSupabaseData();
  }, []);

  const broadcastShift = React.useCallback(
    (input: NewShiftInput) => {
      const newShift: Shift = {
        id: `shift-${Date.now()}`,
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
    },
    [setApplications]
  );

  const applyToShift = React.useCallback(
    (shiftId: string, doctorId: string) => {
      const newApp = {
        id: `app-${Date.now()}`,
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
    },
    [setPayments]
  );

  const requestPaymentChanges = React.useCallback(
    (id: string) => {
      setPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "disputed" } : p))
      );
    },
    [setPayments]
  );

  const markNotificationRead = React.useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    },
    [setNotifications]
  );

  const registerDoctor = React.useCallback(
    (input: NewDoctorInput) => {
      const newDoctor: Doctor = {
        id: `doc-${Date.now()}`,
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
        id: `doc-${Date.now()}`,
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
      };
      setDoctors((prev) => [newDoctor, ...prev]);
      return newDoctor;
    },
    [setDoctors]
  );

  const registerHospital = React.useCallback(
    (input: NewHospitalInput) => {
      const newFacility: Facility = {
        id: `fac-${Date.now()}`,
        status: "pending",
        verification: {
          governmentRegistration: false,
          medicalLicense: false,
          taxRegistration: false,
          accreditation: false,
          authorizedSignatory: false,
        },
        ...input,
      };
      setFacilities((prev) => [newFacility, ...prev]);
      return newFacility;
    },
    [setFacilities]
  );

  const updateDoctorVerification = React.useCallback(
    (id: string, patch: Partial<DoctorVerification>) => {
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
          return {
            ...d,
            verification,
            verified: allVerified,
            status: allVerified ? "active" : d.status,
          };
        })
      );
    },
    [setDoctors]
  );

  const assignDoctorToShift = React.useCallback(
    (shiftId: string, doctorId: string) => {
      setShifts((prev) =>
        prev.map((s) => (s.id === shiftId ? { ...s, assignedDoctorId: doctorId, status: "pending" } : s))
      );
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
    },
    [setDoctors]
  );

  const createReplacementRequest = React.useCallback(
    (input: NewReplacementRequestInput) => {
      const newRequest: ReplacementRequest = {
        id: `rr-${Date.now()}`,
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
            id: `note-${Date.now()}`,
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
          return { ...s, status: "open", assignedDoctorId: undefined, replacementStage: "locum_only" };
        })
      );
      setNotifications((prev) => [
        {
          id: `note-${Date.now()}`,
          title: "New Replacement Opportunity",
          body: `${shiftTitle} was published to Locum Doctors.`,
          timestamp: "Just now",
          read: false,
          type: "info",
        },
        ...prev,
      ]);
    },
    [setReplacementRequests, setShifts, setNotifications, replacementRequests]
  );

  const escalateReplacementRequestToInterns = React.useCallback(
    (id: string) => {
      let shiftTitle = "the shift";
      setShifts((prev) =>
        prev.map((s) => {
          const request = replacementRequests.find((r) => r.id === id);
          if (!request || s.id !== request.shiftId) return s;
          shiftTitle = s.title;
          return { ...s, replacementStage: "open_to_intern" };
        })
      );
      setNotifications((prev) => [
        {
          id: `note-${Date.now()}`,
          title: "Escalated to Interns",
          body: `${shiftTitle} is now also visible to eligible interns.`,
          timestamp: "Just now",
          read: false,
          type: "info",
        },
        ...prev,
      ]);
    },
    [setShifts, setNotifications, replacementRequests]
  );

  const modifyReplacementRequest = React.useCallback(
    (
      id: string,
      patch: Partial<Pick<ReplacementRequest, "preferredReplacementType" | "hourlyCompensation" | "notes">>
    ) => {
      setReplacementRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    },
    [setReplacementRequests]
  );

  const toggleSaveShift = React.useCallback(
    (shiftId: string, doctorId: string) => {
      setSavedShifts((prev) => {
        const existing = prev.find((s) => s.shiftId === shiftId && s.doctorId === doctorId);
        if (existing) return prev.filter((s) => s.id !== existing.id);
        return [
          { id: `saved-${Date.now()}`, shiftId, doctorId, savedAt: new Date().toISOString() },
          ...prev,
        ];
      });
    },
    [setSavedShifts]
  );

  const submitRating = React.useCallback(
    (input: NewRatingInput) => {
      const newRating: Rating = {
        id: `rating-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...input,
      };
      setRatings((prev) => [newRating, ...prev]);
      return newRating;
    },
    [setRatings]
  );

  const updateFacilityVerification = React.useCallback(
    (id: string, patch: Partial<HospitalVerification>) => {
      setFacilities((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          const verification: HospitalVerification = { ...f.verification, ...patch };
          const allVerified = Object.values(verification).every(Boolean);
          return {
            ...f,
            verification,
            status: allVerified ? "verified" : "pending",
          };
        })
      );
    },
    [setFacilities]
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
      escalateReplacementRequestToInterns,
      modifyReplacementRequest,
      toggleSaveShift,
      submitRating,
      updateFacilityVerification,
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
      escalateReplacementRequestToInterns,
      modifyReplacementRequest,
      toggleSaveShift,
      submitRating,
      updateFacilityVerification,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = React.useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
