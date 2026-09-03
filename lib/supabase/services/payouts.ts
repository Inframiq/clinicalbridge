import { createClient } from "@/lib/supabase/client";
import type { PostShiftRecord } from "@/types";
import { postShiftRecords as initialPayments } from "@/lib/mock-data/payments";
import { isUuid } from "./utils";
import { reportSupabase } from "../log";

export async function getPayouts(): Promise<PostShiftRecord[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("payouts")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error || !data || data.length === 0) {
      reportSupabase("getPayouts", error);
      return initialPayments;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((item: Record<string, any>) => ({
      id: item.id,
      shiftId: item.shift_id,
      doctorId: item.doctor_id,
      hours: Number(item.hours),
      hourlyRate: Number(item.hourly_rate),
      grossPay: Number(item.gross_pay),
      platformFeePct: Number(item.platform_fee_pct),
      netPayout: Number(item.net_payout),
      status: item.status,
      submittedAt: item.submitted_at,
      approvedAt: item.approved_at ?? undefined,
      paidAt: item.paid_at ?? undefined,
      hasTimesheet: Boolean(item.has_timesheet),
      hasClinicalNotes: Boolean(item.has_clinical_notes),
    }));
  } catch (err) {
    reportSupabase("getPayouts", err);
    return initialPayments;
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
