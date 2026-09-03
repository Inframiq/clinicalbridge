import { createClient } from "@/lib/supabase/client";
import type { SavedShift } from "@/types";
import { isUuid } from "./utils";
import { reportSupabase } from "../log";

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
    reportSupabase("createSavedShiftInSupabase", err);
  }
}

export async function deleteSavedShiftInSupabase(doctorId: string, shiftId: string): Promise<void> {
  if (!isUuid(doctorId) || !isUuid(shiftId)) return;
  const supabase = createClient();
  try {
    await supabase.from("saved_shifts").delete().eq("doctor_id", doctorId).eq("shift_id", shiftId);
  } catch (err) {
    reportSupabase(`deleteSavedShiftInSupabase(${shiftId})`, err);
  }
}
