-- -----------------------------------------------------------------------------
-- Migration 020: Persist notification preferences.
--
-- Every role's Settings page has a "Notification Preferences" panel of
-- per-topic toggles (e.g. "New shift applications", "Payment updates"), but
-- the topic keys and defaults differ per role and the whole thing was
-- previously local-only React state - "Save Preferences" just showed a
-- success toast and threw the choice away on reload. One generic JSONB
-- column on `profiles` covers every role's toggle map without needing a
-- role-specific schema: each Settings page already owns its own set of
-- topic keys and defaults client-side, this column just needs to round-trip
-- whatever object that page sends.
--
-- No extra guard needed: a user setting their own notification preferences
-- is exactly the self-service case the existing "auth.uid() = id OR
-- is_super_admin()" UPDATE policy on profiles (migration 002) already
-- allows, and the privileged-column guard trigger (migration 012) only
-- blocks role/verified/verification_status, not this column.
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
