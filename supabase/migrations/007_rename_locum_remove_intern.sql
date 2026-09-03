-- Migration 007: Rename "Locum Doctor" -> "Locum Tenens" and remove the "intern" role
--
-- Renames are done via ALTER TYPE ... RENAME VALUE (safe, in-place, existing rows
-- follow automatically). Removing 'intern' has no direct DROP VALUE in Postgres, so
-- it uses the standard swap pattern: reassign any existing 'intern' rows to
-- 'locum_tenens' (data-preserving, no accounts are deleted), then rebuild each enum
-- type without 'intern' and repoint the column to it.

-- -----------------------------------------------------------------------------
-- 1. Rename locum_doctor -> locum_tenens (user_role) and locum -> locum_tenens
--    (doctor_kind). Guarded so this migration can be safely re-run.
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

-- -----------------------------------------------------------------------------
-- 2. Update the signup trigger to default to locum_tenens (was locum_doctor).
--    Done immediately after the rename so there's no window where signups
--    could reference an enum label that no longer exists.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        role,
        full_name,
        verified,
        completed_onboarding,
        verification_status
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'locum_tenens'::public.user_role),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        FALSE,
        FALSE,
        'Pending'
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
-- 3. Reassign any existing intern rows to locum_tenens before the value
--    becomes unrepresentable. Accounts are preserved, not deleted.
-- -----------------------------------------------------------------------------
UPDATE public.profiles SET role = 'locum_tenens' WHERE role = 'intern';
UPDATE public.doctors SET doctor_kind = 'locum_tenens' WHERE doctor_kind = 'intern';

-- -----------------------------------------------------------------------------
-- 4. Rebuild user_role and doctor_kind without 'intern'.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5. Drop the now-dead two-stage "escalate to interns" replacement workflow:
--    shifts.replacement_stage / shifts.intern_supervision_required columns and
--    the replacement_stage enum.
-- -----------------------------------------------------------------------------
ALTER TABLE public.shifts DROP COLUMN IF EXISTS replacement_stage;
ALTER TABLE public.shifts DROP COLUMN IF EXISTS intern_supervision_required;
DROP TYPE IF EXISTS public.replacement_stage;
