# Supabase-first data layer — verification status

> **Historical (2026-09-03).** Offline/mock-data mode was removed after this was written, and the auth gate now fails closed when the Supabase env vars are missing. For the current deployment steps see `README.md` → "Deploying to production".

**Branch:** `sdd/supabase-first-data-layer` · **Head:** `577b001` · **Date:** 2026-09-03
**Plan:** `docs/superpowers/plans/2026-09-03-supabase-first-data-layer.md`

## Static gates — ALL PASS (run at HEAD `577b001`)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint .` | 0 errors, 7 warnings — **all pre-existing**, none introduced by this work (6× React-Compiler "incompatible library" notes for TanStack Table / react-hook-form, 1× `react-hooks/exhaustive-deps` in `hooks/use-autosave.ts`). Baseline was 10 at branch start; this work *removed* 3 (2 stale `exhaustive-deps` in `app-data-provider.tsx`, 1 `no-unused-vars` in `proxy.ts`). |
| `npm test` (`vitest run`) | 27/27 across 7 files (`env`, `log`, `mappers`, `services-read`, `services-write`, `server`, `use-local-storage-state`) |
| `npx next build` | success. The 4 role sections + their pages render as `ƒ (Dynamic)` (they read cookies via the server-component layouts); public routes (`/login`, `/signup`, `/onboarding/*`, …) stay `○ (Static)`; `ƒ Proxy (Middleware)` present. |

## Integration checks — PENDING one user action

These require the pending migrations applied to the live Supabase project **and** a running dev server. They are NOT runnable from the implementation subagents.

### Blocking action for the user

Run **`apply_pending_migrations.sql`** (repo root) in the Supabase dashboard → SQL Editor → Run. It is idempotent (safe to re-run). It applies migrations 005–010 plus:
- a guarded `profiles.completed_onboarding` / `verification_status` backfill (migration 002 was only partially applied on the live project);
- the full RLS policy set for `replacement_requests`, `payouts`, `ratings`, `applications`, `notifications`, and a hardened `shifts` policy — including the 3-way UPDATE predicate (row owner **OR** facility owner **OR** `is_super_admin()`) needed for the hospital-driven approve/fill/reject flows.

**Take a database backup first** — migration 007 rewrites the `user_role` / `doctor_kind` enums. See `docs/superpowers/specs/2026-09-03-supabase-rls-checklist.md`.

### Checklist to run after the SQL is applied (`npm run dev`, browser console open)

1. Sign up as hospital, then working_doctor, then locum_tenens → each reaches its onboarding screen, no red dev overlay, exactly one `profiles` row per user (Supabase → Table Editor).
2. Super-admin → `/super-admin/doctors` → shows the real new registrations (empty-state text only if the tables are genuinely empty), and live-updates on approve without a manual refresh.
3. Post a shift as hospital → a row lands in `shifts` (Table Editor) → hard-reload the page → the shift persists (it came from the DB, not localStorage).
4. Temporarily revoke the `shifts` UPDATE policy in Supabase → change a shift's status in the UI → the optimistic change **reverts** and a `toast.error` shows the real reason → restore the policy.
5. Blank `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` → the app runs on seed data, the amber "Offline demo data" banner shows bottom-left, `/hospital/dashboard` is reachable without a redirect, and mutations no-op without an error toast → restore `.env.local`.
6. Click through one page per role section (12 routes) with DevTools console open → zero "hydration mismatch" / "Text content did not match" warnings, zero Supabase overlays.

## Deploy note — `NEXT_PUBLIC_*` must be set at **build** time

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` **must be present
in the build environment**, not only at runtime. `lib/supabase/env.ts` computes

```ts
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
```

from `process.env.NEXT_PUBLIC_*`, and Next inlines `NEXT_PUBLIC_*` as literals at
build time. A build run without them therefore compiles `isSupabaseConfigured`
down to a constant `false`, permanently — injecting the variables into the
container/host at runtime does **not** fix it, because there is no longer a
`process.env` lookup to satisfy.

The consequence is silent and security-relevant: the server-side auth gate in the
four role layouts (`app/{hospital,locum-tenens,super-admin,working-doctor}/layout.tsx`)
is wrapped in an `isSupabaseConfigured` check so the app can run on seed data
offline. With the constant folded to `false`, that gate is skipped — every role
section becomes reachable without a session, and the app serves seed data while
looking fully functional. Nothing errors and nothing logs.

**Runbook:** set both variables in the CI/CD build step (not just the runtime
service config) for every environment, and after deploying verify that visiting a
role route while logged out redirects to `/login` and that the amber "Offline demo
data" banner is **absent**. The banner's presence in a deployed build is the
visible symptom of a mis-scoped build env.

## Known follow-ups (not in this pass — see the ledger's deferred/parked lines)

- **25 `app/` pages still import `@/lib/mock-data` directly** → they show seed data regardless of the real DB. Catalogued with per-page slice mappings in `docs/superpowers/specs/2026-09-03-mock-data-page-followups.md`. This pass was scoped to the shared data layer; converting the pages is the next backlog.
- `Facility` type currently lives in `lib/supabase/services/facilities.ts` (re-exported from `lib/mock-data/organizations.ts`); its natural home is `@/types/index.ts`. Type-only, non-breaking — deferred to avoid a 7-file churn right before verification.
- `lib/format.ts` `formatDate()` has a latent SSR/client timezone day-shift edge — outside this pass's swept surface.
- ~~Offline SSR relies on `isSupabaseConfigured` (build-time-inlined `NEXT_PUBLIC_*`); a build produced without the env vars silently disables the server auth gate. Document this in the deploy runbook.~~ → promoted to the **Deploy note** section above.
- The 4 role layouts inline the same `createClient()` + `getUser()` + profile-fetch — could be DRY'd into one helper.
