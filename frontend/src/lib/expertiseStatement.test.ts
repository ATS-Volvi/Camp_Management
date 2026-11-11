import { describe, it, expect } from "vitest";
import { buildStatementSummary, formatCurrencyCell, formatCountCell } from "./expertiseStatement";

describe("expertiseStatement", () => {
  it("matches exact figures from the uploaded report screenshot", () => {
    // Exact counts from user screenshot
    const sampleCounts = {
      "1x1": { officeLunchMeals: 1466 },
      "2x1": { active: 25 },
      "3x1": { active: 1443, onSite: 20, onVacation: 61 },
      "4x1": { active: 1179, onSite: 10, onVacation: 0 },
      "5x1": { active: 221, onVacation: 12 },
      "6x1": { active: 9822, onSite: 1, onVacation: 109 },
    };

    const summary = buildStatementSummary(
      sampleCounts,
      "26-August-2026",
      "25-September-2026",
      "EMBS",
      "(All)"
    );

    // Table 1 Occupancy totals:
    // Active: 25 + 1443 + 1179 + 221 + 9822 = 12690
    expect(summary.totalOccupancy.active).toBe(12690);
    // On-Site: 20 + 10 + 1 = 31
    expect(summary.totalOccupancy.onSite).toBe(31);
    // On-Vacation: 61 + 0 + 12 + 109 = 182
    expect(summary.totalOccupancy.onVacation).toBe(182);
    // Resident beds = 12690 + 31 + 182 = 12903
    expect(summary.totalOccupancy.active + summary.totalOccupancy.onSite + summary.totalOccupancy.onVacation).toBe(12903);
    // Office Lunch meals = 1466
    expect(summary.totalOccupancy.officeLunchMeals).toBe(1466);
    // Grand Total Occupancy = 12903 + 1466 = 14369
    expect(summary.totalOccupancy.grandTotal).toBe(14369);

    // Table 3 Row charges check:
    const r1 = summary.rows.find((r) => r.category === "1x1")!;
    expect(r1.officeLunchCharges).toBe(7623.2);
    expect(r1.grandTotalCharges).toBe(7623.2);

    const r2 = summary.rows.find((r) => r.category === "2x1")!;
    expect(r2.accommodationCharges).toBe(300);
    expect(r2.cateringCharges).toBe(325);
    expect(r2.grandTotalCharges).toBe(625);

    const r3 = summary.rows.find((r) => r.category === "3x1")!;
    expect(r3.accommodationCharges).toBe(15873);
    expect(r3.cateringCharges).toBe(15873);
    expect(r3.onSiteCharges).toBe(220);
    expect(r3.onVacationCharges).toBe(671);
    expect(r3.grandTotalCharges).toBe(32637);

    const r4 = summary.rows.find((r) => r.category === "4x1")!;
    expect(r4.accommodationCharges).toBe(11790);
    expect(r4.cateringCharges).toBe(11790);
    expect(r4.onSiteCharges).toBe(100);
    expect(r4.grandTotalCharges).toBe(23680);

    const r5 = summary.rows.find((r) => r.category === "5x1")!;
    expect(r5.accommodationCharges).toBe(1989);
    expect(r5.cateringCharges).toBe(2210);
    expect(r5.onVacationCharges).toBe(108);
    expect(r5.grandTotalCharges).toBe(4307);

    const r6 = summary.rows.find((r) => r.category === "6x1")!;
    expect(r6.accommodationCharges).toBe(88398);
    expect(r6.cateringCharges).toBe(98220);
    expect(r6.onSiteCharges).toBe(9);
    expect(r6.onVacationCharges).toBe(981);
    expect(r6.grandTotalCharges).toBe(187608);

    // Grand totals:
    expect(summary.totalCharges.accommodation).toBe(118350);
    expect(summary.totalCharges.catering).toBe(128418);
    expect(summary.totalCharges.onSite).toBe(329);
    expect(summary.totalCharges.onVacation).toBe(1760);
    expect(summary.totalCharges.officeLunch).toBe(7623.2);
    expect(summary.totalCharges.grandTotal).toBe(256480.2);

    // Cell formatting checks:
    expect(formatCurrencyCell(118350)).toBe("118,350.00");
    expect(formatCurrencyCell(256480.2)).toBe("256,480.20");
    expect(formatCurrencyCell(0)).toBe("-");
    expect(formatCountCell(12690)).toBe("12,690");
    expect(formatCountCell(0)).toBe("-");
  });
});

