import { describe, expect, it } from "vitest";
import { resolveRoomTypeTier, getExcelTierRates, getExcelMealRates, EXCEL_STANDARD_RATES } from "./excelRates";

describe("excelRates", () => {
  it("resolves various room type representations accurately", () => {
    expect(resolveRoomTypeTier("1x1")).toBe("1x1");
    expect(resolveRoomTypeTier("executive_single")).toBe("1x1");
    expect(resolveRoomTypeTier(null, 1)).toBe("1x1");

    expect(resolveRoomTypeTier("2x1")).toBe("2x1");
    expect(resolveRoomTypeTier("supervisor_twin")).toBe("2x1");

    expect(resolveRoomTypeTier("3x1")).toBe("3x1");
    expect(resolveRoomTypeTier("staff_4bed")).toBe("4x1");
    expect(resolveRoomTypeTier("5x1")).toBe("5x1");
    expect(resolveRoomTypeTier("6x1")).toBe("6x1");
    expect(resolveRoomTypeTier("skilled_6bed")).toBe("6x1");
  });

  it("returns the exact Excel accommodation and catering rates", () => {
    const t1 = getExcelTierRates("1x1");
    expect(t1.accommodationRate).toBe(17);
    expect(t1.cateringRate).toBe(13);
    expect(t1.combinedRate).toBe(30);

    const t2 = getExcelTierRates("2x1");
    expect(t2.accommodationRate).toBe(12);
    expect(t2.cateringRate).toBe(13);
    expect(t2.combinedRate).toBe(25);

    const t3 = getExcelTierRates("3x1");
    expect(t3.accommodationRate).toBe(11);
    expect(t3.cateringRate).toBe(11);
    expect(t3.combinedRate).toBe(22);

    const t4 = getExcelTierRates("4x1");
    expect(t4.accommodationRate).toBe(10);
    expect(t4.cateringRate).toBe(10);
    expect(t4.combinedRate).toBe(20);

    const t6 = getExcelTierRates("6x1");
    expect(t6.accommodationRate).toBe(9);
    expect(t6.cateringRate).toBe(10);
    expect(t6.combinedRate).toBe(19);
  });

  it("returns the exact meal breakdown per Excel summary sheet", () => {
    const m1 = getExcelMealRates("1x1");
    expect(m1.breakfast).toBe(2.6);
    expect(m1.lunch).toBe(5.2);
    expect(m1.dinner).toBe(5.2);
    expect(m1.breakfast + m1.lunch + m1.dinner).toBe(13);

    const m3 = getExcelMealRates("3x1");
    expect(m3.breakfast).toBe(2.2);
    expect(m3.lunch).toBe(4.4);
    expect(m3.dinner).toBe(4.4);
    expect(m3.breakfast + m3.lunch + m3.dinner).toBe(11);

    const m4 = getExcelMealRates("4x1");
    expect(m4.breakfast).toBe(2.0);
    expect(m4.lunch).toBe(4.0);
    expect(m4.dinner).toBe(4.0);
    expect(m4.breakfast + m4.lunch + m4.dinner).toBe(10);
  });
});

