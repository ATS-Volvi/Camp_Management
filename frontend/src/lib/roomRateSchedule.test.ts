import { describe, it, expect } from "vitest";
import {
  getEffectiveRateForDay,
  resolveRoomStayCost,
  RoomRateSchedule,
  LeaveDateRange,
} from "./roomRateSchedule";

describe("roomRateSchedule resolution engine", () => {
  const sampleSchedules: RoomRateSchedule[] = [
    {
      id: "sch-1",
      camp_id: "camp-alpha",
      room_category: "Standard",
      daily_rate: 50,
      holding_rate: 15,
      effective_from: "2026-10-01",
      effective_to: "2026-10-14",
    },
    {
      id: "sch-2",
      camp_id: "camp-alpha",
      room_category: "Standard",
      daily_rate: 70,
      holding_rate: 20,
      effective_from: "2026-10-15",
      effective_to: null, // ongoing
    },
  ];

  it("resolves the correct effective rate for single days across the boundary", () => {
    // Before Oct 15 -> rate 50
    const day1 = getEffectiveRateForDay("2026-10-10", "camp-alpha", "Standard", sampleSchedules, 40, 10);
    expect(day1.dailyRate).toBe(50);
    expect(day1.holdingRate).toBe(15);
    expect(day1.scheduleId).toBe("sch-1");

    // On and after Oct 15 -> rate 70
    const day2 = getEffectiveRateForDay("2026-10-15", "camp-alpha", "Standard", sampleSchedules, 40, 10);
    expect(day2.dailyRate).toBe(70);
    expect(day2.holdingRate).toBe(20);
    expect(day2.scheduleId).toBe("sch-2");

    // Fallback when no matching camp/category
    const fallback = getEffectiveRateForDay("2026-10-15", "other-camp", "Deluxe", sampleSchedules, 45, 12);
    expect(fallback.dailyRate).toBe(45);
    expect(fallback.holdingRate).toBe(12);
  });

  it("handles a single flat rate without rate change", () => {
    const start = new Date("2026-10-01T00:00:00Z");
    const end = new Date("2026-10-14T00:00:00Z"); // 14 days
    const result = resolveRoomStayCost(start, end, "camp-alpha", "Standard", sampleSchedules, 50, 15);

    expect(result.stayDays).toBe(14);
    expect(result.normalDays).toBe(14);
    expect(result.leaveDays).toBe(0);
    expect(result.normalRoomCost).toBe(14 * 50); // 700
    expect(result.totalRoomRevenue).toBe(700);
    expect(result.hasRateChange).toBe(false);
    expect(result.rateBreakdownLabel).toBe("50.00 SAR/day");
    expect(result.segments).toHaveLength(1);
  });

  it("splits a stay across mid-month rate changes (user scenario: Oct 1 - Oct 30, changes Oct 15)", () => {
    const start = new Date("2026-10-01T00:00:00Z");
    const end = new Date("2026-10-30T00:00:00Z"); // 30 days total (Oct 1 to 14 = 14 days; Oct 15 to 30 = 16 days)
    const result = resolveRoomStayCost(start, end, "camp-alpha", "Standard", sampleSchedules, 50, 15);

    expect(result.stayDays).toBe(30);
    expect(result.hasRateChange).toBe(true);
    expect(result.segments).toHaveLength(2);

    // Segment 1: Oct 1 - Oct 14 (14 days @ 50)
    expect(result.segments[0].from).toBe("2026-10-01");
    expect(result.segments[0].to).toBe("2026-10-14");
    expect(result.segments[0].days).toBe(14);
    expect(result.segments[0].dailyRate).toBe(50);
    expect(result.segments[0].normalCost).toBe(14 * 50); // 700

    // Segment 2: Oct 15 - Oct 30 (16 days @ 70)
    expect(result.segments[1].from).toBe("2026-10-15");
    expect(result.segments[1].to).toBe("2026-10-30");
    expect(result.segments[1].days).toBe(16);
    expect(result.segments[1].dailyRate).toBe(70);
    expect(result.segments[1].normalCost).toBe(16 * 70); // 1120

    // Total = 700 + 1120 = 1820 SAR
    expect(result.totalRoomRevenue).toBe(1820);
    expect(result.rateBreakdownLabel).toBe("14d @ SAR 50 + 16d @ SAR 70");
    expect(result.effectiveDailyRate).toBeCloseTo(1820 / 30, 2);
  });

  it("correctly handles leaves and holding charges spanning the rate change boundary", () => {
    // Stay: Oct 1 to Oct 20 (20 days).
    // Leave: Oct 10 to Oct 17 (8 days on leave).
    // Oct 10-14 (5 days): leave @ holding rate 15 = 75 SAR.
    // Oct 15-17 (3 days): leave @ holding rate 20 = 60 SAR.
    // Normal days:
    // Oct 1-9 (9 days): normal @ 50 = 450 SAR.
    // Oct 18-20 (3 days): normal @ 70 = 210 SAR.
    // Total normal: 450 + 210 = 660. Total holding: 75 + 60 = 135. Total = 795 SAR.
    const start = new Date("2026-10-01T00:00:00Z");
    const end = new Date("2026-10-20T00:00:00Z");
    const leaves: LeaveDateRange[] = [{ from: "2026-10-10", to: "2026-10-17" }];

    const result = resolveRoomStayCost(
      start,
      end,
      "camp-alpha",
      "Standard",
      sampleSchedules,
      50,
      15,
      leaves
    );

    expect(result.stayDays).toBe(20);
    expect(result.leaveDays).toBe(8);
    expect(result.normalDays).toBe(12);
    expect(result.normalRoomCost).toBe(660);
    expect(result.holdingCost).toBe(135);
    expect(result.totalRoomRevenue).toBe(795);
    expect(result.hasRateChange).toBe(true);
  });

  it("gracefully falls back when no schedule matches", () => {
    const start = new Date("2026-10-01T00:00:00Z");
    const end = new Date("2026-10-10T00:00:00Z");
    const result = resolveRoomStayCost(start, end, "unregistered-camp", "Vip", [], 100, 30);

    expect(result.stayDays).toBe(10);
    expect(result.totalRoomRevenue).toBe(1000);
    expect(result.hasRateChange).toBe(false);
    expect(result.rateBreakdownLabel).toBe("100.00 SAR/day");
  });
});
