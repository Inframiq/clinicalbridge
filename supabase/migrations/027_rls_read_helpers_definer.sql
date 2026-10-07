-- -----------------------------------------------------------------------------
-- Migration 027: Stop the migration 013 read policies from re-entering RLS.
--
-- The facilities and doctors SELECT policies call helpers that query each
-- other's tables as the caller, so every row checked re-applies the other
-- table's policy (facilities -> doctor_relates_to_facility -> doctors ->
-- facility_owns_or_relates_to_doctor -> facilities/applications -> ...).
-- departments, attendance_records and profiles inherit that cost through
-- their own EXISTS lookups on doctors/facilities.
--
-- Fix, without changing who can see what:
--   1. Both helpers become SECURITY DEFINER (like the owns_* helpers in 023),
--      so their lookups read the tables directly. Each lookup is already
--      pinned to auth.uid() - the caller's own doctor row or own facility -
--      which the caller could always see, so the result is unchanged.
--   2. The policies call auth.uid() / is_super_admin() through a scalar
--      sub-select, so Postgres evaluates them once per statement instead of
--      once per row, and the owner checks on departments/attendance use the
--      023 owns_* helpers instead of EXISTS lookups through doctors' RLS.
--
-- Idempotent: CREATE OR REPLACE for the helpers, DROP POLICY IF EXISTS before
-- each CREATE POLICY.
-- -----------------------------------------------------------------------------

-- ---------------------------------------------------------------- helpers ----

CREATE OR REPLACE FUNCTION public.facility_owns_or_relates_to_doctor(
    target_doctor_id UUID,
    target_facility_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        (target_facility_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.facilities f
            WHERE f.id = target_facility_id AND f.profile_id = auth.uid()
        ))
        OR EXISTS (
            SELECT 1 FROM public.applications a
            JOIN public.shifts s ON s.id = a.shift_id
            JOIN public.facilities f ON f.id = s.facility_id
            WHERE a.doctor_id = target_doctor_id AND f.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.shifts s
            JOIN public.facilities f ON f.id = s.facility_id
            WHERE s.assigned_doctor_id = target_doctor_id AND f.profile_id = auth.uid()
        );
$$;

CREATE OR REPLACE FUNCTION public.doctor_relates_to_facility(target_facility_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.doctors d
        WHERE d.profile_id = auth.uid()
          AND (
              d.facility_id = target_facility_id
              OR EXISTS (
                  SELECT 1 FROM public.applications a
                  JOIN public.shifts s ON s.id = a.shift_id
                  WHERE a.doctor_id = d.id AND s.facility_id = target_facility_id
              )
              OR EXISTS (
                  SELECT 1 FROM public.shifts s
                  WHERE s.assigned_doctor_id = d.id AND s.facility_id = target_facility_id
              )
          )
    );
$$;

-- --------------------------------------------------------------- policies ----

DROP POLICY IF EXISTS "Profiles viewable by self, related facility, or admin" ON public.profiles;
CREATE POLICY "Profiles viewable by self, related facility, or admin" ON public.profiles
    FOR SELECT USING (
        id = (SELECT auth.uid())
        OR (SELECT public.is_super_admin())
        OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.profile_id = profiles.id)
    );

DROP POLICY IF EXISTS "Facilities viewable by owner, related doctor, or admin" ON public.facilities;
CREATE POLICY "Facilities viewable by owner, related doctor, or admin" ON public.facilities
    FOR SELECT USING (
        profile_id = (SELECT auth.uid())
        OR (SELECT public.is_super_admin())
        OR public.doctor_relates_to_facility(id)
    );

DROP POLICY IF EXISTS "Doctors viewable by self, related facility, or admin" ON public.doctors;
CREATE POLICY "Doctors viewable by self, related facility, or admin" ON public.doctors
    FOR SELECT USING (
        profile_id = (SELECT auth.uid())
        OR (SELECT public.is_super_admin())
        OR public.facility_owns_or_relates_to_doctor(id, facility_id)
    );

DROP POLICY IF EXISTS "Departments viewable by facility owner, employed doctor, or admin" ON public.departments;
CREATE POLICY "Departments viewable by facility owner, employed doctor, or admin" ON public.departments
    FOR SELECT USING (
        (SELECT public.is_super_admin())
        OR public.owns_facility(facility_id)
        OR EXISTS (
            SELECT 1 FROM public.doctors
            WHERE facility_id = departments.facility_id AND profile_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Attendance viewable by doctor, facility owner, or admin" ON public.attendance_records;
CREATE POLICY "Attendance viewable by doctor, facility owner, or admin" ON public.attendance_records
    FOR SELECT USING (
        (SELECT public.is_super_admin())
        OR public.owns_doctor(replacement_doctor_id)
        OR public.owns_shift_facility(shift_id)
    );
