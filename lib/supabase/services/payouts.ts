import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PostShiftRecord } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";
import { mapPayoutRow } from "../mappers";

export async function getPayouts(
  client?: SupabaseClient
): Promise<{ data: PostShiftRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) return { data: [], error: null };
  client ??= createClient();
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
  patch: Partial<Pick<PostShiftRecord, "status" | "approvedAt" | "paidAt">>,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updatePayoutStatusInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  const update: Record<string, unknown> = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.approvedAt !== undefined) update.approved_at = patch.approvedAt;
  if (patch.paidAt !== undefined) update.paid_at = patch.paidAt;
  if (Object.keys(update).length === 0) return { data: null, error: null };

  client ??= createClient();
  try {
    const { data, error } = await client
      .from("payouts")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`updatePayoutStatusInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updatePayoutStatusInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}
