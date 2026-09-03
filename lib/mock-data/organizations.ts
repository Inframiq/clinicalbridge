import type { HospitalVerification } from "@/types";

// The Facility shape now lives with the Supabase read service (its mapper is the
// source of truth). Re-exported here so existing importers keep working.
export type { Facility } from "@/lib/supabase/services/facilities";
import type { Facility } from "@/lib/supabase/services/facilities";

const FULLY_VERIFIED: HospitalVerification = {
  governmentRegistration: true,
  medicalLicense: true,
  taxRegistration: true,
  accreditation: true,
  authorizedSignatory: true,
};

export const facilities: Facility[] = [
  {
    id: "fac-city-medical",
    name: "City Medical Center",
    city: "New York, NY",
    registrationNumber: "NY-HOSP-10021",
    governmentLicense: "DOH-NY-4471",
    hospitalType: "Multi-Specialty Hospital",
    contactPerson: "Karen Whitfield",
    email: "admin@citymedicalcenter.com",
    phone: "+1 (555) 123-4567",
    verification: FULLY_VERIFIED,
    status: "verified",
  },
  {
    id: "fac-metro-health",
    name: "Metro Health System",
    city: "Newark, NJ",
    registrationNumber: "NJ-HOSP-30456",
    governmentLicense: "DOH-NJ-1123",
    hospitalType: "Community Hospital",
    contactPerson: "Marcus Diallo",
    email: "admin@metrohealth.org",
    phone: "+1 (555) 234-5678",
    verification: {
      governmentRegistration: true,
      medicalLicense: true,
      taxRegistration: false,
      accreditation: false,
      authorizedSignatory: false,
    },
    status: "pending",
  },
  {
    id: "fac-st-marys",
    name: "St. Mary's Hospital",
    city: "Boston, MA",
    registrationNumber: "MA-HOSP-58821",
    governmentLicense: "DOH-MA-7765",
    hospitalType: "Teaching Hospital",
    contactPerson: "Elena Bianchi",
    email: "admin@stmarys.org",
    phone: "+1 (555) 345-6789",
    verification: {
      governmentRegistration: true,
      medicalLicense: false,
      taxRegistration: false,
      accreditation: false,
      authorizedSignatory: false,
    },
    status: "pending",
  },
  {
    id: "fac-riverside",
    name: "Riverside Community Hospital",
    city: "Riverside, CA",
    registrationNumber: "CA-HOSP-90212",
    governmentLicense: "DOH-CA-2287",
    hospitalType: "Community Hospital",
    contactPerson: "Priya Nair",
    email: "admin@riversidecommunity.org",
    phone: "+1 (555) 456-7890",
    verification: {
      governmentRegistration: false,
      medicalLicense: false,
      taxRegistration: false,
      accreditation: false,
      authorizedSignatory: false,
    },
    status: "pending",
  },
  {
    id: "fac-northside",
    name: "Northside Medical Center",
    city: "Atlanta, GA",
    registrationNumber: "GA-HOSP-11045",
    governmentLicense: "DOH-GA-5540",
    hospitalType: "Trauma Center",
    contactPerson: "Tyler Brooks",
    email: "admin@northsidemedical.org",
    phone: "+1 (555) 567-8901",
    verification: FULLY_VERIFIED,
    status: "verified",
  },
];

export const currentFacility = facilities[0];
