import { describe, expect, it } from "vitest";
import { absenceOnDay, absencePeriods, type AccommodationAbsence } from "./accommodationAbsence";
import { buildRevenueRows } from "@/components/reports/RevenueReportTab";
const absence: AccommodationAbsence = { id: "a", check_in_id: "stay", employee_id: "e", camp_id: "c", room_id: "r", reason: "Site Transfer", absence_status: "on_site", temporary_out_date: "2026-10-03", expected_return_date: "2026-10-05", actual_return_date: "2026-10-06", ended_by_checkout: false };
const data = { checkIns: [{ id: "stay", employee_id: "e", room_id: "r", camp_id: "c", check_in_date: "2026-10-01T09:00:00Z", food_required: true, employees: { employee_id: "1", name: "A", employee_type: "own" }, rooms: { room_number: "1", category: "1x1", daily_food_rate: 30 } }], checkOuts: [{ employee_id: "e", check_out_date: "2026-10-11T09:00:00Z" }], rates: [{ camp_id: "c", room_category: "1x1", daily_rate: 100 }], categories: [{ category_key: "1x1", holding_charge: 20 }], cancellations: [], absences: [absence] };
describe("temporary retained-room billing", () => {
  it("reports leave-only meal deductions separately from approved credits without double counting", () => {
    const rows = buildRevenueRows({ ...data, cancellations: [{ employee_id: "e", status: "approved", source: "manual", from_date: "2026-10-02", to_date: "2026-10-04", food_cancellation_request_meals: [{ meal_type: "lunch" }] }] }, "2026-10-01", "2026-10-10");
    expect(rows[0].leaveFoodDeductions).toEqual({ breakfastCount: 3, lunchCount: 3, dinnerCount: 3, ramadanCount: 0, breakfast: 30, lunch: 30, dinner: 30, ramadan: 0, total: 90 });
    expect(rows[0].foodDeductions).toEqual({ breakfastCount: 3, lunchCount: 4, dinnerCount: 3, ramadanCount: 0, breakfast: 30, lunch: 40, dinner: 30, ramadan: 0, total: 100 });
    expect(rows[0].foodRevenue).toBe(200);
  });
  it("charges only holding with zero food on every site absence day", () => { expect(buildRevenueRows(data, "2026-10-03", "2026-10-05")[0]).toMatchObject({ roomRevenue: 60, foodRevenue: 0, total: 60, leaveDays: 3 }); });
  it("resumes normal room and food on actual return, not expected return", () => { expect(buildRevenueRows(data, "2026-10-06", "2026-10-06")[0]).toMatchObject({ roomRevenue: 100, foodRevenue: 30, leaveDays: 0 }); });
  it("does not duplicate room or holding charges", () => { expect(buildRevenueRows(data, "2026-10-01", "2026-10-10")[0]).toMatchObject({ roomRevenue: 760, normalRoomCost: 700, holdingCost: 60, foodRevenue: 210, total: 970 }); });
  it("never charges after permanent checkout", () => { expect(buildRevenueRows(data, "2026-10-11", "2026-10-31")).toEqual([]); });
  it("keeps ongoing absences open beyond expected return", () => { expect(absenceOnDay({ ...absence, actual_return_date: null }, "2026-10-10")).toBe(true); });
  it("supports multiple cycles linked only to their original stay", () => { expect(absencePeriods([absence, { ...absence, id: "b", check_in_id: "other" }], "stay")).toEqual([{ from: "2026-10-03", to: "2026-10-05" }]); });
  it.each(["vacation", "on_site", "away"])("charges holding only irrespective of reason: %s", absence_status => { expect(buildRevenueRows({ ...data, absences: [{ ...absence, absence_status }] }, "2026-10-03", "2026-10-03")[0]).toMatchObject({ roomRevenue: 20, foodRevenue: 0 }); });
  it("deduplicates overlapping approved food cancellation and absence", () => { expect(buildRevenueRows({ ...data, cancellations: [{ employee_id: "e", status: "approved", source: "manual", from_date: "2026-10-03", to_date: "2026-10-05", food_cancellation_request_meals: [{ meal_type: "lunch" }] }] }, "2026-10-03", "2026-10-05")[0]).toMatchObject({ foodRevenue: 0, mealsCancelled: 9 }); });
});