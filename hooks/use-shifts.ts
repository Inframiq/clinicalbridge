"use client";

import { useAppData } from "@/context/app-data-provider";

export function useShifts() {
  const { shifts, broadcastShift, updateShiftStatus, confirmShiftAttendance, respondToShiftAssignment } =
    useAppData();
  return { shifts, broadcastShift, updateShiftStatus, confirmShiftAttendance, respondToShiftAssignment };
}
