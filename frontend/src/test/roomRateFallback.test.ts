import { describe, it, expect } from "vitest";
import { resolveDailyRoomRate } from "@/lib/roomRateFallback";

describe("resolveDailyRoomRate", () => {
  it("uses the camp override when one is saved", () => {
    expect(resolveDailyRoomRate(120, 80)).toBe(120);
  });

  it("falls back to the master rate when the camp has no override", () => {
    expect(resolveDailyRoomRate(undefined, 80)).toBe(80);
    expect(resolveDailyRoomRate(null, 80)).toBe(80);
  });

  it("returns 0 when neither camp nor master rate exists", () => {
    expect(resolveDailyRoomRate(undefined, undefined)).toBe(0);
    expect(resolveDailyRoomRate(null, null)).toBe(0);
  });

  it("respects an explicit 0 camp override instead of the master rate", () => {
    expect(resolveDailyRoomRate(0, 80)).toBe(0);
  });
});
