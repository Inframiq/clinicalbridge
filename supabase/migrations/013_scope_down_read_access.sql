-- -----------------------------------------------------------------------------
-- Migration 013: Scope down SELECT access that migrations 001-012 left as
-- "any authenticated user can read every row" across profiles, facilities,
-- doctors, departments, replacement_requests, payouts, ratings and
-- attendance_records.
--
-- Under that broad policy, any doctor or hospital admin could read every
-- other hospital's facility record (registration numbers, verification
-- status), every other doctor's profile (email, phone), every hospital's
-- internal department roster, and every payout/rating/attendance/replacement
-- record on the platform. This migration narrows each of those to the
-- parties who actually have a relationship to the row: the owner, a facility
-- the doctor is employed by or has applied to / been assigned a shift at,
-- or a super admin.
--
-- Deliberately UNCHANGED:
--   - shifts: stays viewable by any authenticated user. This is the open
--     marketplace listing that the whole product is built around - a
--     hospital broadcasts a shift so every doctor on the platform can see
--     and apply to it. Restricting this would break the core feature.
--   - applications: already scoped to the applicant or the shift's facility
--     owner since migration 001; no change needed.
--   - notifications / saved_shifts: already scoped to their owning user
--     since migrations 001 / 008; no change needed.
--
-- Depends on migration 012 (is_super_admin(), and the doctors/applications/
-- shifts INSERT/UPDATE policies referenced by the EXISTS checks below).
--
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY; the helper
-- function uses CREATE OR REPLACE.
-- -----------------------------------------------------------------------------

-- Helper: does the CURRENT caller own a facility related to this doctor -
-- either as the doctor's employer (doctors.facility_id), or as the facility
-- that owns a shift this doctor applied to, or as the facility that owns a
-- shift this doctor is currently assigned to? Takes the doctor's own `id`
-- and `facility_id` directly (as columns of the row already being tested by
-- the calling policy) rather than re-querying `public.doctors`, so this
-- never recurses back into the doctors table's own RLS policy.
CREATE OR REPLACE FUNCTION public.facility_owns_or_relates_to_doctor(
    target_doctor_id UUID,
    target_facility_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
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

-- profiles: self, a related facility (via the doctor row this profile owns,
-- gated by the doctors policy below), or admin. Facility contact fields
-- (email/phone) already live on public.facilities itself, so no facility-side
-- equivalent lookup is needed here.
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self, related facility, or admin" ON public.profiles;
CREATE POLICY "Profiles viewable by self, related facility, or admin" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
        OR public.is_super_admin()
        OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.profile_id = profiles.id)
    );

-- Helper: does the CALLER (as a doctor) have a relationship to this facility -
-- employed there, applied to one of its shifts, or assigned to one of its
-- shifts? Mirrors facility_owns_or_relates_to_doctor in the opposite
-- direction. Looks up the caller's own doctor row (always visible to them
-- under the doctors policy's self branch), so this never recurses through
-- the facilities policy that calls it.
CREATE OR REPLACE FUNCTION public.doctor_relates_to_facility(target_facility_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
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

-- facilities: the owner, admin, or a doctor with a real relationship to the
-- facility (employed there, applied to, or assigned one of its shifts) - the
-- marketplace itself still reads facility name/location off the denormalized
-- columns on `shifts`, this only covers direct facilities-table lookups such
-- as the messaging thread list showing who a doctor is talking to.
DROP POLICY IF EXISTS "Facilities are viewable by authenticated users" ON public.facilities;
DROP POLICY IF EXISTS "Facilities viewable by owner or admin" ON public.facilities;
DROP POLICY IF EXISTS "Facilities viewable by owner, related doctor, or admin" ON public.facilities;
CREATE POLICY "Facilities viewable by owner, related doctor, or admin" ON public.facilities
    FOR SELECT USING (
        auth.uid() = profile_id
        OR public.is_super_admin()
        OR public.doctor_relates_to_facility(id)
    );

-- doctors: self, a related facility (employer, applied-to, or assigned-to),
-- or admin.
DROP POLICY IF EXISTS "Doctors viewable by authenticated users" ON public.doctors;
DROP POLICY IF EXISTS "Doctors viewable by self, related facility, or admin" ON public.doctors;
CREATE POLICY "Doctors viewable by self, related facility, or admin" ON public.doctors
    FOR SELECT USING (
        auth.uid() = profile_id
        OR public.is_super_admin()
        OR public.facility_owns_or_relates_to_doctor(id, facility_id)
    );

-- departments: the owning facility, a doctor employed there, or admin.
-- Doctors browsing the marketplace never need this - shifts already carry
-- department_name directly.
DROP POLICY IF EXISTS "Departments viewable by authenticated users" ON public.departments;
DROP POLICY IF EXISTS "Departments viewable by facility owner, employed doctor, or admin" ON public.departments;
CREATE POLICY "Departments viewable by facility owner, employed doctor, or admin" ON public.departments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.facilities WHERE id = departments.facility_id AND profile_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.doctors WHERE facility_id = departments.facility_id AND profile_id = auth.uid())
        OR public.is_super_admin()
    );

-- replacement_requests: the requesting doctor, the facility that owns the
-- shift, or admin.
DROP POLICY IF EXISTS "Replacement requests viewable by authenticated users" ON public.replacement_requests;
DROP POLICY IF EXISTS "Replacement requests viewable by requester, facility owner, or admin" ON public.replacement_requests;
CREATE POLICY "Replacement requests viewable by requester, facility owner, or admin" ON public.replacement_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = replacement_requests.requesting_doctor_id AND profile_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.shifts s
            JOIN public.facilities f ON s.facility_id = f.id
            WHERE s.id = replacement_requests.shift_id AND f.profile_id = auth.uid()
        )
        OR public.is_super_admin()
    );

-- payouts: the doctor being paid, the facility paying, or admin.
DROP POLICY IF EXISTS "Payouts viewable by authenticated users" ON public.payouts;
DROP POLICY IF EXISTS "Payouts viewable by doctor, facility, or admin" ON public.payouts;
CREATE POLICY "Payouts viewable by doctor, facility, or admin" ON public.payouts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = payouts.doctor_id AND profile_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.facilities WHERE id = payouts.facility_id AND profile_id = auth.uid())
        OR public.is_super_admin()
    );

-- ratings: the doctor being reviewed, the facility on either side of the
-- review, or admin. The aggregate doctors.rating/review_count columns stay
-- visible per the doctors policy above; this only gates the underlying
-- per-review rows (which can carry a free-text comment).
DROP POLICY IF EXISTS "Ratings viewable by authenticated users" ON public.ratings;
DROP POLICY IF EXISTS "Ratings viewable by doctor, facility, or admin" ON public.ratings;
CREATE POLICY "Ratings viewable by doctor, facility, or admin" ON public.ratings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = ratings.doctor_id AND profile_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.facilities WHERE id = ratings.facility_id AND profile_id = auth.uid())
        OR public.is_super_admin()
    );

-- attendance_records: the checking-in doctor, the facility that owns the
-- shift, or admin.
DROP POLICY IF EXISTS "Attendance viewable by authenticated users" ON public.attendance_records;
DROP POLICY IF EXISTS "Attendance viewable by doctor, facility owner, or admin" ON public.attendance_records;
CREATE POLICY "Attendance viewable by doctor, facility owner, or admin" ON public.attendance_records
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = attendance_records.replacement_doctor_id AND profile_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.shifts s
            JOIN public.facilities f ON s.facility_id = f.id
            WHERE s.id = attendance_records.shift_id AND f.profile_id = auth.uid()
        )
        OR public.is_super_admin()
    );
