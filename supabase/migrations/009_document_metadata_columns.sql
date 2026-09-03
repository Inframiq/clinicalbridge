-- Migration 009: Separate uploaded-document metadata from verification checklists
--
-- Onboarding wizards were writing uploaded document metadata directly into
-- doctors.verification_details / facilities.verification_status — the same
-- JSONB columns the super-admin verification checklist (booleans) reads and
-- writes. For hospitals, the document-checklist keys are identical to the
-- checklist keys (governmentRegistration, medicalLicense, taxRegistration,
-- accreditation, authorizedSignatory), so submitting a hospital application
-- overwrote the checklist with file-metadata objects, which read back as
-- truthy and made the hospital appear fully verified without any admin
-- action. This migration gives document metadata its own column so the
-- checklist columns stay boolean-only.
--
-- NOTE: any hospital that currently shows status "verified" purely because
-- of this bug should be manually re-reviewed by an admin after this deploys
-- — there is no reliable way to distinguish a real verified checklist from
-- a bugged one via SQL alone, so no automatic backfill/repair is attempted.

ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '{}'::jsonb;
