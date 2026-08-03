"use client";

import { useAppData } from "@/context/app-data-provider";

export function useFacilities() {
  const { facilities, updateFacilityVerification, registerHospital } = useAppData();
  return { facilities, updateFacilityVerification, registerHospital };
}
