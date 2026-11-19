import { describe, it, expect } from "vitest";

describe("Catering Cost Control & Budget Calculations", () => {
  it("calculates budget utilization and warning thresholds correctly", () => {
    const allocatedBudget = 100000;
    const actualSpend = 85000;
    const thresholdPct = 80;

    const utilizationPct = (actualSpend / allocatedBudget) * 100;
    expect(utilizationPct).toBe(85);

    let status = "within_budget";
    if (utilizationPct >= 100) status = "exceeded";
    else if (utilizationPct >= thresholdPct) status = "approaching_limit";

    expect(status).toBe("approaching_limit");
  });

  it("calculates cost per worker-day without dividing by zero", () => {
    const totalSpend = 45000;
    const activeWorkers = 500;
    const daysInPeriod = 30;
    const workerDays = activeWorkers * daysInPeriod;

    const costPerWorkerDay = workerDays > 0 ? totalSpend / workerDays : 0;
    expect(costPerWorkerDay).toBe(3.0);

    // zero worker handling
    const zeroSpendWorker = 0 > 0 ? totalSpend / 0 : 0;
    expect(zeroSpendWorker).toBe(0);
  });

  it("calculates cost per meal accurately across confirmed meals", () => {
    const totalSpend = 90000;
    const confirmedMeals = 15000;

    const costPerMeal = confirmedMeals > 0 ? totalSpend / confirmedMeals : 0;
    expect(costPerMeal).toBe(6.0);
  });
});

describe("Meal Consumption & Waste Intelligence Logic", () => {
  it("strictly separates uncollected meals from confirmed food waste", () => {
    const scheduled = 1200;
    const prepared = 1150;
    const collected = 1050;
    const uncollected = Math.max(0, prepared - collected); // 100

    expect(uncollected).toBe(100);

    // Dispositions logged by supervisor
    const safelyRetained = 60; // chilled for next shift
    const reused = 25;        // repurposed into soup/staff mess
    const discarded = 15;      // actual food waste

    const unitMealCost = 6.0;

    // Potential uncollected value vs confirmed waste financial impact
    const uncollectedValueSAR = uncollected * unitMealCost; // 600 SAR
    const confirmedWasteCostSAR = discarded * unitMealCost; // 90 SAR

    expect(uncollectedValueSAR).toBe(600);
    expect(confirmedWasteCostSAR).toBe(90);
    expect(confirmedWasteCostSAR).toBeLessThan(uncollectedValueSAR);
    expect(safelyRetained + reused + discarded).toBe(uncollected);
  });

  it("calculates collection percentage accurately", () => {
    const prepared = 800;
    const collected = 760;

    const collectionPct = prepared > 0 ? (collected / prepared) * 100 : 0;
    expect(collectionPct).toBe(95);
  });
});
