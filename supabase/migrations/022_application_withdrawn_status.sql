-- -----------------------------------------------------------------------------
-- Migration 022: Add 'withdrawn' to application_status.
--
-- The app's Application type and the locum "Withdraw" button use the status
-- 'withdrawn', but the enum only had 'cancelled', so every withdrawal was
-- rejected by Postgres ("invalid input value for enum") and rolled back in the
-- UI with an error toast.
--
-- Kept in its own migration: a value added with ALTER TYPE ... ADD VALUE
-- cannot be used in the same transaction, and 023's guards reference it.
-- -----------------------------------------------------------------------------

ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'withdrawn';
