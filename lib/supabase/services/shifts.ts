import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Shift, ReplacementRequest, Application } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";
import { mapShiftRow } from "../mappers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapReplacementRequestRow(item: Record<string, any>): ReplacementRequest {
  return {
    id: item.id,
    shiftId: item.shift_id,
    requestingDoctorId: item.requesting_doctor_id,
    reason: item.reason,
    preferredReplacementType: item.preferred_replacement_type,
    hourlyCompensation: Number(item.hourly_compensation),
    notes: item.notes,
    status: item.status,
    requestedAt: item.requested_at,
    reviewedAt: item.reviewed_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApplicationRow(item: Record<string, any>): Application {
  return {
    id: item.id,
    shiftId: item.shift_id,
    doctorId: item.doctor_id,
    status: item.status,
    appliedAt: item.applied_at,
    matchScorePct: item.match_score_pct,
  };
}

export async function getShifts(
  client?: SupabaseClient
): Promise<{ data: Shift[]; error: string | null }> {
  if (!isSupabaseConfigured) return { data: [], error: null };
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("shifts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      reportSupabase("getShifts", error);
      return { data: [], error: describeSupabaseError(error) };
    }

    return { data: (data ?? []).map(mapShiftRow), error: null };
  } catch (err) {
    reportSupabase("getShifts", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

export async function getReplacementRequests(
  client?: SupabaseClient
): Promise<{ data: ReplacementRequest[]; error: string | null }> {
  if (!isSupabaseConfigured) return { data: [], error: null };
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("replacement_requests")
      .select("*")
      .order("requested_at", { ascending: false });

    if (error) {
      reportSupabase("getReplacementRequests", error);
      return { data: [], error: describeSupabaseError(error) };
    }

    return { data: (data ?? []).map(mapReplacementRequestRow), error: null };
  } catch (err) {
    reportSupabase("getReplacementRequests", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

export async function getApplications(
  client?: SupabaseClient
): Promise<{ data: Application[]; error: string | null }> {
  if (!isSupabaseConfigured) return { data: [], error: null };
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("applications")
      .select("*")
      .order("applied_at", { ascending: false });

    if (error) {
      reportSupabase("getApplications", error);
      return { data: [], error: describeSupabaseError(error) };
    }

    return { data: (data ?? []).map(mapApplicationRow), error: null };
  } catch (err) {
    reportSupabase("getApplications", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

export async function createShiftInSupabase(
  shift: Shift,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(shift.id) || !isUuid(shift.facilityId)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("createShiftInSupabase: skipped non-uuid id", shift.id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("shifts")
      .insert({
        id: shift.id,
        title: shift.title,
        department_name: shift.department || "General",
        facility_name: shift.facilityName || "City Medical Center",
        facility_id: shift.facilityId,
        location: shift.location || {},
        date: shift.date,
        start_time: shift.startTime,
        end_time: shift.endTime,
        shift_type: shift.shiftType || "General",
        sub_specialty: shift.subSpecialty,
        hourly_rate: shift.hourlyRate,
        doctors_needed: shift.doctorsNeeded || 1,
        experience_level: shift.experienceLevel || "Mid Level+",
        description: shift.description || "",
        status: shift.status || "open",
        code_red: shift.codeRed || false,
      })
      .select()
      .single();
    if (error) {
      reportSupabase(`createShiftInSupabase(${shift.id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`createShiftInSupabase(${shift.id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function updateShiftStatusInSupabase(
  id: string,
  status: Shift["status"],
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateShiftStatusInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("shifts")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateShiftStatusInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateShiftStatusInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function updateShiftAssignmentInSupabase(
  shiftId: string,
  patch: { assignedDoctorId?: string | null; status?: Shift["status"] },
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(shiftId)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateShiftAssignmentInSupabase: skipped non-uuid id", shiftId);
    return { data: null, error: null };
  }
  const update: Record<string, unknown> = {};
  if (patch.assignedDoctorId !== undefined) update.assigned_doctor_id = patch.assignedDoctorId;
  if (patch.status !== undefined) update.status = patch.status;
  if (Object.keys(update).length === 0) return { data: null, error: null };

  client ??= createClient();
  try {
    const { data, error } = await client
      .from("shifts")
      .update(update)
      .eq("id", shiftId)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateShiftAssignmentInSupabase(${shiftId})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateShiftAssignmentInSupabase(${shiftId})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function createReplacementRequestInSupabase(
  req: ReplacementRequest,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(req.id) || !isUuid(req.shiftId) || !isUuid(req.requestingDoctorId)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("createReplacementRequestInSupabase: skipped non-uuid id", req.id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("replacement_requests")
      .insert({
        id: req.id,
        shift_id: req.shiftId,
        requesting_doctor_id: req.requestingDoctorId,
        reason: req.reason,
        preferred_replacement_type: req.preferredReplacementType || "Locum Tenens",
        hourly_compensation: req.hourlyCompensation,
        notes: req.notes,
        status: req.status || "pending",
      })
      .select()
      .single();
    if (error) {
      reportSupabase(`createReplacementRequestInSupabase(${req.id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`createReplacementRequestInSupabase(${req.id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function updateReplacementRequestStatusInSupabase(
  id: string,
  status: ReplacementRequest["status"],
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateReplacementRequestStatusInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("replacement_requests")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateReplacementRequestStatusInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateReplacementRequestStatusInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function modifyReplacementRequestInSupabase(
  id: string,
  patch: Partial<Pick<ReplacementRequest, "hourlyCompensation" | "notes">>,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("modifyReplacementRequestInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  const update: Record<string, unknown> = {};
  if (patch.hourlyCompensation !== undefined) update.hourly_compensation = patch.hourlyCompensation;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (Object.keys(update).length === 0) return { data: null, error: null };

  client ??= createClient();
  try {
    const { data, error } = await client
      .from("replacement_requests")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`modifyReplacementRequestInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`modifyReplacementRequestInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function createApplicationInSupabase(
  app: Application,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(app.id) || !isUuid(app.shiftId) || !isUuid(app.doctorId)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("createApplicationInSupabase: skipped non-uuid id", app.id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("applications")
      .insert({
        id: app.id,
        shift_id: app.shiftId,
        doctor_id: app.doctorId,
        status: app.status || "applied",
        match_score_pct: app.matchScorePct || 85,
      })
      .select()
      .single();
    if (error) {
      reportSupabase(`createApplicationInSupabase(${app.id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`createApplicationInSupabase(${app.id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function updateApplicationStatusInSupabase(
  id: string,
  status: Application["status"],
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateApplicationStatusInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("applications")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateApplicationStatusInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateApplicationStatusInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}
