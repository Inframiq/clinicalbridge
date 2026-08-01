"use client";

import { useAppData } from "@/context/app-data-provider";

export function useShifts() {
  const { shifts, broadcastShift, updateShiftStatus } = useAppData();
  return { shifts, broadcastShift, updateShiftStatus };
}
