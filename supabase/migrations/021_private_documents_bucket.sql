-- -----------------------------------------------------------------------------
-- Migration 021: Make the `documents` bucket private.
--
-- The bucket holds medical licenses, government IDs and registration papers,
-- but migrations 002/012 created it with public = true and a SELECT policy of
-- "any authenticated user". That meant:
--   * anyone holding a file URL (browser history, a forwarded link, logs) could
--     open the document with no login at all, and
--   * any signed-in account could list/read every other account's documents.
--
-- After this migration the bucket is private and a document is readable only
-- by the account that uploaded it (first path segment = auth.uid(), which is
-- how uploadDocumentToStorage names files) or by a super admin. The app no
-- longer uses stored `publicUrl`s; it requests a short-lived signed URL per
-- preview (lib/supabase/storage.ts getSignedDocumentUrl), which Storage only
-- issues to callers that pass this SELECT policy.
--
-- Uploads are likewise pinned to the caller's own folder, so one account can
-- no longer write files into another account's folder.
--
-- Idempotent: safe to re-run.
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
CREATE POLICY "Users can view documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents'
        AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_super_admin())
    );

DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
CREATE POLICY "Users can upload their own documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- The UPDATE policy from 012 had no WITH CHECK, so an owner could move
-- (rename) their object into someone else's folder. Pin the new row too.
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
CREATE POLICY "Users can update their own documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents'
        AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_super_admin())
    )
    WITH CHECK (
        bucket_id = 'documents'
        AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_super_admin())
    );
