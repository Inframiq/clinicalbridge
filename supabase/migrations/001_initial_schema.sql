-- LocumTenens Platform (ClinicalBridge) Database Schema
-- Migration 001: Core Tables, Enums, Triggers, and RLS Policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('hospital', 'working_doctor', 'locum_doctor', 'intern', 'super_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE doctor_kind AS ENUM ('working', 'locum', 'intern');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE shift_status AS ENUM ('open', 'active', 'pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE replacement_request_status AS ENUM ('pending', 'approved', 'rejected', 'filled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE replacement_stage AS ENUM ('locum_only', 'open_to_intern');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('applied', 'in_review', 'shortlisted', 'accepted', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM ('pending_approval', 'approved', 'payment_processed', 'disputed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- -----------------------------------------------------------------------------
-- 1. PROFILES (Linked to Supabase auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'locum_doctor',
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. HOSPITALS / FACILITIES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    registration_number TEXT,
    government_license TEXT,
    hospital_type TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    verification_status JSONB DEFAULT '{"governmentRegistration": false, "medicalLicense": false, "taxRegistration": false, "accreditation": false, "authorizedSignatory": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. DEPARTMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_doctors INT DEFAULT 0,
    available_doctors INT DEFAULT 0,
    on_leave_doctors INT DEFAULT 0,
    vacant_positions INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. DOCTORS (Working, Locum, Intern)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_kind doctor_kind NOT NULL DEFAULT 'locum',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    sub_specialty TEXT,
    license_number TEXT,
    license_expiry DATE,
    npi_number TEXT,
    years_of_experience TEXT,
    employment_type TEXT DEFAULT 'Independent / Locum',
    facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    preferred_locations TEXT[],
    preferred_departments TEXT[],
    max_travel_distance_miles INT DEFAULT 25,
    max_hours_per_week INT DEFAULT 40,
    available_days TEXT[],
    rating NUMERIC(3,2) DEFAULT 5.00,
    review_count INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    verification_details JSONB DEFAULT '{"medicalCouncil": false, "degree": false, "identity": false, "hospitalApproval": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. SHIFTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    department_name TEXT NOT NULL,
    facility_name TEXT NOT NULL,
    location JSONB DEFAULT '{}'::jsonb,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    shift_type TEXT NOT NULL,
    sub_specialty TEXT,
    hourly_rate NUMERIC(10,2) NOT NULL,
    doctors_needed INT DEFAULT 1,
    experience_level TEXT DEFAULT 'Mid Level+',
    description TEXT,
    status shift_status DEFAULT 'open',
    code_red BOOLEAN DEFAULT FALSE,
    assigned_doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    replacement_stage replacement_stage DEFAULT 'locum_only',
    required_qualification TEXT,
    supervisor_name TEXT,
    emergency_contact TEXT,
    intern_supervision_required BOOLEAN DEFAULT FALSE,
    application_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. REPLACEMENT REQUESTS (Staged Workflow)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.replacement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    requesting_doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    preferred_replacement_type TEXT NOT NULL DEFAULT 'Both',
    hourly_compensation NUMERIC(10,2) NOT NULL,
    notes TEXT,
    status replacement_request_status DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 7. APPLICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    status application_status DEFAULT 'applied',
    match_score_pct INT DEFAULT 85,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_doctor_shift_application UNIQUE(shift_id, doctor_id)
);

-- -----------------------------------------------------------------------------
-- 8. ATTENDANCE & CHECK-IN TRACKING
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    replacement_doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    verified_by_profile_id UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    status TEXT DEFAULT 'checked_in'
);

-- -----------------------------------------------------------------------------
-- 9. PAYOUTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    hours NUMERIC(5,2) NOT NULL,
    hourly_rate NUMERIC(10,2) NOT NULL,
    gross_pay NUMERIC(10,2) NOT NULL,
    platform_fee_pct NUMERIC(5,2) DEFAULT 10.00,
    net_payout NUMERIC(10,2) NOT NULL,
    status payout_status DEFAULT 'pending_approval',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 10. RATINGS & REVIEWS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    direction TEXT NOT NULL, -- 'hospital_to_doctor' or 'doctor_to_hospital'
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    categories JSONB DEFAULT '{}'::jsonb,
    overall_score NUMERIC(3,2) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. NOTIFICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- TRIGGER: Automatically Create Profile on Signup
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'locum_doctor'::user_role),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replacement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- General access policies
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Facilities are viewable by authenticated users" ON public.facilities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Facilities editable by facility owner" ON public.facilities FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Doctors viewable by authenticated users" ON public.doctors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Doctors editable by owner" ON public.doctors FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Shifts viewable by authenticated users" ON public.shifts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Shifts manageable by facility" ON public.shifts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.facilities WHERE id = shifts.facility_id AND profile_id = auth.uid())
);

CREATE POLICY "Applications viewable by applicant or facility owner" ON public.applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.doctors WHERE id = applications.doctor_id AND profile_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.shifts s JOIN public.facilities f ON s.facility_id = f.id WHERE s.id = applications.shift_id AND f.profile_id = auth.uid())
);

CREATE POLICY "Doctors can submit applications" ON public.applications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.doctors WHERE id = applications.doctor_id AND profile_id = auth.uid())
);

CREATE POLICY "Notifications viewable by target user" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
