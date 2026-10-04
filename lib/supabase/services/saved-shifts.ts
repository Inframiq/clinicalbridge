import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { SavedShift } from "@/types";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";

export async function createSavedShiftInSupabase(
  savedShift: SavedShift,
  client?: TypedSupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(savedShift.id) || !isUuid(savedShift.doctorId) || !isUuid(savedShift.shiftId)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("createSavedShiftInSupabase: skipped non-uuid id", savedShift.id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("saved_shifts")
      .insert({
        id: savedShift.id,
        doctor_id: savedShift.doctorId,
        shift_id: savedShift.shiftId,
      })
      .select()
      .single();
    if (error) {
      reportSupabase(`createSavedShiftInSupabase(${savedShift.id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`createSavedShiftInSupabase(${savedShift.id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function deleteSavedShiftInSupabase(
  doctorId: string,
  shiftId: string,
  client?: TypedSupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(doctorId) || !isUuid(shiftId)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("deleteSavedShiftInSupabase: skipped non-uuid id", shiftId);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { error } = await client
      .from("saved_shifts")
      .delete()
      .eq("doctor_id", doctorId)
      .eq("shift_id", shiftId);
    if (error) {
      reportSupabase(`deleteSavedShiftInSupabase(${shiftId})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data: null, error: null };
  } catch (err) {
    reportSupabase(`deleteSavedShiftInSupabase(${shiftId})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}
