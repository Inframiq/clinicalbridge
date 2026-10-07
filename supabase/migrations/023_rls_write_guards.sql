-- -----------------------------------------------------------------------------
-- Migration 023: Column- and transition-level write guards.
--
-- RLS policies decide WHICH rows a user may write, but most UPDATE policies
-- have no WITH CHECK and no column restriction, so anyone allowed to touch a
-- row could change ANY column of it. An audit (all migrations applied, each
-- policy exercised per role) found these holes, all fixed here:
--
--   payouts       a doctor could rewrite hours / hourly_rate / net_payout on
--                 their own payout, or mark it paid before the hospital
--                 approved it.
--   applications  a doctor could set their own application to 'accepted'.
--   shifts        the assigned doctor could change hourly_rate, date, title,
--                 facility... of the shift.
--   replacement_  the requesting doctor could approve / fill their own
--   requests      request.
--   attendance    a doctor could mark their own attendance 'verified', or
--                 check in to a shift they were never assigned.
--   ratings       a doctor could write a 'hospital_to_doctor' 5-star rating
--                 about themselves, or rate a facility they never worked at.
--   messages      a participant could rewrite the other person's message.
--   threads       a participant could swap the other participant out.
--   doctors /     the owner could self-approve the admin verification
--   facilities    checklist, their per-document review statuses, and (for
--                 doctors) their rating / review_count - and on INSERT could
--                 create the row already verified.
--   profiles      a direct INSERT (when the signup trigger hadn't created the
--                 row) could set verified / verification_status = 'Approved'.
--   notifications a user could only notify themselves, so hospital invites
--                 (Smart Matches) and doctor issue reports always failed.
--
-- Super admins and server-side contexts (service role / SQL editor, where
-- auth.uid() is NULL) are exempt from every guard. Anonymous API callers also
-- have a NULL uid, but no UPDATE/INSERT policy admits them, so RLS stops them
-- before these triggers matter.
--
-- Idempotent: safe to re-run.
-- -----------------------------------------------------------------------------

-- ---------------------------------------------------------------- helpers ----

CREATE OR REPLACE FUNCTION public.is_trusted_writer()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT auth.uid() IS NULL OR public.is_super_admin();
$$;

CREATE OR REPLACE FUNCTION public.owns_doctor(target_doctor_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (SELECT 1 FROM public.doctors WHERE id = target_doctor_id AND profile_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_facility(target_facility_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (SELECT 1 FROM public.facilities WHERE id = target_facility_id AND profile_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_shift_facility(target_shift_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.shifts s JOIN public.facilities f ON f.id = s.facility_id
        WHERE s.id = target_shift_id AND f.profile_id = auth.uid()
    );
$$;

-- Row equality ignoring the listed columns.
CREATE OR REPLACE FUNCTION public.same_except(old_row jsonb, new_row jsonb, allowed text[])
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
    SELECT (old_row - allowed) = (new_row - allowed);
$$;

-- Uploaded-document maps are written by the applicant (new files) and by the
-- super admin (per-document review). A non-admin may add or replace files,
-- but every document that carries a non-pending review decision must be the
-- exact same file with the exact same decision it already had.
CREATE OR REPLACE FUNCTION public.document_reviews_unchanged(old_docs jsonb, new_docs jsonb)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    k text;
    nd jsonb;
    od jsonb;
BEGIN
    IF new_docs IS NULL OR jsonb_typeof(new_docs) <> 'object' THEN
        RETURN true;
    END IF;
    FOR k, nd IN SELECT * FROM jsonb_each(new_docs) LOOP
        IF jsonb_typeof(nd) <> 'object' OR coalesce(nd->>'status', 'pending') = 'pending' THEN
            CONTINUE;
        END IF;
        od := CASE WHEN jsonb_typeof(old_docs) = 'object' THEN old_docs->k END;
        IF od IS NULL
           OR od->>'path' IS DISTINCT FROM nd->>'path'
           OR od->>'status' IS DISTINCT FROM nd->>'status'
           OR od->>'reviewedAt' IS DISTINCT FROM nd->>'reviewedAt'
           OR od->>'rejectionReason' IS DISTINCT FROM nd->>'rejectionReason' THEN
            RETURN false;
        END IF;
    END LOOP;
    RETURN true;
END;
$$;

-- Strip review decisions from a document map (used on self-INSERT).
CREATE OR REPLACE FUNCTION public.strip_document_reviews(docs jsonb)
RETURNS jsonb
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE WHEN jsonb_typeof(docs) = 'object' THEN
        coalesce((SELECT jsonb_object_agg(key,
                    CASE WHEN jsonb_typeof(value) = 'object'
                         THEN value - 'status' - 'reviewedAt' - 'rejectionReason' - 'viewedAt'
                         ELSE value END)
                  FROM jsonb_each(docs)), '{}'::jsonb)
    ELSE docs END;
$$;

-- --------------------------------------------------------------- profiles ----

CREATE OR REPLACE FUNCTION public.guard_profile_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() THEN RETURN NEW; END IF;
    NEW.verified := false;
    NEW.completed_onboarding := false;
    NEW.verification_status := 'Pending';
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_profile_insert ON public.profiles;
CREATE TRIGGER guard_profile_insert BEFORE INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_insert();

-- The 012 guard called is_super_admin() only, which also blocked the service
-- role / SQL editor. Same rules, trusted-writer exemption.
CREATE OR REPLACE FUNCTION public.guard_privileged_profile_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() THEN RETURN NEW; END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Not authorized to change profile id';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Not authorized to change profile role';
    END IF;
    IF NEW.verified IS DISTINCT FROM OLD.verified THEN
        RAISE EXCEPTION 'Not authorized to change profile verified flag';
    END IF;
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
       AND NEW.verification_status IS DISTINCT FROM 'Submitted' THEN
        RAISE EXCEPTION 'Not authorized to set verification_status to %', NEW.verification_status;
    END IF;
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------- doctors ----

CREATE OR REPLACE FUNCTION public.guard_privileged_doctor_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() THEN RETURN NEW; END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.verified := false;
        NEW.verification_details := '{"medicalCouncil": false, "degree": false, "identity": false, "hospitalApproval": false}'::jsonb;
        NEW.rating := 5.00;
        NEW.review_count := 0;
        NEW.basic_info_status := 'pending';
        NEW.basic_info_reviewed_at := NULL;
        NEW.basic_info_rejection_reason := NULL;
        NEW.uploaded_documents := public.strip_document_reviews(NEW.uploaded_documents);
        RETURN NEW;
    END IF;

    IF NEW.verified IS DISTINCT FROM OLD.verified
       OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
       OR NEW.verification_details IS DISTINCT FROM OLD.verification_details
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.review_count IS DISTINCT FROM OLD.review_count
       OR NEW.basic_info_status IS DISTINCT FROM OLD.basic_info_status
       OR NEW.basic_info_reviewed_at IS DISTINCT FROM OLD.basic_info_reviewed_at
       OR NEW.basic_info_rejection_reason IS DISTINCT FROM OLD.basic_info_rejection_reason THEN
        RAISE EXCEPTION 'Not authorized to change a privileged doctor column';
    END IF;
    IF NOT public.document_reviews_unchanged(OLD.uploaded_documents, NEW.uploaded_documents) THEN
        RAISE EXCEPTION 'Not authorized to change document review decisions';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_privileged_doctor_update ON public.doctors;
CREATE TRIGGER guard_privileged_doctor_update BEFORE INSERT OR UPDATE ON public.doctors
    FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_doctor_update();

-- ------------------------------------------------------------- facilities ----

CREATE OR REPLACE FUNCTION public.guard_privileged_facility_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() THEN RETURN NEW; END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.verification_status := '{"governmentRegistration": false, "medicalLicense": false, "taxRegistration": false, "accreditation": false, "authorizedSignatory": false}'::jsonb;
        NEW.basic_info_status := 'pending';
        NEW.basic_info_reviewed_at := NULL;
        NEW.basic_info_rejection_reason := NULL;
        NEW.uploaded_documents := public.strip_document_reviews(NEW.uploaded_documents);
        RETURN NEW;
    END IF;

    IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.basic_info_status IS DISTINCT FROM OLD.basic_info_status
       OR NEW.basic_info_reviewed_at IS DISTINCT FROM OLD.basic_info_reviewed_at
       OR NEW.basic_info_rejection_reason IS DISTINCT FROM OLD.basic_info_rejection_reason THEN
        RAISE EXCEPTION 'Not authorized to change a privileged facility column';
    END IF;
    IF NOT public.document_reviews_unchanged(OLD.uploaded_documents, NEW.uploaded_documents) THEN
        RAISE EXCEPTION 'Not authorized to change document review decisions';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_privileged_facility_update ON public.facilities;
CREATE TRIGGER guard_privileged_facility_update BEFORE INSERT OR UPDATE ON public.facilities
    FOR EACH ROW EXECUTE FUNCTION public.guard_privileged_facility_update();

-- ----------------------------------------------------------------- shifts ----
-- The facility owner has full control. The assigned doctor may only accept
-- (pending -> confirmed) or decline (unassign themselves, back to 'open').

CREATE OR REPLACE FUNCTION public.guard_shift_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() OR public.owns_facility(OLD.facility_id) THEN RETURN NEW; END IF;

    IF NOT public.same_except(to_jsonb(OLD), to_jsonb(NEW), ARRAY['status', 'assigned_doctor_id']) THEN
        RAISE EXCEPTION 'Assigned doctors may only accept or decline a shift';
    END IF;
    IF NEW.assigned_doctor_id IS NOT NULL AND NEW.assigned_doctor_id IS DISTINCT FROM OLD.assigned_doctor_id THEN
        RAISE EXCEPTION 'Not authorized to reassign this shift';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status = 'pending' AND NEW.status = 'confirmed' AND NEW.assigned_doctor_id IS NOT NULL)
       AND NOT (NEW.status = 'open' AND NEW.assigned_doctor_id IS NULL) THEN
        RAISE EXCEPTION 'Not authorized to move this shift from % to %', OLD.status, NEW.status;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_shift_update ON public.shifts;
CREATE TRIGGER guard_shift_update BEFORE UPDATE ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.guard_shift_update();

-- ----------------------------------------------------------- applications ----

CREATE OR REPLACE FUNCTION public.guard_application_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() THEN RETURN NEW; END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.status::text NOT IN ('applied', 'in_review') THEN
            RAISE EXCEPTION 'New applications must start as applied or in_review';
        END IF;
        RETURN NEW;
    END IF;

    IF NOT public.same_except(to_jsonb(OLD), to_jsonb(NEW), ARRAY['status']) THEN
        RAISE EXCEPTION 'Only the application status can be changed';
    END IF;
    IF public.owns_shift_facility(OLD.shift_id) THEN
        IF NEW.status::text = 'withdrawn' AND OLD.status IS DISTINCT FROM NEW.status THEN
            RAISE EXCEPTION 'Only the applicant can withdraw an application';
        END IF;
        RETURN NEW;
    END IF;
    -- Applicant: may only withdraw.
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::text <> 'withdrawn' THEN
        RAISE EXCEPTION 'Applicants may only withdraw their application';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_application_write ON public.applications;
CREATE TRIGGER guard_application_write BEFORE INSERT OR UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.guard_application_write();

-- ---------------------------------------------------------------- payouts ----
-- Amounts are immutable outside trusted contexts. The facility approves or
-- disputes; the doctor can only withdraw an approved payout.

CREATE OR REPLACE FUNCTION public.guard_payout_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() THEN RETURN NEW; END IF;

    IF public.owns_facility(OLD.facility_id) OR public.owns_shift_facility(OLD.shift_id) THEN
        IF NOT public.same_except(to_jsonb(OLD), to_jsonb(NEW), ARRAY['status', 'approved_at']) THEN
            RAISE EXCEPTION 'Facilities may only approve or dispute a payout';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status
           AND NOT (OLD.status IN ('pending_approval', 'disputed') AND NEW.status IN ('approved', 'disputed')) THEN
            RAISE EXCEPTION 'Not authorized to move this payout from % to %', OLD.status, NEW.status;
        END IF;
        RETURN NEW;
    END IF;

    -- Doctor.
    IF NOT public.same_except(to_jsonb(OLD), to_jsonb(NEW), ARRAY['status', 'paid_at', 'has_timesheet', 'has_clinical_notes']) THEN
        RAISE EXCEPTION 'Doctors may only withdraw an approved payout';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status = 'approved' AND NEW.status = 'payment_processed') THEN
        RAISE EXCEPTION 'Not authorized to move this payout from % to %', OLD.status, NEW.status;
    END IF;
    IF NEW.paid_at IS DISTINCT FROM OLD.paid_at AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Not authorized to change paid_at';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_payout_update ON public.payouts;
CREATE TRIGGER guard_payout_update BEFORE UPDATE ON public.payouts
    FOR EACH ROW EXECUTE FUNCTION public.guard_payout_update();

-- --------------------------------------------------- replacement_requests ----

CREATE OR REPLACE FUNCTION public.guard_replacement_request_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() THEN RETURN NEW; END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.status := 'pending';
        NEW.reviewed_at := NULL;
        RETURN NEW;
    END IF;

    IF NEW.shift_id IS DISTINCT FROM OLD.shift_id
       OR NEW.requesting_doctor_id IS DISTINCT FROM OLD.requesting_doctor_id
       OR NEW.requested_at IS DISTINCT FROM OLD.requested_at THEN
        RAISE EXCEPTION 'Not authorized to change who or what this request is for';
    END IF;
    IF NOT public.owns_shift_facility(OLD.shift_id)
       AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at) THEN
        RAISE EXCEPTION 'Only the hospital can review a replacement request';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_replacement_request_write ON public.replacement_requests;
CREATE TRIGGER guard_replacement_request_write BEFORE INSERT OR UPDATE ON public.replacement_requests
    FOR EACH ROW EXECUTE FUNCTION public.guard_replacement_request_write();

-- ----------------------------------------------------- attendance_records ----

CREATE OR REPLACE FUNCTION public.guard_attendance_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() THEN RETURN NEW; END IF;

    IF TG_OP = 'INSERT' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.shifts s
            WHERE s.id = NEW.shift_id AND s.assigned_doctor_id = NEW.replacement_doctor_id
        ) THEN
            RAISE EXCEPTION 'You can only check in to a shift you are assigned to';
        END IF;
        NEW.status := 'checked_in';
        NEW.check_out_time := NULL;
        NEW.verified_by_profile_id := NULL;
        NEW.verified_at := NULL;
        RETURN NEW;
    END IF;

    IF NEW.shift_id IS DISTINCT FROM OLD.shift_id
       OR NEW.replacement_doctor_id IS DISTINCT FROM OLD.replacement_doctor_id THEN
        RAISE EXCEPTION 'Not authorized to move an attendance record';
    END IF;

    IF public.owns_shift_facility(OLD.shift_id) THEN
        IF NEW.verified_by_profile_id IS DISTINCT FROM OLD.verified_by_profile_id
           AND NEW.verified_by_profile_id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Attendance can only be verified in your own name';
        END IF;
        RETURN NEW;
    END IF;

    -- Doctor: may only check out of an unverified record.
    IF NOT public.same_except(to_jsonb(OLD), to_jsonb(NEW), ARRAY['check_out_time', 'status']) THEN
        RAISE EXCEPTION 'Doctors may only check out';
    END IF;
    IF OLD.status = 'verified'
       OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'checked_out') THEN
        RAISE EXCEPTION 'Not authorized to set attendance status to %', NEW.status;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_attendance_write ON public.attendance_records;
CREATE TRIGGER guard_attendance_write BEFORE INSERT OR UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.guard_attendance_write();

-- --------------------------------------------------------------- messaging ----

CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() THEN RETURN NEW; END IF;
    IF NOT public.same_except(to_jsonb(OLD), to_jsonb(NEW), ARRAY['read']) THEN
        RAISE EXCEPTION 'Messages cannot be edited';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_message_update ON public.messages;
CREATE TRIGGER guard_message_update BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.guard_message_update();

CREATE OR REPLACE FUNCTION public.guard_thread_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF public.is_trusted_writer() THEN RETURN NEW; END IF;
    IF NOT public.same_except(to_jsonb(OLD), to_jsonb(NEW), ARRAY['last_message_at']) THEN
        RAISE EXCEPTION 'Thread participants cannot be changed';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_thread_update ON public.message_threads;
CREATE TRIGGER guard_thread_update BEFORE UPDATE ON public.message_threads
    FOR EACH ROW EXECUTE FUNCTION public.guard_thread_update();

-- ---------------------------------------------------------------- ratings ----
-- A rating must come from the side it claims to be from, about a shift that
-- facility posted and that doctor was assigned to.

DROP POLICY IF EXISTS "Ratings insertable by the rater" ON public.ratings;
CREATE POLICY "Ratings insertable by the rater" ON public.ratings
    FOR INSERT WITH CHECK (
        public.is_super_admin()
        OR (
            overall_score BETWEEN 1 AND 5
            AND EXISTS (
                SELECT 1 FROM public.shifts s
                WHERE s.id = ratings.shift_id
                  AND s.facility_id = ratings.facility_id
                  AND s.assigned_doctor_id = ratings.doctor_id
            )
            AND (
                (direction = 'doctor_to_hospital' AND public.owns_doctor(doctor_id))
                OR (direction = 'hospital_to_doctor' AND public.owns_facility(facility_id))
            )
        )
    );

-- ---------------------------------------------------------- notifications ----
-- Allow notifying someone you have a working relationship with (the same
-- test messaging uses), and let an approved hospital invite any doctor
-- (Smart Matches invites doctors who have not applied yet).

CREATE OR REPLACE FUNCTION public.can_notify(recipient uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT recipient = auth.uid()
        OR public.is_super_admin()
        OR public.profiles_have_messaging_relationship(auth.uid(), recipient)
        OR (
            EXISTS (
                SELECT 1 FROM public.profiles me
                WHERE me.id = auth.uid() AND me.role = 'hospital' AND me.verification_status = 'Approved'
            )
            AND EXISTS (SELECT 1 FROM public.doctors d WHERE d.profile_id = recipient)
        );
$$;

DROP POLICY IF EXISTS "Notifications insertable for the target user" ON public.notifications;
CREATE POLICY "Notifications insertable for the target user" ON public.notifications
    FOR INSERT WITH CHECK (public.can_notify(user_id));
