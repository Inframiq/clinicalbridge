"use client";

import { useAppData } from "@/context/app-data-provider";

export function useFacilities() {
  const {
    facilities,
    updateFacilityVerification,
    updateFacilityProfile,
    reviewFacilityDocument,
    markFacilityDocumentViewed,
    reviewFacilityBasicInfo,
    registerHospital,
    approveFacilityRegistration,
    rejectFacilityRegistration,
  } = useAppData();
  return {
    facilities,
    updateFacilityVerification,
    updateFacilityProfile,
    reviewFacilityDocument,
    markFacilityDocumentViewed,
    reviewFacilityBasicInfo,
    registerHospital,
    approveFacilityRegistration,
    rejectFacilityRegistration,
  };
}
