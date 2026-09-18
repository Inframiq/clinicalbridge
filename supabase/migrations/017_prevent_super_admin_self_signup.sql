-- -----------------------------------------------------------------------------
-- Migration 017: Close the super-admin self-signup privilege escalation.
--
-- `handle_new_user()` (migration 005, re-issued unchanged by 007) trusted
-- `NEW.raw_user_meta_data->>'role'` completely:
--
--   COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'locum_tenens'::public.user_role)
--
-- `raw_user_meta_data` is the `options.data` object the *client* passes to
-- `supabase.auth.signUp()` - it is attacker-controlled. Since `'super_admin'`
-- is a valid `public.user_role` label, any anonymous visitor could call
-- `supabase.auth.signUp({ email, password, options: { data: { role: 'super_admin' } } })`
-- directly (browser console, curl, no auth token beyond the public anon key)
-- and this SECURITY DEFINER trigger would insert a `profiles` row with
-- `role = 'super_admin'`, bypassing RLS entirely and unlocking every
-- `is_super_admin()`-gated policy plus the whole /super-admin surface.
--
-- Two independent fixes, so a hole in either alone can't reopen this:
--
--   1. `handle_new_user()` now only accepts the three self-serve roles from
--      metadata; anything else (missing, malformed, or 'super_admin') falls
--      back to 'locum_tenens'. This is the trigger every signup goes through,
--      so it closes the hole regardless of which client code path is used.
--      On an `ON CONFLICT` re-fire it now leaves `role` untouched instead of
--      overwriting it, so it can never downgrade an admin-promoted account
--      back to whatever a stale signup payload originally requested.
--
--   2. The `profiles` INSERT policy gets a `WITH CHECK` that blocks a
--      self-row-insert (`auth.uid() = id`) from ever setting
--      `role = 'super_admin'`. The trigger above is SECURITY DEFINER and
--      bypasses RLS, so this doesn't affect it - it only closes the same hole
--      for any *client*-issued insert (e.g. the `auth-provider.tsx` fallback
--      upsert this migration's companion app fix already restricts, or any
--      future direct-insert code path), which had no column-level check at
--      all before this.
--
-- Promoting an account to super_admin must only ever be done by an existing
-- super admin (an UPDATE, which is already guarded by the
-- `guard_privileged_profile_update` trigger from migration 012), never by
-- self-signup.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    requested_role text := NEW.raw_user_meta_data ->> 'role';
    safe_role public.user_role;
BEGIN
    IF requested_role IN ('hospital', 'working_doctor', 'locum_tenens') THEN
        safe_role := requested_role::public.user_role;
    ELSE
        safe_role := 'locum_tenens'::public.user_role;
    END IF;

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
        safe_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        FALSE,
        FALSE,
        'Pending'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
        -- role deliberately not touched here - see header.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- profiles INSERT policy: add the same allowlist as a WITH CHECK, so a
-- client-issued self-insert (auth.uid() = id) can never claim super_admin
-- either, independent of the trigger above.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        (auth.uid() = id AND role <> 'super_admin'::public.user_role)
        OR public.is_super_admin()
    );
