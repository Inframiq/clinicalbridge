import { createClient } from "@/lib/supabase/client";
import type { Rating } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";
import { mapRatingRow } from "../mappers";

export async function getRatings(
  client: SupabaseClient = createClient()
): Promise<{ data: Rating[]; error: string | null }> {
  try {
    const { data, error } = await client
      .from("ratings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      reportSupabase("getRatings", error);
      return { data: [], error: describeSupabaseError(error) };
    }

    return { data: (data ?? []).map(mapRatingRow), error: null };
  } catch (err) {
    reportSupabase("getRatings", err);
    return { data: [], error: describeSupabaseError(err) };
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
