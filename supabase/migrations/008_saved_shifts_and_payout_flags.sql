-- Migration 008: Add saved_shifts table and missing payout flag columns
--
-- saved_shifts has no backing table today (SavedShift is purely a client-side
-- localStorage construct). payouts is missing hasTimesheet/hasClinicalNotes,
-- which the app tracks but had nowhere to persist.

-- -----------------------------------------------------------------------------
-- 1. SAVED SHIFTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_doctor_saved_shift UNIQUE (doctor_id, shift_id)
);

ALTER TABLE public.saved_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can view their own saved shifts" ON public.saved_shifts;
CREATE POLICY "Doctors can view their own saved shifts" ON public.saved_shifts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = saved_shifts.doctor_id AND profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Doctors can save shifts" ON public.saved_shifts;
CREATE POLICY "Doctors can save shifts" ON public.saved_shifts
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = saved_shifts.doctor_id AND profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Doctors can unsave shifts" ON public.saved_shifts;
CREATE POLICY "Doctors can unsave shifts" ON public.saved_shifts
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.doctors WHERE id = saved_shifts.doctor_id AND profile_id = auth.uid())
    );

-- -----------------------------------------------------------------------------
-- 2. PAYOUT DOCUMENT FLAGS
-- -----------------------------------------------------------------------------
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS has_timesheet BOOLEAN DEFAULT FALSE;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS has_clinical_notes BOOLEAN DEFAULT FALSE;
