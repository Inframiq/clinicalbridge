-- -----------------------------------------------------------------------------
-- Migration 024: Append-only audit log.
--
-- Records who changed what on the records that matter for trust and money:
--   * every change a super admin makes to profiles, doctors or facilities
--     (approvals, rejections, checklist ticks, per-document decisions, the
--     "viewed" stamp on a document - i.e. who looked at whose credentials);
--   * every payout status change, by anyone;
--   * account deletions / anonymisations (migration 025).
--
-- Written only by SECURITY DEFINER triggers/functions, never by the client:
-- there is no INSERT/UPDATE/DELETE policy, so even a super admin cannot edit
-- or erase history through the API. Readable by super admins only.
--
-- Idempotent: safe to re-run.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- NULL when the change came from a server-side context (service role,
    -- SQL editor, scheduled job).
    actor_id UUID,
    actor_role TEXT,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id TEXT,
    -- { column: { "old": ..., "new": ... } } for updates; free-form otherwise.
    changes JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS audit_log_occurred_at_idx ON public.audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON public.audit_log (target_table, target_id);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log (actor_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit log readable by super admins" ON public.audit_log;
CREATE POLICY "Audit log readable by super admins" ON public.audit_log
    FOR SELECT USING (public.is_super_admin());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.write_audit(
    p_action text, p_table text, p_target text, p_changes jsonb
) RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    INSERT INTO public.audit_log (actor_id, actor_role, action, target_table, target_id, changes)
    VALUES (
        auth.uid(),
        (SELECT role::text FROM public.profiles WHERE id = auth.uid()),
        p_action, p_table, p_target, coalesce(p_changes, '{}'::jsonb)
    );
$$;
REVOKE EXECUTE ON FUNCTION public.write_audit(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- { col: {old, new} } for every column whose value changed.
CREATE OR REPLACE FUNCTION public.row_diff(old_row jsonb, new_row jsonb)
RETURNS jsonb
LANGUAGE sql IMMUTABLE
AS $$
    SELECT coalesce(jsonb_object_agg(n.key, jsonb_build_object('old', old_row->n.key, 'new', n.value)), '{}'::jsonb)
    FROM jsonb_each(new_row) n
    WHERE (old_row->n.key) IS DISTINCT FROM n.value;
$$;

-- Admin actions on accounts / verification.
CREATE OR REPLACE FUNCTION public.audit_admin_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    diff jsonb;
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN NULL;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        diff := public.row_diff(to_jsonb(OLD), to_jsonb(NEW));
        IF diff = '{}'::jsonb THEN RETURN NULL; END IF;
        PERFORM public.write_audit('admin_update', TG_TABLE_NAME, NEW.id::text, diff);
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM public.write_audit('admin_insert', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    ELSE
        PERFORM public.write_audit('admin_delete', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_admin_change ON public.profiles;
CREATE TRIGGER audit_admin_change AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
DROP TRIGGER IF EXISTS audit_admin_change ON public.doctors;
CREATE TRIGGER audit_admin_change AFTER INSERT OR UPDATE OR DELETE ON public.doctors
    FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
DROP TRIGGER IF EXISTS audit_admin_change ON public.facilities;
CREATE TRIGGER audit_admin_change AFTER INSERT OR UPDATE OR DELETE ON public.facilities
    FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();

-- Money: every payout status change, whoever makes it.
CREATE OR REPLACE FUNCTION public.audit_payout_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM public.write_audit('payout_status', 'payouts', NEW.id::text,
            public.row_diff(to_jsonb(OLD), to_jsonb(NEW)));
    END IF;
    RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS audit_payout_status ON public.payouts;
CREATE TRIGGER audit_payout_status AFTER UPDATE ON public.payouts
    FOR EACH ROW EXECUTE FUNCTION public.audit_payout_status();
