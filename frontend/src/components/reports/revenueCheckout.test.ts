import { describe, expect, it } from "vitest";
import { buildRevenueRows } from "./RevenueReportTab";

describe("report billing stops at checkout", () => {
  const data = {
    checkIns: [{ id: "stay", employee_id: "e", camp_id: "c", check_in_date: "2026-10-10T12:00:00Z", food_required: true,
      employees: { name: "Thapa", employee_id: "EMP-1", employee_type: "own" }, rooms: { room_number: "101", category: "staff_4bed", daily_food_rate: 30 }, camps: { name: "Camp" } }],
    checkOuts: [{ employee_id: "e", check_out_date: "2026-10-20T12:00:00Z" }],
    rates: [{ camp_id: "c", room_category: "staff_4bed", daily_rate: 100 }],
    cancellations: [{ employee_id: "e", status: "approved", from_date: "2026-10-15", to_date: "2026-12-31", food_cancellation_request_meals: [{ meal_type: "lunch" }] }],
  };
  it("caps room, food and cancellation credits before checkout even with a future request", () => {
    const rows = buildRevenueRows(data, "2026-10-01", "2026-12-31");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ stayDays: 10, roomRevenue: 1000, foodRevenue: 250, mealsCancelled: 5, total: 1250, stayTo: "19/10/2026" });
  });
  it("returns no billable resident rows from checkout day onward", () => {
    expect(buildRevenueRows(data, "2026-10-20", "2026-12-31")).toEqual([]);
  });
  it("charges real October stays despite legacy checkout records while retaining an approved lunch deduction", () => {
    const input = { ...data,
      checkIns: [...data.checkIns, { ...data.checkIns[0], id: "later-stay", check_in_date: "2026-10-23T12:00:00Z" }],
      cancellations: [
        { ...data.cancellations[0], source: "manual", to_date: "2026-10-19" },
        { ...data.cancellations[0], source: "auto_checkout", from_date: "2026-10-14", to_date: "2027-10-14", food_cancellation_request_meals: [{ meal_type: "breakfast" }, { meal_type: "lunch" }, { meal_type: "dinner" }] },
        { ...data.cancellations[0], source: "manual", status: "pending", from_date: "2026-10-23", to_date: "2026-10-31" },
      ],
    };
    const rows = buildRevenueRows(input, "2026-10-01", "2026-10-31");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ stayDays: 10, foodRevenue: 250, mealsCancelled: 5 });
    expect(rows[1]).toMatchObject({ stayDays: 9, foodRevenue: 270, mealsCancelled: 0 });
    expect(rows.reduce((sum, row) => sum + row.foodRevenue, 0)).toBe(520);
  });
  it("uses Camp Food Rates master prices instead of the room default when configured", () => {
    const input = { ...data, campMealRates: [{ camp_id: "c", breakfast_rate: 4, lunch_rate: 8, dinner_rate: 8, ramadan_rate: 0 }] };
    const rows = buildRevenueRows(input, "2026-10-01", "2026-12-31");
    // 10 days: breakfast 10×4 + dinner 10×8 + lunch 5×8 (5 lunches cancelled) = 160
    expect(rows[0]).toMatchObject({ stayDays: 10, foodRevenue: 160, mealsCancelled: 5 });
  });
  it.each(["pending", "rejected", "cancelled"])("does not deduct food for a %s cancellation", status => {
    const input = { ...data, cancellations: data.cancellations.map(c => ({ ...c, status })) };
    expect(buildRevenueRows(input, "2026-10-10", "2026-10-19")[0]).toMatchObject({ foodRevenue: 300, mealsCancelled: 0, total: 1300 });
  });
});