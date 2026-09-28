import { describe, expect, it } from "vitest";
import { licenseExpiryStatus } from "@/lib/license-expiry";

const NOW = new Date(2026, 8, 28, 23, 30); // Sep 28 2026, late evening local time

describe("licenseExpiryStatus", () => {
  it("is unknown without a valid date", () => {
    expect(licenseExpiryStatus(undefined, NOW)).toEqual({ state: "unknown", daysLeft: null });
    expect(licenseExpiryStatus("", NOW).state).toBe("unknown");
    expect(licenseExpiryStatus("not a date", NOW).state).toBe("unknown");
  });

  it("treats the expiry day itself as still valid", () => {
    expect(licenseExpiryStatus("2026-09-28", NOW)).toEqual({ state: "expiring", daysLeft: 0 });
  });

  it("flags a licence that expired yesterday", () => {
    expect(licenseExpiryStatus("2026-09-27", NOW)).toEqual({ state: "expired", daysLeft: -1 });
  });

  it("warns within 60 days and is ok beyond", () => {
    expect(licenseExpiryStatus("2026-11-27", NOW)).toEqual({ state: "expiring", daysLeft: 60 });
    expect(licenseExpiryStatus("2026-11-28", NOW)).toEqual({ state: "ok", daysLeft: 61 });
  });
});
