import { createClient } from "@/lib/supabase/client";
import type { PostShiftRecord } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";
import { mapPayoutRow } from "../mappers";

export async function getPayouts(
  client: SupabaseClient = createClient()
): Promise<{ data: PostShiftRecord[]; error: string | null }> {
  try {
    const { data, error } = await client
      .from("payouts")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) {
      reportSupabase("getPayouts", error);
      return { data: [], error: describeSupabaseError(error) };
    }

    return { data: (data ?? []).map(mapPayoutRow), error: null };
  } catch (err) {
    reportSupabase("getPayouts", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

export async function updatePayoutStatusInSupabase(
  id: string,
  patch: Partial<Pick<PostShiftRecord, "status" | "approvedAt" | "paidAt">>
): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = createClient();
  const update: Record<string, unknown> = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.approvedAt !== undefined) update.approved_at = patch.approvedAt;
  if (patch.paidAt !== undefined) update.paid_at = patch.paidAt;
  if (Object.keys(update).length === 0) return;

  try {
    await supabase.from("payouts").update(update).eq("id", id);
  } catch (err) {
    reportSupabase(`updatePayoutStatusInSupabase(${id})`, err);
  }
}
