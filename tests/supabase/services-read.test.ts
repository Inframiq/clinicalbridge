import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Minimal Supabase query-builder stand-in. Every chained method returns the same
 * object; the terminal `order()` resolves to the caller-supplied `{ data, error }`.
 * `eq()` is here so the notifications chain (`.select().eq().order()`) also works.
 * `from` is a spy so tests can assert the client was never touched.
 */
function fakeClient(result: { data: unknown; error: unknown }) {
  const q = {
    select: () => q,
    eq: () => q,
    order: () => Promise.resolve(result),
  };
  const from = vi.fn(() => q);
  return { client: { from } as never, from };
}

/**
 * `isSupabaseConfigured` is read at module-eval time, so each test stubs the env
 * and re-imports the reader (mirrors tests/supabase/services-write.test.ts).
 * The readers now short-circuit to `{ data: [], error: null }` in offline mode,
 * so they must be loaded with credentials present to exercise the query path.
 */
async function loadShiftsReader(configured: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", configured ? "https://x.supabase.co" : "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", configured ? "anon-key" : "");
  const mod = await import("@/lib/supabase/services/shifts");
  return mod.getShifts;
}

async function loadNotificationsReader(configured: boolean) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", configured ? "https://x.supabase.co" : "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", configured ? "anon-key" : "");
  const mod = await import("@/lib/supabase/services/notifications");
  return mod.getNotifications;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getShifts", () => {
  it("returns rows mapped on success", async () => {
    const getShifts = await loadShiftsReader(true);
    const { client } = fakeClient({
      data: [
        {
          id: "s1",
          title: "T",
          department_name: "ICU",
          facility_id: "f1",
          hourly_rate: "10",
          status: "open",
        },
      ],
      error: null,
    });
    const { data, error } = await getShifts(client);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].department).toBe("ICU");
  });

  it("returns { data: [], error: string } on query error — never mock data", async () => {
    const getShifts = await loadShiftsReader(true);
    const { client } = fakeClient({ data: null, error: { message: "boom", code: "PGRST" } });
    const { data, error } = await getShifts(client);
    expect(data).toEqual([]);
    expect(error).toBe("boom | code: PGRST");
  });

  it("returns { data: [], error: null } on zero rows", async () => {
    const getShifts = await loadShiftsReader(true);
    const { client } = fakeClient({ data: [], error: null });
    const { data, error } = await getShifts(client);
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it("returns { data: [], error: string } when the client throws", async () => {
    const getShifts = await loadShiftsReader(true);
    const throwingClient = {
      from: () => {
        throw new Error("network down");
      },
    } as never;
    const { data, error } = await getShifts(throwingClient);
    expect(data).toEqual([]);
    expect(error).toBe("network down");
  });

  it("returns { data: [], error: null } in offline mode without touching a client", async () => {
    const getShifts = await loadShiftsReader(false);
    const { client, from } = fakeClient({ data: [{ id: "s1" }], error: null });
    const res = await getShifts(client);
    expect(res).toEqual({ data: [], error: null });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("getNotifications", () => {
  it("returns { data: [], error: null } for a non-uuid userId without touching the client", async () => {
    const getNotifications = await loadNotificationsReader(true);
    const explodingClient = {
      from: () => {
        throw new Error("should not be called");
      },
    } as never;
    const { data, error } = await getNotifications("not-a-uuid", explodingClient);
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it("maps rows on success for a valid uuid", async () => {
    const getNotifications = await loadNotificationsReader(true);
    const { client } = fakeClient({
      data: [
        {
          id: "n1",
          title: "Hi",
          body: "There",
          created_at: new Date().toISOString(),
          read: false,
          type: "info",
        },
      ],
      error: null,
    });
    const { data, error } = await getNotifications(
      "11111111-1111-1111-1111-111111111111",
      client
    );
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Hi");
  });

  it("returns { data: [], error: string } on query error", async () => {
    const getNotifications = await loadNotificationsReader(true);
    const { client } = fakeClient({ data: null, error: { message: "boom", code: "PGRST" } });
    const { data, error } = await getNotifications(
      "11111111-1111-1111-1111-111111111111",
      client
    );
    expect(data).toEqual([]);
    expect(error).toBe("boom | code: PGRST");
  });
});
