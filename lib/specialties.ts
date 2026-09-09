/**
 * Canonical list of physician specialties offered across the platform.
 * Used by the onboarding wizards, doctor registration, and any specialty
 * picker. Ordered roughly by locum/hospital staffing demand, then the rest
 * alphabetically. Edit here once — every picker updates.
 */
export const SPECIALTIES = [
  "Emergency Medicine",
  "Internal Medicine",
  "Hospital Medicine (Hospitalist)",
  "Family Medicine",
  "Critical Care / ICU",
  "Anesthesiology",
  "Psychiatry",
  "Pediatrics",
  "Obstetrics & Gynecology",
  "General Surgery",
  "Orthopedic Surgery",
  "Radiology",
  "Cardiology",
  "Neurology",
  "Pulmonology",
  "Nephrology",
  "Gastroenterology",
  "Endocrinology",
  "Infectious Disease",
  "Hematology / Oncology",
  "Rheumatology",
  "Dermatology",
  "Urology",
  "Ophthalmology",
  "Otolaryngology (ENT)",
  "Physical Medicine & Rehabilitation",
  "Pathology",
  "Neonatology",
  "Geriatric Medicine",
  "Pain Medicine",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
