# Supabase RLS / Realtime / Trigger checklist

Companion to `apply_pending_migrations.sql`. Task 2 of the "Supabase-first data
layer" effort. This documents the row-level-security, realtime-publication, and
trigger-function state that later tasks (7, 8, 18) assume is in place once the
combined migration file has been run.

Status legend:

- **OK** — a migration under `supabase/migrations/` (or `apply_pending_migrations.sql`) already establishes this.
- **OK (RLS completion block)** — added to `apply_pending_migrations.sql` by Task 2 in the `-- RLS completion` section at the end of the file. These close gaps that `supabase/migrations/001`–`010` left open; there is no separate follow-up migration.

Every RLS gap this checklist found is now covered by `apply_pending_migrations.sql` — running that one file leaves the DB ready for the service layer. Nothing here is deferred.

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

- **SELECT** — any authenticated user can read (`auth.role() = 'authenticated'`, or an owner-scoped `EXISTS` where the table is private). These SELECT policies are **required, not optional**: since Task 8 every `*InSupabase` writer chains `.select().single()` after its `.insert()` / `.update()` to return the persisted row, so a missing SELECT policy turns an otherwise successful write into a PGRST116 "0 rows" failure. They also back the reads that already exist (`getReplacementRequests` / `getPayouts` / `getRatings` / `getShifts` / …).
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
| SELECT | `"Shifts viewable by authenticated users"` — `auth.role() = 'authenticated'` | OK — 001, re-created in the RLS completion block (identical predicate). |
| INSERT / UPDATE / DELETE | `"Shifts manageable by facility"` — `FOR ALL` with `USING` **and** `WITH CHECK` = `EXISTS (SELECT 1 FROM public.facilities WHERE id = shifts.facility_id AND profile_id = auth.uid()) OR public.is_super_admin()` | OK (RLS completion block). Migration 001's version had no `WITH CHECK` and no super-admin branch; the completion block `DROP POLICY IF EXISTS "Shifts manageable by facility"` (same name → clean re-run) then recreates it hardened. |
| UPDATE (additive) | `"Shifts updatable by assigned doctor"` — `FOR UPDATE USING (EXISTS (… doctors d … d.id = shifts.assigned_doctor_id AND d.profile_id = auth.uid()))` with `WITH CHECK (assigned_doctor_id IS NULL OR EXISTS (… same …))` | OK (RLS completion block). Postgres ORs permissive policies, so UPDATE on `shifts` is now facility-owner **OR** super-admin **OR** the assigned doctor. |

Code paths: `createShiftInSupabase` insert, `updateShiftStatusInSupabase` / `updateShiftAssignmentInSupabase` update.

The assigned-doctor UPDATE predicate is what makes `respondToShiftAssignment` (`context/app-data-provider.tsx`) work. Its callers are **doctors** (`app/locum-tenens/my-shifts/page.tsx`, `components/dashboard/shift-details-sheet.tsx`); under the facility-owner policy alone their accept/decline UPDATE matched 0 rows, so the chained `.select().single()` returned PGRST116 and the provider rolled the optimistic update back with an error toast. The additive policy's `WITH CHECK` also admits the row whose `assigned_doctor_id` is `NULL` — the decline case — because Postgres re-applies a `FOR UPDATE` policy's `USING` to the post-update row when no `WITH CHECK` is given, which would otherwise reject the decline. Facility-driven writes are still value-checked by the `"Shifts manageable by facility"` `WITH CHECK`.

### `applications`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Applications viewable by applicant or facility owner"` — owner `EXISTS` through `doctors` or through `shifts`→`facilities` | OK — 001 |
| INSERT | `"Doctors can submit applications"` — `EXISTS (SELECT 1 FROM doctors WHERE id = applications.doctor_id AND profile_id = auth.uid())` | OK — 001 |
| UPDATE | `"Applications updatable by doctor or facility owner"` — `EXISTS (… doctors … profile_id = auth.uid())` OR `EXISTS (… shifts JOIN facilities … f.profile_id = auth.uid())` OR `public.is_super_admin()` | OK (RLS completion block). Backs `updateApplicationStatusInSupabase` (both the doctor withdrawing and the hospital moving status). |
| DELETE | none | Not needed — withdrawal is modeled as a `status` update, not a row delete. |

### `replacement_requests`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Replacement requests viewable by authenticated users"` — `auth.role() = 'authenticated'` | OK (RLS completion block). 001 enabled RLS with no policy → `getReplacementRequests` was fully denied; now readable. |
| INSERT | `"Replacement requests insertable by requesting doctor"` — `EXISTS (SELECT 1 FROM public.doctors WHERE id = replacement_requests.requesting_doctor_id AND profile_id = auth.uid()) OR public.is_super_admin()` | OK (RLS completion block). Backs `createReplacementRequestInSupabase`. |
| UPDATE | `"Replacement requests updatable by requesting doctor or admin"` — requesting doctor `EXISTS (… doctors … id = requesting_doctor_id AND profile_id = auth.uid())` **OR** facility owner `EXISTS (SELECT 1 FROM public.shifts s JOIN public.facilities f ON s.facility_id = f.id WHERE s.id = replacement_requests.shift_id AND f.profile_id = auth.uid())` **OR** `public.is_super_admin()` | OK (RLS completion block). Backs `updateReplacementRequestStatusInSupabase`, `modifyReplacementRequestInSupabase` — the real callers are **hospital** users (`app/hospital/replacement-requests/page.tsx`) approving / filling / rejecting, so the facility-owner branch is what makes those UPDATEs match rows. |
| DELETE | none | Not needed — no cancel-by-delete path exists. |

### `payouts`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Payouts viewable by authenticated users"` — `auth.role() = 'authenticated'` | OK (RLS completion block). 001 enabled RLS with no policy → `getPayouts` was fully denied; now readable. |
| INSERT | none | Not needed yet — no service method creates a payout. Add an owner/admin `WITH CHECK` when one lands. |
| UPDATE | `"Payouts updatable by owner doctor or admin"` — payout's doctor `EXISTS (SELECT 1 FROM public.doctors WHERE id = payouts.doctor_id AND profile_id = auth.uid())` **OR** facility owner `EXISTS (SELECT 1 FROM public.shifts s JOIN public.facilities f ON s.facility_id = f.id WHERE s.id = payouts.shift_id AND f.profile_id = auth.uid())` **OR** `public.is_super_admin()` | OK (RLS completion block). Backs `updatePayoutStatusInSupabase` (`status`, `approved_at`, `paid_at`) — the real caller is the **hospital** approving payment (`app/hospital/post-shift/page.tsx`), hence the facility-owner branch. |
| DELETE | none | Not needed. |

### `ratings`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Ratings viewable by authenticated users"` — `auth.role() = 'authenticated'` | OK (RLS completion block). 001 enabled RLS with no policy → `getRatings` was fully denied; now readable. |
| INSERT | `"Ratings insertable by the rater"` — `EXISTS (… doctors … profile_id = auth.uid())` OR `EXISTS (… facilities … profile_id = auth.uid())` OR `public.is_super_admin()` | OK (RLS completion block). Backs `createRatingInSupabase`; the rater must own either side of the rating (checked against `doctor_id` / `facility_id`). |
| UPDATE / DELETE | none | Not needed — ratings are immutable once submitted. |

### `notifications`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Notifications viewable by target user"` — `auth.uid() = user_id` | OK — 001 |
| INSERT | `"Notifications insertable for the target user"` — `user_id = auth.uid() OR public.is_super_admin()` | OK (RLS completion block). Backs `createNotificationInSupabase`; the `is_super_admin()` branch covers admin fan-out to other users. |
| UPDATE | `"Notifications updatable by the target user"` — `user_id = auth.uid()` | OK (RLS completion block). Backs `markNotificationReadInSupabase`. |
| DELETE | none | Not needed. |

### `saved_shifts`
| Op | Policy | Status |
|---|---|---|
| SELECT | `"Doctors can view their own saved shifts"` — `EXISTS (SELECT 1 FROM doctors WHERE id = saved_shifts.doctor_id AND profile_id = auth.uid())` | OK — 008 block |
| INSERT | `"Doctors can save shifts"` — same owner `EXISTS` | OK — 008 block |
| DELETE | `"Doctors can unsave shifts"` — same owner `EXISTS` | OK — 008 block |
| UPDATE | none | not needed (rows are insert/delete only). |

`createSavedShiftInSupabase` does a bare `.insert()` with no chained `.select()`, and `deleteSavedShiftInSupabase` filters by `doctor_id`+`shift_id`, so the owner-scoped SELECT policy is sufficient.

---

## RLS coverage — all closed in `apply_pending_migrations.sql`

Tasks 7 and 8 are TypeScript-only and write no SQL, and the user runs exactly one
file. So every gap below is fixed inside `apply_pending_migrations.sql` itself —
the `-- RLS completion` section appended after the migration 010 block. Nothing is
deferred.

| Table | Added by the RLS completion block | Predicate |
|---|---|---|
| `replacement_requests` | SELECT, INSERT, UPDATE | SELECT: authenticated. INSERT: `EXISTS (… doctors … id = requesting_doctor_id AND profile_id = auth.uid()) OR public.is_super_admin()`. UPDATE: requesting-doctor `EXISTS` **OR** facility-owner `EXISTS (… shifts s JOIN facilities f … s.id = replacement_requests.shift_id AND f.profile_id = auth.uid())` **OR** `public.is_super_admin()` (hospitals are the real UPDATE callers). |
| `payouts` | SELECT, UPDATE | SELECT: authenticated. UPDATE: payout-doctor `EXISTS (… doctors … id = payouts.doctor_id …)` **OR** facility-owner `EXISTS (… shifts s JOIN facilities f … s.id = payouts.shift_id AND f.profile_id = auth.uid())` **OR** `public.is_super_admin()` (hospital approves payment). |
| `ratings` | SELECT, INSERT | SELECT: authenticated. INSERT: `EXISTS (… doctors … id = ratings.doctor_id …) OR EXISTS (… facilities … id = ratings.facility_id …) OR public.is_super_admin()`. |
| `applications` | UPDATE (SELECT + INSERT already in 001) | `EXISTS (… doctors …) OR EXISTS (… shifts JOIN facilities … f.profile_id = auth.uid()) OR public.is_super_admin()`. |
| `notifications` | INSERT + UPDATE (SELECT already in 001) | INSERT: `user_id = auth.uid() OR public.is_super_admin()`. UPDATE: `user_id = auth.uid()`. |
| `shifts` | SELECT + `FOR ALL` re-created (replaces 001's) + additive assigned-doctor UPDATE | SELECT: authenticated. Write: `EXISTS (… facilities … id = shifts.facility_id AND profile_id = auth.uid()) OR public.is_super_admin()` in both `USING` and `WITH CHECK`. Plus `"Shifts updatable by assigned doctor"` — `FOR UPDATE USING (EXISTS (… doctors d … d.id = shifts.assigned_doctor_id AND d.profile_id = auth.uid()))` with `WITH CHECK (assigned_doctor_id IS NULL OR EXISTS (… same …))`. |

Every statement is `DROP POLICY IF EXISTS … ; CREATE POLICY …` (plus a no-op
`ALTER TABLE … ENABLE ROW LEVEL SECURITY`), so the file remains safe to run more
than once, per its header promise. `profiles` / `facilities` / `doctors` /
`saved_shifts` were already fully covered by the migration 006 / 008 blocks.

### Privileged-column guard triggers

An RLS `USING` clause gates **which rows** an owner may update; it does **not**
validate the resulting values. `"Users can update their own profile"`,
`"Doctors editable by owner"` and `"Facilities editable by facility owner"` are
all `FOR UPDATE USING (owner OR is_super_admin())` with **no `WITH CHECK`**, so
from the browser with the anon key any authenticated user could run
`update public.profiles set role = 'super_admin' where id = auth.uid();` —
and `is_super_admin()` reads exactly `profiles.role`, so that one statement
unlocks the admin branch of every other policy. The same shape let a doctor
self-set `doctors.verified = true` (→ `mapDoctorRow` renders `status: "active"`)
or reassign `doctors.profile_id` / `facilities.profile_id` to hijack a row.

A plain `WITH CHECK` cannot express "column X may not change" (it cannot see the
`OLD` row), and column `GRANT`s would also block the legitimate super-admin
approval writes that run from the browser. So the guard is three
`BEFORE UPDATE … FOR EACH ROW` triggers, appended at the end of
`apply_pending_migrations.sql`. Each is `SECURITY DEFINER SET search_path =
public, pg_temp` and idempotent (`CREATE OR REPLACE FUNCTION` +
`DROP TRIGGER IF EXISTS`).

| Trigger | Table | Guarded columns | Behaviour |
|---|---|---|---|
| `guard_privileged_profile_update` | `public.profiles` | `role`, `verified` (strict); `verification_status` (with one carve-out) | `RAISE EXCEPTION` when `NOT public.is_super_admin()` and `role` or `verified` changes at all. For `verification_status`, a change is rejected **unless the new value is `'Submitted'`** — see the carve-out below. |
| `guard_privileged_doctor_update` | `public.doctors` | `verified`, `profile_id` | `RAISE EXCEPTION` if either is `IS DISTINCT FROM` its old value and `NOT public.is_super_admin()` — blocks doctor self-verification and ownership reassignment. |
| `guard_privileged_facility_update` | `public.facilities` | `profile_id` | Blocks facility ownership reassignment / disowning. |

#### `verification_status` — the `'Submitted'` carve-out

`profiles.verification_status` is **admin-only except that a non-admin may set it
to `'Submitted'` on their own row**. That is the "I have uploaded my documents"
transition all three onboarding wizards perform
(`components/forms/onboarding-wizard.tsx:299`,
`hospital-onboarding-wizard.tsx:204`,
`working-doctor-onboarding-wizard.tsx:237`), as the signing-up user, in the same
`.update()` that writes `completed_onboarding`, `full_name` and `phone`. It also
covers re-submission after an admin sets `'Needs Changes'`.

`'Submitted'` confers no privilege — `is_super_admin()` reads only
`profiles.role`, and the value is consumed by the verification screens
(`app/verification/status/page.tsx`, `components/forms/login-form.tsx`) for
routing copy. Every other value — `'Under Review'`, `'Needs Changes'`,
`'Approved'`, `'Rejected'` — remains reachable only through the
`NOT public.is_super_admin()` gate, i.e. only by a super admin. Since `verified`
is guarded strictly and independently, a user who sets their own status to
`'Submitted'` still cannot flip `profiles.verified`.

Codebase check backing the carve-out (`verification_status` across
`components/forms/`, `context/`, `app/`, `lib/`): the only non-admin **UPDATE**
writes are the three wizards, all writing exactly `'Submitted'`. The
`'Approved'` / `'Rejected'` writes come from
`updateDoctorRegistrationStatusInSupabase` / `updateFacilityRegistrationStatusInSupabase`,
which run as the super admin. `context/auth-provider.tsx:117` is inside an
`.upsert(…, { onConflict: "id", ignoreDuplicates: true })` → `ON CONFLICT DO NOTHING`
(INSERT only, the BEFORE UPDATE trigger never fires), and `:233` / `:269` build
in-memory `UserProfile` objects for offline/demo mode with no DB write at all.

Only `UPDATE` is guarded. `INSERT` is unaffected — `handle_new_user()` and the
`auth-provider.tsx` fallback upsert (`onConflict: "id", ignoreDuplicates: true`
→ `ON CONFLICT DO NOTHING`, never an UPDATE) both still work, and the doctors
insert in the onboarding wizards writes `verified: false` on a fresh row.

**Legitimate writes verified against the guards:**

| Write | Caller | Touches a guarded column? | Verdict |
|---|---|---|---|
| `updateDoctorVerificationInSupabase` (`doctors.verified`, `verification_details`) | super-admin approval flow | yes (`doctors.verified`) | allowed — `is_super_admin()` is true |
| `updateDoctorRegistrationStatusInSupabase` / `updateFacilityRegistrationStatusInSupabase` (`profiles.verification_status`, `profiles.verified`) | super-admin approval flow | yes (both) | allowed — `is_super_admin()` is true |
| `updateDoctorProfileInSupabase` (specialty / license / locations / …) | doctor | no | allowed |
| `updateFacilityVerificationInSupabase` (`facilities.verification_status` jsonb) | hospital | no — that is the jsonb checklist column on `facilities`, not `profiles.verification_status`, and `facilities` guards only `profile_id` | allowed |
| onboarding wizards → `profiles.update({ completed_onboarding, full_name, phone })` | new user (non-admin) | no | allowed |
| onboarding wizards → `profiles.update({ verification_status: 'Submitted' })` | new user (non-admin) | yes — `profiles.verification_status` | allowed by the `'Submitted'` carve-out above |

---

## `facilities.verification_status` vs `profiles.verification_status` — naming-collision determination

**These are two different columns on two different tables, and the application code is already internally consistent. No schema change is made.**

| Column | Type | Default (migration 001 / 002) | Meaning | Code that reads it | Code that writes it |
|---|---|---|---|---|---|
| `facilities.verification_status` | `JSONB` | `{"governmentRegistration": false, "medicalLicense": false, "taxRegistration": false, "accreditation": false, "authorizedSignatory": false}` | Per-document verification **checklist** (booleans) | `mapFacilityRow` → `item.verification_status` spread into `HospitalVerification` | `updateFacilityVerificationInSupabase` → `.update({ verification_status: verification })` (jsonb object) |
| `profiles.verification_status` | `TEXT` | `'Pending'` | Account-level **registration status** string (`Pending` / `Submitted` / `Approved` / `Rejected`) | `mapFacilityRow` / `mapDoctorRow` → `item.profiles?.verification_status` → `registrationStatus` | `updateFacilityRegistrationStatusInSupabase`, `updateDoctorRegistrationStatusInSupabase` → `.from("profiles").update({ verification_status: status })` (text) |

Every read of `facilities.verification_status` treats it as jsonb; every write sends jsonb. Every read of `profiles.verification_status` treats it as text; every write sends text. The `getFacilities` / `getDoctors` queries pull the profile value through an explicit `profiles(verification_status)` join alias, so the two never alias to the same key in a row object. The doctors side uses `doctors.verification_details` (jsonb checklist) as its table-level counterpart, mirroring the facilities pattern.

Per the Task 2 brief Step 3: because the collision is only a shared *name* across different tables — not one column carrying two meanings — the resolution is to **document it here and change nothing**. No `RENAME COLUMN`, and `lib/supabase/services/facilities.ts` needs no change for this.
