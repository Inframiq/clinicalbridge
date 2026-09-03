import { describe, expect, it } from "vitest";
import { getShifts } from "@/lib/supabase/services/shifts";
import { getNotifications } from "@/lib/supabase/services/notifications";

/**
 * Minimal Supabase query-builder stand-in. Every chained method returns the same
 * object; the terminal `order()` resolves to the caller-supplied `{ data, error }`.
 * `eq()` is here so the notifications chain (`.select().eq().order()`) also works.
 */
function fakeClient(result: { data: unknown; error: unknown }) {
  const q = {
    select: () => q,
    eq: () => q,
    order: () => Promise.resolve(result),
  };
  return { from: () => q } as never;
}

describe("getShifts", () => {
  it("returns rows mapped on success", async () => {
    const { data, error } = await getShifts(
      fakeClient({
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
      })
    );
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].department).toBe("ICU");
  });

  it("returns { data: [], error: string } on query error — never mock data", async () => {
    const { data, error } = await getShifts(
      fakeClient({ data: null, error: { message: "boom", code: "PGRST" } })
    );
    expect(data).toEqual([]);
    expect(error).toBe("boom | code: PGRST");
  });

  it("returns { data: [], error: null } on zero rows", async () => {
    const { data, error } = await getShifts(fakeClient({ data: [], error: null }));
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it("returns { data: [], error: string } when the client throws", async () => {
    const throwingClient = {
      from: () => {
        throw new Error("network down");
      },
    } as never;
    const { data, error } = await getShifts(throwingClient);
    expect(data).toEqual([]);
    expect(error).toBe("network down");
  });
});

describe("getNotifications", () => {
  it("returns { data: [], error: null } for a non-uuid userId without touching the client", async () => {
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
    const { data, error } = await getNotifications(
      "11111111-1111-1111-1111-111111111111",
      fakeClient({
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
      })
    );
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Hi");
  });

  it("returns { data: [], error: string } on query error", async () => {
    const { data, error } = await getNotifications(
      "11111111-1111-1111-1111-111111111111",
      fakeClient({ data: null, error: { message: "boom", code: "PGRST" } })
    );
    expect(data).toEqual([]);
    expect(error).toBe("boom | code: PGRST");
  });
});
