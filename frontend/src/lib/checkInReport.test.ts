import { describe, expect, it } from "vitest";
import { checkInPeriodBounds, latestSuccessfulCheckIns, type CheckInReportRecord } from "./checkInReport";

describe("check-in reporting rules", () => {
  it("date-wise reporting includes exactly the selected date", () => {
    expect(checkInPeriodBounds("daily", "2026-10-17", "2026-04", "", "")).toEqual({ from: "2026-10-17", to: "2026-10-17" });
  });
  it("month-wise reporting includes the entire selected calendar month", () => {
    expect(checkInPeriodBounds("monthly", "", "2026-04", "", "")).toEqual({ from: "2026-04-01", to: "2026-04-30" });
    expect(checkInPeriodBounds("monthly", "", "2024-02", "", "").to).toBe("2024-02-29");
  });
  it("receipts contain only the latest check-in of successfully checked-in employees", () => {
    const records = [
      { id: "old", employee_id: "success", check_in_date: "2026-09-01" },
      { id: "new", employee_id: "success", check_in_date: "2026-10-17" },
      { id: "failed", employee_id: "failed", check_in_date: "2026-10-17" },
    ] as CheckInReportRecord[];
    expect(latestSuccessfulCheckIns(records, ["success"]).map(r => r.id)).toEqual(["new"]);
    expect(latestSuccessfulCheckIns(records, [])).toEqual([]);
  });
});