import { describe, expect, it } from "vitest";
import { departmentDisplayName, departmentLabel, matchesDepartment } from "./departmentLabels";

const master = [
  { name: "Heavy Equipment Rental Department", code: "HERD" },
  { name: "Modular Building Services", code: "MBS" },
  { name: "Electrical and Instrumentation Division", code: "EI" },
];

describe("department short forms", () => {
  it("uses the Department Master code and name", () => {
    expect(departmentLabel("HERD", master)).toEqual({ short: "HERD", name: "Heavy Equipment Rental Department" });
  });
  it("maps the spreadsheet spelling of a master department onto its code", () => {
    expect(departmentLabel("EMBS", master)).toEqual({ short: "MBS", name: "Modular Building Services" });
    expect(departmentLabel("Elctrcl & Instr", master)).toEqual({ short: "EI", name: "Electrical and Instrumentation Division" });
  });
  it("maps the abbreviated workforce-file names to their short forms", () => {
    expect(departmentLabel("People Departmn", master)).toEqual({ short: "HR", name: "Human Resources" });
    expect(departmentLabel("Finance Dept", master)).toEqual({ short: "FIN", name: "Finance" });
    expect(departmentLabel("Hlth, Sfty& Env", master)).toEqual({ short: "HSE", name: "Health, Safety & Environment" });
    expect(departmentLabel("Equipment Servi", master)).toEqual({ short: "HERD", name: "Heavy Equipment Rental Department" });
  });
  it("falls back to initials for departments nobody has named", () => {
    expect(departmentLabel("Zebra Unit", master).short).toBe("ZU");
    expect(departmentLabel("", master)).toEqual({ short: "Not recorded", name: "Not recorded" });
  });
  it("shows short form and full name together", () => {
    expect(departmentDisplayName(departmentLabel("HERD", master))).toBe("HERD — Heavy Equipment Rental Department");
  });

  it("matches department accounting for SAP truncation and project code", () => {
    expect(matchesDepartment({ department: "Equipment Servi", project: "HERD" }, "HERD")).toBe(true);
    expect(matchesDepartment({ department: "HERD", project: "HERD" }, "HERD")).toBe(true);
    expect(matchesDepartment({ department: "Equipment Services", project: "OTHER" }, "HERD")).toBe(true);
    expect(matchesDepartment({ department: "Maintanence", project: "HERD" }, "HERD")).toBe(true);
    expect(matchesDepartment({ department: "Civil Construction", project: "CCD" }, "HERD")).toBe(false);
    expect(matchesDepartment({ department: "Civil Construction", project: "CCD" }, "all")).toBe(true);
  });
});
