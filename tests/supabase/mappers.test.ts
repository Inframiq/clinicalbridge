import { describe, expect, it } from "vitest";
import { mapShiftRow, mapPayoutRow, mapRatingRow, mapNotificationRow } from "@/lib/supabase/mappers";
import { mapApplicationRow } from "@/lib/supabase/services/shifts";
import type { Tables } from "@/lib/supabase/types";

// Fixtures are partial and deliberately loose (numerics as strings, 0/1 booleans)
// to exercise the mappers' coercion of wire values.
const row = <T,>(fields: Record<string, unknown>) => fields as unknown as T;

describe("mapShiftRow", () => {
  it("maps snake_case columns and coerces numbers", () => {
    const s = mapShiftRow(row<Tables<"shifts">>({
      id: "s1", title: "Night ICU", department_name: "ICU", facility_name: "CMC",
      facility_id: "f1", date: "2026-09-10", start_time: "20:00", end_time: "06:00",
      shift_type: "Night", hourly_rate: "220", doctors_needed: 2, experience_level: "Senior",
      status: "open", code_red: 1,
    }));
    expect(s).toMatchObject({
      id: "s1", department: "ICU", facilityName: "CMC", hourlyRate: 220,
      doctorsNeeded: 2, codeRed: true, description: "", status: "open",
    });
    expect(s.location).toEqual({ address: "", city: "", state: "", lat: 0, lng: 0 });
  });
});

describe("mapPayoutRow", () => {
  it("coerces money fields and booleans", () => {
    const p = mapPayoutRow(row<Tables<"payouts">>({
      id: "p1", shift_id: "s1", doctor_id: "d1", hours: "8", hourly_rate: "200",
      gross_pay: "1600", platform_fee_pct: "10", net_payout: "1440", status: "approved",
      submitted_at: "t", has_timesheet: true, has_clinical_notes: false,
    }));
    expect(p).toMatchObject({ hours: 8, grossPay: 1600, netPayout: 1440, hasTimesheet: true, hasClinicalNotes: false });
  });
});

describe("mapRatingRow", () => {
  it("defaults categories to an object and coerces overallScore", () => {
    const r = mapRatingRow(row<Tables<"ratings">>({
      id: "r1", shift_id: "s1", direction: "hospital_to_doctor", doctor_id: "d1",
      facility_id: "f1", categories: null, overall_score: "4.5", created_at: "t",
    }));
    expect(r.categories).toEqual({});
    expect(r.overallScore).toBe(4.5);
  });
});

describe("mapNotificationRow", () => {
  it("formats the timestamp relative to the injected now", () => {
    const now = new Date("2026-09-03T12:00:00Z");
    const n = mapNotificationRow(
      row<Tables<"notifications">>({
        id: "n1", title: "T", body: "B", type: "info", read: 0, topic: "shift-status",
        created_at: "2026-09-03T11:00:00Z",
      }),
      now
    );
    expect(n).toMatchObject({ id: "n1", title: "T", read: false, type: "info", topic: "shift-status" });
    expect(n.timestamp).toMatch(/hour/);
  });
});

describe("mapApplicationRow", () => {
  it("folds DB-only statuses into the four the app models", () => {
    const base = { id: "a1", shift_id: "s1", doctor_id: "d1", applied_at: "t", match_score_pct: 90 };
    const status = (s: string | null) =>
      mapApplicationRow(row<Tables<"applications">>({ ...base, status: s })).status;
    expect(status("applied")).toBe("in_review");
    expect(status("shortlisted")).toBe("in_review");
    expect(status(null)).toBe("in_review");
    expect(status("cancelled")).toBe("withdrawn");
    expect(status("accepted")).toBe("accepted");
    expect(status("withdrawn")).toBe("withdrawn");
  });
});
