-- Migration 005: Fix "type user_role does not exist" on signup
-- SECURITY DEFINER functions do not reliably inherit a search_path that
-- includes "public", so the unqualified `user_role` enum reference in
-- handle_new_user() fails when the trigger fires during auth.users insert.
-- Fix: schema-qualify the type and pin the function's search_path.

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
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'locum_doctor'::public.user_role),
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
