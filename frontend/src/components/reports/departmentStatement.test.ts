import { describe, expect, it } from "vitest";
import { groupDepartmentStatements, buildDepartmentStatementPdf, type DepartmentCostRow } from "./departmentStatement";

const row: DepartmentCostRow = {
  id: "stay-1", emp_code: "EMP-SAN001", name: "Sanath", department: "PMTA", supplier: "Own",
  project: "Neom Project", camp: "Ad-Dilam", room: "A-102", stayDays: 30, dailyFood: 20,
  mealsCancelled: 24, roomRevenue: 2400, foodRevenue: 440, total: 2840,
};

describe("department costing statements", () => {
  it("separates each department's amounts without charging other departments", () => {
    const groups = groupDepartmentStatements([row, { ...row, id: "stay-2", emp_code: "EMP2", department: "PSD", total: 1000, roomRevenue: 800, foodRevenue: 200 }]);
    expect(groups.find(g => g.dept === "PMTA")?.total).toBe(2840);
    expect(groups.find(g => g.dept === "PSD")?.total).toBe(1000);
  });
  it("shows room, net food and cancellation credit separately", () => {
    const [group] = groupDepartmentStatements([row]);
    expect(group.room).toBe(2400);
    expect(group.food).toBe(440);
    expect(group.credit).toBe(160);
    expect(group.total).toBe(2840);
  });
  it("counts an employee once even when they have multiple stay lines", () => {
    expect(groupDepartmentStatements([row, { ...row, id: "stay-2" }])[0].residents).toBe(1);
  });
  it("carries the department's cost center into the statement", () => {
    const [group] = groupDepartmentStatements([row], { PMTA: "CC-PMTA" });
    expect(group.costCenter).toBe("CC-PMTA");
    const [fallback] = groupDepartmentStatements([row]);
    expect(fallback.costCenter).toBe("—");
  });
  it("exports the selected month's period including leap-year February", () => {
    const doc = buildDepartmentStatementPdf(groupDepartmentStatements([row])[0], "2024-02");
    expect(doc.output()).toContain("01 Feb 2024 - 29 Feb 2024");
  });
  it("prints a summary with total candidates, room, food and charge at the top", () => {
    const doc = buildDepartmentStatementPdf(groupDepartmentStatements([row])[0], "2026-04");
    const text = doc.output();
    expect(text).toContain("Total Candidates");
    expect(text).toContain("SAR 2,400.00");
    expect(text).toContain("SAR 440.00");
    expect(text).toContain("Grand Total"); expect(text).toContain("SAR 2,840.00");
  });
});
describe("statement food cancellation details", () => {
  it("lists approved cancellations at the bottom of the PDF", () => {
    const doc = buildDepartmentStatementPdf(groupDepartmentStatements([row])[0], "2026-04", undefined, [
      { name: "Sanath", emp_code: "EMP-SAN001", from: "05/04/2026", to: "11/04/2026", meals: "lunch", reason: "vacation" },
    ]);
    const text = doc.output();
    expect(text).toContain("Food Cancellation Details");
    expect(text).toContain("Sanath");
    expect(text).toContain("05/04/2026");
  });
  it("omits the section when there are no cancellations", () => {
    const doc = buildDepartmentStatementPdf(groupDepartmentStatements([row])[0], "2026-04");
    expect(doc.output()).not.toContain("Food Cancellation Details");
  });
});
