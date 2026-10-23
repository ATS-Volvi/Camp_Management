import { describe, it, expect } from "vitest";
import { computeMealCost, defaultMealRates } from "./mealCosting";

const d = (s: string) => new Date(s + "T00:00:00Z");
const client = { breakfast: 10, lunch: 20, dinner: 15, ramadan: 30 };

describe("per-meal food costing", () => {
  it("charges each meal at the client's own Breakfast, Lunch and Dinner rate", () => {
    const r = computeMealCost(d("2026-04-01"), d("2026-04-10"), client, []);
    expect(r.breakfast).toBe(100);
    expect(r.lunch).toBe(200);
    expect(r.dinner).toBe(150);
    expect(r.net).toBe(450);
  });

  it("removes only the cancelled meal type", () => {
    const r = computeMealCost(d("2026-04-01"), d("2026-04-10"), client, [{ from: "2026-04-01", to: "2026-04-05", meals: ["lunch"] }]);
    expect(r.lunch).toBe(100);
    expect(r.breakfast).toBe(100);
    expect(r.mealsCancelled).toBe(5);
  });

  it("uses the Ramadan day rate instead of three meals during Ramadan", () => {
    const r = computeMealCost(d("2026-04-01"), d("2026-04-10"), client, [], { start: "2026-04-06", end: "2026-04-10" });
    expect(r.ramadan).toBe(150);
    expect(r.breakfast + r.lunch + r.dinner).toBe(225);
  });

  it("keeps the standard daily food rate when no client is linked", () => {
    const r = computeMealCost(d("2026-04-01"), d("2026-04-30"), defaultMealRates(20), []);
    expect(Math.round(r.net)).toBe(600);
  });
});
