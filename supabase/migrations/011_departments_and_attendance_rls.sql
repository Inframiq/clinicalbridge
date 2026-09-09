-- -----------------------------------------------------------------------------
-- Migration 011: RLS policies for `departments` and `attendance_records`.
--
-- Both tables were created with RLS ENABLED in migration 001 but were never
-- given any policies — meaning every request to them (SELECT included) was
-- silently denied to every non-service-role caller. That's why the
-- departments feature never used real per-hospital records (it computed
-- everything from doctors/shifts instead) and why attendance/check-in never
-- got built: neither table was reachable from the app.
--
-- departments: viewable by any authenticated user (matches the existing
-- doctors/facilities/shifts convention); created/renamed/deleted only by the
-- facility that owns them, or a super admin.
--
-- attendance_records: viewable by any authenticated user; a doctor can
-- INSERT their own check-in and UPDATE their own record (check-out); the
-- facility that owns the shift can UPDATE it too (to verify attendance); a
-- super admin can do anything.
--
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Departments viewable by authenticated users" ON public.departments;
CREATE POLICY "Departments viewable by authenticated users" ON public.departments
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Departments manageable by facility owner" ON public.departments;
CREATE POLICY "Departments manageable by facility owner" ON public.departments
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.facilities WHERE id = departments.facility_id AND profile_id = auth.uid())
        OR public.is_super_admin()
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.facilities WHERE id = departments.facility_id AND profile_id = auth.uid())
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Attendance viewable by authenticated users" ON public.attendance_records;
CREATE POLICY "Attendance viewable by authenticated users" ON public.attendance_records
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Attendance insertable by the checking-in doctor" ON public.attendance_records;
CREATE POLICY "Attendance insertable by the checking-in doctor" ON public.attendance_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = attendance_records.replacement_doctor_id AND d.profile_id = auth.uid()
        )
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Attendance updatable by doctor or facility owner" ON public.attendance_records;
CREATE POLICY "Attendance updatable by doctor or facility owner" ON public.attendance_records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.doctors d
            WHERE d.id = attendance_records.replacement_doctor_id AND d.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.shifts s
            JOIN public.facilities f ON s.facility_id = f.id
            WHERE s.id = attendance_records.shift_id AND f.profile_id = auth.uid()
        )
        OR public.is_super_admin()
    );
