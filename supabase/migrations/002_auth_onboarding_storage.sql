-- LocumTenens Platform (ClinicalBridge) Migration 002
-- Auth, Profiles Onboarding, RLS & Storage Integration

-- 1. Update public.profiles table schema
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS completed_onboarding BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'Pending';

-- 2. Update trigger to automatically populate new fields on auth signup
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

-- 3. Enhance RLS Policies for Profiles, Facilities, Doctors
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- 4. Storage Bucket Setup & Storage RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
CREATE POLICY "Users can upload their own documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND
        (auth.role() = 'authenticated')
    );

DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
CREATE POLICY "Users can view documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND
        (auth.role() = 'authenticated')
    );

DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
CREATE POLICY "Users can delete their own documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND
        (auth.uid()::text = (storage.foldername(name))[1] OR public.is_super_admin())
    );
