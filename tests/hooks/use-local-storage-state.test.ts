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
