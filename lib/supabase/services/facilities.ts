import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { HospitalVerification } from "@/types";
import type { UploadedFileMetadata } from "@/lib/supabase/storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";

export interface Facility {
  id: string;
  name: string;
  city: string;
  registrationNumber: string;
  governmentLicense: string;
  hospitalType: string;
  contactPerson: string;
  email: string;
  phone: string;
  verification: HospitalVerification;
  status: "pending" | "verified";
  uploadedDocuments?: Record<string, UploadedFileMetadata>;
  profileId?: string;
  /** Account-level registration status from `profiles.verification_status` (e.g. "Submitted", "Approved", "Rejected"). */
  registrationStatus?: string;
}

const EMPTY_VERIFICATION: HospitalVerification = {
  governmentRegistration: false,
  medicalLicense: false,
  taxRegistration: false,
  accreditation: false,
  authorizedSignatory: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapFacilityRow(item: Record<string, any>): Facility {
  const verification: HospitalVerification = { ...EMPTY_VERIFICATION, ...(item.verification_status || {}) };
  const allVerified = Object.values(verification).every(Boolean);
  return {
    id: item.id,
    name: item.name,
    city: item.city ?? "",
    registrationNumber: item.registration_number ?? "",
    governmentLicense: item.government_license ?? "",
    hospitalType: item.hospital_type ?? "",
    contactPerson: item.contact_person ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    verification,
    status: allVerified ? "verified" : "pending",
    uploadedDocuments: item.uploaded_documents ?? {},
    profileId: item.profile_id ?? undefined,
    registrationStatus: item.profiles?.verification_status ?? undefined,
  } satisfies Facility;
}

export async function getFacilities(
  client: SupabaseClient = createClient()
): Promise<{ data: Facility[]; error: string | null }> {
  try {
    const { data, error } = await client
      .from("facilities")
      .select("*, profiles(verification_status)")
      .order("created_at", { ascending: false });

    if (error) {
      reportSupabase("getFacilities", error);
      return { data: [], error: describeSupabaseError(error) };
    }

    // A real, successful query with zero rows means zero real hospitals have
    // registered yet - that must render as an empty state, not silently
    // fall back to seed/mock data that would look like real registrations.
    return { data: (data ?? []).map(mapFacilityRow), error: null };
  } catch (err) {
    reportSupabase("getFacilities", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}

export async function updateFacilityVerificationInSupabase(
  id: string,
  verification: HospitalVerification,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateFacilityVerificationInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("facilities")
      .update({ verification_status: verification })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateFacilityVerificationInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateFacilityVerificationInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

/**
 * Updates the hospital account's overall registration status (`profiles.verification_status`).
 * This is what actually moves the hospital off the "waiting for approval" screen after a
 * super admin reviews their documents - the per-document checklist above only tracks which
 * individual documents passed review, it never touched this field.
 */
export async function updateFacilityRegistrationStatusInSupabase(
  profileId: string | undefined,
  status: "Approved" | "Rejected",
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(profileId)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateFacilityRegistrationStatusInSupabase: skipped non-uuid id", profileId);
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
      reportSupabase(`updateFacilityRegistrationStatusInSupabase(${profileId})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateFacilityRegistrationStatusInSupabase(${profileId})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}
