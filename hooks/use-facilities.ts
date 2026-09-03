"use client";

import { useAppData } from "@/context/app-data-provider";

export function useFacilities() {
  const {
    facilities,
    updateFacilityVerification,
    registerHospital,
    approveFacilityRegistration,
    rejectFacilityRegistration,
  } = useAppData();
  return {
    facilities,
    updateFacilityVerification,
    registerHospital,
    approveFacilityRegistration,
    rejectFacilityRegistration,
  };
}
