import { createClient } from "@/lib/supabase/client";
import type { SavedShift } from "@/types";
import { isUuid } from "./utils";

export async function createSavedShiftInSupabase(savedShift: SavedShift): Promise<void> {
  if (!isUuid(savedShift.id) || !isUuid(savedShift.doctorId) || !isUuid(savedShift.shiftId)) return;
  const supabase = createClient();
  try {
    await supabase.from("saved_shifts").insert({
      id: savedShift.id,
      doctor_id: savedShift.doctorId,
      shift_id: savedShift.shiftId,
    });
  } catch (err) {
    console.error("Supabase insert saved shift error:", err);
  }
}

export async function deleteSavedShiftInSupabase(doctorId: string, shiftId: string): Promise<void> {
  if (!isUuid(doctorId) || !isUuid(shiftId)) return;
  const supabase = createClient();
  try {
    await supabase.from("saved_shifts").delete().eq("doctor_id", doctorId).eq("shift_id", shiftId);
  } catch (err) {
    console.error("Supabase delete saved shift error:", err);
  }
}
