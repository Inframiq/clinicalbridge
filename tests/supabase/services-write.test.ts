import { afterEach, describe, expect, it, vi } from "vitest";

const UUID = "11111111-1111-1111-1111-111111111111";

/**
 * Supabase write-chain stand-in. Every builder method returns the same object;
 * the terminal `single()` resolves to the caller-supplied `{ data, error }`.
 * `then` makes the object awaitable for writers that omit `.select()` (e.g. delete).
 * `from` is a spy so tests can assert the client was never touched.
 */
function fakeClient(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  q.insert = () => q;
  q.update = () => q;
  q.delete = () => q;
  q.eq = () => q;
  q.select = () => q;
  q.single = () => Promise.resolve(result);
  q.maybeSingle = () => Promise.resolve(result);
  q.then = (r: (v: unknown) => unknown) => Promise.resolve(result).then(r);
  const from = vi.fn(() => q);
  return { client: { from } as never, from };
}

/**
 * `isSupabaseConfigured` is read at module-eval time, so each test stubs the env
 * and re-imports the writer (mirrors tests/supabase/env.test.ts).
 */
async function loadWriter(configured: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", configured ? "https://x.supabase.co" : "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", configured ? "anon-key" : "");
  const mod = await import("@/lib/supabase/services/shifts");
  return mod.updateShiftStatusInSupabase;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("updateShiftStatusInSupabase", () => {
  it("skips a non-uuid id without error and never touches the client", async () => {
    const updateShiftStatusInSupabase = await loadWriter(true);
    const { client, from } = fakeClient({ data: null, error: null });
    const res = await updateShiftStatusInSupabase("doc-legacy-id", "open", client);
    expect(res).toEqual({ data: null, error: null });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns an error string on PostgREST failure", async () => {
    const updateShiftStatusInSupabase = await loadWriter(true);
    const { client } = fakeClient({
      data: null,
      error: { message: "denied", code: "42501" },
    });
    const res = await updateShiftStatusInSupabase(UUID, "open", client);
    expect(res.data).toBeNull();
    expect(res.error).toBe("denied | code: 42501");
  });

  it("returns the persisted row on success", async () => {
    const updateShiftStatusInSupabase = await loadWriter(true);
    const row = { id: UUID, status: "open" };
    const { client } = fakeClient({ data: row, error: null });
    const res = await updateShiftStatusInSupabase(UUID, "open", client);
    expect(res).toEqual({ data: row, error: null });
  });

  it("returns { data: null, error: null } in offline mode without touching a client", async () => {
    const updateShiftStatusInSupabase = await loadWriter(false);
    const { client, from } = fakeClient({ data: { id: UUID }, error: null });
    const res = await updateShiftStatusInSupabase(UUID, "open", client);
    expect(res).toEqual({ data: null, error: null });
    expect(from).not.toHaveBeenCalled();
  });
});
