import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Rating } from "@/types";
import type { Tables, TypedSupabaseClient } from "@/lib/supabase/types";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";
import { mapRatingRow } from "../mappers";

export async function getRatings(
  client?: TypedSupabaseClient
): Promise<{ data: Rating[]; error: string | null }> {
  if (!isSupabaseConfigured) return { data: [], error: null };
  client ??= createClient();
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

export async function createRatingInSupabase(
  rating: Rating,
  client?: TypedSupabaseClient
): Promise<{ data: Tables<"ratings"> | null; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (
    !isUuid(rating.id) ||
    !isUuid(rating.shiftId) ||
    !isUuid(rating.doctorId) ||
    !isUuid(rating.facilityId)
  ) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("createRatingInSupabase: skipped non-uuid id", rating.id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("ratings")
      .insert({
        id: rating.id,
        shift_id: rating.shiftId,
        direction: rating.direction,
        doctor_id: rating.doctorId,
        facility_id: rating.facilityId,
        categories: rating.categories,
        overall_score: rating.overallScore,
        comment: rating.comment,
      })
      .select()
      .single();
    if (error) {
      reportSupabase(`createRatingInSupabase(${rating.id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`createRatingInSupabase(${rating.id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}
