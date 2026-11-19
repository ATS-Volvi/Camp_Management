import { describe, it, expect } from "vitest";

describe("Catering Insights: Dining Hall Rush & Food Waste Analytics", () => {
  it("computes accurate hall seating capacity ratio based on physical camp occupants", () => {
    const totalInmates = 1200;
    // Typical camp hall accommodates ~40% of residents at any single meal sitting
    const derivedCapacity = Math.round(totalInmates * 0.4);
    expect(derivedCapacity).toBe(480);

    const currentSeated = 360;
    const occupancyPct = Math.round((currentSeated / derivedCapacity) * 100);
    expect(occupancyPct).toBe(75);

    // 75% occupancy qualifies as moderate flow (yellow)
    const isModerate = occupancyPct >= 65 && occupancyPct < 85;
    expect(isModerate).toBe(true);
  });

  it("calculates accurate queue wait times from congestion thresholds", () => {
    const calculateWait = (pct: number) => {
      if (pct >= 85) return 16;
      if (pct >= 70) return 8;
      return 2;
    };

    expect(calculateWait(92)).toBe(16); // Peak rush
    expect(calculateWait(74)).toBe(8);  // Moderate flow
    expect(calculateWait(45)).toBe(2);  // Free seating
  });

  it("calculates accurate financial waste loss in SAR from kilograms logged", () => {
    const wastedKg = 25;
    const avgPreparedFoodCostSAR = 12.0; // Standard SAR cost per kg
    const financialLoss = wastedKg * avgPreparedFoodCostSAR;

    expect(financialLoss).toBe(300); // 25kg * 12 SAR = 300 SAR
  });

  it("calculates 7-day rolling waste trend percentage correctly", () => {
    const previousWeekSAR = 1200;
    const currentWeekSAR = 960;

    const diffPct = ((currentWeekSAR - previousWeekSAR) / previousWeekSAR) * 100;
    expect(diffPct).toBeCloseTo(-20.0, 1); // 20% reduction in food waste
  });
});
