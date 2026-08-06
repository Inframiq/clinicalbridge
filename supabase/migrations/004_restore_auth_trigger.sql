-- Migration 004: Restore Auth Trigger
-- Now that the schema cache has been reloaded, the trigger will no longer throw HTTP 500 errors.
-- This trigger safely bypasses RLS (via SECURITY DEFINER) to guarantee the profile is created 
-- immediately when the user signs up, even if email confirmation is enabled and the client has no session.

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
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'locum_doctor'::user_role),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
