import { describe, it, expect } from "vitest";
import { employeePresence, employeeCampMap, matchesEmployeeCamp } from "./employeePresence";
import { buildEmployeeStays, type Arrival } from "./employeeStays";
const arrival: Arrival = { id: "a1", employee_id: "e1", camp_id: "c1", room_id: "r1", check_in_date: "2026-11-01", employees: null, rooms: null, camps: null };
const stays = buildEmployeeStays([arrival], [], [], "2026-11-08");
describe("Employee Master presence", () => {
  it("shows Vacation for a vacation resident", () => expect(employeePresence({ id: "e1", status: "active", presence_status: "vacation" }, stays, "2026-11-08")).toBe("Vacation"));
  it("shows Active for an employee in camp", () => expect(employeePresence({ id: "e1", status: "inactive", presence_status: "active" }, stays, "2026-11-08")).toBe("Active"));
  it("does not project a future check-in into current presence", () => expect(employeePresence({ id: "e1", status: "inactive" }, stays, "2026-10-31")).toBe("Inactive"));
});

describe("Employee Master camp filter", () => {
  const own = { id: "e1", employee_type: "own", camp_id: "stale-camp" };
  it("uses the saved current camp rather than a stale master link", () => {
    const camps = employeeCampMap(stays, "2026-11-08");
    expect(matchesEmployeeCamp(own, "c1", camps)).toBe(true);
    expect(matchesEmployeeCamp(own, "stale-camp", camps)).toBe(false);
  });
  it("does not assign a future arrival to a camp", () => {
    expect(matchesEmployeeCamp(own, "unassigned", employeeCampMap(stays, "2026-10-31"))).toBe(true);
  });
  it("includes camp staff by their assigned work camp without a stay", () => {
    expect(matchesEmployeeCamp({ ...own, employee_type: "camp_staff", camp_id: "c2" }, "c2", {})).toBe(true);
  });
  it("keeps all employees visible for All Camps", () => {
    expect(matchesEmployeeCamp(own, "all", {})).toBe(true);
  });
});