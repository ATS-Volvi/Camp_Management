import { describe, expect, it } from "vitest";
import { selectChartRecords, roomRecord, employeeRecord, revenueRecord } from "./dashboardDrilldown";

describe("dashboard chart records", () => {
  it("keeps only the clicked group within the already filtered records", () => {
    const records = [{ id: "a", camp: "one", nationality: "Nepal" }, { id: "b", camp: "two", nationality: "Nepal" }, { id: "c", camp: "one", nationality: "India" }];
    expect(selectChartRecords(records.filter(r => r.camp === "one"), r => r.nationality, "Nepal")).toEqual([records[0]]);
  });
  it("keeps missing demographics in their real not-recorded group", () => {
    expect(selectChartRecords([{ id: "a", nationality: null }, { id: "b", nationality: "Nepal" }], r => r.nationality, "Not recorded")).toEqual([{ id: "a", nationality: null }]);
  });
  it("opens room occupants down to the individual employee without inventing empty-room occupants", () => {
    const employee = employeeRecord({ id: "e", name: "Thapa", employee_id: "EMP-1" });
    expect(roomRecord({ id: "r", room_number: "A-101" }, "Camp 1", [employee]).children?.[1]).toEqual(employee);
    expect(roomRecord({ id: "empty", room_number: "A-102" }, "Camp 1").children).toBeUndefined();
  });
  it("retains saved costing dates, deductions and holding charges at the leaf", () => {
    expect(revenueRecord({ id: "stay", name: "Thapa", stayFrom: "10/10/2026", stayTo: "12/10/2026", roomRevenue: 60, foodRevenue: 0, total: 60, leaveDays: 3, holdingCharge: 20 }).fields).toMatchObject({ From: "10/10/2026", To: "12/10/2026", "Leave days": 3, "Holding rate (SAR)": 20, "Food (SAR)": 0, "Total (SAR)": 60 });
  });
});