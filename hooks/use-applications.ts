"use client";

import { useAppData } from "@/context/app-data-provider";

export function useApplications() {
  const { applications, updateApplicationStatus, applyToShift, withdrawApplication } = useAppData();
  return { applications, updateApplicationStatus, applyToShift, withdrawApplication };
}
