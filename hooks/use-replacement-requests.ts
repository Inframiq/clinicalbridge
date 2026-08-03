"use client";

import { useAppData } from "@/context/app-data-provider";

export function useReplacementRequests() {
  const {
    replacementRequests,
    createReplacementRequest,
    updateReplacementRequestStatus,
    approveReplacementRequest,
    escalateReplacementRequestToInterns,
    modifyReplacementRequest,
  } = useAppData();
  return {
    replacementRequests,
    createReplacementRequest,
    updateReplacementRequestStatus,
    approveReplacementRequest,
    escalateReplacementRequestToInterns,
    modifyReplacementRequest,
  };
}
