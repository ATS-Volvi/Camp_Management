import { describe, it, expect } from "vitest";
import { employeePresence } from "./employeePresence";
import { buildEmployeeStays, type Arrival } from "./employeeStays";
const arrival: Arrival = { id: "a1", employee_id: "e1", camp_id: "c1", room_id: "r1", check_in_date: "2026-11-01", employees: null, rooms: null, camps: null };
const stays = buildEmployeeStays([arrival], [], [], "2026-11-08");
describe("Employee Master presence", () => {
  it("shows Vacation for a vacation resident", () => expect(employeePresence({ id: "e1", status: "active", presence_status: "vacation" }, stays, "2026-11-08")).toBe("Vacation"));
  it("shows Active for an employee in camp", () => expect(employeePresence({ id: "e1", status: "inactive", presence_status: "active" }, stays, "2026-11-08")).toBe("Active"));
  it("does not project a future check-in into current presence", () => expect(employeePresence({ id: "e1", status: "inactive" }, stays, "2026-10-31")).toBe("Inactive"));
});