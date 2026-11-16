import { describe, expect, it } from "vitest";
import { groupDepartmentStatements, addDepartmentLunchStatements, buildDepartmentStatementPdf, departmentCategoryStatusMatrix, filterDepartmentCostRows, type DepartmentCostRow } from "./departmentStatement";

const row: DepartmentCostRow = {
  id: "stay-1", emp_code: "EMP-SAN001", name: "Sanath", department: "PMTA", supplier: "Own",
  project: "Neom Project", camp: "Ad-Dilam", room: "A-102", stayDays: 30, dailyFood: 20,
  mealsCancelled: 24, roomRevenue: 2400, foodRevenue: 440, total: 2840,
};

describe("department costing statements", () => {
  it("keeps one statement and one lunch charge when both MBS and EMBS resident labels exist", () => {
    const groups=addDepartmentLunchStatements(groupDepartmentStatements([{...row,department:"EMBS"},{...row,id:"second",emp_code:"EMP2",department:"MBS"}]),
      [{id:"mbs",name:"Modular Building Services",code:"MBS",cost_center:null}],
      [{id:"request",department_id:"mbs",camp_id:"camp",meal_date:"2026-11-14",quantity:21,unit_price:5,total_cost:105,status:"approved",requested_by:"requester",remarks:"",decision_note:""}],"2026-11-01","2026-11-15");
    expect(groups).toHaveLength(1);
    expect(groups[0].residents).toBe(2);
    expect(groups[0].total).toBe(5785);
    expect(groups[0].departmentLunch.quantity).toBe(21);
  });
  it("retains approved lunches for a saved department absent from the active master list", () => {
    const groups=addDepartmentLunchStatements([],[],[{id:"request",department_id:"mbs",departments:{name:"Modular Building Services",code:"MBS",cost_center:null},camp_id:"camp",meal_date:"2026-11-14",quantity:21,unit_price:5,total_cost:105,status:"approved",requested_by:"requester",remarks:"",decision_note:""}],"2026-11-01","2026-11-15");
    expect(groups[0].departmentLunch.quantity).toBe(21);
    expect(groups[0].total).toBe(105);
  });
  it("includes the November 14 request for 21 MBS lunches in the EMBS statement at SAR 105", () => {
    const groups = addDepartmentLunchStatements(groupDepartmentStatements([{...row,department:"EMBS"}]),
      [{id:"mbs",name:"Modular Building Services",code:"MBS",cost_center:null}],
      [{id:"saved-request",department_id:"mbs",camp_id:"camp",meal_date:"2026-11-14",quantity:21,unit_price:5,total_cost:105,status:"approved",requested_by:"requester",remarks:"Office Lunch",decision_note:""}],
      "2026-11-01","2026-11-15");
    expect(groups).toHaveLength(1);
    expect(groups[0].dept).toBe("EMBS");
    expect(groups[0].departmentLunch).toEqual({quantity:21,cost:105,daily:[{date:"2026-11-14",quantity:21,cost:105}]});
    expect(groups[0].total).toBe(2945);
  });
  it("adds approved department lunch separately to inmate charges", () => {
    const [g]=addDepartmentLunchStatements(groupDepartmentStatements([row]),[{id:"dept",name:"PMTA",code:"PMTA",cost_center:null}],[{id:"lunch",department_id:"dept",camp_id:"camp",meal_date:"2026-11-13",quantity:10,unit_price:8,total_cost:80,status:"approved",requested_by:"requester",remarks:"",decision_note:""}],"2026-11-01","2026-11-30");
    expect(g.food).toBe(440);expect(g.room).toBe(2400);expect(g.departmentLunch.cost).toBe(80);expect(g.total).toBe(2920);
    const [lunchOnly]=addDepartmentLunchStatements([],[{id:"dept",name:"PMTA",code:"PMTA",cost_center:null}],[{id:"lunch",department_id:"dept",camp_id:"camp",meal_date:"2026-11-13",quantity:10,unit_price:8,total_cost:80,status:"approved",requested_by:"requester",remarks:"",decision_note:""}],"2026-11-01","2026-11-30");
    expect(lunchOnly.residents).toBe(0);expect(lunchOnly.total).toBe(80);
  });
  it("totals meal deduction counts and amounts per department", () => {
    const deductions = { breakfastCount: 5, lunchCount: 5, dinnerCount: 5, ramadanCount: 0, breakfast: 25, lunch: 40, dinner: 40, ramadan: 0, total: 105 };
    const groups = groupDepartmentStatements([{ ...row, foodDeductions: deductions }, { ...row, id: "other", department: "PSD", foodDeductions: { ...deductions, total: 50 } }]);
    expect(groups.find(g => g.dept === "PMTA")?.deductions).toEqual(deductions);
    expect(groups.find(g => g.dept === "PSD")?.deductions.total).toBe(50);
  });
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
  it("counts each employee once by room category and status with right and bottom totals", () => {
    const rows: DepartmentCostRow[] = [
      { ...row, id: "old-stay", employeeId: "emp-1", category: "1x1" },
      { ...row, id: "latest-stay", employeeId: "emp-1", category: "2x1", presenceStatus: "active" },
      { ...row, id: "stay-2", employeeId: "emp-2", emp_code: "EMP2", category: "2x1", statusPeriods: [{ status: "vacation", from: "2026-10-10", to: "2026-11-05" }] },
      { ...row, id: "stay-3", employeeId: "emp-3", emp_code: "EMP3", category: "guest", absences: [{ temporary_out_date: "2026-10-12", expected_return_date: null, actual_return_date: null, reason: "Site work", ended_by_checkout: false, absence_status: "on_site" }] },
    ];
    const matrix = departmentCategoryStatusMatrix(rows, "2026-10-31");
    const twin = matrix.table.find(item => item.category === "2x1");
    expect(twin?.counts.Active).toBe(1);
    expect(twin?.counts.Vacation).toBe(1);
    expect(twin?.total).toBe(2);
    expect(matrix.table.find(item => item.category === "guest")?.counts["On Site"]).toBe(1);
    expect(matrix.grand).toEqual({ counts: { Active: 1, "On Site": 1, Vacation: 1, Away: 0 }, total: 3 });
    expect(matrix.table.reduce((sum, item) => sum + item.total, 0)).toBe(matrix.grand.total);
  });
  it("applies camp and block filters to the same employee rows used for charges", () => {
    const rows = [
      { ...row, campId: "camp-1", blockId: "block-a" },
      { ...row, id: "stay-2", campId: "camp-1", blockId: "block-b" },
      { ...row, id: "stay-3", campId: "camp-2", blockId: "block-a" },
    ];
    expect(filterDepartmentCostRows(rows, { camp: "camp-1", block: "block-a" })).toEqual([rows[0]]);
  });
  it("prints the selected date range, Expertise branding and matrix before employee details", () => {
    const doc = buildDepartmentStatementPdf(groupDepartmentStatements([{ ...row, category: "2x1" }])[0], "2026-10", undefined, [], { fromDate: "2026-10-05", toDate: "2026-10-20" });
    const text = doc.output();
    expect(text).toContain("05 Oct 2026 - 20 Oct 2026");
    expect(text).toContain("Expertise Contracting Co.");
    expect(text).toContain("Room Category / Status");
    expect(text.indexOf("Room Category / Status")).toBeLessThan(text.indexOf("Employee / ID"));
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
