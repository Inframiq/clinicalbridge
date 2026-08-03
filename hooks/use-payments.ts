"use client";

import { useAppData } from "@/context/app-data-provider";

export function usePayments() {
  const { payments, approveAndProcessPayment, requestPaymentChanges } = useAppData();
  return { payments, approveAndProcessPayment, requestPaymentChanges };
}
