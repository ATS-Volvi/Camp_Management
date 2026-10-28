import { describe, expect, it } from "vitest";
import { residentsAt, contractStatus } from "./commandDashboard";

describe("command dashboard resident snapshot", () => {
  it("excludes departures and future arrivals while keeping a returned employee once", () => {
    const events = [
      { employee_id: "a", camp_id: "one", check_in_date: "2026-10-01" },
      { employee_id: "a", camp_id: "two", check_in_date: "2026-10-12" },
      { employee_id: "b", camp_id: "one", check_in_date: "2026-10-01" },
      { employee_id: "c", camp_id: "one", check_in_date: "2026-11-01" },
    ];
    expect(residentsAt(events, [
      { employee_id: "a", check_out_date: "2026-10-10" },
      { employee_id: "b", check_out_date: "2026-10-15" },
    ], "2026-10-23T23:59:59")).toEqual([events[1]]);
  });
});
describe("contract expiry window", () => {
  it("flags contracts expiring within the reference's 90-day window", () => {
    expect(contractStatus("2026-12-30", "2026-10-01")).toBe("Expiring ≤ 90 days");
    expect(contractStatus("2026-12-31", "2026-10-01")).toBe("Active");
    expect(contractStatus("2026-09-30", "2026-10-01")).toBe("Expired");
    expect(contractStatus(null, "2026-10-01")).toBe("No end date");
  });
});