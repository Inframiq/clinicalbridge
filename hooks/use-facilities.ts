"use client";

import { useAppData } from "@/context/app-data-provider";

export function useFacilities() {
  const {
    facilities,
    updateFacilityVerification,
    reviewFacilityDocument,
    markFacilityDocumentViewed,
    registerHospital,
    approveFacilityRegistration,
    rejectFacilityRegistration,
  } = useAppData();
  return {
    facilities,
    updateFacilityVerification,
    reviewFacilityDocument,
    markFacilityDocumentViewed,
    registerHospital,
    approveFacilityRegistration,
    rejectFacilityRegistration,
  };
}
