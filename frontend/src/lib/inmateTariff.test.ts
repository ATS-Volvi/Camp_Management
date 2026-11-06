import { describe, expect, it } from "vitest";
import { resolveInmateTariff } from "./inmateTariff";

const masters = {
  categories: [{ category_key: "2x1", code: "2X1", daily_rate: 45 }],
  roomRates: [] as { camp_id: string; room_category: string; daily_rate: number }[],
  roomMealRates: [] as { camp_id: string; room_category: string; breakfast_rate: number; lunch_rate: number; dinner_rate: number }[],
  campMealRates: [{ camp_id: "camp", breakfast_rate: 5, lunch_rate: 8, dinner_rate: 8 }],
  suppliers: [{ name: "SMA", is_active: true, breakfast_rate: 4, lunch_rate: 6, dinner_rate: 7, ramadan_rate: 20, client_room_rates: [{ room_category_code: "2X1", daily_rate: 35 }] }],
};
const resolve = (config = masters, food = true, type = "own") => resolveInmateTariff("camp", "2x1", { employee_type: type, supplier_name: " sma " }, food, 30, config);
describe("Inmates master tariffs", () => {
  it("uses room master and configured camp food instead of old room values", () => {
    expect(resolve()).toMatchObject({ room: 45, food: 21, total: 66 });
  });
  it("respects a camp room override including zero", () => {
    expect(resolve({ ...masters, roomRates: [{ camp_id: "camp", room_category: "2x1", daily_rate: 0 }] }).room).toBe(0);
  });
  it("gives room-type food overrides precedence over camp defaults", () => {
    expect(resolve({ ...masters, roomMealRates: [{ camp_id: "camp", room_category: "2x1", breakfast_rate: 3, lunch_rate: 4, dinner_rate: 5 }] }).food).toBe(12);
  });
  it("applies Supplier Master prices to supplier employees", () => {
    expect(resolve(masters, true, "supplier")).toMatchObject({ room: 35, food: 17, total: 52 });
  });
  it("does not charge food when the saved check-in excludes food", () => {
    expect(resolve(masters, false, "supplier")).toMatchObject({ food: 0, total: 35 });
  });
});