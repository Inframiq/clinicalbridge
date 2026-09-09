-- Migration 010: Enable Supabase Realtime on doctors and facilities
--
-- The super-admin approval dashboard only ever fetched doctors/facilities
-- once at app mount, so new or updated approval requests never appeared
-- without a hard refresh. Adding these tables to the realtime publication
-- lets the client subscribe to INSERT/UPDATE events and keep the dashboard
-- live. Existing RLS (auth.role() = 'authenticated', see
-- 006_ensure_rls_policies.sql) is already permissive enough for a logged-in
-- super-admin session to receive these events — no RLS changes needed here.

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.facilities;
EXCEPTION WHEN duplicate_object THEN null; END $$;
