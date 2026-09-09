"use client";

import { useAppData } from "@/context/app-data-provider";

export function useAttendance() {
  const { attendanceRecords, checkInAttendance, checkOutAttendance, verifyAttendance } = useAppData();
  return { attendanceRecords, checkInAttendance, checkOutAttendance, verifyAttendance };
}
