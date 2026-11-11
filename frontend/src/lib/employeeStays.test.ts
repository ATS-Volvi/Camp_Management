import { describe, expect, it } from "vitest";
import { buildEmployeeStays, scopeEmployeeStays, stayedDays, type Arrival, type Departure, type StayCancellation } from "./employeeStays";
const arrival = (id: string, date: string, camp = "c1", room = "r1"): Arrival => ({ id, employee_id: "e1", camp_id: camp, room_id: room, check_in_date: date, employees: null, camps: null, rooms: null });
const departure = (id: string, date: string, camp = "c1", room = "r1"): Departure => ({ id, employee_id: "e1", camp_id: camp, room_id: room, check_out_date: date, employees: null, camps: null, rooms: null, assets_returned: true, damage_remarks: null, clearance_notes: null });
const request = (id: string, status: string, from = "2026-10-12", to = "2026-10-15"): StayCancellation => ({ id, employee_id: "e1", camp_id: "c1", from_date: from, to_date: to, status, reason: "leave", source: "manual", remarks: null, food_cancellation_request_meals: [{ meal_type: "lunch" }] });
describe("employee stay reports", () => {
  it("retains every checkout cycle and ongoing stay across camps", () => {
    const rows = buildEmployeeStays([arrival("a", "2026-01-01"), arrival("b", "2026-03-01", "c2"), arrival("c", "2026-11-01")], [departure("x", "2026-01-11"), departure("y", "2026-03-21", "c2")], [], "2026-11-08");
    expect(rows.map(r => [r.id, r.camp_id, r.departure, r.days])).toEqual([["c", "c1", null, 8], ["b", "c2", "2026-03-21", 20], ["a", "c1", "2026-01-11", 10]]);
    expect(scopeEmployeeStays(rows, "c1", true).map(r => r.id)).toEqual(["a"]);
  });
  it("camp reports include only that camp's stays while global reports retain all camps", () => {
    const rows = buildEmployeeStays([arrival("a", "2026-10-10"), arrival("b", "2026-11-01", "c2")], [departure("x", "2026-10-20")], []);
    expect(scopeEmployeeStays(rows, "c1").map(r => r.id)).toEqual(["a"]);
    expect(scopeEmployeeStays(rows).map(r => r.id)).toEqual(["b", "a"]);
  });
  it("counts 10–20 October as 10 days, excluding checkout day", () => expect(stayedDays("2026-10-10", "2026-10-20")).toBe(10));
  it("caps an ongoing November stay at 7 November", () => expect(stayedDays("2026-11-01", null, "2026-11-07")).toBe(7));
  it("matches each stay to its own first actual checkout", () => {
    const rows = buildEmployeeStays([arrival("a", "2026-10-10"), arrival("b", "2026-11-01")], [departure("x", "2026-10-20"), departure("y", "2026-11-05")], []);
    expect(rows.map(r => [r.id, r.departure, r.days])).toEqual([["b", "2026-11-05", 4], ["a", "2026-10-20", 10]]);
  });
  it("does not invent a checkout from a later check-in", () => {
    const rows = buildEmployeeStays([arrival("a", "2026-10-10"), arrival("b", "2026-11-01")], [], [], "2026-11-07");
    expect(rows.find(r => r.id === "a")).toMatchObject({ departure: null, days: null, status: "Missing checkout" });
  });
  it("does not reuse a checkout across rooms or camps", () => {
    const rows = buildEmployeeStays([arrival("a", "2026-10-10")], [departure("x", "2026-10-20", "c2", "r2")], []);
    expect(rows.find(r => r.id === "a")?.departure).toBeNull();
    expect(rows.find(r => r.id === "out-x")?.status).toBe("Missing check-in");
  });
  it("shows pending, approved, rejected and cancelled requests, scoped to the stay", () => {
    const rows = buildEmployeeStays([arrival("a", "2026-10-10")], [departure("x", "2026-10-20")], [request("p", "pending"), request("a", "approved"), request("r", "rejected"), request("c", "cancelled"), request("later", "approved", "2026-11-01", "2026-11-05")]);
    expect(rows[0].requests.map(r => r.id)).toEqual(["p", "a", "r", "c"]);
  });
  it("never counts negative days for future arrivals or same-day checkout", () => {
    expect(stayedDays("2026-11-10", null, "2026-11-07")).toBe(0);
    expect(stayedDays("2026-10-10T08:00:00Z", "2026-10-10T17:00:00Z")).toBe(0);
  });
});