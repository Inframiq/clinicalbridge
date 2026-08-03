"use client";

import { useAppData } from "@/context/app-data-provider";

export function useSavedShifts() {
  const { savedShifts, toggleSaveShift } = useAppData();
  return { savedShifts, toggleSaveShift };
}
