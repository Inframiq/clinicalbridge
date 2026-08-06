-- Migration 003: Remove automatic auth trigger
-- We are now handling profile creation manually in the application code
-- (e.g., inside auth-provider.tsx) to provide better error handling and 
-- to decouple the auth signup from the database insertion.

-- Drop the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.handle_new_user();
