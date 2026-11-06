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

  it("calculates room and food cost strictly as per Excel rates when rates not explicitly configured", () => {
    // 1x1: 17 acco, 13 food (2.6 breakfast, 5.2 lunch, 5.2 dinner), total 30
    const stay1x1 = {
      checkIns: [{
        id: "s1", employee_id: "e1", camp_id: "c1", check_in_date: "2026-10-01T00:00:00Z", food_required: true,
        employees: { name: "User 1", employee_id: "E1", employee_type: "own" },
        rooms: { room_number: "A-101", category: "1x1" },
        camps: { name: "Camp 1" }
      }],
      checkOuts: [{ employee_id: "e1", check_out_date: "2026-10-11T00:00:00Z" }], // 10 days
      rates: [],
      cancellations: [],
    };
    const row1x1 = buildRevenueRows(stay1x1, "2026-10-01", "2026-10-31")[0];
    expect(row1x1.stayDays).toBe(10);
    expect(row1x1.dailyRoom).toBe(17);
    expect(row1x1.roomRevenue).toBe(170); // 10 * 17
    expect(row1x1.dailyFood).toBe(13);
    expect(row1x1.breakfastCost).toBeCloseTo(26.0); // 10 * 2.6
    expect(row1x1.lunchCost).toBeCloseTo(52.0);     // 10 * 5.2
    expect(row1x1.dinnerCost).toBeCloseTo(52.0);    // 10 * 5.2
    expect(row1x1.foodRevenue).toBeCloseTo(130.0);  // 10 * 13
    expect(row1x1.total).toBeCloseTo(300.0);        // 170 + 130 = 300 (SAR 30/day)

    // 2x1: 12 acco, 13 food, total 25
    const stay2x1 = {
      ...stay1x1,
      checkIns: [{ ...stay1x1.checkIns[0], rooms: { room_number: "A-102", category: "2x1" } }],
    };
    const row2x1 = buildRevenueRows(stay2x1, "2026-10-01", "2026-10-31")[0];
    expect(row2x1.dailyRoom).toBe(12);
    expect(row2x1.roomRevenue).toBe(120);
    expect(row2x1.foodRevenue).toBeCloseTo(130.0);
    expect(row2x1.total).toBeCloseTo(250.0); // SAR 25/day

    // 3x1: 11 acco, 11 food (2.2, 4.4, 4.4), total 22
    const stay3x1 = {
      ...stay1x1,
      checkIns: [{ ...stay1x1.checkIns[0], rooms: { room_number: "A-103", category: "3x1" } }],
    };
    const row3x1 = buildRevenueRows(stay3x1, "2026-10-01", "2026-10-31")[0];
    expect(row3x1.dailyRoom).toBe(11);
    expect(row3x1.roomRevenue).toBe(110);
    expect(row3x1.breakfastCost).toBeCloseTo(22.0); // 10 * 2.2
    expect(row3x1.lunchCost).toBeCloseTo(44.0);     // 10 * 4.4
    expect(row3x1.dinnerCost).toBeCloseTo(44.0);    // 10 * 4.4
    expect(row3x1.foodRevenue).toBeCloseTo(110.0);
    expect(row3x1.total).toBeCloseTo(220.0); // SAR 22/day

    // 4x1: 10 acco, 10 food (2, 4, 4), total 20
    const stay4x1 = {
      ...stay1x1,
      checkIns: [{ ...stay1x1.checkIns[0], rooms: { room_number: "A-104", category: "4x1" } }],
    };
    const row4x1 = buildRevenueRows(stay4x1, "2026-10-01", "2026-10-31")[0];
    expect(row4x1.dailyRoom).toBe(10);
    expect(row4x1.roomRevenue).toBe(100);
    expect(row4x1.foodRevenue).toBeCloseTo(100.0);
    expect(row4x1.total).toBeCloseTo(200.0); // SAR 20/day

    // 6x1: 9 acco, 10 food (2, 4, 4), total 19
    const stay6x1 = {
      ...stay1x1,
      checkIns: [{ ...stay1x1.checkIns[0], rooms: { room_number: "A-106", category: "6x1" } }],
    };
    const row6x1 = buildRevenueRows(stay6x1, "2026-10-01", "2026-10-31")[0];
    expect(row6x1.dailyRoom).toBe(9);
    expect(row6x1.roomRevenue).toBe(90);
    expect(row6x1.foodRevenue).toBeCloseTo(100.0);
    expect(row6x1.total).toBeCloseTo(190.0); // SAR 19/day
  });
});
