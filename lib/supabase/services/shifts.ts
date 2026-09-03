import { createClient } from "@/lib/supabase/client";
import type { Shift, ReplacementRequest, Application } from "@/types";
import { shifts as initialShifts } from "@/lib/mock-data/shifts";
import { replacementRequests as initialReplacementRequests } from "@/lib/mock-data/replacement-requests";
import { applications as initialApplications } from "@/lib/mock-data/applications";
import { isUuid } from "./utils";
import { reportSupabase } from "../log";

export async function getShifts(): Promise<Shift[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      reportSupabase("getShifts", error);
      return initialShifts;
    }

    return data.map((item) => ({
      id: item.id,
      title: item.title,
      department: item.department_name,
      facilityName: item.facility_name,
      facilityId: item.facility_id,
      location: item.location || { address: "", city: "", state: "", lat: 0, lng: 0 },
      date: item.date,
      startTime: item.start_time,
      endTime: item.end_time,
      shiftType: item.shift_type,
      subSpecialty: item.sub_specialty,
      hourlyRate: Number(item.hourly_rate),
      doctorsNeeded: item.doctors_needed,
      experienceLevel: item.experience_level,
      description: item.description || "",
      status: item.status,
      codeRed: Boolean(item.code_red),
      assignedDoctorId: item.assigned_doctor_id,
      requiredQualification: item.required_qualification,
      supervisorName: item.supervisor_name,
      emergencyContact: item.emergency_contact,
      applicationDeadline: item.application_deadline,
    }));
  } catch (err) {
    reportSupabase("getShifts", err);
    return initialShifts;
  }
}

export async function getReplacementRequests(): Promise<ReplacementRequest[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("replacement_requests")
      .select("*")
      .order("requested_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return initialReplacementRequests;
    }

    return data.map((item) => ({
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
    }));
  } catch (err) {
    reportSupabase("getReplacementRequests", err);
    return initialReplacementRequests;
  }
}

export async function getApplications(): Promise<Application[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("applied_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return initialApplications;
    }

    return data.map((item) => ({
      id: item.id,
      shiftId: item.shift_id,
      doctorId: item.doctor_id,
      status: item.status,
      appliedAt: item.applied_at,
      matchScorePct: item.match_score_pct,
    }));
  } catch (err) {
    reportSupabase("getApplications", err);
    return initialApplications;
  }
}

export async function createShiftInSupabase(shift: Shift): Promise<void> {
  if (!isUuid(shift.id) || !isUuid(shift.facilityId)) return;
  const supabase = createClient();
  try {
    await supabase.from("shifts").insert({
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
    });
  } catch (err) {
    reportSupabase("createShiftInSupabase", err);
  }
}

export async function updateShiftStatusInSupabase(id: string, status: Shift["status"]): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = createClient();
  try {
    await supabase.from("shifts").update({ status }).eq("id", id);
  } catch (err) {
    reportSupabase(`updateShiftStatusInSupabase(${id})`, err);
  }
}

export async function updateShiftAssignmentInSupabase(
  shiftId: string,
  patch: { assignedDoctorId?: string | null; status?: Shift["status"] }
): Promise<void> {
  if (!isUuid(shiftId)) return;
  const update: Record<string, unknown> = {};
  if (patch.assignedDoctorId !== undefined) update.assigned_doctor_id = patch.assignedDoctorId;
  if (patch.status !== undefined) update.status = patch.status;
  if (Object.keys(update).length === 0) return;

  const supabase = createClient();
  try {
    await supabase.from("shifts").update(update).eq("id", shiftId);
  } catch (err) {
    reportSupabase(`updateShiftAssignmentInSupabase(${shiftId})`, err);
  }
}

export async function createReplacementRequestInSupabase(req: ReplacementRequest): Promise<void> {
  if (!isUuid(req.id) || !isUuid(req.shiftId) || !isUuid(req.requestingDoctorId)) return;
  const supabase = createClient();
  try {
    await supabase.from("replacement_requests").insert({
      id: req.id,
      shift_id: req.shiftId,
      requesting_doctor_id: req.requestingDoctorId,
      reason: req.reason,
      preferred_replacement_type: req.preferredReplacementType || "Locum Tenens",
      hourly_compensation: req.hourlyCompensation,
      notes: req.notes,
      status: req.status || "pending",
    });
  } catch (err) {
    reportSupabase("createReplacementRequestInSupabase", err);
  }
}

export async function updateReplacementRequestStatusInSupabase(
  id: string,
  status: ReplacementRequest["status"]
): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = createClient();
  try {
    await supabase.from("replacement_requests").update({ status }).eq("id", id);
  } catch (err) {
    reportSupabase(`updateReplacementRequestStatusInSupabase(${id})`, err);
  }
}

export async function modifyReplacementRequestInSupabase(
  id: string,
  patch: Partial<Pick<ReplacementRequest, "hourlyCompensation" | "notes">>
): Promise<void> {
  if (!isUuid(id)) return;
  const update: Record<string, unknown> = {};
  if (patch.hourlyCompensation !== undefined) update.hourly_compensation = patch.hourlyCompensation;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (Object.keys(update).length === 0) return;

  const supabase = createClient();
  try {
    await supabase.from("replacement_requests").update(update).eq("id", id);
  } catch (err) {
    reportSupabase(`modifyReplacementRequestInSupabase(${id})`, err);
  }
}

export async function createApplicationInSupabase(app: Application): Promise<void> {
  if (!isUuid(app.id) || !isUuid(app.shiftId) || !isUuid(app.doctorId)) return;
  const supabase = createClient();
  try {
    await supabase.from("applications").insert({
      id: app.id,
      shift_id: app.shiftId,
      doctor_id: app.doctorId,
      status: app.status || "applied",
      match_score_pct: app.matchScorePct || 85,
    });
  } catch (err) {
    reportSupabase("createApplicationInSupabase", err);
  }
}

export async function updateApplicationStatusInSupabase(
  id: string,
  status: Application["status"]
): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = createClient();
  try {
    await supabase.from("applications").update({ status }).eq("id", id);
  } catch (err) {
    reportSupabase(`updateApplicationStatusInSupabase(${id})`, err);
  }
}
