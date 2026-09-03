import { createClient } from "@/lib/supabase/client";
import type { Rating } from "@/types";
import { ratings as initialRatings } from "@/lib/mock-data/ratings";
import { isUuid } from "./utils";
import { reportSupabase } from "../log";
import { mapRatingRow } from "../mappers";

export async function getRatings(): Promise<Rating[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("ratings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      reportSupabase("getRatings", error);
      return initialRatings;
    }

    return data.map(mapRatingRow);
  } catch (err) {
    reportSupabase("getRatings", err);
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
    reportSupabase("createRatingInSupabase", err);
  }
}
