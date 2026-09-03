import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Doctor, DoctorVerification } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDoctorRow(item: Record<string, any>): Doctor {
  const vd = item.verification_details || {};
  const verification: DoctorVerification = {
    medicalCouncil: Boolean(vd.medicalCouncil),
    degree: Boolean(vd.degree),
    identity: Boolean(vd.identity),
    hospitalApproval: Boolean(vd.hospitalApproval),
  };
  const verified = Boolean(item.verified);
  return {
    id: item.id,
    firstName: item.first_name,
    lastName: item.last_name,
    specialty: item.specialty,
    subSpecialty: item.sub_specialty ?? undefined,
    rating: Number(item.rating ?? 0),
    reviewCount: item.review_count ?? 0,
    licenseNumber: item.license_number ?? "",
    licenseExpiry: item.license_expiry ?? "",
    npiNumber: item.npi_number ?? "",
    yearsOfExperience: item.years_of_experience ?? "",
    employmentType: item.employment_type ?? "Independent / Locum",
    preferredLocations: item.preferred_locations ?? [],
    verified,
    email: item.profiles?.email ?? "",
    phone: item.profiles?.phone ?? "",
    status: verified ? "active" : "onboarding",
    doctorKind: item.doctor_kind,
    verification,
    uploadedDocuments: item.uploaded_documents ?? {},
    profileId: item.profile_id ?? undefined,
    registrationStatus: item.profiles?.verification_status ?? undefined,
  } satisfies Doctor;
}

export async function getDoctors(
  client: SupabaseClient = createClient()
): Promise<{ data: Doctor[]; error: string | null }> {
  try {
    const { data, error } = await client
      .from("doctors")
      .select("*, profiles(email, phone, verification_status)")
      .order("created_at", { ascending: false });

    if (error) {
      reportSupabase("getDoctors", error);
      return { data: [], error: describeSupabaseError(error) };
    }

    // A real, successful query with zero rows means zero real doctors have
    // registered yet - that must render as an empty state, not silently
    // fall back to seed/mock data that would look like real registrations.
    return { data: (data ?? []).map(mapDoctorRow), error: null };
  } catch (err) {
    reportSupabase("getDoctors", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

export async function updateDoctorVerificationInSupabase(
  id: string,
  verification: DoctorVerification,
  verified: boolean,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateDoctorVerificationInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data: existing } = await client
      .from("doctors")
      .select("verification_details")
      .eq("id", id)
      .maybeSingle();
    const merged = { ...(existing?.verification_details || {}), ...verification };
    const { data, error } = await client
      .from("doctors")
      .update({ verified, verification_details: merged })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateDoctorVerificationInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateDoctorVerificationInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

/**
 * Updates the doctor account's overall registration status (`profiles.verification_status`).
 * This is what actually moves the doctor off the "waiting for approval" screen after a super
 * admin reviews their documents - the per-document checklist above only tracks which individual
 * documents passed review, it never touched this field.
 */
export async function updateDoctorRegistrationStatusInSupabase(
  profileId: string | undefined,
  status: "Approved" | "Rejected",
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(profileId)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateDoctorRegistrationStatusInSupabase: skipped non-uuid id", profileId);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("profiles")
      .update({ verification_status: status, verified: status === "Approved" })
      .eq("id", profileId)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateDoctorRegistrationStatusInSupabase(${profileId})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateDoctorRegistrationStatusInSupabase(${profileId})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

export async function updateDoctorProfileInSupabase(
  id: string,
  patch: Partial<
    Pick<Doctor, "specialty" | "subSpecialty" | "licenseNumber" | "licenseExpiry" | "yearsOfExperience" | "preferredLocations">
  >,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateDoctorProfileInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  const update: Record<string, unknown> = {};
  if (patch.specialty !== undefined) update.specialty = patch.specialty;
  if (patch.subSpecialty !== undefined) update.sub_specialty = patch.subSpecialty;
  if (patch.licenseNumber !== undefined) update.license_number = patch.licenseNumber;
  if (patch.licenseExpiry !== undefined) update.license_expiry = patch.licenseExpiry;
  if (patch.yearsOfExperience !== undefined) update.years_of_experience = patch.yearsOfExperience;
  if (patch.preferredLocations !== undefined) update.preferred_locations = patch.preferredLocations;
  if (Object.keys(update).length === 0) return { data: null, error: null };

  client ??= createClient();
  try {
    const { data, error } = await client
      .from("doctors")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateDoctorProfileInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateDoctorProfileInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}
