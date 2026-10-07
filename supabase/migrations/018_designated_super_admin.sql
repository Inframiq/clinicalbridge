-- -----------------------------------------------------------------------------
-- Migration 018: Configure a single, hardcoded super-admin account.
--
-- The app no longer exposes any way to log in "as" Super Admin (login-form.tsx
-- dropped that tile) or to self-sign-up as one (migration 017). Instead, this
-- migration wires one specific email address to the super_admin role at the
-- database layer, so it can never be granted client-side:
--
--   1. `handle_new_user()` now force-assigns 'super_admin' whenever the
--      signing-up email matches the designated address, regardless of which
--      of the three self-serve roles the signup form sent. This is on top
--      of (not instead of) migration 017's allowlist - any other email is
--      still restricted to hospital/working_doctor/locum_tenens.
--   2. If a profile for that email already exists (it signed up earlier
--      under an ordinary role), it is promoted here directly and marked
--      verified/approved, so it lands on the super-admin dashboard with no
--      onboarding gate. The privileged-column guard trigger from migration
--      012 would otherwise block this exact kind of UPDATE (it only allows
--      role changes made by an existing super admin), so it's briefly
--      disabled around this one statement.
--
-- With this in place, entering the designated email while signing in through
-- ANY of the three role tiles resolves to the super_admin profile - the
-- app-side mismatch bypass in auth-provider.tsx then routes it to
-- /super-admin/dashboard regardless of which tile was clicked.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    requested_role text := NEW.raw_user_meta_data ->> 'role';
    safe_role public.user_role;
BEGIN
    IF lower(NEW.email) = 'chitrothusanjita@gmail.com' THEN
        safe_role := 'super_admin'::public.user_role;
    ELSIF requested_role IN ('hospital', 'working_doctor', 'locum_tenens') THEN
        safe_role := requested_role::public.user_role;
    ELSE
        safe_role := 'locum_tenens'::public.user_role;
    END IF;

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
        safe_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        safe_role = 'super_admin',
        safe_role = 'super_admin',
        CASE WHEN safe_role = 'super_admin' THEN 'Approved' ELSE 'Pending' END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
        -- role deliberately not touched here - see migration 017's header.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Promote an already-existing profile for the designated address, bypassing
-- the privileged-column guard trigger for this one deliberate statement.
ALTER TABLE public.profiles DISABLE TRIGGER guard_privileged_profile_update;

UPDATE public.profiles
SET
    role = 'super_admin'::public.user_role,
    verified = TRUE,
    completed_onboarding = TRUE,
    verification_status = 'Approved'
WHERE lower(email) = 'chitrothusanjita@gmail.com'
  AND role <> 'super_admin'::public.user_role;

ALTER TABLE public.profiles ENABLE TRIGGER guard_privileged_profile_update;
