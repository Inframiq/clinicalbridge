-- -----------------------------------------------------------------------------
-- Migration 012: Track the RLS/security fixes that were previously applied to
-- the live database by hand-pasting `apply_pending_migrations.sql` into the
-- Supabase SQL editor (see that file's own header). None of this was ever
-- captured as a versioned migration, so a fresh environment created via
-- `supabase db push` would be missing all of it. This migration reproduces
-- that file's genuinely-new content (i.e. everything beyond migrations
-- 005-010, which already exist as their own numbered files) so the schema
-- history is reproducible from scratch.
--
-- Covers: missing SELECT/INSERT/UPDATE policies for replacement_requests,
-- payouts, ratings (RLS was enabled in 001 but never given policies, so every
-- request to these three tables was silently denied); missing UPDATE policy
-- for applications and missing INSERT/UPDATE for notifications; a hardened
-- shifts policy with a WITH CHECK and an additional grant for the assigned
-- doctor to accept/decline their own shift; privileged-column guard triggers
-- that stop a non-admin from self-promoting role/verified/verification_status
-- or reassigning doctor/facility ownership via a plain UPDATE; and the
-- "documents" storage bucket, which 002's INSERT never actually landed live.
--
-- The SELECT policies created here are intentionally broad ("any authenticated
-- user") to match what was actually running in production. Migration 013
-- immediately narrows the ones that need to be scoped per-tenant; it is not
-- safe to skip 012 and jump straight to 013, since 013 assumes these INSERT/
-- UPDATE policies and guard triggers already exist.
--
-- Idempotent throughout: DROP POLICY/TRIGGER IF EXISTS before each CREATE.
-- -----------------------------------------------------------------------------

ALTER TABLE public.replacement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- replacement_requests
DROP POLICY IF EXISTS "Replacement requests viewable by authenticated users" ON public.replacement_requests;
CREATE POLICY "Replacement requests viewable by authenticated users" ON public.replacement_requests
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Replacement requests insertable by requesting doctor" ON public.replacement_requests;
CREATE POLICY "Replacement requests insertable by requesting doctor" ON public.replacement_requests
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = replacement_requests.requesting_doctor_id AND profile_id = auth.uid())
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Replacement requests updatable by requesting doctor or admin" ON public.replacement_requests;
CREATE POLICY "Replacement requests updatable by requesting doctor or admin" ON public.replacement_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = replacement_requests.requesting_doctor_id AND profile_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.shifts s
            JOIN public.facilities f ON s.facility_id = f.id
            WHERE s.id = replacement_requests.shift_id AND f.profile_id = auth.uid()
        )
        OR public.is_super_admin()
    );

-- payouts
DROP POLICY IF EXISTS "Payouts viewable by authenticated users" ON public.payouts;
CREATE POLICY "Payouts viewable by authenticated users" ON public.payouts
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Payouts updatable by owner doctor or admin" ON public.payouts;
CREATE POLICY "Payouts updatable by owner doctor or admin" ON public.payouts
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = payouts.doctor_id AND profile_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.shifts s
            JOIN public.facilities f ON s.facility_id = f.id
            WHERE s.id = payouts.shift_id AND f.profile_id = auth.uid()
        )
        OR public.is_super_admin()
    );

-- ratings
DROP POLICY IF EXISTS "Ratings viewable by authenticated users" ON public.ratings;
CREATE POLICY "Ratings viewable by authenticated users" ON public.ratings
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Ratings insertable by the rater" ON public.ratings;
CREATE POLICY "Ratings insertable by the rater" ON public.ratings
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = ratings.doctor_id AND profile_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.facilities WHERE id = ratings.facility_id AND profile_id = auth.uid())
        OR public.is_super_admin()
    );

-- applications: SELECT + INSERT already exist (migration 001). Add UPDATE.
DROP POLICY IF EXISTS "Applications updatable by doctor or facility owner" ON public.applications;
CREATE POLICY "Applications updatable by doctor or facility owner" ON public.applications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = applications.doctor_id AND profile_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.shifts s
            JOIN public.facilities f ON s.facility_id = f.id
            WHERE s.id = applications.shift_id AND f.profile_id = auth.uid()
        )
        OR public.is_super_admin()
    );

-- notifications: SELECT already exists (migration 001). Add INSERT + UPDATE.
DROP POLICY IF EXISTS "Notifications insertable for the target user" ON public.notifications;
CREATE POLICY "Notifications insertable for the target user" ON public.notifications
    FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Notifications updatable by the target user" ON public.notifications;
CREATE POLICY "Notifications updatable by the target user" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- shifts: replace migration 001's "Shifts manageable by facility" FOR ALL
-- policy (no WITH CHECK, no super-admin branch) with a hardened owner-or-admin
-- version, and add a second UPDATE policy so the assigned doctor can
-- accept/decline their own shift assignment (Postgres ORs permissive
-- policies together, so this widens UPDATE without weakening the facility
-- policy).
DROP POLICY IF EXISTS "Shifts viewable by authenticated users" ON public.shifts;
CREATE POLICY "Shifts viewable by authenticated users" ON public.shifts
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Shifts manageable by facility" ON public.shifts;
CREATE POLICY "Shifts manageable by facility" ON public.shifts
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.facilities WHERE id = shifts.facility_id AND profile_id = auth.uid())
        OR public.is_super_admin()
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.facilities WHERE id = shifts.facility_id AND profile_id = auth.uid())
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Shifts updatable by assigned doctor" ON public.shifts;
CREATE POLICY "Shifts updatable by assigned doctor" ON public.shifts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = shifts.assigned_doctor_id AND d.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        assigned_doctor_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = shifts.assigned_doctor_id AND d.profile_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- Privileged-column guard: RLS USING clauses gate WHICH rows an owner may
-- update, but not the resulting values. Without this, any authenticated user
-- could self-set profiles.role / verified / verification_status (-> instant
-- super_admin), or a doctor could self-verify or reassign ownership.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_privileged_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Not authorized to change profile role';
        END IF;
        IF NEW.verified IS DISTINCT FROM OLD.verified THEN
            RAISE EXCEPTION 'Not authorized to change profile verified flag';
        END IF;
        IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
           AND NEW.verification_status IS DISTINCT FROM 'Submitted' THEN
            RAISE EXCEPTION 'Not authorized to set verification_status to %', NEW.verification_status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS guard_privileged_profile_update ON public.profiles;
CREATE TRIGGER guard_privileged_profile_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_profile_update();

CREATE OR REPLACE FUNCTION public.guard_privileged_doctor_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_super_admin() AND (
        NEW.verified IS DISTINCT FROM OLD.verified
        OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
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

CREATE OR REPLACE FUNCTION public.guard_privileged_facility_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.is_super_admin() AND NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
        RAISE EXCEPTION 'Not authorized to reassign facility ownership';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS guard_privileged_facility_update ON public.facilities;
CREATE TRIGGER guard_privileged_facility_update
    BEFORE UPDATE ON public.facilities
    FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_facility_update();

-- -----------------------------------------------------------------------------
-- Storage: the "documents" bucket + its RLS. 002 defines this, but the live
-- project never actually got it (GET /storage/v1/bucket/documents -> 404),
-- so every onboarding document upload failed. Re-applying is a harmless no-op
-- if 002 did land.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
CREATE POLICY "Users can upload their own documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
CREATE POLICY "Users can view documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
CREATE POLICY "Users can update their own documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents'
        AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_super_admin())
    );

DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
CREATE POLICY "Users can delete their own documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents'
        AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_super_admin())
    );
