import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [{ name: "sb", value: "x" }], set: () => {} }),
}));

/**
 * `SUPABASE_URL` / `SUPABASE_ANON_KEY` are read at module-eval time and
 * `createServerClient` throws on empty strings, so stub the env and re-import
 * (mirrors tests/supabase/services-write.test.ts).
 */
async function loadCreateClient() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  const mod = await import("@/lib/supabase/server");
  return mod.createClient;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("server createClient", () => {
  it("builds a client that exposes auth + from", async () => {
    const createClient = await loadCreateClient();
    const c = await createClient();
    expect(typeof c.auth.getUser).toBe("function");
    expect(typeof c.from).toBe("function");
  });
});
