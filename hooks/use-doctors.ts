"use client";

import { useAppData } from "@/context/app-data-provider";

export function useDoctors() {
  const {
    doctors,
    registerDoctor,
    registerSelfDoctor,
    updateDoctorVerification,
    reviewDoctorDocument,
    updateDoctorProfile,
    assignDoctorToShift,
    approveDoctorRegistration,
    rejectDoctorRegistration,
  } = useAppData();
  return {
    doctors,
    registerDoctor,
    registerSelfDoctor,
    updateDoctorVerification,
    reviewDoctorDocument,
    updateDoctorProfile,
    assignDoctorToShift,
    approveDoctorRegistration,
    rejectDoctorRegistration,
  };
}
