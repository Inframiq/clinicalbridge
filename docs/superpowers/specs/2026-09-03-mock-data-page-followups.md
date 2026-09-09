# Mock-data page follow-ups

**Status:** backlog / follow-up. Out of scope for the 2026-09-03 Supabase-first
data-layer pass (which was scoped to the shared layer: `context/app-data-provider`,
the `hooks/use-*` selectors, the `lib/supabase/services/*` readers/writers, and the
mappers).

## Problem

25 page files under `app/` still `import` seed/mock data directly from
`@/lib/mock-data/*` instead of reading it through `useAppData()` (or the
`useShifts()` / `useDoctors()` / `useReplacementRequests()` selector hooks that
wrap it). In **offline mode** this is invisible — the provider is seeded from the
same modules. In **online mode** (`NEXT_PUBLIC_SUPABASE_*` set) these pages still
render the hard-coded seed rows, so they show fake data regardless of what is
actually in the database, while the rest of the app shows live rows. Each of
these imports needs to be replaced with the matching `useAppData()` slice, with
the page's "current user" rows resolved from the auth profile id rather than the
`currentDoctor` / `currentWorkingDoctor` seed singletons.

## Not data hazards (still listed for completeness)

- `import type { Facility } from "@/lib/mock-data/organizations"` — **type-only**
  import, erased at compile time, no runtime seed data. The controller decided
  against relocating the `Facility` type in this pass; these lines can stay until
  that type moves to `types/`.
- `DEPARTMENTS` from `@/lib/mock-data/departments` and the pseudo-clinical demo
  content (`shiftTimeline`, `patients` from `@/lib/mock-data/notifications`) are
  **static reference / demo content**, not user data. They have no `useAppData()`
  slice and can stay until (and unless) they become DB-backed.
- Everything from `@/lib/mock-data/analytics` (`earningsSeries`,
  `specialtyBreakdown`, `dayOfWeekBreakdown`, `timeOfDayBreakdown`,
  `performanceTrends`, `topFacilities`, `shiftOverviewSeries`,
  `applicationStatusBreakdown`) is **analytics-derived** — it should be computed
  from the real `shifts` / `applications` / `payments` slices, which is a larger
  piece of work than a slice swap.

## `useAppData()` slices available

`shifts` · `doctors` · `facilities` · `applications` · `payments` · `ratings` ·
`replacementRequests` · `notifications` · `savedShifts`

---

## hospital/

| path | mock-data it imports | `useAppData()` slice it should read instead |
| --- | --- | --- |
| `app/hospital/active-shifts/page.tsx` | `shiftTimeline` from `mock-data/notifications` | shift rows → `shifts`; the per-shift timeline is static demo content (n/a) |
| `app/hospital/analytics/page.tsx` | `doctors` from `mock-data/doctors`; `facilities` + `type Facility` from `mock-data/organizations`; `earningsSeries, specialtyBreakdown, dayOfWeekBreakdown, timeOfDayBreakdown, performanceTrends, topFacilities` from `mock-data/analytics` | `doctors`, `facilities`; series → n/a / analytics-derived (aggregate `shifts` + `payments`); `type Facility` is type-only |
| `app/hospital/applications/page.tsx` | `getShiftById` from `mock-data/shifts` | `shifts` (look up by id within the slice) |
| `app/hospital/dashboard/page.tsx` | `doctors` from `mock-data/doctors`; `activityFeed, notifications` from `mock-data/notifications`; `shiftOverviewSeries, applicationStatusBreakdown` from `mock-data/analytics` | `doctors`, `notifications` (`activityFeed` → derive from `notifications`); series → n/a / analytics-derived (from `shifts` + `applications`) |
| `app/hospital/departments/page.tsx` | `DEPARTMENTS` from `mock-data/departments` | n/a — static reference list |
| `app/hospital/ratings/page.tsx` | `doctors` from `mock-data/doctors` | `doctors` (+ `ratings` for the rating rows) |

## locum-tenens/

| path | mock-data it imports | `useAppData()` slice it should read instead |
| --- | --- | --- |
| `app/locum-tenens/analytics/page.tsx` | `currentDoctor, doctors` from `mock-data/doctors`; `facilities` from `mock-data/organizations`; analytics series from `mock-data/analytics` | `doctors` (current via auth profile id); `facilities`; series → n/a / analytics-derived |
| `app/locum-tenens/applications/page.tsx` | `currentDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity; application rows → `applications` |
| `app/locum-tenens/dashboard/page.tsx` | `currentDoctor` from `mock-data/doctors`; `earningsSeries` from `mock-data/analytics` | `doctors` keyed by auth identity; earnings → n/a / analytics-derived (from `payments`) |
| `app/locum-tenens/documents/page.tsx` | `currentDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity (document metadata lives on the doctor row) |
| `app/locum-tenens/earnings/page.tsx` | `currentDoctor` from `mock-data/doctors`; `earningsSeries` from `mock-data/analytics` | `doctors` keyed by auth identity; `payments` (+ analytics-derived series) |
| `app/locum-tenens/marketplace/page.tsx` | `currentDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity; shift listings already come from `useShifts()` |
| `app/locum-tenens/my-schedule/page.tsx` | `currentDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity; `shifts` filtered by `assignedDoctorId` |
| `app/locum-tenens/my-shifts/page.tsx` | `currentDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity; `shifts` + `applications` |
| `app/locum-tenens/post-shift/page.tsx` | `currentDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity; post-shift records → `payments` |
| `app/locum-tenens/ratings/page.tsx` | `currentDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity; `ratings` |
| `app/locum-tenens/settings/page.tsx` | `currentDoctor` from `mock-data/doctors`; `DEPARTMENTS` from `mock-data/departments` | `doctors` keyed by auth identity; `DEPARTMENTS` → n/a (static reference list) |
| `app/locum-tenens/shift-hub/page.tsx` | `currentDoctor` from `mock-data/doctors`; `patients, shiftTimeline` from `mock-data/notifications` | `doctors` keyed by auth identity; `patients` / `shiftTimeline` → n/a (static demo clinical content) |
| `app/locum-tenens/wallet-payouts/page.tsx` | `currentDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity; payout rows → `payments` |

## super-admin/

| path | mock-data it imports | `useAppData()` slice it should read instead |
| --- | --- | --- |
| `app/super-admin/analytics/page.tsx` | analytics series from `mock-data/analytics`; `type Facility` from `mock-data/organizations` | n/a / analytics-derived (aggregate `shifts`, `payments`, `doctors`, `facilities`); `type Facility` is type-only |
| `app/super-admin/hospitals/page.tsx` | `type Facility` from `mock-data/organizations` | type-only import (not a data hazard); the hospital rows on the page should read `facilities` |

## working-doctor/

| path | mock-data it imports | `useAppData()` slice it should read instead |
| --- | --- | --- |
| `app/working-doctor/dashboard/page.tsx` | `currentWorkingDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity |
| `app/working-doctor/replacement-requests/page.tsx` | `currentWorkingDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity; `replacementRequests` |
| `app/working-doctor/schedule/page.tsx` | `currentWorkingDoctor` from `mock-data/doctors` | `doctors` keyed by auth identity; `shifts` |
| `app/working-doctor/settings/page.tsx` | `currentWorkingDoctor` from `mock-data/doctors`; `DEPARTMENTS` from `mock-data/departments` | `doctors` keyed by auth identity; `DEPARTMENTS` → n/a (static reference list) |

---

## Suggested order

Do the **dashboards first** — `app/hospital/dashboard`, `app/locum-tenens/dashboard`,
`app/working-doctor/dashboard` (and `app/super-admin/analytics`, the super-admin
landing) — they are the highest-traffic pages and the most jarring when they show
stale seed data next to live rows elsewhere. Next, the plain slice-swaps that need
no analytics work: the `currentDoctor` / `currentWorkingDoctor` identity pages
(`applications`, `my-shifts`, `my-schedule`, `documents`, `ratings`, `settings`,
`wallet-payouts`, `replacement-requests`, `schedule`) — these all follow the same
"resolve the doctor row from the auth profile id" pattern, so once one is done the
rest are mechanical. Then `app/hospital/applications` (`getShiftById` → `shifts`
lookup) and `app/hospital/ratings` (`doctors` + `ratings`). Leave the
`@/lib/mock-data/analytics` series and the static `DEPARTMENTS` / demo-content
imports for last — the analytics ones each need a real aggregation from the
`shifts` / `applications` / `payments` slices, which is its own piece of work.
