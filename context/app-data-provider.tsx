"use client";

import * as React from "react";
import type {
  Shift,
  Application,
  PostShiftRecord,
  AppNotification,
} from "@/types";
import {
  shifts as seedShifts,
  applications as seedApplications,
  postShiftRecords as seedPayments,
  notifications as seedNotifications,
} from "@/lib/mock-data";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

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

interface AppDataContextValue {
  shifts: Shift[];
  applications: Application[];
  payments: PostShiftRecord[];
  notifications: AppNotification[];
  broadcastShift: (input: NewShiftInput) => Shift;
  updateShiftStatus: (id: string, status: Shift["status"]) => void;
  updateApplicationStatus: (id: string, status: Application["status"]) => void;
  applyToShift: (shiftId: string, doctorId: string) => void;
  approveAndProcessPayment: (id: string) => void;
  requestPaymentChanges: (id: string) => void;
  markNotificationRead: (id: string) => void;
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
      return newShift;
    },
    [setShifts]
  );

  const updateShiftStatus = React.useCallback(
    (id: string, status: Shift["status"]) => {
      setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
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
      setApplications((prev) => [
        {
          id: `app-${Date.now()}`,
          shiftId,
          doctorId,
          status: "in_review",
          appliedAt: new Date().toISOString(),
          matchScorePct: 90,
        },
        ...prev,
      ]);
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

  const value = React.useMemo(
    () => ({
      shifts,
      applications,
      payments,
      notifications,
      broadcastShift,
      updateShiftStatus,
      updateApplicationStatus,
      applyToShift,
      approveAndProcessPayment,
      requestPaymentChanges,
      markNotificationRead,
    }),
    [
      shifts,
      applications,
      payments,
      notifications,
      broadcastShift,
      updateShiftStatus,
      updateApplicationStatus,
      applyToShift,
      approveAndProcessPayment,
      requestPaymentChanges,
      markNotificationRead,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = React.useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
