import { describe, it, expect } from "vitest";
import { departmentInmatesMatrix, filterTotalInmates, totalInmatesMatrix } from "./totalInmates";
import { residentStatus } from "./accommodationAbsence";

describe("total inmates matrix", () => {
  it("counts residents per room category and status with grand total", () => {
    const m = totalInmatesMatrix([
      { room_category: "1x1", status: "Active" }, { room_category: "1x1", status: "Vacation" },
      { room_category: "4x1", status: "On Site" }, { room_category: "4x1", status: "Active" },
    ]);
    const one = m.table.find(r => r.category === "1x1");
    expect(one?.counts.Active).toBe(1); expect(one?.counts.Vacation).toBe(1); expect(one?.total).toBe(2);
    expect(m.grand.counts.Active).toBe(2); expect(m.grand.counts["On Site"]).toBe(1); expect(m.grand.total).toBe(4);
  });
  it("includes empty rooms and counts vacant beds without releasing vacation beds", () => {
    const m = totalInmatesMatrix([{ room_id: "r1", room_category: "3x1", status: "Vacation" }], [
      { id: "r1", camp_id: "c1", building_id: "b1", category: "3x1", max_capacity: 3 },
      { id: "r2", camp_id: "c1", building_id: "b1", category: "3x1", max_capacity: 3 },
    ]);
    expect(m.table.find(r => r.category === "3x1")?.availableRooms).toBe(2);
    expect(m.grand.unoccupied).toBe(5);
    expect(m.grand.total).toBe(1);
  });
  it("does not treat residents excluded by nationality as vacant beds", () => {
    const all = [{ room_id: "r1", room_category: "2x1", nationality: "India", status: "Active" },
      { room_id: "r1", room_category: "2x1", nationality: "Nepal", status: "Away" }];
    const filtered = filterTotalInmates(all, { camp: "all", block: "all", dept: "all", nationality: "India" });
    const m = totalInmatesMatrix(filtered, [{ id: "r1", camp_id: "c1", building_id: "b1", category: "2x1", max_capacity: 2 }], all);
    expect(m.grand.total).toBe(1);
    expect(m.grand.unoccupied).toBe(0);
  });
  it("applies camp, block, department and nationality together", () => {
    const rows = [
      { camp_id: "c1", block_id: "b1", department: "HR", nationality: "India" },
      { camp_id: "c1", block_id: "b2", department: "HR", nationality: "India" },
      { camp_id: "c2", block_id: "b1", department: "HR", nationality: "India" },
      { camp_id: "c1", block_id: "b1", department: "HR", nationality: "Nepal" },
      { camp_id: "c1", block_id: "b1", department: "FIN", nationality: "India" },
    ];
    expect(filterTotalInmates(rows, { camp: "c1", block: "b1", dept: "HR", nationality: "India" })).toEqual([rows[0]]);
  });
  it("groups all four statuses by department and includes a grand total", () => {
    const m = departmentInmatesMatrix([
      { department: "HR", status: "Active" }, { department: "HR", status: "On Site" },
      { department: "FIN", status: "Vacation" }, { department: "FIN", status: "Away" },
    ]);
    expect(m.table.find(r => r.department === "HR")?.total).toBe(2);
    expect(m.table.find(r => r.department === "FIN")?.counts.Vacation).toBe(1);
    expect(m.grand.counts).toEqual({ Active: 1, "On Site": 1, Vacation: 1, Away: 1 });
    expect(m.grand.total).toBe(4);
  });
});

describe("checkout reason maps to status", () => {
  it("uses the reason's status for temporary checkout", () => {
    expect(residentStatus({ absence_status: "vacation" } as any)).toBe("Vacation");
    expect(residentStatus({ absence_status: "on_site" } as any)).toBe("On Site");
    expect(residentStatus(null, null)).toBe("Active");
  });
});

describe("department room-category counts", () => {
  it("shows two PMTA inmates under 2x1, counting people rather than rooms or status", () => {
    const m = departmentInmatesMatrix([
      { department: "PMTA", room_id: "r1", room_category: "2x1", status: "Active" },
      { department: "PMTA", room_id: "r1", room_category: "2x1", status: "Vacation" },
      { department: "HR", room_category: "2x1", status: "On Site" },
      { department: "PMTA", room_category: "1x1", status: "Away" },
    ]);
    const pmta = m.table.find(r => r.department === "PMTA");
    expect(pmta?.categoryCounts["2x1"]).toBe(2);
    expect(pmta?.categoryCounts["1x1"]).toBe(1);
    expect(pmta?.categoryCounts.guest).toBe(0);
    expect(m.grand.categoryCounts["2x1"]).toBe(3);
    expect(Object.values(m.grand.categoryCounts).reduce((a, b) => a + b, 0)).toBe(m.grand.total);
  });
  it("uses the same filtered residents for status and category totals", () => {
    const rows = [
      { department: "PMTA", camp_id: "c1", block_id: "b1", nationality: "India", room_category: "2x1", status: "Active" },
      { department: "PMTA", camp_id: "c2", block_id: "b1", nationality: "India", room_category: "2x1", status: "Active" },
    ];
    const m = departmentInmatesMatrix(filterTotalInmates(rows, { camp: "c1", block: "b1", nationality: "India", dept: "PMTA" }));
    expect(m.grand.categoryCounts["2x1"]).toBe(1);
    expect(m.grand.counts.Active).toBe(1);
    expect(m.grand.total).toBe(1);
  });
});
