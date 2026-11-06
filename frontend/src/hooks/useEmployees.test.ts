import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    range: vi.fn(),
  };
  return { query, from: vi.fn(), useQuery: vi.fn() };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import { useEmployees } from "./useEmployees";

describe("employee registry pagination", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.from.mockReturnValue(mocks.query);
    mocks.query.select.mockReturnValue(mocks.query);
    mocks.query.order.mockReturnValue(mocks.query);
    mocks.query.eq.mockReturnValue(mocks.query);
    mocks.useQuery.mockImplementation((options) => options);
  });

  async function fetchEmployees(type?: "own" | "supplier" | "camp_staff") {
    useEmployees(type);
    return mocks.useQuery.mock.calls[0][0].queryFn();
  }

  it("loads all 3,004 Own employees, not only the first 1,000", async () => {
    const saved = Array.from({ length: 3004 }, (_, index) => ({ id: `employee-${index}` }));
    mocks.query.range.mockImplementation(async (from, to) => ({
      data: saved.slice(from, to + 1), error: null,
    }));
    expect(await fetchEmployees("own")).toEqual(saved);
    expect(mocks.query.range.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999], [3000, 3999]]);
    expect(mocks.query.eq.mock.calls).toEqual(Array(4).fill(["employee_type", "own"]));
    expect(mocks.query.order.mock.calls).toEqual(Array.from({ length: 4 }, () => [
      ["created_at", { ascending: false }], ["id", { ascending: false }],
    ]).flat());
  });

  it.each(["supplier", "camp_staff"] as const)("retains the %s filter on every page", async (type) => {
    mocks.query.range.mockResolvedValue({ data: [{ id: type }], error: null });
    expect(await fetchEmployees(type)).toEqual([{ id: type }]);
    expect(mocks.query.eq).toHaveBeenCalledWith("employee_type", type);
  });

  it("fetches a final empty page for exactly 1,000 records without a type filter", async () => {
    mocks.query.range.mockResolvedValueOnce({ data: Array(1000).fill({ id: "saved" }), error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    expect(await fetchEmployees()).toHaveLength(1000);
    expect(mocks.query.eq).not.toHaveBeenCalled();
    expect(mocks.query.range).toHaveBeenLastCalledWith(1000, 1999);
  });

  it("fails instead of reporting a partial count when a later page fails", async () => {
    const error = new Error("Page unavailable");
    mocks.query.range.mockResolvedValueOnce({ data: Array(1000).fill({ id: "saved" }), error: null })
      .mockResolvedValueOnce({ data: null, error });
    await expect(fetchEmployees("own")).rejects.toThrow("Page unavailable");
  });
});