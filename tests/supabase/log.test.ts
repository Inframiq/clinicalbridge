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
