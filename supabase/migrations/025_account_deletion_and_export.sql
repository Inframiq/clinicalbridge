-- -----------------------------------------------------------------------------
-- Migration 025: Self-service account deletion and data export.
--
-- export_my_data()    Everything the platform holds about the caller, as one
--                     JSON document (right of access / portability).
--
-- delete_my_account() Right to erasure, without destroying records other
--                     people rely on:
--   * No working history (no payouts, attendance, ratings or assigned
--     shifts): the auth user is deleted and every row cascades away.
--   * With history: personal data is scrubbed from profiles / doctors /
--     facilities, open shifts and pending applications are closed, sign-in
--     is disabled and sessions revoked - but payouts, ratings and attendance
--     stay intact for the counter-party and for financial record-keeping.
--   The caller's uploaded files must be removed through the Storage API
--   BEFORE calling this (the app does that); deleting storage.objects rows
--   from SQL would orphan the files themselves.
--
-- Both run as the signed-in user only. The super admin account cannot be
-- deleted this way.
--
-- Idempotent: safe to re-run.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    uid uuid := auth.uid();
    doctor_ids uuid[];
    facility_ids uuid[];
    thread_ids uuid[];
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Not signed in';
    END IF;

    SELECT coalesce(array_agg(id), '{}') INTO doctor_ids FROM public.doctors WHERE profile_id = uid;
    SELECT coalesce(array_agg(id), '{}') INTO facility_ids FROM public.facilities WHERE profile_id = uid;
    SELECT coalesce(array_agg(id), '{}') INTO thread_ids FROM public.message_threads
        WHERE participant_one = uid OR participant_two = uid;

    RETURN jsonb_build_object(
        'exported_at', now(),
        'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = uid),
        'doctor_records', (SELECT coalesce(jsonb_agg(d), '[]') FROM public.doctors d WHERE d.id = ANY (doctor_ids)),
        'facilities', (SELECT coalesce(jsonb_agg(f), '[]') FROM public.facilities f WHERE f.id = ANY (facility_ids)),
        'departments', (SELECT coalesce(jsonb_agg(x), '[]') FROM public.departments x WHERE x.facility_id = ANY (facility_ids)),
        'shifts', (SELECT coalesce(jsonb_agg(s), '[]') FROM public.shifts s
                   WHERE s.facility_id = ANY (facility_ids) OR s.assigned_doctor_id = ANY (doctor_ids)),
        'applications', (SELECT coalesce(jsonb_agg(a), '[]') FROM public.applications a WHERE a.doctor_id = ANY (doctor_ids)),
        'saved_shifts', (SELECT coalesce(jsonb_agg(x), '[]') FROM public.saved_shifts x WHERE x.doctor_id = ANY (doctor_ids)),
        'replacement_requests', (SELECT coalesce(jsonb_agg(r), '[]') FROM public.replacement_requests r
                                 WHERE r.requesting_doctor_id = ANY (doctor_ids)),
        'attendance_records', (SELECT coalesce(jsonb_agg(x), '[]') FROM public.attendance_records x
                               WHERE x.replacement_doctor_id = ANY (doctor_ids)),
        'payouts', (SELECT coalesce(jsonb_agg(x), '[]') FROM public.payouts x
                    WHERE x.doctor_id = ANY (doctor_ids) OR x.facility_id = ANY (facility_ids)),
        'ratings', (SELECT coalesce(jsonb_agg(x), '[]') FROM public.ratings x
                    WHERE x.doctor_id = ANY (doctor_ids) OR x.facility_id = ANY (facility_ids)),
        'notifications', (SELECT coalesce(jsonb_agg(n), '[]') FROM public.notifications n WHERE n.user_id = uid),
        'message_threads', (SELECT coalesce(jsonb_agg(t), '[]') FROM public.message_threads t WHERE t.id = ANY (thread_ids)),
        'messages', (SELECT coalesce(jsonb_agg(m ORDER BY m.created_at), '[]') FROM public.messages m WHERE m.thread_id = ANY (thread_ids))
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    uid uuid := auth.uid();
    doctor_ids uuid[];
    facility_ids uuid[];
    has_history boolean;
    placeholder_email text;
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Not signed in';
    END IF;
    IF public.is_super_admin() THEN
        RAISE EXCEPTION 'The super admin account cannot be deleted from the app';
    END IF;

    SELECT coalesce(array_agg(id), '{}') INTO doctor_ids FROM public.doctors WHERE profile_id = uid;
    SELECT coalesce(array_agg(id), '{}') INTO facility_ids FROM public.facilities WHERE profile_id = uid;

    has_history :=
        EXISTS (SELECT 1 FROM public.payouts WHERE doctor_id = ANY (doctor_ids) OR facility_id = ANY (facility_ids))
        OR EXISTS (SELECT 1 FROM public.ratings WHERE doctor_id = ANY (doctor_ids) OR facility_id = ANY (facility_ids))
        OR EXISTS (SELECT 1 FROM public.attendance_records a
                   LEFT JOIN public.shifts s ON s.id = a.shift_id
                   WHERE a.replacement_doctor_id = ANY (doctor_ids) OR s.facility_id = ANY (facility_ids)
                      OR a.verified_by_profile_id = uid)
        OR EXISTS (SELECT 1 FROM public.shifts
                   WHERE assigned_doctor_id = ANY (doctor_ids)
                      OR (facility_id = ANY (facility_ids) AND assigned_doctor_id IS NOT NULL));

    IF NOT has_history THEN
        PERFORM public.write_audit('account_deleted', 'profiles', uid::text, '{}'::jsonb);
        DELETE FROM auth.users WHERE id = uid;
        RETURN 'deleted';
    END IF;

    placeholder_email := 'deleted+' || uid::text || '@deleted.invalid';

    UPDATE public.profiles SET
        full_name = 'Deleted user',
        email = placeholder_email,
        phone = NULL,
        avatar_url = NULL,
        notification_preferences = '{}'::jsonb
    WHERE id = uid;

    UPDATE public.doctors SET
        first_name = 'Deleted',
        last_name = 'user',
        license_number = NULL,
        license_expiry = NULL,
        npi_number = NULL,
        preferred_locations = '{}',
        preferred_departments = '{}',
        available_days = '{}',
        uploaded_documents = '{}'::jsonb,
        certifications = '{}'::jsonb
    WHERE id = ANY (doctor_ids);

    -- A hospital is a business, so its name stays on past shifts and
    -- payouts; the named contact person and their details go.
    UPDATE public.facilities SET
        contact_person = NULL,
        email = NULL,
        phone = NULL,
        uploaded_documents = '{}'::jsonb
    WHERE id = ANY (facility_ids);

    UPDATE public.shifts SET status = 'cancelled'
    WHERE facility_id = ANY (facility_ids) AND status IN ('open', 'pending');

    UPDATE public.applications SET status = 'withdrawn'
    WHERE doctor_id = ANY (doctor_ids) AND status IN ('applied', 'in_review', 'shortlisted');

    DELETE FROM public.saved_shifts WHERE doctor_id = ANY (doctor_ids);
    DELETE FROM public.notifications WHERE user_id = uid;

    -- Disable sign-in: free the email address, drop the password and every
    -- linked identity / session, and ban the user indefinitely.
    UPDATE auth.users SET
        email = placeholder_email,
        encrypted_password = NULL,
        phone = NULL,
        raw_user_meta_data = '{}'::jsonb,
        banned_until = 'infinity'
    WHERE id = uid;
    DELETE FROM auth.identities WHERE user_id = uid;
    DELETE FROM auth.sessions WHERE user_id = uid;

    PERFORM public.write_audit('account_anonymised', 'profiles', uid::text, '{}'::jsonb);
    RETURN 'anonymised';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
