import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./apiClient";

const calls: { url: string; method: string; body?: string }[] = [];
function mockFetch(response: unknown) {
  calls.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? "GET", body: init.body as string | undefined });
    return new Response(JSON.stringify(response), { status: 200 });
  }));
}
afterEach(() => vi.unstubAllGlobals());

describe("data shim", () => {
  it("keeps both bounds of a date range and every order column", async () => {
    mockFetch([]);
    await api.from("check_ins").select("*").gte("check_in_date", "2026-10-01").lt("check_in_date", "2026-11-01")
      .order("check_in_date", { ascending: false }).order("id");
    const params = new URL(calls[0].url).searchParams;
    expect(params.getAll("check_in_date")).toEqual(["gte.2026-10-01", "lt.2026-11-01"]);
    expect(params.get("order")).toBe("check_in_date.desc,id.asc");
  });

  it("sends long filters in a POST body instead of the URL", async () => {
    mockFetch([]);
    const ids = Array.from({ length: 500 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`);
    await api.from("check_outs").select("employee_id").in("employee_id", ids);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toMatch(/\/data\/check_outs\/query$/);
    expect(JSON.parse(calls[0].body!).employee_id).toBe(`in.(${ids.join(",")})`);
  });

  it("returns count for head queries and maps not-is-null", async () => {
    mockFetch({ count: 7 });
    const res = await api.from("visitors").select("*", { count: "exact", head: true }).not("contract_end_date", "is", null);
    expect(res).toMatchObject({ data: null, count: 7, error: null });
    const params = new URL(calls[0].url).searchParams;
    expect(params.get("head")).toBe("true");
    expect(params.get("contract_end_date")).toBe("is.not_null");
  });
});
