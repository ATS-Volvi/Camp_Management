import { describe, it, expect } from "vitest";
import { totalInmatesMatrix } from "./totalInmates";
import { residentStatus } from "./accommodationAbsence";

describe("total inmates matrix", () => {
  it("counts residents per room category and status with grand total", () => {
    const m = totalInmatesMatrix([
      { room_category: "1x1", status: "Active" }, { room_category: "1x1", status: "Vacation" },
      { room_category: "4x1", status: "On Site" }, { room_category: "4x1", status: "Active" },
    ]);
    const one = m.table.find(r => r.category === "1x1")!;
    expect(one.counts.Active).toBe(1); expect(one.counts.Vacation).toBe(1); expect(one.total).toBe(2);
    expect(m.grand.counts.Active).toBe(2); expect(m.grand.counts["On Site"]).toBe(1); expect(m.grand.total).toBe(4);
  });
});

describe("checkout reason maps to status", () => {
  it("uses the reason's status for temporary checkout", () => {
    expect(residentStatus({ absence_status: "vacation" } as any)).toBe("Vacation");
    expect(residentStatus({ absence_status: "on_site" } as any)).toBe("On Site");
    expect(residentStatus(null, null)).toBe("Active");
  });
});
