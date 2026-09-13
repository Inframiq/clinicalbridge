-- -----------------------------------------------------------------------------
-- Migration 016: Indexes for the foreign-key columns the RLS policies added in
-- migrations 011-014 filter on.
--
-- Those policies scope reads down to "the owner, a related facility/doctor, or
-- admin" via correlated EXISTS subqueries (e.g. "does a doctor exist with this
-- profile_id and facility_id", "does an application exist joining doctor_id to
-- shift_id to facility_id"). None of the columns those subqueries filter on
-- were ever indexed - not even the ones introduced back in migration 001 - so
-- every one of those checks was a sequential scan, evaluated per row of the
-- outer query and further multiplied by the profiles<->doctors policy
-- cross-reference (reading profiles evaluates the doctors policy, which
-- evaluates the facilities/applications/shifts policies). That's what was
-- surfacing as `getAttendanceRecords`/`getDepartments`/`getFacilities`/
-- `getDoctors` failing with Postgres error 57014 ("canceling statement due to
-- statement timeout") on plain `select *` calls.
--
-- Purely additive and safe to run any time: adds indexes only, changes no
-- policy logic or access rules.
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS facilities_profile_id_idx ON public.facilities (profile_id);

CREATE INDEX IF NOT EXISTS departments_facility_id_idx ON public.departments (facility_id);

CREATE INDEX IF NOT EXISTS doctors_profile_id_idx ON public.doctors (profile_id);
CREATE INDEX IF NOT EXISTS doctors_facility_id_idx ON public.doctors (facility_id);

CREATE INDEX IF NOT EXISTS shifts_facility_id_idx ON public.shifts (facility_id);
CREATE INDEX IF NOT EXISTS shifts_assigned_doctor_id_idx ON public.shifts (assigned_doctor_id);

-- applications has a UNIQUE(shift_id, doctor_id) constraint from migration 001,
-- which already indexes shift_id as its leading column - doctor_id alone
-- (used by the applicant-side RLS checks) needs its own index.
CREATE INDEX IF NOT EXISTS applications_doctor_id_idx ON public.applications (doctor_id);

CREATE INDEX IF NOT EXISTS attendance_records_shift_id_idx ON public.attendance_records (shift_id);
CREATE INDEX IF NOT EXISTS attendance_records_replacement_doctor_id_idx ON public.attendance_records (replacement_doctor_id);

CREATE INDEX IF NOT EXISTS replacement_requests_shift_id_idx ON public.replacement_requests (shift_id);
CREATE INDEX IF NOT EXISTS replacement_requests_requesting_doctor_id_idx ON public.replacement_requests (requesting_doctor_id);

CREATE INDEX IF NOT EXISTS payouts_shift_id_idx ON public.payouts (shift_id);
CREATE INDEX IF NOT EXISTS payouts_doctor_id_idx ON public.payouts (doctor_id);
CREATE INDEX IF NOT EXISTS payouts_facility_id_idx ON public.payouts (facility_id);

CREATE INDEX IF NOT EXISTS ratings_shift_id_idx ON public.ratings (shift_id);
CREATE INDEX IF NOT EXISTS ratings_doctor_id_idx ON public.ratings (doctor_id);
CREATE INDEX IF NOT EXISTS ratings_facility_id_idx ON public.ratings (facility_id);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);

-- saved_shifts has UNIQUE(doctor_id, shift_id) from migration 008, which
-- already indexes doctor_id as its leading column - no further index needed.

CREATE INDEX IF NOT EXISTS message_threads_participant_one_idx ON public.message_threads (participant_one);
CREATE INDEX IF NOT EXISTS message_threads_participant_two_idx ON public.message_threads (participant_two);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages (sender_id);
