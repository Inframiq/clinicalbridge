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
