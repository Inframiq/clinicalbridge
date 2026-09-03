import { createClient } from "@/lib/supabase/client";
import type { Rating } from "@/types";
import { ratings as initialRatings } from "@/lib/mock-data/ratings";
import { isUuid } from "./utils";

export async function getRatings(): Promise<Rating[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("ratings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn("Supabase query returned empty or error, using initial dataset:", error?.message);
      return initialRatings;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((item: Record<string, any>) => ({
      id: item.id,
      shiftId: item.shift_id,
      direction: item.direction,
      doctorId: item.doctor_id,
      facilityId: item.facility_id,
      categories: item.categories || {},
      overallScore: Number(item.overall_score),
      comment: item.comment ?? undefined,
      createdAt: item.created_at,
    }));
  } catch (err) {
    console.error("Failed to fetch ratings from Supabase:", err);
    return initialRatings;
  }
}

export async function createRatingInSupabase(rating: Rating): Promise<void> {
  if (!isUuid(rating.id) || !isUuid(rating.shiftId) || !isUuid(rating.doctorId) || !isUuid(rating.facilityId)) return;
  const supabase = createClient();
  try {
    await supabase.from("ratings").insert({
      id: rating.id,
      shift_id: rating.shiftId,
      direction: rating.direction,
      doctor_id: rating.doctorId,
      facility_id: rating.facilityId,
      categories: rating.categories,
      overall_score: rating.overallScore,
      comment: rating.comment,
    });
  } catch (err) {
    console.error("Supabase insert rating error:", err);
  }
}
