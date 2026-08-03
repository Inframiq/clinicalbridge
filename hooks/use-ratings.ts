"use client";

import { useAppData } from "@/context/app-data-provider";

export function useRatings() {
  const { ratings, submitRating } = useAppData();
  return { ratings, submitRating };
}
