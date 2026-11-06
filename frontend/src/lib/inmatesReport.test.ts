import { describe, expect, it } from "vitest";
import { currentInmateStays, matchesInmateLocation } from "./inmatesReport";

describe("inmates report", () => {
  const row = { camp_id: "camp1", block_id: "blockA", floor_key: "blockA|2", room_id: "A201" };
  it("combines camp, block, floor and room filters", () => {
    expect(matchesInmateLocation(row, { camp: "camp1", block: "blockA", floor: "blockA|2", room: "A201" })).toBe(true);
    for (const key of ["camp", "block", "floor", "room"]) {
      expect(matchesInmateLocation(row, { camp: "camp1", block: "blockA", floor: "blockA|2", room: "A201", [key]: "different" })).toBe(false);
    }
  });
  it("all camps includes locations with repeated room and floor names", () => {
    expect(matchesInmateLocation(row, { camp: "all", block: "all", floor: "all", room: "all" })).toBe(true);
    expect(matchesInmateLocation(row, { camp: "all", block: "all", floor: "blockB|2", room: "all" })).toBe(false);
  });
  it("includes only the latest active stay and excludes future arrivals", () => {
    const stay = { employee_id: "e1", room_id: "r1", camp_id: "c1", check_in_date: "2026-11-01" };
    const moved = { ...stay, room_id: "r2", camp_id: "c2", check_in_date: "2026-11-03" };
    expect(currentInmateStays([stay, moved, { ...stay, employee_id: "future", check_in_date: "2026-12-01" }], [{ employee_id: "e1", room_id: "r1", check_out_date: "2026-11-03" }], new Date("2026-11-05"))).toEqual([moved]);
    expect(currentInmateStays([stay], [{ employee_id: "e1", room_id: "r1", check_out_date: "2026-11-04" }], new Date("2026-11-05"))).toEqual([]);
  });
});