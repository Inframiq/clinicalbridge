"use client";

import { useAppData } from "@/context/app-data-provider";

export function useApplications() {
  const { applications, updateApplicationStatus, applyToShift } = useAppData();
  return { applications, updateApplicationStatus, applyToShift };
}
