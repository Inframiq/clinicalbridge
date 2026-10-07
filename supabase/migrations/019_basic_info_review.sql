-- -----------------------------------------------------------------------------
-- Migration 019: Split hospital/doctor verification into independently
-- reviewable sections instead of one combined Approve/Reject Registration
-- action.
--
-- Until now, the super-admin verify dialogs let a document be approved or
-- rejected individually, but the applicant's Basic Info (name, registration
-- number, contact details, etc.) had no review state of its own - it was
-- just displayed as read-only text next to the document list. This adds a
-- "Basic Info" review status, mirroring the shape already used for
-- individual documents (pending/approved/rejected + reviewed_at +
-- rejection_reason), so the UI can show and gate each section on its own
-- status rather than a single all-or-nothing registration decision.
--
-- Both new columns are guarded the same way `guard_privileged_doctor_update`
-- already guards `verified`/`profile_id`: only a super admin can move them.
-- Without this, the existing "owner OR super_admin" UPDATE policy on
-- facilities/doctors would let a hospital or doctor set their own Basic Info
-- status to "approved" directly.
-- -----------------------------------------------------------------------------

ALTER TABLE public.facilities
    ADD COLUMN IF NOT EXISTS basic_info_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (basic_info_status IN ('pending', 'approved', 'rejected')),
    ADD COLUMN IF NOT EXISTS basic_info_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS basic_info_rejection_reason TEXT;

ALTER TABLE public.doctors
    ADD COLUMN IF NOT EXISTS basic_info_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (basic_info_status IN ('pending', 'approved', 'rejected')),
    ADD COLUMN IF NOT EXISTS basic_info_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS basic_info_rejection_reason TEXT;

CREATE OR REPLACE FUNCTION public.guard_privileged_facility_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_super_admin() AND (
        NEW.profile_id IS DISTINCT FROM OLD.profile_id
        OR NEW.basic_info_status IS DISTINCT FROM OLD.basic_info_status
    ) THEN
        RAISE EXCEPTION 'Not authorized to change a privileged facility column';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS guard_privileged_facility_update ON public.facilities;
CREATE TRIGGER guard_privileged_facility_update
    BEFORE UPDATE ON public.facilities
    FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_facility_update();

CREATE OR REPLACE FUNCTION public.guard_privileged_doctor_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_super_admin() AND (
        NEW.verified IS DISTINCT FROM OLD.verified
        OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
        OR NEW.basic_info_status IS DISTINCT FROM OLD.basic_info_status
    ) THEN
        RAISE EXCEPTION 'Not authorized to change a privileged doctor column';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS guard_privileged_doctor_update ON public.doctors;
CREATE TRIGGER guard_privileged_doctor_update
    BEFORE UPDATE ON public.doctors
    FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_doctor_update();
