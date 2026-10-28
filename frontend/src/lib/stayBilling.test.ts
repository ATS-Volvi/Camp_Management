import { describe, expect, it } from "vitest";
import { billableStayWindow, stayDeparture } from "./stayBilling";
import { computeMealCost } from "./mealCosting";

describe("checkout billing cutoff", () => {
  it("bills 10–19 October for checkout on 20 October, excluding future dates", () => {
    const w = billableStayWindow("2026-10-10", "2026-10-20", "2026-10-01", "2026-12-31");
    expect(w.days).toBe(10);
    expect(w.end.toISOString().slice(0, 10)).toBe("2026-10-19");
    expect(computeMealCost(w.start, w.end, { breakfast: 5, lunch: 10, dinner: 10, ramadan: 20 }, []).net).toBe(250);
  });
  it("allows future billing windows while the stay is ongoing", () => {
    expect(billableStayWindow("2026-10-10", null, "2026-10-10", "2026-11-01").days).toBe(23);
  });
  it("charges nothing on or after checkout day", () => {
    expect(billableStayWindow("2026-10-10", "2026-10-20", "2026-10-20", "2026-10-31").days).toBe(0);
  });
  it("does not use a later stay's checkout for an earlier stay", () => {
    const stay = { employee_id: "e", check_in_date: "2026-10-10" };
    expect(stayDeparture(stay, [{ employee_id: "e", check_out_date: "2026-10-20" }, { employee_id: "e", check_out_date: "2026-11-20" }], [stay, { employee_id: "e", check_in_date: "2026-11-10" }])).toBe("2026-10-20");
  });
});