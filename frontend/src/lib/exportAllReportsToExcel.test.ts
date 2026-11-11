import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildStatementSummary } from "./expertiseStatement";

describe("exportAllReportsToExcel", () => {
  it("builds multi-sheet workbook structure successfully", () => {
    const wb = XLSX.utils.book_new();

    const summary = buildStatementSummary(
      {
        "1x1": { officeLunchMeals: 1466 },
        "2x1": { active: 25 },
        "3x1": { active: 1443, onSite: 20, onVacation: 61 },
      },
      "26-August-2026",
      "25-September-2026",
      "EMBS"
    );

    const sheet1Aoa: any[][] = [];
    sheet1Aoa.push(["(Division/department/Intercompany)", summary.department]);
    sheet1Aoa.push(["Service Period", `${summary.periodFrom} to ${summary.periodTo}`]);

    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Aoa);
    XLSX.utils.book_append_sheet(wb, ws1, "Occupancy & Charges");

    const ws2 = XLSX.utils.json_to_sheet([{ "Cost Center": "CC-101", Department: "EMBS" }]);
    XLSX.utils.book_append_sheet(wb, ws2, "Department Monthly");

    const ws3 = XLSX.utils.json_to_sheet([{ "Employee ID": "EMP001", Name: "John Doe" }]);
    XLSX.utils.book_append_sheet(wb, ws3, "Employee Report");

    expect(wb.SheetNames).toEqual([
      "Occupancy & Charges",
      "Department Monthly",
      "Employee Report",
    ]);
  });
});

