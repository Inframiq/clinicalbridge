# Supabase RLS / Realtime / Trigger checklist

Companion to `apply_pending_migrations.sql`. Task 2 of the "Supabase-first data
layer" effort. This documents the row-level-security, realtime-publication, and
trigger-function state that later tasks (7, 8, 18) assume is in place once the
combined migration file has been run.

Status legend:

- **OK** — a migration under `supabase/migrations/` (or `apply_pending_migrations.sql`) already establishes this.
- **REQUIRED** — the code path exists and needs this policy, but no migration creates it yet. A follow-up migration must add it before that path works against a live DB with RLS enforced.

---

## ⚠️ Backup warning

**Take a full database backup (Supabase Dashboard → Database → Backups, or `pg_dump`) before running `apply_pending_migrations.sql`.** Migration 007 rewrites the `user_role` and `doctor_kind` enums (drop-and-recreate swap via `*_new` types, repointing `profiles.role` / `doctors.doctor_kind`) and permanently drops the `replacement_stage` enum plus `shifts.replacement_stage` / `shifts.intern_supervision_required`. Any `'intern'` rows are reassigned to `'locum_tenens'` — that reassignment is not reversible without a backup.

---

## Trigger functions

Both must be `SECURITY DEFINER` **with a pinned search path** — `SET search_path = public, pg_temp` — so the unqualified enum/table references inside them resolve when they run in the `auth` insert context (this was the root cause fixed by migration 005).

| Function | Purpose | Required definition | Status |
|---|---|---|---|
| `public.handle_new_user()` | `AFTER INSERT ON auth.users` trigger (`on_auth_user_created`); inserts the matching `public.profiles` row (`id, email, role, full_name, verified, completed_onboarding, verification_status`) with `ON CONFLICT (id) DO UPDATE`. | `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp`; enum casts schema-qualified (`::public.user_role`); default role `'locum_tenens'`. | OK — `apply_pending_migrations.sql` (migration 005 block, re-issued by 007 block). Base `001`/`002`/`004` definitions lack the pinned `search_path`; running the combined file replaces them. |
| `public.is_super_admin()` | Boolean helper used in every owner-or-admin policy: `EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')`. | `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp`. | OK — `apply_pending_migrations.sql` (migration 006 block). |

`handle_new_user()` depends on `profiles.completed_onboarding` and `profiles.verification_status` existing. Those are added by migration 002, but migration 006's own header notes 002 "only partially applied" on the live project. `apply_pending_migrations.sql` now prepends a guarded `-- Migration 002 backfill` block (`ADD COLUMN IF NOT EXISTS`) so the trigger is safe even if 002 never ran.

---

## Realtime publication (`supabase_realtime`)

| Table | In publication? | Status | Notes |
|---|---|---|---|
| `public.doctors` | Yes | OK — `apply_pending_migrations.sql` migration 010 block (`ALTER PUBLICATION supabase_realtime ADD TABLE`, `duplicate_object` guarded). | Super-admin approval dashboard subscribes to INSERT/UPDATE. |
| `public.facilities` | Yes | OK — migration 010 block. | Same. |
| all other tables | No | n/a | No client currently opens a realtime channel on them. Add to the publication only when a live subscription is introduced. |

Existing `SELECT` policy (`auth.role() = 'authenticated'`) on `doctors` / `facilities` is permissive enough for a logged-in super-admin session to receive these events; migration 010 changes no RLS.

---

## Per-table policy checklist

Target model:

- **SELECT** — any authenticated user can read (`auth.role() = 'authenticated'`, or an owner-scoped `EXISTS` where the table is private). Needed so a `.select()` chained after an `.insert()` / `.update()` returns the row (see Task 8).
- **INSERT / UPDATE / DELETE** — the owner (`auth.uid() = profile_id`, `auth.uid() = id`, `auth.uid() = user_id`, or an owner `EXISTS` sub-select through `doctors` / `facilities`) **or** `public.is_super_admin()`.

### `profiles`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Public profiles are viewable by authenticated users"` — `auth.role() = 'authenticated'` | OK — 001 / 006 block |
| INSERT | `"Users can insert their own profile"` — `auth.uid() = id OR public.is_super_admin()` | OK — 002 / 006 block |
| UPDATE | `"Users can update their own profile"` — `auth.uid() = id OR public.is_super_admin()` | OK — 002 / 006 block |
| DELETE | none | REQUIRED only if a delete path is added (none today; `auth.users` cascade covers account deletion). |

Code paths: `auth-provider.tsx` insert; `updateDoctorRegistrationStatusInSupabase` / `updateFacilityRegistrationStatusInSupabase` write `verification_status` (text) + `verified`; onboarding wizards write `completed_onboarding`, `verification_status`, `full_name`, `phone`. Super-admin approval relies on the `is_super_admin()` branch of the UPDATE policy.

### `facilities`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Facilities are viewable by authenticated users"` — `auth.role() = 'authenticated'` | OK — 001 / 006 block |
| INSERT | `"Facilities insertable by owner"` — `auth.uid() = profile_id OR public.is_super_admin()` | OK — 002 / 006 block |
| UPDATE | `"Facilities editable by facility owner"` — `auth.uid() = profile_id OR public.is_super_admin()` | OK — 002 / 006 block |
| DELETE | none | REQUIRED only if a delete path is added (none today). |

### `doctors`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Doctors viewable by authenticated users"` — `auth.role() = 'authenticated'` | OK — 001 / 006 block |
| INSERT | `"Doctors insertable by owner"` — `auth.uid() = profile_id OR public.is_super_admin()` | OK — 002 / 006 block |
| UPDATE | `"Doctors editable by owner"` — `auth.uid() = profile_id OR public.is_super_admin()` | OK — 002 / 006 block |
| DELETE | none | REQUIRED only if a delete path is added (none today). |

### `shifts`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Shifts viewable by authenticated users"` — `auth.role() = 'authenticated'` | OK — 001 |
| INSERT / UPDATE / DELETE | `"Shifts manageable by facility"` — `FOR ALL USING (EXISTS (SELECT 1 FROM facilities WHERE id = shifts.facility_id AND profile_id = auth.uid()))` | OK — 001. **Gap: no `public.is_super_admin()` branch** and `FOR ALL` has no `WITH CHECK`. REQUIRED: widen to `... OR public.is_super_admin()` and add a matching `WITH CHECK` so admin tooling and post-insert `.select()` work. |

Code paths: `createShiftInSupabase` insert, `updateShiftStatusInSupabase` / `updateShiftAssignmentInSupabase` update.

### `applications`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Applications viewable by applicant or facility owner"` — owner `EXISTS` through `doctors` or through `shifts`→`facilities` | OK — 001 |
| INSERT | `"Doctors can submit applications"` — `EXISTS (SELECT 1 FROM doctors WHERE id = applications.doctor_id AND profile_id = auth.uid())` | OK — 001 |
| UPDATE | none | **REQUIRED** — `updateApplicationStatusInSupabase` sets `status`; with RLS on and no UPDATE policy this is a silent deny. Add: facility owner (through `shifts`→`facilities`) or `public.is_super_admin()`. |
| DELETE | none | REQUIRED only if a withdraw-application path is added. |

### `replacement_requests`
| Op | Policy | Status |
|---|---|---|
| SELECT | none | **REQUIRED** — RLS is enabled on the table (001) but **no policy is defined**, so every `getReplacementRequests` read is denied. Add authenticated-read (or owner/facility-scoped read). |
| INSERT | none | **REQUIRED** — `createReplacementRequestInSupabase`. Add: requesting doctor owns the row (`EXISTS (SELECT 1 FROM doctors WHERE id = requesting_doctor_id AND profile_id = auth.uid())`). |
| UPDATE | none | **REQUIRED** — `updateReplacementRequestStatusInSupabase`, `modifyReplacementRequestInSupabase`. Add: requesting doctor, owning facility, or `public.is_super_admin()`. |
| DELETE | none | REQUIRED only if a cancel path is added. |

### `payouts`
| Op | Policy | Status |
|---|---|---|
| SELECT | none | **REQUIRED** — RLS enabled in 001 with no policy; `getPayouts` is denied. Add: doctor owner (`EXISTS` through `doctors`), facility owner (`EXISTS` through `facilities`), or `public.is_super_admin()`. |
| INSERT | none | REQUIRED when a create-payout path lands (no service method today). |
| UPDATE | none | **REQUIRED** — `updatePayoutStatusInSupabase` sets `status`, `approved_at`, `paid_at`. Add: facility owner or `public.is_super_admin()`. |
| DELETE | none | not needed. |

### `ratings`
| Op | Policy | Status |
|---|---|---|
| SELECT | none | **REQUIRED** — RLS enabled in 001 with no policy; `getRatings` is denied. Add authenticated-read. |
| INSERT | none | **REQUIRED** — `createRatingInSupabase`. Add: the rater owns the counterpart row (doctor through `doctors`, or facility through `facilities`), keyed off `direction`. |
| UPDATE / DELETE | none | not needed (ratings are immutable once submitted). |

### `notifications`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Notifications viewable by target user"` — `auth.uid() = user_id` | OK — 001 |
| INSERT | none | **REQUIRED** — `createNotificationInSupabase`. Add: `auth.uid() = user_id OR public.is_super_admin()` (server/admin code fans out notifications to other users, so an admin/service branch is needed). |
| UPDATE | none | **REQUIRED** — `markNotificationReadInSupabase` sets `read = true`. Add: `auth.uid() = user_id`. |
| DELETE | none | not needed. |

### `saved_shifts`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Doctors can view their own saved shifts"` — `EXISTS (SELECT 1 FROM doctors WHERE id = saved_shifts.doctor_id AND profile_id = auth.uid())` | OK — 008 block |
| INSERT | `"Doctors can save shifts"` — same owner `EXISTS` | OK — 008 block |
| DELETE | `"Doctors can unsave shifts"` — same owner `EXISTS` | OK — 008 block |
| UPDATE | none | not needed (rows are insert/delete only). |

`createSavedShiftInSupabase` does a bare `.insert()` with no chained `.select()`, and `deleteSavedShiftInSupabase` filters by `doctor_id`+`shift_id`, so the owner-scoped SELECT policy is sufficient.

---

## Summary of RLS follow-up work (for Task 7 / 8, not this task)

`apply_pending_migrations.sql` covers the schema and the `profiles` / `facilities` / `doctors` / `saved_shifts` policies. The following tables still need policies added in a new migration before their write paths work under enforced RLS:

- **`replacement_requests`** — SELECT + INSERT + UPDATE (no policies at all today).
- **`payouts`** — SELECT + UPDATE (no policies at all today).
- **`ratings`** — SELECT + INSERT (no policies at all today).
- **`applications`** — UPDATE (SELECT + INSERT already exist).
- **`notifications`** — INSERT + UPDATE (SELECT already exists).
- **`shifts`** — widen the `FOR ALL` policy with `OR public.is_super_admin()` and a `WITH CHECK`.

---

## `facilities.verification_status` vs `profiles.verification_status` — naming-collision determination

**These are two different columns on two different tables, and the application code is already internally consistent. No schema change is made.**

| Column | Type | Default (migration 001 / 002) | Meaning | Code that reads it | Code that writes it |
|---|---|---|---|---|---|
| `facilities.verification_status` | `JSONB` | `{"governmentRegistration": false, "medicalLicense": false, "taxRegistration": false, "accreditation": false, "authorizedSignatory": false}` | Per-document verification **checklist** (booleans) | `mapFacilityRow` → `item.verification_status` spread into `HospitalVerification` | `updateFacilityVerificationInSupabase` → `.update({ verification_status: verification })` (jsonb object) |
| `profiles.verification_status` | `TEXT` | `'Pending'` | Account-level **registration status** string (`Pending` / `Submitted` / `Approved` / `Rejected`) | `mapFacilityRow` / `mapDoctorRow` → `item.profiles?.verification_status` → `registrationStatus` | `updateFacilityRegistrationStatusInSupabase`, `updateDoctorRegistrationStatusInSupabase` → `.from("profiles").update({ verification_status: status })` (text) |

Every read of `facilities.verification_status` treats it as jsonb; every write sends jsonb. Every read of `profiles.verification_status` treats it as text; every write sends text. The `getFacilities` / `getDoctors` queries pull the profile value through an explicit `profiles(verification_status)` join alias, so the two never alias to the same key in a row object. The doctors side uses `doctors.verification_details` (jsonb checklist) as its table-level counterpart, mirroring the facilities pattern.

Per the Task 2 brief Step 3: because the collision is only a shared *name* across different tables — not one column carrying two meanings — the resolution is to **document it here and change nothing**. No `RENAME COLUMN`, and `lib/supabase/services/facilities.ts` needs no change for this.
