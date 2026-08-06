import { createClient } from "@/lib/supabase/client";
import type { Shift, ReplacementRequest, Application } from "@/types";
import { shifts as initialShifts } from "@/lib/mock-data/shifts";
import { replacementRequests as initialReplacementRequests } from "@/lib/mock-data/replacement-requests";
import { applications as initialApplications } from "@/lib/mock-data/applications";

export async function getShifts(): Promise<Shift[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn("Supabase query returned empty or error, using initial dataset:", error?.message);
      return initialShifts;
    }

    return data.map((item: Record<string, any>) => ({
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
      replacementStage: item.replacement_stage,
      requiredQualification: item.required_qualification,
      supervisorName: item.supervisor_name,
      emergencyContact: item.emergency_contact,
      internSupervisionRequired: Boolean(item.intern_supervision_required),
      applicationDeadline: item.application_deadline,
    }));
  } catch (err) {
    console.error("Failed to fetch shifts from Supabase:", err);
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

    return data.map((item: Record<string, any>) => ({
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

    return data.map((item: Record<string, any>) => ({
      id: item.id,
      shiftId: item.shift_id,
      doctorId: item.doctor_id,
      status: item.status,
      appliedAt: item.applied_at,
      matchScorePct: item.match_score_pct,
    }));
  } catch (err) {
    return initialApplications;
  }
}

export async function createShiftInSupabase(shift: Partial<Shift>): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.from("shifts").insert({
      title: shift.title,
      department_name: shift.department || "General",
      facility_name: shift.facilityName || "City Medical Center",
      facility_id: shift.facilityId || "fac-city-medical",
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
    console.error("Supabase insert shift error:", err);
  }
}

export async function updateShiftStatusInSupabase(id: string, status: Shift["status"]): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.from("shifts").update({ status }).eq("id", id);
  } catch (err) {
    console.error("Supabase update shift status error:", err);
  }
}

export async function createReplacementRequestInSupabase(req: Partial<ReplacementRequest>): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.from("replacement_requests").insert({
      shift_id: req.shiftId,
      requesting_doctor_id: req.requestingDoctorId,
      reason: req.reason,
      preferred_replacement_type: req.preferredReplacementType || "Both",
      hourly_compensation: req.hourlyCompensation,
      notes: req.notes,
      status: req.status || "pending",
    });
  } catch (err) {
    console.error("Supabase insert replacement request error:", err);
  }
}

export async function updateReplacementRequestStatusInSupabase(
  id: string,
  status: ReplacementRequest["status"]
): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.from("replacement_requests").update({ status }).eq("id", id);
  } catch (err) {
    console.error("Supabase update replacement request error:", err);
  }
}

export async function createApplicationInSupabase(app: Partial<Application>): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.from("applications").insert({
      shift_id: app.shiftId,
      doctor_id: app.doctorId,
      status: app.status || "applied",
      match_score_pct: app.matchScorePct || 85,
    });
  } catch (err) {
    console.error("Supabase insert application error:", err);
  }
}

