import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { AttendanceRecord } from "@/types";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAttendanceRow(item: Record<string, any>): AttendanceRecord {
  return {
    id: item.id,
    shiftId: item.shift_id,
    doctorId: item.replacement_doctor_id,
    checkInTime: item.check_in_time ?? undefined,
    checkOutTime: item.check_out_time ?? undefined,
    verifiedByProfileId: item.verified_by_profile_id ?? undefined,
    verifiedAt: item.verified_at ?? undefined,
    status: item.status,
  };
}

export async function getAttendanceRecords(
  client?: TypedSupabaseClient
): Promise<{ data: AttendanceRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) return { data: [], error: null };
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("attendance_records")
      .select("*")
      .order("check_in_time", { ascending: false });
    if (error) {
      reportSupabase("getAttendanceRecords", error);
      return { data: [], error: describeSupabaseError(error) };
    }
    return { data: (data ?? []).map(mapAttendanceRow), error: null };
  } catch (err) {
    reportSupabase("getAttendanceRecords", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

export async function checkInInSupabase(
  record: AttendanceRecord,
  client?: TypedSupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(record.id) || !isUuid(record.shiftId) || !isUuid(record.doctorId)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("checkInInSupabase: skipped non-uuid id", record.id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("attendance_records")
      .insert({
        id: record.id,
        shift_id: record.shiftId,
        replacement_doctor_id: record.doctorId,
        check_in_time: record.checkInTime,
        status: "checked_in",
      })
      .select()
      .single();
    if (error) {
      reportSupabase(`checkInInSupabase(${record.id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`checkInInSupabase(${record.id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function checkOutInSupabase(
  id: string,
  checkOutTime: string,
  client?: TypedSupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) return { data: null, error: null };
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("attendance_records")
      .update({ check_out_time: checkOutTime, status: "checked_out" })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`checkOutInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`checkOutInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function verifyAttendanceInSupabase(
  id: string,
  verifierProfileId: string,
  client?: TypedSupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) return { data: null, error: null };
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("attendance_records")
      .update({
        status: "verified",
        verified_by_profile_id: verifierProfileId,
        verified_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`verifyAttendanceInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`verifyAttendanceInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}
