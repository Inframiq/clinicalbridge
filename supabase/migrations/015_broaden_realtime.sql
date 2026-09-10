-- -----------------------------------------------------------------------------
-- Migration 015: Add the remaining data tables to the realtime publication.
--
-- Migration 010 only added doctors/facilities (for the super-admin approval
-- dashboard). Every other table - shifts, applications, replacement_requests,
-- payouts, ratings, departments, attendance_records, notifications - was
-- still fetched once on login with no live updates, so e.g. a doctor's new
-- application never appeared on a hospital's already-open dashboard without
-- a manual reload. RLS already scopes what each connected client actually
-- receives from these publications (see migrations 012/013), so this is safe
-- to broaden without changing who can see what.
-- -----------------------------------------------------------------------------

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.replacement_requests;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payouts;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN null; END $$;
