import { describe, expect, it } from "vitest";
import { approvedFoodCancellations } from "./approvedFoodCancellations";
import { computeMealCost, defaultMealRates } from "./mealCosting";

describe("invoice food cancellation approval", () => {
  it("does not apply an old approved checkout cancellation to a later October stay", () => {
    const requests = [{ status: "approved", source: "auto_checkout", from: "2026-10-14", to: "2027-10-14", meals: ["breakfast", "lunch", "dinner"] }];
    const result = computeMealCost(new Date("2026-10-23T00:00:00Z"), new Date("2026-10-31T00:00:00Z"), defaultMealRates(30), approvedFoodCancellations(requests));
    expect(result.net).toBe(270);
    expect(result.mealsCancelled).toBe(0);
  });
  it.each(["pending", "rejected", "cancelled", undefined])("keeps the full SAR 300 food charge for status %s", status => {
    const requests = [{ status, from: "2026-10-10", to: "2026-10-19", meals: ["breakfast", "lunch", "dinner"] }];
    const result = computeMealCost(new Date("2026-10-10T00:00:00Z"), new Date("2026-10-19T00:00:00Z"), defaultMealRates(30), approvedFoodCancellations(requests));
    expect(result.net).toBe(300);
    expect(result.mealsCancelled).toBe(0);
  });
  it("deducts only the approved lunch request, leaving SAR 250 food charge", () => {
    const requests = [
      { status: "pending", from: "2026-10-10", to: "2026-10-19", meals: ["breakfast", "dinner"] },
      { status: "approved", from: "2026-10-15", to: "2026-10-19", meals: ["lunch"] },
    ];
    const result = computeMealCost(new Date("2026-10-10T00:00:00Z"), new Date("2026-10-19T00:00:00Z"), defaultMealRates(30), approvedFoodCancellations(requests));
    expect(result.net).toBe(250);
    expect(result.mealsCancelled).toBe(5);
  });
});