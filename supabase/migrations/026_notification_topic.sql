-- -----------------------------------------------------------------------------
-- Migration 026: Tag notifications with a preference topic.
--
-- Each Settings page stores per-topic toggles in
-- profiles.notification_preferences (migration 020), keyed like
-- "shift-invites" or "shift-status". Recording the topic on the notification
-- lets the email sender (supabase/functions/send-notification-email) skip
-- topics the recipient has switched off. NULL = no topic (always delivered).
-- -----------------------------------------------------------------------------

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS topic TEXT;
