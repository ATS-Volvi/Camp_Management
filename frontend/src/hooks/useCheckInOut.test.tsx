import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

const { from, rpc, getUser } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), getUser: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from, rpc, auth: { getUser } } }));
import { useCheckedInEmployees, useCheckIn } from "./useCheckInOut";

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

describe("date-aware employee check-in", () => {
  it("saves the selected check-in date and food choice through the canonical RPC", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "operator" } } });
    rpc.mockResolvedValue({ data: "saved-check-in", error: null });
    const { result } = renderHook(() => useCheckIn(), { wrapper });
    await expect(result.current.mutateAsync({
      employeeId: "employee", roomId: "room", campId: "camp",
      checkInDate: "2026-10-22T06:43:00Z", foodRequired: false,
    })).resolves.toBe("saved-check-in");
    expect(rpc).toHaveBeenCalledWith("perform_check_in", {
      p_employee_id: "employee", p_room_id: "room", p_camp_id: "camp", p_performed_by: "operator",
      p_iqama_number: null, p_passport_number: null, p_food_required: false,
      p_check_in_date: "2026-10-22T06:43:00Z",
    });
  });
});

describe("food cancellation current camp residents", () => {
  beforeEach(() => from.mockReset());

  it("lists a currently checked-in employee, not someone who checked out", async () => {
    const eq = vi.fn().mockReturnThis();
    const employeeIds = vi.fn(async (_column, ids: string[]) => ({ data: ids.map(id => ({ id, name: id })), error: null }));
    from.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(), eq,
      order: vi.fn(async () => ({ error: null, data: table === "check_ins" ? [
        { employee_id: "resident", room_id: "r1", check_in_date: "2026-10-10T00:00:00Z" },
        { employee_id: "departed", room_id: "r2", check_in_date: "2026-10-10T00:00:00Z" },
      ] : [{ employee_id: "departed", check_out_date: "2026-10-12T00:00:00Z" }] })),
      in: employeeIds,
    }));
    const { result } = renderHook(() => useCheckedInEmployees("selected-camp"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(e => e.id)).toEqual(["resident"]);
    expect(eq.mock.calls).toEqual([["camp_id", "selected-camp"], ["camp_id", "selected-camp"]]);
    expect(employeeIds).toHaveBeenCalledWith("id", ["resident"]);
  });

  it("includes a returned resident only once after a new check-in", async () => {
    from.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => ({ error: null, data: table === "check_ins" ? [
        { employee_id: "returned", room_id: "new-room", check_in_date: "2026-10-15T00:00:00Z" },
        { employee_id: "returned", room_id: "old-room", check_in_date: "2026-10-01T00:00:00Z" },
      ] : [{ employee_id: "returned", check_out_date: "2026-10-10T00:00:00Z" }] })),
      in: vi.fn(async () => ({ data: [{ id: "returned", name: "Returned resident" }], error: null })),
    }));
    const { result } = renderHook(() => useCheckedInEmployees("selected-camp"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "returned", name: "Returned resident", checked_in_room_id: "new-room", stay_from: "2026-10-15", stay_to: null }]);
  });
});