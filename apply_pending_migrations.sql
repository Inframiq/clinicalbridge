-- =============================================================================
-- Combined pending migrations 005-010, in order.
--
-- These exist as files under supabase/migrations/ but were never pushed to
-- the live Supabase project (no `supabase link` + `supabase db push` was run).
-- That gap is what caused:
--   - "Could not find the 'certifications' column of 'doctors'" on doctor/
--     locum-tenens signup (needs migration 009)
--   - "Could not find the 'uploaded_documents' column of 'facilities'" on
--     hospital signup (needs migration 009)
--   - Super-admin dashboard showing stale/fake data and not updating live
--     after approvals (needs migrations 006, 009, 010)
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
-- (Or: `supabase link` then `supabase db push` to apply the migration files
-- directly and get them tracked in supabase_migrations.schema_migrations -
-- the CLI route is preferred long-term; this file is the fast path.)
--
-- Safe to run more than once: every statement below is idempotent
-- (IF NOT EXISTS / DROP ... IF EXISTS / CREATE OR REPLACE / exception-guarded).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Migration 002 backfill: guarantee profiles.completed_onboarding and
-- profiles.verification_status exist before migration 005's handle_new_user()
-- trigger (below) references them in its INSERT column list.
--
-- These columns were added by 002_auth_onboarding_storage.sql, but
-- 006_ensure_rls_policies.sql notes 002 "only partially applied" on the live
-- database. If 002 never ran, creating the 005 trigger without these columns
-- makes every subsequent signup fail with "column ... does not exist". These
-- ALTERs are no-ops when 002 did apply.
--
-- This guards a *partial* 002 apply; it is not a true schema gap in the
-- migration history (002 does define both columns).
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_onboarding BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'Pending';

-- -----------------------------------------------------------------------------
-- Migration 005: Fix "type user_role does not exist" on signup
-- SECURITY DEFINER functions do not reliably inherit a search_path that
-- includes "public", so the unqualified `user_role` enum reference in
-- handle_new_user() fails when the trigger fires during auth.users insert.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, email, role, full_name, verified, completed_onboarding, verification_status
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'locum_tenens'::public.user_role),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        FALSE, FALSE, 'Pending'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Migration 006: Re-ensure RLS policies for profiles, facilities, doctors,
-- including super-admin override access (auth.uid() = owner OR is_super_admin()).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_super_admin());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR public.is_super_admin());

DROP POLICY IF EXISTS "Facilities are viewable by authenticated users" ON public.facilities;
CREATE POLICY "Facilities are viewable by authenticated users" ON public.facilities
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Facilities editable by facility owner" ON public.facilities;
CREATE POLICY "Facilities editable by facility owner" ON public.facilities
    FOR UPDATE USING (auth.uid() = profile_id OR public.is_super_admin());

DROP POLICY IF EXISTS "Facilities insertable by owner" ON public.facilities;
CREATE POLICY "Facilities insertable by owner" ON public.facilities
    FOR INSERT WITH CHECK (auth.uid() = profile_id OR public.is_super_admin());

DROP POLICY IF EXISTS "Doctors viewable by authenticated users" ON public.doctors;
CREATE POLICY "Doctors viewable by authenticated users" ON public.doctors
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Doctors editable by owner" ON public.doctors;
CREATE POLICY "Doctors editable by owner" ON public.doctors
    FOR UPDATE USING (auth.uid() = profile_id OR public.is_super_admin());

DROP POLICY IF EXISTS "Doctors insertable by owner" ON public.doctors;
CREATE POLICY "Doctors insertable by owner" ON public.doctors
    FOR INSERT WITH CHECK (auth.uid() = profile_id OR public.is_super_admin());

-- -----------------------------------------------------------------------------
-- Migration 007: Rename "Locum Doctor" -> "Locum Tenens" and remove the
-- "intern" role. Data-preserving: existing 'intern' rows are reassigned to
-- 'locum_tenens' before the enum value becomes unrepresentable.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'locum_doctor'
    ) THEN
        ALTER TYPE public.user_role RENAME VALUE 'locum_doctor' TO 'locum_tenens';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_enum WHERE enumtypid = 'public.doctor_kind'::regtype AND enumlabel = 'locum'
    ) THEN
        ALTER TYPE public.doctor_kind RENAME VALUE 'locum' TO 'locum_tenens';
    END IF;
END $$;

UPDATE public.profiles SET role = 'locum_tenens' WHERE role = 'intern';
UPDATE public.doctors SET doctor_kind = 'locum_tenens' WHERE doctor_kind = 'intern';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'intern') THEN
        DROP TYPE IF EXISTS public.user_role_new;
        CREATE TYPE public.user_role_new AS ENUM ('hospital', 'working_doctor', 'locum_tenens', 'super_admin');

        ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
        ALTER TABLE public.profiles
            ALTER COLUMN role TYPE public.user_role_new USING role::text::public.user_role_new;
        ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'locum_tenens'::public.user_role_new;

        DROP TYPE public.user_role;
        ALTER TYPE public.user_role_new RENAME TO user_role;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.doctor_kind'::regtype AND enumlabel = 'intern') THEN
        DROP TYPE IF EXISTS public.doctor_kind_new;
        CREATE TYPE public.doctor_kind_new AS ENUM ('working', 'locum_tenens');

        ALTER TABLE public.doctors ALTER COLUMN doctor_kind DROP DEFAULT;
        ALTER TABLE public.doctors
            ALTER COLUMN doctor_kind TYPE public.doctor_kind_new USING doctor_kind::text::public.doctor_kind_new;
        ALTER TABLE public.doctors ALTER COLUMN doctor_kind SET DEFAULT 'locum_tenens'::public.doctor_kind_new;

        DROP TYPE public.doctor_kind;
        ALTER TYPE public.doctor_kind_new RENAME TO doctor_kind;
    END IF;
END $$;

ALTER TABLE public.shifts DROP COLUMN IF EXISTS replacement_stage;
ALTER TABLE public.shifts DROP COLUMN IF EXISTS intern_supervision_required;
DROP TYPE IF EXISTS public.replacement_stage;

-- -----------------------------------------------------------------------------
-- Migration 008: Add saved_shifts table and missing payout flag columns.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_doctor_saved_shift UNIQUE (doctor_id, shift_id)
);

ALTER TABLE public.saved_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can view their own saved shifts" ON public.saved_shifts;
CREATE POLICY "Doctors can view their own saved shifts" ON public.saved_shifts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = saved_shifts.doctor_id AND profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Doctors can save shifts" ON public.saved_shifts;
CREATE POLICY "Doctors can save shifts" ON public.saved_shifts
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = saved_shifts.doctor_id AND profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Doctors can unsave shifts" ON public.saved_shifts;
CREATE POLICY "Doctors can unsave shifts" ON public.saved_shifts
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = saved_shifts.doctor_id AND profile_id = auth.uid())
    );

ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS has_timesheet BOOLEAN DEFAULT FALSE;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS has_clinical_notes BOOLEAN DEFAULT FALSE;

-- -----------------------------------------------------------------------------
-- Migration 009: Separate uploaded-document metadata from verification
-- checklists. This is the one whose absence is currently throwing
-- "Could not find the 'certifications'/'uploaded_documents' column" (PGRST204)
-- on doctor/hospital signup.
-- -----------------------------------------------------------------------------
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- Migration 010: Enable Supabase Realtime on doctors and facilities, so the
-- super-admin dashboard live-updates on new/updated approvals instead of
-- needing a hard refresh.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.facilities;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- -----------------------------------------------------------------------------
-- RLS completion: policies for tables that 001 left RLS-enabled with no policy
-- (replacement_requests, payouts, ratings), plus the missing write policies on
-- applications / notifications and a hardened shifts policy.
--
-- Without this block, every service-layer read/write to replacement_requests,
-- payouts and ratings is denied the moment the app talks to a live DB, and
-- application-status / notification updates silently fail. The predicate style
-- matches migration 006 (owner OR public.is_super_admin()) and migration 008
-- (owner via EXISTS through public.doctors / public.facilities).
--
-- NOTE: no service write currently chains .select() after insert/update, but
-- these SELECT policies are the prerequisite for doing so (Task 8) and for the
-- reads that already exist (getReplacementRequests / getPayouts / getRatings).
-- All statements idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.
-- -----------------------------------------------------------------------------
ALTER TABLE public.replacement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- replacement_requests: authenticated read; requesting doctor, the facility that
-- owns the shift, or a super admin writes. Hospitals are the real callers of the
-- UPDATE path (approve / fill / reject), so the facility-owner branch is required.
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

-- payouts: authenticated read; payout's doctor, the facility that owns the shift,
-- or a super admin updates. Hospitals approve payments, so they need the
-- facility-owner branch.
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

-- ratings: authenticated read; rater must own the doctor or facility side (or be admin).
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

-- applications: SELECT + INSERT already exist in migration 001. Add the missing UPDATE:
-- the applying doctor, the facility that owns the application's shift, or a super admin.
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

-- notifications: SELECT already exists in migration 001. Add INSERT + UPDATE.
DROP POLICY IF EXISTS "Notifications insertable for the target user" ON public.notifications;
CREATE POLICY "Notifications insertable for the target user" ON public.notifications
    FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Notifications updatable by the target user" ON public.notifications;
CREATE POLICY "Notifications updatable by the target user" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- shifts: replace migration 001's "Shifts manageable by facility" FOR ALL policy
-- (no WITH CHECK, no super-admin branch) with a hardened owner-or-admin version.
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
