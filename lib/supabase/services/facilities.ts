import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { HospitalVerification } from "@/types";
import type { DocumentReviewStatus, UploadedFileMetadata } from "@/lib/supabase/storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "./utils";
import { reportSupabase, describeSupabaseError } from "../log";

export interface Facility {
  id: string;
  name: string;
  /** Not collected at onboarding today; only ever set from the hospital settings page. */
  address?: string;
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
  /** Super admin's review of the Basic Info section, independent of the per-document statuses. */
  basicInfoStatus: DocumentReviewStatus;
  basicInfoReviewedAt?: string;
  basicInfoRejectionReason?: string;
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
    address: item.address ?? "",
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
    basicInfoStatus: (item.basic_info_status ?? "pending") as DocumentReviewStatus,
    basicInfoReviewedAt: item.basic_info_reviewed_at ?? undefined,
    basicInfoRejectionReason: item.basic_info_rejection_reason ?? undefined,
  } satisfies Facility;
}

export async function getFacilities(
  client?: SupabaseClient
): Promise<{ data: Facility[]; error: string | null }> {
  if (!isSupabaseConfigured) return { data: [], error: null };
  client ??= createClient();
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

export async function updateFacilityProfileInSupabase(
  id: string,
  patch: Partial<Pick<Facility, "name" | "address" | "city" | "phone" | "email" | "contactPerson">>,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateFacilityProfileInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.address !== undefined) update.address = patch.address;
  if (patch.city !== undefined) update.city = patch.city;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.email !== undefined) update.email = patch.email;
  if (patch.contactPerson !== undefined) update.contact_person = patch.contactPerson;
  if (Object.keys(update).length === 0) return { data: null, error: null };

  client ??= createClient();
  try {
    const { data, error } = await client
      .from("facilities")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateFacilityProfileInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateFacilityProfileInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
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
 * Persists the whole `uploaded_documents` JSONB for a facility after a super
 * admin approves or rejects an individual document in the verification dialog.
 */
export async function updateFacilityDocumentsInSupabase(
  id: string,
  uploadedDocuments: Record<string, UploadedFileMetadata>,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateFacilityDocumentsInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("facilities")
      .update({ uploaded_documents: uploadedDocuments })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateFacilityDocumentsInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateFacilityDocumentsInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}

/**
 * Records a super admin's approve/reject decision on a facility's Basic Info
 * section - independent of the per-document review in
 * {@link updateFacilityDocumentsInSupabase}.
 */
export async function updateFacilityBasicInfoReviewInSupabase(
  id: string,
  decision: Exclude<DocumentReviewStatus, "pending">,
  reason: string | undefined,
  client?: SupabaseClient
): Promise<{ data: unknown; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateFacilityBasicInfoReviewInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  client ??= createClient();
  try {
    const { data, error } = await client
      .from("facilities")
      .update({
        basic_info_status: decision,
        basic_info_reviewed_at: new Date().toISOString(),
        basic_info_rejection_reason: decision === "rejected" ? reason : null,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      reportSupabase(`updateFacilityBasicInfoReviewInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateFacilityBasicInfoReviewInSupabase(${id})`, err);
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
  status: "Approved" | "Rejected" | "Needs Changes",
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
