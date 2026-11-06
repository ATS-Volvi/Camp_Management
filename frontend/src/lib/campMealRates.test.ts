import { describe, expect, it } from "vitest";
import { resolveCampMealRates } from "./campMealRates";
import { computeMealCost } from "./mealCosting";

describe("camp food prices by room type", () => {
  const defaults = [{ camp_id: "camp", breakfast_rate: 5, lunch_rate: 8, dinner_rate: 8 }];
  const overrides = [{ camp_id: "camp", room_category: "1x1", breakfast_rate: 7, lunch_rate: 12, dinner_rate: 10, ramadan_rate: 25 }];
  it("matches both camp and room type", () => {
    expect(resolveCampMealRates("camp", "1x1", overrides, defaults, 30)).toEqual({ breakfast: 7, lunch: 12, dinner: 10, ramadan: 25 });
    expect(resolveCampMealRates("other", "1x1", overrides, defaults, 30).lunch).toBe(10);
  });
  it("preserves configured camp prices for room types without overrides", () => {
    expect(resolveCampMealRates("camp", "2x1", overrides, defaults, 30)).toEqual({ breakfast: 5, lunch: 8, dinner: 8, ramadan: 21 });
  });
  it("credits an approved lunch at its room-type price, not an average", () => {
    const rate = resolveCampMealRates("camp", "1x1", overrides, defaults, 30);
    expect(computeMealCost(new Date("2026-10-01"), new Date("2026-10-05"), rate, [{ from: "2026-10-01", to: "2026-10-01", meals: ["lunch"] }])).toMatchObject({ full: 145, lunch: 48, net: 133 });
  });
  it("allows a zero-price room-type override", () => {
    expect(resolveCampMealRates("camp", "1x1", [{ ...overrides[0], breakfast_rate: 0, lunch_rate: 0, dinner_rate: 0, ramadan_rate: 0 }], defaults, 30)).toEqual({ breakfast: 0, lunch: 0, dinner: 0, ramadan: 0 });
  });
});