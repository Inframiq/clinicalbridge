"use client";

import { useAppData } from "@/context/app-data-provider";

export function useDepartments() {
  const { departments, createDepartment, renameDepartment, deleteDepartment } = useAppData();
  return { departments, createDepartment, renameDepartment, deleteDepartment };
}
