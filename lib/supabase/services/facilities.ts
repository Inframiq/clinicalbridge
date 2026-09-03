import { createClient } from "@/lib/supabase/client";
import type { HospitalVerification } from "@/types";
import { facilities as initialFacilities, type Facility } from "@/lib/mock-data/organizations";
import { isUuid } from "./utils";

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

export async function getFacilities(): Promise<Facility[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("facilities")
      .select("*, profiles(verification_status)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase facilities query failed, using initial dataset as a display-only fallback:", error.message);
      return initialFacilities;
    }

    // A real, successful query with zero rows means zero real hospitals have
    // registered yet - that must render as an empty state, not silently
    // fall back to seed/mock data that would look like real registrations.
    return (data ?? []).map(mapFacilityRow);
  } catch (err) {
    console.error("Failed to fetch facilities from Supabase:", err);
    return initialFacilities;
  }
}

export async function updateFacilityVerificationInSupabase(
  id: string,
  verification: HospitalVerification
): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = createClient();
  try {
    await supabase.from("facilities").update({ verification_status: verification }).eq("id", id);
  } catch (err) {
    console.error("Supabase update facility verification error:", err);
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
  status: "Approved" | "Rejected"
): Promise<void> {
  if (!isUuid(profileId)) return;
  const supabase = createClient();
  try {
    await supabase
      .from("profiles")
      .update({ verification_status: status, verified: status === "Approved" })
      .eq("id", profileId);
  } catch (err) {
    console.error("Supabase update facility registration status error:", err);
  }
}
