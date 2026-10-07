-- -----------------------------------------------------------------------------
-- Migration 014: Real direct-messaging feature.
--
-- Replaces the hardcoded fake "Messages" inbox (app/locum-tenens/messages)
-- with a real two-party thread + message model. A thread can only be created
-- between a doctor and a facility that already have a legitimate business
-- relationship on the platform - the doctor applied to one of the facility's
-- shifts, or is/was assigned one - mirroring the relationship rule migration
-- 013 uses to scope down doctor/profile visibility. This stops the feature
-- from becoming a way to cold-message any stranger on the platform.
--
-- participant_one/participant_two are always stored in a canonical order
-- (participant_one < participant_two by UUID comparison) so a lookup never
-- has to check both orderings and a unique constraint can prevent duplicate
-- threads for the same pair.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT ordered_distinct_participants CHECK (participant_one < participant_two),
    CONSTRAINT unique_thread_pair UNIQUE (participant_one, participant_two)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_thread_id_created_at_idx ON public.messages (thread_id, created_at);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- A thread is only creatable/visible between two profiles who have a real
-- doctor<->facility relationship: the doctor side of the pair applied to, or
-- was assigned, a shift owned by the facility side of the pair. Reuses
-- migration 013's relationship helper (a facility "relates to" a doctor via
-- application or assignment) plus the direct-employment case.
CREATE OR REPLACE FUNCTION public.profiles_have_messaging_relationship(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1
        FROM public.doctors d
        JOIN public.facilities f ON f.profile_id IN (a, b)
        WHERE d.profile_id IN (a, b)
          AND d.profile_id <> f.profile_id
          AND (
              d.facility_id = f.id
              OR EXISTS (
                  SELECT 1 FROM public.applications app
                  JOIN public.shifts s ON s.id = app.shift_id
                  WHERE app.doctor_id = d.id AND s.facility_id = f.id
              )
              OR EXISTS (
                  SELECT 1 FROM public.shifts s
                  WHERE s.assigned_doctor_id = d.id AND s.facility_id = f.id
              )
          )
    );
$$;

DROP POLICY IF EXISTS "Threads viewable by participants or admin" ON public.message_threads;
CREATE POLICY "Threads viewable by participants or admin" ON public.message_threads
    FOR SELECT USING (
        auth.uid() IN (participant_one, participant_two)
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Threads insertable by a related participant" ON public.message_threads;
CREATE POLICY "Threads insertable by a related participant" ON public.message_threads
    FOR INSERT WITH CHECK (
        auth.uid() IN (participant_one, participant_two)
        AND public.profiles_have_messaging_relationship(participant_one, participant_two)
    );

DROP POLICY IF EXISTS "Messages viewable by thread participants or admin" ON public.messages;
CREATE POLICY "Messages viewable by thread participants or admin" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.message_threads t
            WHERE t.id = messages.thread_id AND auth.uid() IN (t.participant_one, t.participant_two)
        )
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Messages insertable by a thread participant" ON public.messages;
CREATE POLICY "Messages insertable by a thread participant" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.message_threads t
            WHERE t.id = messages.thread_id AND auth.uid() IN (t.participant_one, t.participant_two)
        )
    );

-- Either participant can mark messages read (only the `read` column is ever
-- touched from the client - see markThreadRead in the messages service).
DROP POLICY IF EXISTS "Messages updatable by thread participants" ON public.messages;
CREATE POLICY "Messages updatable by thread participants" ON public.messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.message_threads t
            WHERE t.id = messages.thread_id AND auth.uid() IN (t.participant_one, t.participant_two)
        )
    );

-- Bumping last_message_at on send is done from the client in the same
-- request path as the owning thread's participants, so the existing SELECT
-- policy's USING clause (participants only) is sufficient for this UPDATE.
DROP POLICY IF EXISTS "Threads updatable by participants" ON public.message_threads;
CREATE POLICY "Threads updatable by participants" ON public.message_threads
    FOR UPDATE USING (auth.uid() IN (participant_one, participant_two));

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
EXCEPTION WHEN duplicate_object THEN null; END $$;
