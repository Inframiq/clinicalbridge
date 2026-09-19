"use client";

import { useAppData } from "@/context/app-data-provider";

export function usePayments() {
  const { payments, approvePayment, withdrawPayout, requestPaymentChanges } = useAppData();
  return { payments, approvePayment, withdrawPayout, requestPaymentChanges };
}
