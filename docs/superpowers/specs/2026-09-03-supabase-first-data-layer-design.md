# Supabase-first data layer with clean fallbacks

- **Date:** 2026-09-03
- **Status:** Approved for planning
- **Scope:** Shared data layer (`context/`, `lib/supabase/`, `hooks/`, `proxy.ts`, role
  layouts) + spot-checks of the highest-traffic pages. Not a per-page audit of all ~60 routes.

## Problem

The app treats mock data as the source of truth and Supabase as an optional overlay.
Every Supabase read falls back to `lib/mock-data` on error or empty; every write is an
un-awaited fire-and-forget call whose rejection is swallowed and logged with
`console.error`. Consequences observed:

1. **Dev-overlay spam.** Next.js 16 promotes every `console.error` to a full-screen error
   overlay. There are 31 `console.error(…, err)` sites in `lib/supabase/**`, `hooks/**`,
   `context/**`. A single missing DB column reads to the user as "a lot of issues."
   Example already fixed this session: `auth-provider.tsx` signup logging a handled
   "User already registered" as `console.error`.
2. **Errors serialize to `{}`.** `console.error("…", err)` on a `PostgrestError` /
   `AuthError` drops the non-enumerable `.message`. `describeSupabaseError()` exists in
   `lib/supabase/services/utils.ts` to fix this and is used nowhere.
3. **Schema drift.** Migrations `005`–`010` were never applied to the live Supabase
   project (`apply_pending_migrations.sql` documents this). Signup and several reads throw
   `PGRST204` for missing columns (`certifications`, `uploaded_documents`, document
   metadata) and realtime never fires.
4. **UI/DB divergence.** Optimistic local writes + swallowed remote failures mean the
   screen and the database drift with no signal to anyone.
5. **No server-side data.** All data loads client-side in `useEffect` after mount →
   loading flash and a visible mock→real "pop".
6. **Re-render churn.** `useLocalStorageState` runs `JSON.parse` on every render, producing
   a new reference each pass, so every context consumer re-renders on every provider render.

TypeScript is currently clean (`tsc --noEmit` exit 0). ESLint is clean (0 errors, 10
warnings — mostly benign React-Compiler "incompatible library" notes for TanStack Table /
react-hook-form, plus a few `exhaustive-deps` in `app-data-provider` and `use-autosave`).

## Principle

When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are both set
("**online mode**"), Supabase is the only source of truth:

- A successful query with zero rows renders an **empty state**. Never seed/mock data
  dressed as real records.
- Every mutation is **awaited**; failure rolls back the optimistic update and shows a
  `toast.error` with the real reason.
- Initial page loads for role sections are **server-rendered** from the authenticated
  Supabase session.

When the env vars are absent ("**offline mode**"), the app runs on `lib/mock-data` with a
persistent visible dev banner ("Offline demo data — Supabase not configured"). Mock data
never appears in online mode.

A single helper decides mode:

```ts
// lib/supabase/env.ts
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
```

The hardcoded fallback URL/key literals currently inlined in `lib/supabase/client.ts` and
`proxy.ts` are removed — they are what makes "unconfigured" undetectable today.

## Design

### Unit 1 — Error reporting (`lib/supabase/log.ts`)

New module. One entry point:

```ts
export function reportSupabase(
  context: string,
  error: unknown,
  opts?: { level?: "warn" | "error" }
): void;
```

- Formats via `describeSupabaseError(error)` (moved here from `utils.ts`, or re-exported).
- `level: "warn"` (default) → `console.warn(\`[supabase] \${context}: \${describe(error)}\`)`.
- `level: "error"` → same string, `console.error`, reserved for genuine invariant
  violations (never for an expected fallback or a handled user-facing outcome).
- **Never passes a raw error object as a `console.*` argument.** That is the only thing
  that triggers the Next.js overlay, and the formatted string carries `code` / `details`
  / `hint` anyway.

All 31 existing `console.error(…, err)` call sites in `lib/supabase/**`, `hooks/**`,
`context/**` are converted to `reportSupabase(...)`. Expected fallbacks are `"warn"`.

`isUuid()` early-returns in the `*InSupabase` writers gain a
`reportSupabase("skip write: non-uuid id", ...)` in development so silent no-ops are
visible in the console.

### Unit 2 — Database schema (`apply_pending_migrations.sql`)

Deliverable is verification, not new SQL authoring, unless a gap is found.

1. Audit every column the code reads/writes against the migration DDL:
   - `lib/supabase/services/shifts.ts` — `shifts` columns (`department_name`,
     `facility_name`, `location` jsonb, `assigned_doctor_id`, `code_red`, …),
     `replacement_requests`, `applications`.
   - `lib/supabase/services/doctors.ts` — `mapDoctorRow` reads `verification_details`,
     `uploaded_documents`, `doctor_kind`, `profile_id`, joined `profiles(email, phone,
     verification_status)`.
   - `lib/supabase/services/facilities.ts` — `mapFacilityRow` reads
     `facilities.verification_status` (jsonb checklist) plus joined
     `profiles.verification_status` (text status). Confirm both columns exist and the
     naming collision is intentional; if not, rename the facilities jsonb column to
     `verification_details` for consistency with `doctors` and update the mapper + writer.
   - `payouts` (`has_timesheet`, `has_clinical_notes`), `ratings`, `notifications`,
     `saved_shifts`.
2. Confirm `apply_pending_migrations.sql` is **self-sufficient against a DB that has only
   migrations 001–004 applied** — in particular that `profiles.completed_onboarding` and
   `profiles.verification_status` already exist (added by 002) before 005's
   `handle_new_user()` inserts them. If uncertain, prepend guarded
   `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements.
3. Produce `docs/superpowers/specs/2026-09-03-supabase-rls-checklist.md`: required RLS for
   each table (authenticated read; owner or `is_super_admin()` write), realtime
   publication membership, and the `SECURITY DEFINER` + `search_path` requirement on
   trigger functions.
4. User runs the file in the Supabase SQL Editor. Implementer then re-runs the audit
   against a fresh `getDoctors()` / `getFacilities()` / signup smoke.

### Unit 3 — Service layer read contract (`lib/supabase/services/*.ts`)

Every `getX()` changes signature from `Promise<T[]>` to
`Promise<{ data: T[]; error: string | null }>`:

- Query error → `{ data: [], error: describeSupabaseError(error) }`. **No mock import.**
- Zero rows → `{ data: [], error: null }`.
- Success → `{ data: rows.map(map), error: null }`.
- `getNotifications` keeps its `userId` guard but returns the same shape.

The `import { X as initialX } from "@/lib/mock-data/*"` lines are deleted from every
service file. Mock data is referenced only by `AppDataProvider` in offline mode.

Row-mapping functions (`mapDoctorRow`, `mapFacilityRow`, and the inline mappers in
`shifts.ts` / `payouts.ts` / `ratings.ts`) are extracted to the top of each file as named
exports so they are unit-testable in isolation.

### Unit 4 — Service layer write contract (`lib/supabase/services/*.ts`)

Every `*InSupabase()` changes from `Promise<void>` to
`Promise<{ data: Row | null; error: string | null }>`:

- Insert/update calls add `.select().single()` (or `.select()`) so the persisted row is
  returned for reconciliation.
- try/catch and PostgREST `error` both map to `{ data: null, error: describe(...) }`.
- The `isUuid` guard still short-circuits, returning `{ data: null, error: null }` — a
  local-only id is not a failure, it just was never a DB row. Callers therefore need no
  special-casing: `error === null` means "nothing to roll back". A one-line dev
  `reportSupabase` warn records the skip.

### Unit 5 — `AppDataProvider` (`context/app-data-provider.tsx`)

**Initial state.** `useLocalStorageState<Shift[]>("lt-shifts", isSupabaseConfigured ? [] :
seedShifts)` — and likewise for the other eight slices. In online mode the provider paints
empty, then fills from the sync effect below.

**Sync effect (reads).** The existing `Promise.all` block calls the new `{ data, error }`
services. For each slice: `if (!error) setX(data)` unconditionally (including empty — that
is a real empty state). If `error`, leave the slice as-is and `reportSupabase`. The
current "only replace when non-empty" logic for shifts/replacements/applications is
removed. Dependency array gets the setters (fixes the `exhaustive-deps` warning) — the
setters are stable because Unit 8 makes them stable.

**Mutations.** Each handler (`broadcastShift`, `updateShiftStatus`,
`updateApplicationStatus`, `applyToShift`, `withdrawApplication`,
`approveAndProcessPayment`, `requestPaymentChanges`, `markNotificationRead`,
`registerDoctor`, `registerSelfDoctor`, `registerHospital`, `updateDoctorVerification`,
`updateDoctorProfile`, `assignDoctorToShift`, `respondToShiftAssignment`,
`createReplacementRequest`, `updateReplacementRequestStatus`, `approveReplacementRequest`,
`modifyReplacementRequest`, `toggleSaveShift`, `submitRating`,
`updateFacilityVerification`, `approve*/reject*Registration`) becomes `async` and follows
one pattern:

```ts
const prev = snapshot();              // capture slice(s) touched
setSlice(optimisticNext);             // instant UI
const { data, error } = await xInSupabase(payload);
if (error) {
  setSlice(prev);                     // roll back
  toast.error(`Couldn't save: ${error}`);
  return;
}
if (data) setSlice(reconcile(data));  // adopt persisted row
// error === null && data === null  → local-only id, nothing persisted, keep optimistic
```

Handlers that currently return the created object (`broadcastShift`,
`createReplacementRequest`, `registerDoctor`, `registerSelfDoctor`, `registerHospital`,
`submitRating`) return `Promise<T>` and reject / surface on failure. Callers in
`components/forms/*` and pages are updated to `await` and to not navigate on failure. The
context interface type is updated accordingly.

**Realtime effect.** Unchanged in shape; gains a `.subscribe((status) => …)` callback that
`reportSupabase`s a non-`SUBSCRIBED` status once, and is a no-op in offline mode.

**Offline banner.** When `!isSupabaseConfigured`, render a fixed-position dev banner
(dismissible per session via `sessionStorage`) as a sibling of `children`.

### Unit 6 — Server Supabase client (`lib/supabase/server.ts`)

New module, per the `@supabase/ssr` + Next 16 contract (`cookies()` is async):

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // called from a Server Component render — safe to ignore; proxy refreshes
        }
      },
    },
  });
}
```

### Unit 7 — Auth: role layouts, `auth-provider`, `proxy.ts`

**Role layouts.** `app/{hospital,locum-tenens,working-doctor,super-admin}/layout.tsx`
become `async` Server Components:

```tsx
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");
const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
if (profile && profile.role !== "<role>") redirect(roleHome(profile.role));
return <AppShell navItems={…} initialProfile={profile}>{children}</AppShell>;
```

`AppShell` accepts an optional `initialProfile` used for first paint; the client
`auth-provider` still hydrates and takes over. The client-side `requiredRole` gate in
`AppShell` stays as defense-in-depth but no longer causes the visible redirect flash.

**`auth-provider.tsx`.**
- `createClient()` uses `lib/supabase/env` (no inline literals).
- `supabase.auth.getUser()` remains the source of truth; the `lt-auth-session` localStorage
  cache is kept only for instant first paint and is cleared on `SIGNED_OUT`.
- `fetchProfile`'s client-side `insert` becomes
  `upsert({...}, { onConflict: "id", ignoreDuplicates: true })` so it stops racing the
  `on_auth_user_created` trigger; a conflict is not logged.
- All `console.warn`/`console.error` go through `reportSupabase`.
- `login(role)` (mock session) is gated to offline mode; in online mode it is a no-op that
  `reportSupabase`s "mock login ignored (online mode)".

**`proxy.ts`.**
- Cookie `setAll` keeps `options` (fixes the unused-var lint warning) and mirrors the
  `@supabase/ssr` reference `updateSession` shape.
- The `lt-auth-session` cookie bypass is deleted: that key lives in `localStorage`, so
  `request.cookies.get("lt-auth-session")` is always `null` and the branch never runs.
- Unauthenticated request to a protected prefix → redirect to `/login` (unchanged intent,
  dead fallback removed). In offline mode (`!isSupabaseConfigured`) the proxy is a pass-
  through `NextResponse.next()`.

### Unit 8 — `useLocalStorageState` (`hooks/use-local-storage-state.ts`)

- Memoize parsing: keep the raw string from `useSyncExternalStore`, and derive the parsed
  value through a module-level `Weak-ish` cache keyed by `key + rawString` (or a `useRef`
  holding `{ raw, parsed }` and re-parsing only when `raw` changes). Result: stable
  reference across renders when storage has not changed → context `value` stops churning.
- `getServerSnapshot` accepts an injected server value (default `null`) so a future
  server-seeded provider can hand SSR data in without a mismatch. Not wired to a caller in
  this pass, but the signature lands now.
- `setValue` still writes `localStorage` + dispatches the custom event; no behavior change.

### Data flow (online mode)

```
request → proxy.ts (refresh Supabase session cookie, gate protected prefixes)
        → role layout (Server Component): getUser + profile, redirect on mismatch
        → AppShell (initialProfile for first paint)
        → AuthProvider (client): getUser is truth, localStorage = paint cache
        → AppDataProvider (client): slices start [], sync effect fills from services,
          realtime patches doctors/facilities, mutations optimistic → await → reconcile/rollback
        → services: { data, error }, never mock, row mappers pure
        → reportSupabase: formatted strings only, warn by default
```

### Error handling summary

| Situation | Behavior |
|---|---|
| Query error (online) | slice unchanged, `reportSupabase` warn, no toast (read path) |
| Query zero rows (online) | slice set to `[]`, empty state renders |
| Mutation error (real id) | optimistic rollback + `toast.error(reason)` |
| Mutation on local-only id | kept local, one dev warn, no toast |
| Env not configured | offline mode, mock data, visible banner, proxy pass-through |
| Auth `getUser` fails in layout | `redirect("/login")` |
| Realtime not `SUBSCRIBED` | one `reportSupabase` warn |

## Testing

The repo has **no test setup today** (no `test` script, no runner in `package.json`). The
plan's first task is to add one — `vitest` (aligns with the Vite/React ecosystem already
present) with a single `npm test` script — before writing the unit tests below. If adding
a runner is rejected during planning, these become one-off `tsx` scripts under
`scripts/checks/` instead.

- **Unit (new):**
  - `describeSupabaseError` — PostgrestError-shaped, AuthError-shaped, plain Error, string,
    null.
  - `reportSupabase` — asserts `console.error` is never called with a non-string arg;
    `warn` vs `error` routing.
  - Row mappers (`mapDoctorRow`, `mapFacilityRow`, shift/payout/rating mappers) — snake→
    camel, null coalescing, nested `profiles` join, missing optional columns.
  - `isSupabaseConfigured` — both set / one missing / neither.
- **Integration (manual, documented in the plan):**
  - Migrations applied → signup as each role reaches its onboarding screen with no overlay.
  - `getDoctors()` / `getFacilities()` with zero rows → dashboards show empty states.
  - Create a shift → row in `shifts` → reload → still there (persistence, not localStorage).
  - Force a mutation failure (revoke a policy) → optimistic change rolls back + toast.
  - `next dev`, one page per role, console open → zero hydration warnings, zero overlays.
- **Gates:** `npx tsc --noEmit` exit 0 · `npx eslint` no new warnings · `npx next build`
  succeeds · manual dev smoke above.

## Out of scope (explicit)

- Server-fetching all nine data slices into the providers (only auth/profile is
  server-rendered here). Follow-up.
- Removing `localStorage` persistence entirely.
- Per-file hydration audit of all ~60 routes — only the shared layer plus the busiest
  pages (`*/dashboard`, `locum-tenens/marketplace`, `hospital/replacement-requests`,
  `super-admin/doctors`) are swept.
- Replacing react-hook-form / TanStack Table to clear the React-Compiler warnings.
- Auth UI/UX redesign; OAuth provider setup.

## Risks

- **Applying migration 007** rewrites the `user_role` / `doctor_kind` enums. If the live DB
  already partially matches, the guarded `DO $$` blocks handle it; still, take a Supabase
  backup first (noted in the RLS checklist).
- **Empty states everywhere on first deploy.** Online mode with an empty DB means
  dashboards render empty until real signups exist. This is intended per the approved
  principle but is a visible change from today's seeded look.
- **`.select().single()` on writes** requires the RLS `SELECT` policy to allow reading the
  just-written row. The audit + checklist must confirm this for each table.
- **Server Component layouts opt routes into dynamic rendering** (they read cookies). Build
  output will show these routes as `ƒ (Dynamic)`; acceptable for authenticated areas.
