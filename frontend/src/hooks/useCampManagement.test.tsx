import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

const { from, insert, update, single } = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), update: vi.fn(), single: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
import { useAddCamp, useUpdateCamp } from "./useCampManagement";

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("camp photos and contract dates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain = { insert, update, select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single };
    insert.mockReturnValue(chain);
    update.mockReturnValue(chain);
    from.mockReturnValue(chain);
    single.mockResolvedValue({ data: { id: "camp" }, error: null });
  });

  it("stores contract start and end dates when creating a camp", async () => {
    const { result } = renderHook(() => useAddCamp(), { wrapper });
    await result.current.mutateAsync({ name: "New camp", location: "Riyadh", contract_start_date: "2026-11-06", contract_end_date: "2027-11-05" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ contract_start_date: "2026-11-06", contract_end_date: "2027-11-05" }));
  });

  it("keeps dates optional for camps without a contract", async () => {
    const { result } = renderHook(() => useAddCamp(), { wrapper });
    await result.current.mutateAsync({ name: "Owned camp", location: "Riyadh", contract_start_date: null, contract_end_date: null });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ contract_start_date: null, contract_end_date: null }));
  });

  it("saves an uploaded real-photo path and updated contract dates", async () => {
    const { result } = renderHook(() => useUpdateCamp(), { wrapper });
    await result.current.mutateAsync({ id: "camp", photo_path: "real-camp.jpg", contract_start_date: "2026-11-06", contract_end_date: "2027-11-05" });
    expect(update).toHaveBeenCalledWith({ photo_path: "real-camp.jpg", contract_start_date: "2026-11-06", contract_end_date: "2027-11-05" });
  });
});