# Supabase-first Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Supabase the single source of truth when it is configured, confine mock data to an explicit offline mode, and stop swallowed Supabase errors from surfacing as Next.js dev overlays.

**Architecture:** A small `env` module decides "online" (both `NEXT_PUBLIC_SUPABASE_*` set) vs "offline". Service functions return `{ data, error }` and never import mock data. `AppDataProvider` starts empty online, fills from services, and runs mutations optimistically with rollback + toast on failure. A new server Supabase client powers async Server Component role layouts. All Supabase error logging goes through one `reportSupabase()` helper that only ever passes strings to `console.*`.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts` = renamed middleware, async `cookies()`), React 19, TypeScript, `@supabase/ssr` 0.12, `@supabase/supabase-js` 2.112, `sonner` toasts, `vitest` (added in Task 1).

**Spec:** `docs/superpowers/specs/2026-09-03-supabase-first-data-layer-design.md`

## Global Constraints

- Never pass a raw error object as an argument to `console.error` / `console.warn` / `console.log`. Format to a string first. Raw objects passed to `console.error` are what Next.js 16 promotes to the full-screen dev overlay.
- No mock-data imports (`@/lib/mock-data/*`) anywhere under `lib/supabase/`. Mock data is referenced only by `context/app-data-provider.tsx`, and only in offline mode.
- No hardcoded Supabase URL or anon-key literals in source. Read them from `lib/supabase/env.ts`.
- "Online mode" ⇔ `isSupabaseConfigured === true` ⇔ both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are non-empty.
- A successful query returning zero rows is a real empty state. Never fall back to seed data on empty in online mode.
- Every mutation in `AppDataProvider` is `async`, awaits its service call, and on `error` rolls back the optimistic update and shows `toast.error`.
- Verification gates for every task: `npx tsc --noEmit` exits 0, `npx eslint .` produces no new warnings beyond the 10 pre-existing ones (React-Compiler "incompatible library" notes + a few `exhaustive-deps`).
- Commit after each task with a `feat:` / `refactor:` / `chore:` / `docs:` prefix. End every commit message with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01LLNZmtpYqQU6uguVTiqQah
  ```

---

## File Structure

**New files:**
- `lib/supabase/env.ts` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `isSupabaseConfigured`.
- `lib/supabase/log.ts` — `describeSupabaseError(err)`, `reportSupabase(context, err, opts?)`.
- `lib/supabase/server.ts` — async `createClient()` for Server Components / Route Handlers.
- `lib/supabase/mappers.ts` — pure row-mapping functions extracted from `shifts.ts`, `payouts.ts`, `ratings.ts` (the `doctors.ts` / `facilities.ts` mappers are already top-level exports and stay where they are, re-exported from here for one import site).
- `components/layout/offline-mode-banner.tsx` — fixed dev banner shown in offline mode.
- `vitest.config.ts` + `tests/` — unit tests.
- `docs/superpowers/specs/2026-09-03-supabase-rls-checklist.md` — RLS + realtime + trigger requirements (companion doc, produced by Task 2).

**Modified files:**
- `lib/supabase/client.ts` — use `env.ts`, drop literals.
- `lib/supabase/services/utils.ts` — keep `isUuid` only; `describeSupabaseError` moves to `log.ts`.
- `lib/supabase/services/{shifts,doctors,facilities,payouts,ratings,notifications,saved-shifts}.ts` — `{ data, error }` contracts, no mock imports, `reportSupabase`.
- `hooks/use-local-storage-state.ts` — memoized parse, `getServerSnapshot(serverValue?)`.
- `context/app-data-provider.tsx` — env-aware seed, new read/write contracts, async mutations, banner, realtime status.
- `context/auth-provider.tsx` — `env.ts`, `upsert` profile, `reportSupabase`, offline-gated `login()`.
- `proxy.ts` — proper cookie `setAll`, drop dead `lt-auth-session` bypass, offline pass-through.
- `app/{hospital,locum-tenens,working-doctor,super-admin}/layout.tsx` — async Server Components.
- `components/layout/app-shell.tsx` — accept optional `initialProfile`.
- `types/index.ts` — `AppDataContextValue` mutation signatures become `Promise`-returning where they now await.
- `components/forms/{broadcast-shift-form,request-replacement-dialog,register-doctor-form,rate-hospital-dialog,onboarding-wizard,hospital-onboarding-wizard,working-doctor-onboarding-wizard}.tsx` — `await` mutations, don't navigate on failure.
- `apply_pending_migrations.sql` — only if Task 2's audit finds a gap.
- `package.json` — `vitest` devDependency + `test` script.

---

## Task 1: Test runner + environment module

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/supabase/env.ts`
- Create: `tests/supabase/env.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `lib/supabase/env.ts` exports:
    - `SUPABASE_URL: string` — `process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""`
    - `SUPABASE_ANON_KEY: string` — `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""`
    - `isSupabaseConfigured: boolean` — `Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)`
  - `npm test` runs vitest once (no watch).

- [ ] **Step 1: Add vitest to package.json**

Run: `npm install -D vitest@^2`

Then edit `package.json` `"scripts"` to add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

If `npm install` is unavailable in this environment, STOP and raise it at the checkpoint — the fallback (authoring tests as `node --test` `.mjs` files) changes every later test step and needs a decision.

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 3: Write the failing test**

`tests/supabase/env.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadEnv() {
  vi.resetModules();
  return import("@/lib/supabase/env");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isSupabaseConfigured", () => {
  it("is true when both env vars are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const { isSupabaseConfigured } = await loadEnv();
    expect(isSupabaseConfigured).toBe(true);
  });

  it("is false when the anon key is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { isSupabaseConfigured } = await loadEnv();
    expect(isSupabaseConfigured).toBe(false);
  });

  it("is false when neither is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { isSupabaseConfigured } = await loadEnv();
    expect(isSupabaseConfigured).toBe(false);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/supabase/env'`.

- [ ] **Step 5: Create lib/supabase/env.ts**

```ts
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when the app has real Supabase credentials — "online mode". */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 7: Point the browser client at env.ts**

Rewrite `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
```

- [ ] **Step 8: Verify gates**

Run: `npx tsc --noEmit` → exit 0. `npx eslint .` → no new warnings.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/supabase/env.ts lib/supabase/client.ts tests/supabase/env.test.ts
git commit -m "chore: add vitest and Supabase env module"
```

---

## Task 2: Migration audit + RLS checklist

**Files:**
- Create: `docs/superpowers/specs/2026-09-03-supabase-rls-checklist.md`
- Modify (only if a gap is found): `apply_pending_migrations.sql`

**Interfaces:**
- Consumes: nothing (documentation task).
- Produces: a verified `apply_pending_migrations.sql` the user runs, plus the checklist doc.

- [ ] **Step 1: Cross-check every column the code touches against the migration DDL**

Read `supabase/migrations/001_initial_schema.sql` through `010`, plus `apply_pending_migrations.sql`. Build a table: for each `.from("<table>").select/insert/update(...)` and each `map*Row` field in `lib/supabase/services/*.ts`, record the column name and confirm a migration creates it. Pay attention to:
  - `shifts`: `department_name`, `facility_name`, `facility_id`, `location` (jsonb), `assigned_doctor_id`, `code_red`, `required_qualification`, `supervisor_name`, `emergency_contact`, `application_deadline`, `experience_level`, `sub_specialty`, `doctors_needed`, `hourly_rate`, `shift_type`, `start_time`, `end_time`.
  - `doctors`: `verification_details` (jsonb), `uploaded_documents` (jsonb, migration 009), `certifications` (jsonb, migration 009), `doctor_kind`, `profile_id`, `first_name`, `last_name`, `sub_specialty`, `license_number`, `license_expiry`, `npi_number`, `years_of_experience`, `employment_type`, `preferred_locations`, `review_count`.
  - `facilities`: `verification_status` (jsonb checklist — note the collision with `profiles.verification_status` which is a text status), `uploaded_documents` (migration 009), `profile_id`, `registration_number`, `government_license`, `hospital_type`, `contact_person`.
  - `payouts`: `has_timesheet`, `has_clinical_notes` (migration 008), `gross_pay`, `platform_fee_pct`, `net_payout`, `submitted_at`, `approved_at`, `paid_at`.
  - `profiles`: `completed_onboarding`, `verification_status` (must exist before migration 005's trigger inserts them — confirm migration 002 adds them).
  - `saved_shifts`, `ratings`, `notifications` tables exist with the referenced columns.

- [ ] **Step 2: If any referenced column is created by no migration, add a guarded statement to `apply_pending_migrations.sql`**

Use the existing idempotent style, e.g.:
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_onboarding BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'Pending';
```
Place additions in the migration block whose comment matches their purpose, or a new `-- Migration 002 backfill` block near the top if they belong to the base schema.

- [ ] **Step 3: Decide the `facilities.verification_status` naming collision**

If `mapFacilityRow` reads `item.verification_status` as the jsonb checklist while `updateFacilityRegistrationStatusInSupabase` writes the text status onto `profiles.verification_status`, the two are different columns on different tables and the code is already consistent — document that in the checklist and do nothing. Only if the same table has both meanings on one column, rename the facilities jsonb column to `verification_details` (guarded `ALTER TABLE ... RENAME COLUMN`) and note that `facilities.ts` must be updated in Task 7/8.

- [ ] **Step 4: Write the RLS checklist doc**

`docs/superpowers/specs/2026-09-03-supabase-rls-checklist.md` covering, per table (`profiles`, `facilities`, `doctors`, `shifts`, `applications`, `replacement_requests`, `payouts`, `ratings`, `notifications`, `saved_shifts`):
  - `SELECT` policy: authenticated users can read (needed so `.select()` after a write returns the row — see Task 8).
  - `INSERT`/`UPDATE`/`DELETE` policy: owner (`auth.uid() = profile_id` / `user_id`) or `is_super_admin()`.
  - Realtime: `doctors` and `facilities` are in the `supabase_realtime` publication (migration 010).
  - Trigger functions `handle_new_user`, `is_super_admin` are `SECURITY DEFINER SET search_path = public, pg_temp`.
  - A one-line "take a database backup before running migration 007" warning (it rewrites the `user_role` / `doctor_kind` enums).

- [ ] **Step 5: Commit, then hand the SQL to the user**

```bash
git add docs/superpowers/specs/2026-09-03-supabase-rls-checklist.md apply_pending_migrations.sql
git commit -m "docs: verify pending migrations and document RLS requirements"
```

Tell the user: "Run `apply_pending_migrations.sql` in the Supabase SQL Editor now; later tasks assume the schema matches." Implementation of code tasks can proceed in parallel; the integration checks in Task 18 need the SQL applied.

---

## Task 3: `lib/supabase/log.ts` — error formatting and reporting

**Files:**
- Create: `lib/supabase/log.ts`
- Modify: `lib/supabase/services/utils.ts` (remove `describeSupabaseError`, keep `isUuid`)
- Create: `tests/supabase/log.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `describeSupabaseError(err: unknown): string` — pulls `message`, `code`, `details`, `hint` off PostgREST/Auth error shapes; `"Unknown error"` when there is no message; passes plain `Error` and `string` through.
  - `reportSupabase(context: string, err: unknown, opts?: { level?: "warn" | "error" }): void` — logs exactly one string: `` `[supabase] ${context}: ${describeSupabaseError(err)}` ``. Default level `"warn"` → `console.warn`. `"error"` → `console.error`. Never receives or forwards a non-string to `console.*`.

- [ ] **Step 1: Write the failing test**

`tests/supabase/log.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeSupabaseError, reportSupabase } from "@/lib/supabase/log";

afterEach(() => vi.restoreAllMocks());

describe("describeSupabaseError", () => {
  it("formats a PostgREST-shaped error with code/details/hint", () => {
    const e = { message: "column missing", code: "PGRST204", details: "d", hint: "h" };
    expect(describeSupabaseError(e)).toBe("column missing | code: PGRST204 | details: d | hint: h");
  });

  it("handles a plain Error", () => {
    expect(describeSupabaseError(new Error("boom"))).toBe("boom");
  });

  it("handles a string", () => {
    expect(describeSupabaseError("nope")).toBe("nope");
  });

  it("handles null / object with no message", () => {
    expect(describeSupabaseError(null)).toBe("null");
    expect(describeSupabaseError({})).toBe("Unknown error");
  });
});

describe("reportSupabase", () => {
  it("warns by default with a single string argument", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    reportSupabase("getShifts", { message: "x", code: "PGRST100" });
    expect(errSpy).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);
    expect(spy.mock.calls[0][0]).toBe("[supabase] getShifts: x | code: PGRST100");
  });

  it("routes level:error to console.error, still one string", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    reportSupabase("invariant", new Error("bad"), { level: "error" });
    expect(spy.mock.calls[0]).toEqual(["[supabase] invariant: bad"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- log`
Expected: FAIL — module not found.

- [ ] **Step 3: Create lib/supabase/log.ts**

```ts
/**
 * PostgrestError / AuthError extend Error, so `.message` is a non-enumerable own
 * property that generic serialization (and Next's dev overlay) silently drops,
 * printing "{}". Pull the useful fields out explicitly.
 */
export function describeSupabaseError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error && !("code" in err) && !("details" in err)) return err.message;
  if (!err || typeof err !== "object") return String(err);
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  const parts = [e.message || "Unknown error"];
  if (e.code) parts.push(`code: ${e.code}`);
  if (e.details) parts.push(`details: ${e.details}`);
  if (e.hint) parts.push(`hint: ${e.hint}`);
  return parts.join(" | ");
}

/**
 * The ONLY place Supabase failures get logged. Emits a single formatted string —
 * never a raw error object, which is what Next.js 16 escalates to a full-screen
 * overlay. Default level is "warn" (an expected fallback / handled outcome);
 * reserve "error" for genuine invariant violations.
 */
export function reportSupabase(
  context: string,
  err: unknown,
  opts: { level?: "warn" | "error" } = {}
): void {
  const line = `[supabase] ${context}: ${describeSupabaseError(err)}`;
  if (opts.level === "error") console.error(line);
  else console.warn(line);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- log`
Expected: PASS.

- [ ] **Step 5: Trim utils.ts**

In `lib/supabase/services/utils.ts` delete the `describeSupabaseError` function and its doc comment. Keep `UUID_RE` and `isUuid`. (Grep confirms `describeSupabaseError` has no importers today, so nothing else breaks.)

- [ ] **Step 6: Verify gates + commit**

Run: `npx tsc --noEmit`, `npx eslint .`.
```bash
git add lib/supabase/log.ts lib/supabase/services/utils.ts tests/supabase/log.test.ts
git commit -m "feat: add reportSupabase, the single Supabase error log path"
```

---

## Task 4: Route all Supabase logging through `reportSupabase`

**Files:**
- Modify: `lib/supabase/services/{shifts,doctors,facilities,payouts,ratings,notifications,saved-shifts}.ts`
- Modify: `lib/supabase/storage.ts`
- Modify: `context/app-data-provider.tsx`
- Modify: `context/auth-provider.tsx`

**Interfaces:**
- Consumes: `reportSupabase` from Task 3.
- Produces: zero `console.error(<non-string>)` and zero `console.warn("...", errObj)` in `lib/supabase/**`, `hooks/**`, `context/**`. Read contracts and return types are UNCHANGED in this task — logging only.

- [ ] **Step 1: Replace every `console.error(msg, err)` / `console.warn(msg, err?.message)` in the service files**

For each of the 7 service files, each catch block and each `if (error …)` branch: replace
```ts
console.error("Failed to fetch shifts from Supabase:", err);
```
with
```ts
reportSupabase("getShifts", err);
```
Use the enclosing function name as the `context`. For write failures use `` `${fnName}(${id})` `` when an id is in scope. Add `import { reportSupabase } from "@/lib/supabase/log";` to each file. Remove now-unused `error?.message` interpolations.

- [ ] **Step 2: Same treatment for `lib/supabase/storage.ts`**

Lines 107 and 129 (`console.warn(..., uploadError)` and `console.error("Storage upload exception:", error)`) → `reportSupabase("uploadDocumentToStorage", uploadError)` and `reportSupabase("uploadDocumentToStorage", error, { level: "error" })`.

- [ ] **Step 3: Same for the two context files**

`context/app-data-provider.tsx`: the three `console.warn("Supabase ... error:", err)` calls in the sync / realtime / notifications effects → `reportSupabase("AppDataProvider.sync", err)` etc.
`context/auth-provider.tsx`: the `console.warn` calls in `fetchProfile` / `checkUser` and the `console.warn("Supabase signup error:", error.message)` → `reportSupabase("auth.fetchProfile", e)` / `reportSupabase("auth.signUp", error)`.

- [ ] **Step 4: Grep to prove the sweep is complete**

Run: `grep -rn "console\.\(error\|warn\)" lib/supabase context hooks`
Expected: only occurrences are inside `lib/supabase/log.ts`. Any other hit is a miss — fix it.

- [ ] **Step 5: Verify gates + manual check**

Run: `npx tsc --noEmit`, `npx eslint .`. Run `npm run dev`, open `/signup`, submit an already-registered email → toast appears, **no red overlay**, console shows one `[supabase] auth.signUp: User already registered ...` line.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase context
git commit -m "refactor: route all Supabase logging through reportSupabase"
```

---

## Task 5: `useLocalStorageState` — stop per-render parse churn

**Files:**
- Modify: `hooks/use-local-storage-state.ts`
- Create: `tests/hooks/use-local-storage-state.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `useLocalStorageState<T>(key, initialValue, serverValue?)` — return tuple `[value, setValue, reset]` unchanged. `value` keeps a **stable reference** across renders while `localStorage[key]` is unchanged. `getServerSnapshot` returns `serverValue ?? null`.

- [ ] **Step 1: Write the failing test**

`tests/hooks/use-local-storage-state.test.ts` (vitest `environment: "jsdom"` for this file — add `// @vitest-environment jsdom` at the top):
```ts
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

describe("useLocalStorageState", () => {
  it("returns a stable value reference across re-renders when storage is unchanged", () => {
    localStorage.setItem("k", JSON.stringify([1, 2, 3]));
    const { result, rerender } = renderHook(() => useLocalStorageState<number[]>("k", []));
    const first = result.current[0];
    rerender();
    expect(result.current[0]).toBe(first); // same reference, not just deep-equal
  });

  it("falls back to initialValue when storage is empty", () => {
    const init = ["x"];
    const { result } = renderHook(() => useLocalStorageState<string[]>("empty", init));
    expect(result.current[0]).toBe(init);
  });
});
```

Add dev deps if missing: `npm i -D @testing-library/react jsdom`. If that install is blocked, raise at checkpoint; a `node --test` port of this needs a DOM shim.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- use-local-storage-state`
Expected: FAIL on the stable-reference assertion (current code `JSON.parse`s every render).

- [ ] **Step 3: Implement memoized parse**

Rewrite the hook body so the parsed value is cached against the raw string:
```ts
export function useLocalStorageState<T>(key: string, initialValue: T, serverValue?: T) {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    window.addEventListener(eventName(key), callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener(eventName(key), callback);
    };
  }, [key]);

  const getSnapshot = useCallback(() => window.localStorage.getItem(key), [key]);
  const getServerSnapshot = useCallback(() => serverValue ?? null, [serverValue]);

  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const cache = useRef<{ raw: string | T | null; parsed: T }>({ raw: null, parsed: initialValue });
  const value = useMemo(() => {
    if (stored === null) return initialValue;
    if (typeof stored !== "string") return stored as T;      // serverValue passthrough
    if (cache.current.raw === stored) return cache.current.parsed;
    const parsed = JSON.parse(stored) as T;
    cache.current = { raw: stored, parsed };
    return parsed;
  }, [stored, initialValue]);

  const setValue = useCallback((updater: T | ((prev: T) => T)) => {
    const current = readValue(key, initialValue);
    const next = typeof updater === "function" ? (updater as (prev: T) => T)(current) : updater;
    window.localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event(eventName(key)));
  }, [key, initialValue]);

  const reset = useCallback(() => setValue(initialValue), [setValue, initialValue]);
  return [value, setValue, reset] as const;
}
```
Add `useMemo`, `useRef` to the React import.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- use-local-storage-state`
Expected: PASS.

- [ ] **Step 5: Verify gates + commit**

```bash
git add hooks/use-local-storage-state.ts tests/hooks/use-local-storage-state.test.ts package.json package-lock.json
git commit -m "perf: memoize useLocalStorageState parse to stop context re-render churn"
```

---

## Task 6: Extract and test row mappers

**Files:**
- Create: `lib/supabase/mappers.ts`
- Modify: `lib/supabase/services/{shifts,payouts,ratings}.ts` (import mapper instead of inline)
- Create: `tests/supabase/mappers.test.ts`

**Interfaces:**
- Consumes: `Shift`, `PostShiftRecord`, `Rating`, `Doctor`, `Facility`, `AppNotification` from `@/types` / `@/lib/mock-data/organizations`.
- Produces, all pure (`Record<string, unknown>` row → domain object):
  - `mapShiftRow(item): Shift`
  - `mapPayoutRow(item): PostShiftRecord`
  - `mapRatingRow(item): Rating`
  - re-exports `mapDoctorRow` (from `./services/doctors`) and `mapFacilityRow` (from `./services/facilities`)
  - `mapNotificationRow(item, now?: Date): AppNotification` — `now` param makes the `formatDistanceToNow` deterministic in tests.

- [ ] **Step 1: Write the failing test**

`tests/supabase/mappers.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mapShiftRow, mapPayoutRow, mapRatingRow, mapNotificationRow } from "@/lib/supabase/mappers";

describe("mapShiftRow", () => {
  it("maps snake_case columns and coerces numbers", () => {
    const s = mapShiftRow({
      id: "s1", title: "Night ICU", department_name: "ICU", facility_name: "CMC",
      facility_id: "f1", date: "2026-09-10", start_time: "20:00", end_time: "06:00",
      shift_type: "Night", hourly_rate: "220", doctors_needed: 2, experience_level: "Senior",
      status: "open", code_red: 1,
    });
    expect(s).toMatchObject({
      id: "s1", department: "ICU", facilityName: "CMC", hourlyRate: 220,
      doctorsNeeded: 2, codeRed: true, description: "", status: "open",
    });
    expect(s.location).toEqual({ address: "", city: "", state: "", lat: 0, lng: 0 });
  });
});

describe("mapPayoutRow", () => {
  it("coerces money fields and booleans", () => {
    const p = mapPayoutRow({
      id: "p1", shift_id: "s1", doctor_id: "d1", hours: "8", hourly_rate: "200",
      gross_pay: "1600", platform_fee_pct: "10", net_payout: "1440", status: "approved",
      submitted_at: "t", has_timesheet: true, has_clinical_notes: false,
    });
    expect(p).toMatchObject({ hours: 8, grossPay: 1600, netPayout: 1440, hasTimesheet: true, hasClinicalNotes: false });
  });
});

describe("mapRatingRow", () => {
  it("defaults categories to an object and coerces overallScore", () => {
    const r = mapRatingRow({
      id: "r1", shift_id: "s1", direction: "hospital_to_doctor", doctor_id: "d1",
      facility_id: "f1", categories: null, overall_score: "4.5", created_at: "t",
    });
    expect(r.categories).toEqual({});
    expect(r.overallScore).toBe(4.5);
  });
});

describe("mapNotificationRow", () => {
  it("formats the timestamp relative to the injected now", () => {
    const now = new Date("2026-09-03T12:00:00Z");
    const n = mapNotificationRow(
      { id: "n1", title: "T", body: "B", type: "info", read: 0, created_at: "2026-09-03T11:00:00Z" },
      now
    );
    expect(n).toMatchObject({ id: "n1", title: "T", read: false, type: "info" });
    expect(n.timestamp).toMatch(/hour/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mappers` → FAIL, module not found.

- [ ] **Step 3: Create lib/supabase/mappers.ts**

Move the object literal from `shifts.ts` `getShifts().map(item => ({...}))` into `mapShiftRow`. Move `payouts.ts` inline mapper into `mapPayoutRow`. Move `ratings.ts` inline mapper into `mapRatingRow`. Extract `notifications.ts`'s mapper into `mapNotificationRow(item, now = new Date())` using `formatDistanceToNow(new Date(item.created_at), { addSuffix: true })` (pass `now` only where the lib supports it; otherwise compute the distance manually is out of scope — `date-fns` `formatDistanceToNow` reads system time, so accept the `/hour/` loose assertion and drop the `now` param if it complicates typing). Re-export:
```ts
export { mapDoctorRow } from "./services/doctors";
export { mapFacilityRow } from "./services/facilities";
```

- [ ] **Step 4: Rewire the three service files to import their mapper**

`shifts.ts`: `import { mapShiftRow } from "../mappers";` and `return data.map(mapShiftRow);`. Same for `payouts.ts` / `ratings.ts`. Leave `doctors.ts` / `facilities.ts` mappers defined in place (mappers.ts re-exports them).

- [ ] **Step 5: Run tests + gates**

Run: `npm test`, `npx tsc --noEmit`, `npx eslint .`. All green.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/mappers.ts lib/supabase/services/shifts.ts lib/supabase/services/payouts.ts lib/supabase/services/ratings.ts tests/supabase/mappers.test.ts
git commit -m "refactor: extract Supabase row mappers into a pure, tested module"
```

---

## Task 7: Service read contract → `{ data, error }`, no mock fallback

**Files:**
- Modify: `lib/supabase/services/{shifts,doctors,facilities,payouts,ratings,notifications}.ts`
- Create: `tests/supabase/services-read.test.ts`

**Interfaces:**
- Consumes: `reportSupabase`, mappers.
- Produces (all `getX` change shape):
  - `getShifts(): Promise<{ data: Shift[]; error: string | null }>`
  - `getReplacementRequests(): Promise<{ data: ReplacementRequest[]; error: string | null }>`
  - `getApplications(): Promise<{ data: Application[]; error: string | null }>`
  - `getDoctors(): Promise<{ data: Doctor[]; error: string | null }>`
  - `getFacilities(): Promise<{ data: Facility[]; error: string | null }>`
  - `getPayouts(): Promise<{ data: PostShiftRecord[]; error: string | null }>`
  - `getRatings(): Promise<{ data: Rating[]; error: string | null }>`
  - `getNotifications(userId: string): Promise<{ data: AppNotification[]; error: string | null }>` — non-uuid userId → `{ data: [], error: null }`.
  - Rule: query `error` → `{ data: [], error: describeSupabaseError(error) }` + `reportSupabase`. Thrown → same. Zero rows → `{ data: [], error: null }`. Success → `{ data: rows.map(map), error: null }`.
  - **All `import { X as initialX } from "@/lib/mock-data/*"` lines are deleted from these files.**

- [ ] **Step 1: Write the failing test (inject a fake Supabase client)**

`getX` currently calls `createClient()` internally. Refactor each `getX` to accept an optional client: `getShifts(client = createClient())`. Then:
```ts
import { describe, expect, it } from "vitest";
import { getShifts } from "@/lib/supabase/services/shifts";

function fakeClient(result: { data: unknown; error: unknown }) {
  const q = {
    select: () => q,
    order: () => Promise.resolve(result),
  };
  return { from: () => q } as never;
}

describe("getShifts", () => {
  it("returns rows mapped on success", async () => {
    const { data, error } = await getShifts(fakeClient({
      data: [{ id: "s1", title: "T", department_name: "ICU", facility_id: "f1", hourly_rate: "10", status: "open" }],
      error: null,
    }));
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].department).toBe("ICU");
  });

  it("returns { data: [], error: string } on query error — never mock data", async () => {
    const { data, error } = await getShifts(fakeClient({ data: null, error: { message: "boom", code: "PGRST" } }));
    expect(data).toEqual([]);
    expect(error).toBe("boom | code: PGRST");
  });

  it("returns { data: [], error: null } on zero rows", async () => {
    const { data, error } = await getShifts(fakeClient({ data: [], error: null }));
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- services-read` → FAIL (arity + return shape).

- [ ] **Step 3: Rewrite each `getX`**

Template (`shifts.ts`):
```ts
import { createClient } from "@/lib/supabase/client";
import { reportSupabase, describeSupabaseError } from "@/lib/supabase/log";
import { mapShiftRow } from "../mappers";
import type { Shift } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getShifts(
  client: SupabaseClient = createClient()
): Promise<{ data: Shift[]; error: string | null }> {
  try {
    const { data, error } = await client.from("shifts").select("*").order("created_at", { ascending: false });
    if (error) {
      reportSupabase("getShifts", error);
      return { data: [], error: describeSupabaseError(error) };
    }
    return { data: (data ?? []).map(mapShiftRow), error: null };
  } catch (err) {
    reportSupabase("getShifts", err);
    return { data: [], error: describeSupabaseError(err) };
  }
}
```
Apply the same shape to `getReplacementRequests`, `getApplications` (both currently fall back to mock on empty — remove that), `getDoctors`, `getFacilities`, `getPayouts`, `getRatings`, `getNotifications`. Delete every `@/lib/mock-data` import in these files. `getReplacementRequests` / `getApplications` keep their inline mappers or move them to `mappers.ts` if trivial — implementer's call, but keep them pure.

- [ ] **Step 4: Run tests + gates**

`npm test`, `npx tsc --noEmit`, `npx eslint .`. Green. TS will now flag `context/app-data-provider.tsx` consumers — that is expected and fixed in Task 9. If `tsc` fails only inside `app-data-provider.tsx`, that is acceptable for THIS task's commit ONLY IF Task 9 immediately follows; otherwise stub the provider call sites minimally to keep `tsc` green. Prefer: do Task 9 in the same session right after.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/services tests/supabase/services-read.test.ts
git commit -m "refactor: getX services return { data, error } and never fall back to mock data"
```

---

## Task 8: Service write contract → `{ data, error }`

**Files:**
- Modify: `lib/supabase/services/{shifts,doctors,facilities,payouts,ratings,notifications,saved-shifts}.ts`
- Create: `tests/supabase/services-write.test.ts`

**Interfaces:**
- Consumes: `reportSupabase`, `describeSupabaseError`, `isUuid`.
- Produces: every `*InSupabase` / `create*InSupabase` / `update*InSupabase` / `delete*InSupabase` returns `Promise<{ data: <Row> | null; error: string | null }>`:
  - non-uuid guard hit → `{ data: null, error: null }` + dev-only `reportSupabase("<fn>: skipped non-uuid id", ...)`.
  - PostgREST `error` or thrown → `{ data: null, error: describeSupabaseError(...) }` + `reportSupabase`.
  - success → `{ data: <persisted row from .select()>, error: null }` (or `{ data: null, error: null }` for `delete`).
  - Each writer takes an optional trailing `client` param for tests, like Task 7.
  - Exact names kept: `createShiftInSupabase`, `updateShiftStatusInSupabase`, `updateShiftAssignmentInSupabase`, `createReplacementRequestInSupabase`, `updateReplacementRequestStatusInSupabase`, `modifyReplacementRequestInSupabase`, `createApplicationInSupabase`, `updateApplicationStatusInSupabase`, `updateDoctorVerificationInSupabase`, `updateDoctorRegistrationStatusInSupabase`, `updateDoctorProfileInSupabase`, `updateFacilityVerificationInSupabase`, `updateFacilityRegistrationStatusInSupabase`, `updatePayoutStatusInSupabase`, `createRatingInSupabase`, `markNotificationReadInSupabase`, `createNotificationInSupabase`, `createSavedShiftInSupabase`, `deleteSavedShiftInSupabase`.

- [ ] **Step 1: Write the failing test**

`tests/supabase/services-write.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { updateShiftStatusInSupabase } from "@/lib/supabase/services/shifts";

function fakeClient(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  q.update = () => q; q.eq = () => q; q.select = () => q;
  q.single = () => Promise.resolve(result);
  q.then = (r: (v: unknown) => unknown) => Promise.resolve(result).then(r); // thenable for no-select paths
  return { from: () => q } as never;
}

describe("updateShiftStatusInSupabase", () => {
  it("skips a non-uuid id without error", async () => {
    const res = await updateShiftStatusInSupabase("doc-legacy-id", "open");
    expect(res).toEqual({ data: null, error: null });
  });

  it("returns error string on PostgREST failure", async () => {
    const res = await updateShiftStatusInSupabase(
      "11111111-1111-1111-1111-111111111111", "open",
      fakeClient({ data: null, error: { message: "denied", code: "42501" } })
    );
    expect(res.data).toBeNull();
    expect(res.error).toBe("denied | code: 42501");
  });

  it("returns the persisted row on success", async () => {
    const row = { id: "11111111-1111-1111-1111-111111111111", status: "open" };
    const res = await updateShiftStatusInSupabase(
      "11111111-1111-1111-1111-111111111111", "open",
      fakeClient({ data: row, error: null })
    );
    expect(res).toEqual({ data: row, error: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- services-write` → FAIL.

- [ ] **Step 3: Rewrite each writer**

Template:
```ts
export async function updateShiftStatusInSupabase(
  id: string,
  status: Shift["status"],
  client: SupabaseClient = createClient()
): Promise<{ data: unknown; error: string | null }> {
  if (!isUuid(id)) {
    if (process.env.NODE_ENV !== "production")
      reportSupabase("updateShiftStatusInSupabase: skipped non-uuid id", id);
    return { data: null, error: null };
  }
  try {
    const { data, error } = await client.from("shifts").update({ status }).eq("id", id).select().single();
    if (error) {
      reportSupabase(`updateShiftStatusInSupabase(${id})`, error);
      return { data: null, error: describeSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    reportSupabase(`updateShiftStatusInSupabase(${id})`, err);
    return { data: null, error: describeSupabaseError(err) };
  }
}
```
For `delete` (`deleteSavedShiftInSupabase`) skip `.select().single()`, return `{ data: null, error }`. For multi-field guards (`createReplacementRequestInSupabase` checks 3 ids) keep all guards; any miss → `{ data: null, error: null }`.

- [ ] **Step 4: Tests + gates + commit**

```bash
git add lib/supabase/services tests/supabase/services-write.test.ts
git commit -m "refactor: *InSupabase writers return { data, error } with the persisted row"
```

---

## Task 9: `AppDataProvider` — env-aware seed + new read contract

**Files:**
- Modify: `context/app-data-provider.tsx`

**Interfaces:**
- Consumes: `isSupabaseConfigured`, the `{ data, error }` `getX` services, `reportSupabase`.
- Produces: provider compiles against the Task 7 contracts; slices are `[]` on first paint in online mode; sync effect sets each slice from `data` whenever `error === null` (including empty).

- [ ] **Step 1: Env-aware initial values**

At the top of `AppDataProvider`:
```ts
const seed = isSupabaseConfigured
  ? { shifts: [], applications: [], payments: [], notifications: [], doctors: [], replacementRequests: [], savedShifts: [], ratings: [], facilities: [] }
  : { shifts: seedShifts, applications: seedApplications, payments: seedPayments, notifications: seedNotifications, doctors: seedDoctors, replacementRequests: seedReplacementRequests, savedShifts: [], ratings: seedRatings, facilities: seedFacilities };
```
Pass `seed.shifts` etc. as the `initialValue` to each `useLocalStorageState`. Keep the `"lt-*"` keys.

- [ ] **Step 2: Rewrite the sync effect to the new contract**

```ts
React.useEffect(() => {
  if (!isSupabaseConfigured) return;
  let cancelled = false;
  (async () => {
    const [shiftsR, replR, appsR, docsR, facsR, payR, ratR] = await Promise.all([
      getShifts(), getReplacementRequests(), getApplications(),
      getDoctors(), getFacilities(), getPayouts(), getRatings(),
    ]);
    if (cancelled) return;
    if (!shiftsR.error) setShifts(shiftsR.data);
    if (!replR.error) setReplacementRequests(replR.data);
    if (!appsR.error) setApplications(appsR.data);
    if (!docsR.error) setDoctors(docsR.data);
    if (!facsR.error) setFacilities(facsR.data);
    if (!payR.error) setPayments(payR.data);
    if (!ratR.error) setRatings(ratR.data);
  })();
  return () => { cancelled = true; };
}, [setShifts, setReplacementRequests, setApplications, setDoctors, setFacilities, setPayments, setRatings]);
```
The setters are stable (Task 5 made `useLocalStorageState`'s `setValue` depend only on `key` + stable `initialValue`), so the dependency array satisfies `exhaustive-deps` without re-running each render — resolves the lint warning at line 238.

- [ ] **Step 3: The notifications effect uses the new contract**

```ts
React.useEffect(() => {
  if (!isSupabaseConfigured || !user?.id) return;
  getNotifications(user.id).then(({ data, error }) => {
    if (!error) setNotifications(data);
  });
}, [user?.id, setNotifications]);
```

- [ ] **Step 4: Gates**

`npx tsc --noEmit` clean, `npx eslint .` — the two `exhaustive-deps` warnings at old lines 238/282 are gone; no new warnings.

- [ ] **Step 5: Commit**

```bash
git add context/app-data-provider.tsx
git commit -m "refactor: AppDataProvider seeds empty online, fills from { data, error } services"
```

---

## Task 10: `AppDataProvider` — async mutations with rollback

**Files:**
- Modify: `context/app-data-provider.tsx`
- Modify: `types/index.ts`

**Interfaces:**
- Consumes: Task 8 writers.
- Produces: `AppDataContextValue` — these members return `Promise`:
  - `broadcastShift(input): Promise<Shift>`
  - `createReplacementRequest(input): Promise<ReplacementRequest>`
  - `registerDoctor(input): Promise<Doctor>`
  - `registerSelfDoctor(input, kind): Promise<Doctor>`
  - `registerHospital(input): Promise<Facility>`
  - `submitRating(input): Promise<Rating>`
  - all `void`-returning mutations become `() => Promise<void>` (status updates, toggles, approvals). Names unchanged.
  - On a write `error`, the optimistic state change is reverted and `toast.error(\`Couldn't save: \${error}\`)` fires; the create-style methods reject with `new Error(error)`.

- [ ] **Step 1: Convert one mutation as the pattern — `updateShiftStatus`**

```ts
const updateShiftStatus = React.useCallback(async (id: string, status: Shift["status"]) => {
  let prev: Shift[] = [];
  setShifts((s) => { prev = s; return s.map((x) => (x.id === id ? { ...x, status } : x)); });
  const { error } = await updateShiftStatusInSupabase(id, status);
  if (error) {
    setShifts(prev);
    toast.error(`Couldn't update shift: ${error}`);
  }
}, [setShifts]);
```
`import { toast } from "sonner";` at the top.

- [ ] **Step 2: Convert the create-style mutations**

`broadcastShift`:
```ts
const broadcastShift = React.useCallback(async (input: NewShiftInput): Promise<Shift> => {
  const newShift: Shift = { id: crypto.randomUUID(), status: "open", ...CITY_MEDICAL, ...input, matchStats: { targetDoctors: 48, avgMatchScorePct: 95, estResponseMinutes: [5, 10] } };
  let prev: Shift[] = [];
  setShifts((s) => { prev = s; return [newShift, ...s]; });
  const { data, error } = await createShiftInSupabase(newShift);
  if (error) {
    setShifts(prev);
    toast.error(`Couldn't post shift: ${error}`);
    throw new Error(error);
  }
  if (data) setShifts((s) => s.map((x) => (x.id === newShift.id ? mapShiftRow(data as Record<string, unknown>) : x)));
  return newShift;
}, [setShifts]);
```
Apply the same shape to `createReplacementRequest`, `registerDoctor`, `registerSelfDoctor`, `registerHospital`, `submitRating`.

- [ ] **Step 3: Convert the remaining `void` mutations**

`updateApplicationStatus`, `applyToShift`, `withdrawApplication`, `approveAndProcessPayment`, `requestPaymentChanges`, `markNotificationRead`, `updateDoctorVerification`, `updateDoctorProfile`, `assignDoctorToShift`, `respondToShiftAssignment`, `updateReplacementRequestStatus`, `approveReplacementRequest`, `modifyReplacementRequest`, `toggleSaveShift`, `updateFacilityVerification`, `approveFacilityRegistration`, `rejectFacilityRegistration`, `approveDoctorRegistration`, `rejectDoctorRegistration` — each becomes `async`, captures `prev`, awaits its writer(s), rolls back + toasts on `error`. `confirmShiftAttendance` has no writer today; leave it sync (local-only) but note it with a `// local-only: no payouts/attendance table yet` comment.

For multi-write mutations (`approveReplacementRequest` writes a replacement-request status AND a shift assignment) await both; if either errors, roll back both slices and toast once.

- [ ] **Step 4: Update `types/index.ts`**

Change the `AppDataContextValue` signatures for the six create-style methods to `=> Promise<T>` and the converted `void` ones to `=> Promise<void>`. (If `AppDataContextValue` lives in `context/app-data-provider.tsx` rather than `types/index.ts`, edit it there — grep for `interface AppDataContextValue`.)

- [ ] **Step 5: Gates**

`npx tsc --noEmit` — now fails inside the 7 mutation-caller components. That is Task 11. Commit this task and Task 11 together in the same session; do not leave `main` with a red `tsc`.

- [ ] **Step 6: Commit**

```bash
git add context/app-data-provider.tsx types/index.ts
git commit -m "feat: AppDataProvider mutations await Supabase, roll back and toast on failure"
```

---

## Task 11: Update mutation callers

**Files:**
- Modify: `components/forms/broadcast-shift-form.tsx`
- Modify: `components/forms/request-replacement-dialog.tsx`
- Modify: `components/forms/register-doctor-form.tsx`
- Modify: `components/forms/rate-hospital-dialog.tsx`
- Modify: `components/forms/onboarding-wizard.tsx`
- Modify: `components/forms/hospital-onboarding-wizard.tsx`
- Modify: `components/forms/working-doctor-onboarding-wizard.tsx`

**Interfaces:**
- Consumes: the `Promise`-returning mutations from Task 10.
- Produces: each caller `await`s the mutation inside its existing `try/catch` (or adds one), and does **not** run its success side-effect (`toast.success`, `router.push`, dialog close, form reset) when the mutation throws.

- [ ] **Step 1: `broadcast-shift-form.tsx`**

Find the `broadcastShift(...)` call in `onSubmit`. Wrap:
```ts
try {
  await broadcastShift(payload);
} catch {
  return; // AppDataProvider already showed the toast
}
toast.success("Shift posted");
router.push("/hospital/active-shifts");
```
Remove any pre-existing non-awaited assumptions.

- [ ] **Step 2: Repeat for the other six**

Same shape: `await` the create call, `catch { return; }` before the navigate/close/reset. In the three onboarding wizards the call is `registerSelfDoctor` / `registerHospital` inside the final-step handler — guard the "advance to verification screen" / `router.push` behind a successful `await`.

- [ ] **Step 3: Gates**

`npx tsc --noEmit` → clean. `npx eslint .` → no new warnings. `npm test` → green.

- [ ] **Step 4: Manual smoke**

`npm run dev`. In offline mode (temporarily blank `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`): post a shift → success toast + navigation still work (writer returns `{data:null,error:null}` on the mock uuid). Restore `.env.local`.

- [ ] **Step 5: Commit**

```bash
git add components/forms
git commit -m "refactor: await AppDataProvider mutations, skip success side-effects on failure"
```

---

## Task 12: Offline banner + realtime subscribe status

**Files:**
- Create: `components/layout/offline-mode-banner.tsx`
- Modify: `context/app-data-provider.tsx`

**Interfaces:**
- Consumes: `isSupabaseConfigured`.
- Produces: `<OfflineModeBanner />` — renders `null` when `isSupabaseConfigured`, else a fixed bottom-left pill "Offline demo data — Supabase not configured" with a dismiss button that sets `sessionStorage["cb-offline-banner-dismissed"]`.

- [ ] **Step 1: Create the banner component** (`"use client"`, reads `sessionStorage` inside `useEffect` + `useHasMounted` guard so SSR/CSR match).

```tsx
"use client";
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useHasMounted } from "@/hooks/use-has-mounted";

export function OfflineModeBanner() {
  const mounted = useHasMounted();
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(sessionStorage.getItem("cb-offline-banner-dismissed") === "1");
  }, []);
  if (isSupabaseConfigured || !mounted || dismissed) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 shadow-sm">
      Offline demo data — Supabase not configured
      <button onClick={() => { sessionStorage.setItem("cb-offline-banner-dismissed", "1"); setDismissed(true); }} aria-label="Dismiss" className="text-amber-700 hover:text-amber-900">✕</button>
    </div>
  );
}
```

- [ ] **Step 2: Render it from `AppDataProvider`**

In the provider's return: `<AppDataContext.Provider value={value}>{children}<OfflineModeBanner /></AppDataContext.Provider>`.

- [ ] **Step 3: Realtime status callback**

In the realtime effect, guard with `if (!isSupabaseConfigured) return;` at the top, and change `.subscribe()` to:
```ts
.subscribe((status) => {
  if (status !== "SUBSCRIBED" && status !== "CLOSED")
    reportSupabase("AppDataProvider.realtime", `channel status: ${status}`);
});
```

- [ ] **Step 4: Gates + manual**

`npx tsc --noEmit`, `npx eslint .`. `npm run dev` with a blanked env var → banner shows, dismiss persists for the tab. Restore env.

- [ ] **Step 5: Commit**

```bash
git add components/layout/offline-mode-banner.tsx context/app-data-provider.tsx
git commit -m "feat: offline-mode banner and realtime subscribe-status logging"
```

---

## Task 13: Server Supabase client

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `tests/supabase/server.test.ts`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- Produces: `createClient(): Promise<SupabaseClient>` — built with `@supabase/ssr` `createServerClient` and Next's async `cookies()`; `setAll` is wrapped in try/catch (no-op during a Server Component render).

- [ ] **Step 1: Write the failing test** (mock `next/headers`)

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [{ name: "sb", value: "x" }], set: () => {} }),
}));

describe("server createClient", () => {
  it("builds a client that exposes auth + from", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const c = await createClient();
    expect(typeof c.auth.getUser).toBe("function");
    expect(typeof c.from).toBe("function");
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- server` → module not found.

- [ ] **Step 3: Create `lib/supabase/server.ts`**

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
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component render — cookies are read-only here; proxy.ts refreshes them.
        }
      },
    },
  });
}
```

- [ ] **Step 4: Pass + gates + commit**

```bash
git add lib/supabase/server.ts tests/supabase/server.test.ts
git commit -m "feat: server-side Supabase client for Server Components"
```

---

## Task 14: Role layouts become async Server Components

**Files:**
- Modify: `app/hospital/layout.tsx`
- Modify: `app/locum-tenens/layout.tsx`
- Modify: `app/working-doctor/layout.tsx`
- Modify: `app/super-admin/layout.tsx`
- Modify: `components/layout/app-shell.tsx`

**Interfaces:**
- Consumes: `lib/supabase/server.ts` `createClient`, `isSupabaseConfigured`.
- Produces: `AppShell` accepts `initialProfile?: UserProfile | null` (from `context/auth-provider`), used only for first-paint display; the client `AuthProvider` remains the runtime source of truth. Layouts redirect unauthenticated (online) users to `/login` and role-mismatched users to their own home.

- [ ] **Step 1: `AppShell` prop**

Add `initialProfile?: UserProfile | null` to `AppShellProps`. Where `AppShell` currently reads `name` / `title` / `role` from `useAuthRole()` for the header, fall back to `initialProfile` when the context value is still empty (`role == null`). Do not change the `requiredRole` client gate.

- [ ] **Step 2: Rewrite `app/locum-tenens/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { locumTenensNavItems } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const roleHome: Record<string, string> = {
  hospital: "/hospital/dashboard",
  working_doctor: "/working-doctor/dashboard",
  locum_tenens: "/locum-tenens/dashboard",
  super_admin: "/super-admin/dashboard",
};

export default async function LocumTenensLayout({ children }: { children: React.ReactNode }) {
  let initialProfile = null;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profile && profile.role !== "locum_tenens") redirect(roleHome[profile.role] ?? "/login");
    initialProfile = profile;
  }
  return (
    <AppShell navItems={locumTenensNavItems} rootLabel={PLATFORM.name} requiredRole="locum_tenens" initialProfile={initialProfile}>
      {children}
    </AppShell>
  );
}
```
Remove the `"use client"` directive from the file.

- [ ] **Step 3: Repeat for hospital / working-doctor / super-admin layouts**

Same body, swapping the role string, `navItems`, and `requiredRole`. Read each existing file first for extra props it passes to `AppShell` and preserve them.

- [ ] **Step 4: Gates**

`npx tsc --noEmit`, `npx eslint .`. `npx next build` → the four route groups show as `ƒ (Dynamic)`; build succeeds.

- [ ] **Step 5: Manual**

`npm run dev`, online mode, logged out → visiting `/locum-tenens/dashboard` server-redirects to `/login` with no flash of the shell. Logged in as the wrong role → redirected to the right home.

- [ ] **Step 6: Commit**

```bash
git add app/hospital/layout.tsx app/locum-tenens/layout.tsx app/working-doctor/layout.tsx app/super-admin/layout.tsx components/layout/app-shell.tsx
git commit -m "feat: role layouts server-render the session and gate before paint"
```

---

## Task 15: `auth-provider.tsx` cleanup

**Files:**
- Modify: `context/auth-provider.tsx`

**Interfaces:**
- Consumes: `isSupabaseConfigured`.
- Produces: no behavior change to the public `useAuthRole()` surface except `login(role)` becomes a no-op in online mode.

- [ ] **Step 1: `fetchProfile` insert → upsert**

Replace the `.insert({...}).select("*").single()` fallback block with:
```ts
const { data: newProfile, error: upsertError } = await supabase
  .from("profiles")
  .upsert(
    { id: userId, email: fallbackEmail, role: fallbackRole, full_name: fallbackName, verified: false, completed_onboarding: false, verification_status: "Pending" },
    { onConflict: "id", ignoreDuplicates: true }
  )
  .select("*")
  .maybeSingle();
if (!upsertError && newProfile) return newProfile as UserProfile;
```
A duplicate (trigger already created the row) is no longer logged.

- [ ] **Step 2: Gate `login()`**

```ts
const login = React.useCallback((role: UserRole) => {
  if (isSupabaseConfigured) {
    reportSupabase("auth.login", "mock login ignored (online mode)");
    return;
  }
  /* ...existing mock-session body... */
}, [setSession]);
```

- [ ] **Step 3: Confirm logging** — every `console.*` in this file already routed through `reportSupabase` in Task 4; re-grep to be sure.

- [ ] **Step 4: Gates + manual**

`npx tsc --noEmit`, `npx eslint .`. `npm run dev`: sign up a fresh user online → lands on onboarding, `profiles` row exists exactly once, no overlay.

- [ ] **Step 5: Commit**

```bash
git add context/auth-provider.tsx
git commit -m "refactor: idempotent profile upsert, offline-gated mock login"
```

---

## Task 16: `proxy.ts` cleanup

**Files:**
- Modify: `proxy.ts`

**Interfaces:**
- Consumes: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `isSupabaseConfigured`.
- Produces: proxy refreshes the Supabase auth cookie and redirects unauthenticated requests on protected prefixes to `/login`; pass-through when offline.

- [ ] **Step 1: Rewrite**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/env";

const PROTECTED = ["/hospital", "/working-doctor", "/locum-tenens", "/super-admin"];

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  if (!user && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/hospital/:path*", "/working-doctor/:path*", "/locum-tenens/:path*", "/super-admin/:path*"],
};
```
The dead `lt-auth-session` cookie branch and the hardcoded URL literal are gone; `setAll` now consumes `options`, clearing the `no-unused-vars` warning.

- [ ] **Step 2: Gates + manual**

`npx eslint .` → the `proxy.ts` warning is gone; total warnings drop to 9. `npx tsc --noEmit` clean. `npm run dev`: logged-out visit to `/hospital/dashboard` → redirect to `/login`; logged-in visit → passes through.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "refactor: proxy.ts drops dead demo bypass, offline pass-through, lint clean"
```

---

## Task 17: Hydration sweep of the shared layer + busy pages

**Files:**
- Modify: as found — expect `components/dashboard/activity-feed.tsx`, `components/dashboard/shift-details-sheet.tsx`, `components/landing/testimonials.tsx`, `components/layout/breadcrumbs.tsx` and up to four pages.
- Create: `docs/superpowers/specs/2026-09-03-mock-data-page-followups.md`

**Interfaces:**
- Consumes: `useHasMounted`.
- Produces: no in-render non-deterministic values in the swept files; a catalogued list of pages still importing `@/lib/mock-data` directly.

- [ ] **Step 1: Grep for hydration hazards in the shared layer + the 4 busy pages**

Run:
```bash
grep -rn "Date.now()\|new Date()\|Math.random()\|crypto.randomUUID()\|toLocaleDateString\|toLocaleTimeString\|toLocaleString" \
  context hooks components/layout components/dashboard \
  app/hospital/dashboard app/locum-tenens/dashboard app/working-doctor/dashboard \
  app/super-admin/dashboard app/locum-tenens/marketplace app/hospital/replacement-requests app/super-admin/doctors
```

- [ ] **Step 2: For each hit in render scope, fix it**

- Value only needed after interaction (ids for new rows, timestamps on submit): already inside a callback — leave it.
- Value rendered during SSR + CSR (relative times, "today" highlights, formatted dates): move behind `useHasMounted()` — render a stable placeholder (`—` or the ISO date) until `mounted`, then the localized string. Pattern:
  ```tsx
  const mounted = useHasMounted();
  <span>{mounted ? new Date(iso).toLocaleDateString() : iso.slice(0, 10)}</span>
  ```
- `formatDistanceToNow` in `mapNotificationRow` runs at fetch time on the client only (services are client-called) → no SSR pass → safe, no change.

- [ ] **Step 3: Catalogue the remaining mock-data pages**

`grep -rln "@/lib/mock-data" app` → write the list into `docs/superpowers/specs/2026-09-03-mock-data-page-followups.md` with a one-line note per page of which slice it should read from `useAppData()` instead. This is the follow-up backlog, explicitly out of scope for this plan (spec "Out of scope").

- [ ] **Step 4: Gates + manual**

`npx tsc --noEmit`, `npx eslint .`, `npm test`. `npm run dev`, open each of the 4 busy pages + one dashboard per role with the browser console visible → **zero** "hydration mismatch" / "Text content did not match" warnings.

- [ ] **Step 5: Commit**

```bash
git add context hooks components app docs/superpowers/specs/2026-09-03-mock-data-page-followups.md
git commit -m "fix: guard non-deterministic render values in shared layer + busy pages"
```

---

## Task 18: Full verification pass

**Files:** none (verification only). Any fix needed gets folded back into the owning task's file and re-committed here with a `fix:` message.

- [ ] **Step 1: Static gates**

Run, expecting clean:
```bash
npx tsc --noEmit
npx eslint .            # 9 warnings, all pre-existing library/exhaustive-deps notes; 0 errors
npm test                # all suites green
npx next build          # succeeds; role routes render as ƒ (Dynamic)
```

- [ ] **Step 2: Integration — requires `apply_pending_migrations.sql` already run (Task 2)**

With real `.env.local`:
1. `npm run dev`. Sign up as hospital, working_doctor, locum_tenens in turn → each reaches its onboarding screen, no overlay, one `profiles` row each.
2. Super-admin dashboard (`app/super-admin/doctors`) → shows the real new registrations (empty-state text only if the tables are genuinely empty), updates live on approve without refresh.
3. Post a shift as hospital → confirm a row lands in `shifts` (Supabase Table Editor) → hard-reload → the shift persists (came from DB, not localStorage).
4. Temporarily revoke the `shifts` UPDATE policy in Supabase → change a shift status in the UI → optimistic change reverts + `toast.error` with the real reason → restore the policy.
5. Blank `NEXT_PUBLIC_SUPABASE_URL` → app runs on seed data, offline banner visible, `/hospital/dashboard` reachable without redirect → restore.

- [ ] **Step 3: Hydration — clean console**

Click through one page per role section (12 routes) with DevTools console open. Zero hydration warnings, zero Supabase overlays.

- [ ] **Step 4: Final commit / PR**

```bash
git add -A
git commit -m "test: full verification pass for Supabase-first data layer"
```
Open a PR against `master` summarizing the 8 units and linking the spec.

---

## Self-Review

**Spec coverage:**
- Unit 1 (env, no literals) → Task 1. ✓
- Unit 2 (reportSupabase, describeSupabaseError activation, 31 sites, isUuid dev warn) → Tasks 3, 4, 8. ✓
- Unit 3 (schema audit, RLS checklist, self-sufficiency, facilities naming) → Task 2. ✓
- Unit 4 (`getX` → `{data,error}`, no mock imports, mappers extracted) → Tasks 6, 7. ✓
- Unit 5 (`*InSupabase` → `{data,error}` + `.select()`, local-only id → `{null,null}`) → Task 8. ✓
- Unit 6 (`AppDataProvider`: env seed, sync effect, async mutations, rollback+toast, offline banner, realtime status, exhaustive-deps) → Tasks 9, 10, 12. ✓
- Unit 6 caller updates → Task 11. ✓
- Unit 7 (`lib/supabase/server.ts`) → Task 13. ✓
- Unit 7 (role layouts async SC, `AppShell` `initialProfile`, `fetchProfile` upsert, `proxy.ts`, offline-gated `login`) → Tasks 14, 15, 16. ✓
- Unit 8 (`useLocalStorageState` memoized parse, `getServerSnapshot` arg) → Task 5. ✓
- Testing section (vitest add, unit targets, integration checklist, gates) → Tasks 1, 3, 5, 6, 7, 8, 13, 18. ✓
- Risks (migration 007 backup, empty states, `.select()` needs RLS read, dynamic rendering) → Task 2 checklist + Task 14 Step 4 + Task 18. ✓
- Out of scope (9-slice server fetch, full page audit, localStorage removal, RHF/Table swap) → respected; page backlog catalogued in Task 17 Step 3.

**Placeholder scan:** No "TBD"/"handle appropriately"/"similar to Task N" — each task repeats its own code. Task 2 is inherently an audit; its steps enumerate the exact columns and the exact idempotent SQL shape to add, and the RLS doc's contents are enumerated per table.

**Type consistency:**
- `getX` return `{ data: T[]; error: string | null }` — defined Task 7, consumed Task 9 with matching destructure. ✓
- `*InSupabase` return `{ data: Row | null; error: string | null }` — defined Task 8, consumed Task 10 (`const { error } = await`, `const { data, error } = await`). ✓
- create-style mutations `=> Promise<T>` throwing `new Error(error)` — Task 10 — consumed Task 11 (`try { await … } catch { return; }`). ✓
- `mapShiftRow(item: Record<string, unknown>): Shift` — Task 6 — reused in Task 10 Step 2 for write reconciliation. ✓
- `useLocalStorageState(key, initialValue, serverValue?)` — Task 5 — extra arg is optional, existing 2-arg calls in `AppDataProvider` / `auth-provider` still compile. ✓
- `AppShell` `initialProfile?: UserProfile | null` — Task 14 Step 1 defines, Steps 2–3 pass it. ✓
- `isSupabaseConfigured` — Task 1 — consumed in Tasks 9, 12, 13(via env), 14, 15, 16. ✓
