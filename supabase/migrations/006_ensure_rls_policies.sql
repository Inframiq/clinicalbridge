-- Migration 006: Re-ensure RLS policies for profiles, facilities, doctors
-- These policies were defined in 002_auth_onboarding_storage.sql, but appear to
-- be missing on the live database (e.g. "new row violates row-level security
-- policy for table doctors" on a valid owner insert), suggesting 002 only
-- partially applied. This migration is idempotent and safe to re-run.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_super_admin());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR public.is_super_admin());

-- Facilities Policies
DROP POLICY IF EXISTS "Facilities are viewable by authenticated users" ON public.facilities;
CREATE POLICY "Facilities are viewable by authenticated users" ON public.facilities
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Facilities editable by facility owner" ON public.facilities;
CREATE POLICY "Facilities editable by facility owner" ON public.facilities
    FOR UPDATE USING (auth.uid() = profile_id OR public.is_super_admin());

DROP POLICY IF EXISTS "Facilities insertable by owner" ON public.facilities;
CREATE POLICY "Facilities insertable by owner" ON public.facilities
    FOR INSERT WITH CHECK (auth.uid() = profile_id OR public.is_super_admin());

-- Doctors Policies
DROP POLICY IF EXISTS "Doctors viewable by authenticated users" ON public.doctors;
CREATE POLICY "Doctors viewable by authenticated users" ON public.doctors
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Doctors editable by owner" ON public.doctors;
CREATE POLICY "Doctors editable by owner" ON public.doctors
    FOR UPDATE USING (auth.uid() = profile_id OR public.is_super_admin());

DROP POLICY IF EXISTS "Doctors insertable by owner" ON public.doctors;
CREATE POLICY "Doctors insertable by owner" ON public.doctors
    FOR INSERT WITH CHECK (auth.uid() = profile_id OR public.is_super_admin());
