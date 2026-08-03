/**
 * Single source of truth for white-label branding. Every hospital-specific
 * detail in the UI is read from this file (or ACTIVE_ORGANIZATION below) —
 * nothing is hardcoded in components/pages. To rebrand the whole app for a
 * different operator, edit the values here (or wire them to env vars / a
 * tenant API); nothing else needs to change.
 */

export const PLATFORM = {
  name: "ClinicalBridge",
  shortName: "ClinicalBridge",
  tagline: "Connecting Care. When It Matters.",
  description:
    "The enterprise marketplace connecting hospitals and clinics with verified, on-demand medical talent.",
  logoInitials: "CB",
  supportEmail: "support@clinicalbridge.com",
  supportPhone: "+1 (800) 123-4567",
  website: "https://clinicalbridge.com",
} as const;

/**
 * The tenant/organization currently signed in to the platform (a hospital or
 * clinic). Shown in the topbar org-switcher and on generated documents.
 * In production this would come from the authenticated session, not a constant.
 */
export const ACTIVE_ORGANIZATION = {
  name: "City Medical Center",
  address: "123 Health St, New York, NY 10001",
  phone: "+1 (555) 123-4567",
  email: "admin@citymedicalcenter.com",
  logoInitials: "CMC",
} as const;
