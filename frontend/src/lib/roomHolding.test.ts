import { describe, it, expect } from "vitest";
import { leaveDaysWithin, roomCostWithHolding } from "./roomHolding";

describe("room holding charges", () => {
  it("bills leave days at the holding charge until the employee returns", () => {
    // 30-day stay, 7 days leave, room 80/day, holding 20/day
    expect(roomCostWithHolding(30, 7, 80, 20)).toBe(23 * 80 + 7 * 20);
  });

  it("counts leave days only inside the stay window", () => {
    const n = leaveDaysWithin([{ from: "2026-04-25", to: "2026-05-05" }], new Date("2026-04-01"), new Date("2026-04-30"));
    expect(n).toBe(6);
  });

  it("treats an open leave (not yet returned) as running to the end of the period", () => {
    const n = leaveDaysWithin([{ from: "2026-04-21", to: null }], new Date("2026-04-01"), new Date("2026-04-30"));
    expect(n).toBe(10);
  });
});

import { leaveRangesWithin, dmy } from "./roomHolding";
import { computeMealCost } from "./mealCosting";
describe("leave periods on cost reports", () => {
  it("clips leave to the stay and formats dd/MM/yyyy", () => {
    const r = leaveRangesWithin([{ from: "2026-10-10", to: "2026-10-12" }], new Date("2026-10-01"), new Date("2026-10-31"));
    expect(r.map(l => `${dmy(l.from)}-${dmy(l.to)}`)).toEqual(["10/10/2026-12/10/2026"]);
  });
  it("leave days remove all meals for those days", () => {
    const m = computeMealCost(new Date("2026-10-10"), new Date("2026-10-12"), { breakfast: 5, lunch: 10, dinner: 10, ramadan: 0 }, [{ from: "2026-10-10", to: "2026-10-12", meals: [] }]);
    expect(m.net).toBe(0);
  });
});
