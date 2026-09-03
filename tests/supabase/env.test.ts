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
