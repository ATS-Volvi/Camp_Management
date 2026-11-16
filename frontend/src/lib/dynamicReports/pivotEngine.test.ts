import { describe, it, expect } from "vitest";
import { computePivotMatrix, formatPivotValue } from "./pivotEngine";
import { ReportConfig, FieldDefinition } from "./types";

describe("pivotEngine", () => {
  const sampleRecords = [
    { department: "EMBS", camp: "Camp 1", presence_status: "active", inmates_count: 1, grand_total: 100 },
    { department: "EMBS", camp: "Camp 1", presence_status: "on_site", inmates_count: 1, grand_total: 120 },
    { department: "EMBS", camp: "Camp 2", presence_status: "active", inmates_count: 1, grand_total: 150 },
    { department: "HERD", camp: "Camp 1", presence_status: "active", inmates_count: 1, grand_total: 200 },
    { department: "HERD", camp: "Camp 1", presence_status: "vacation", inmates_count: 1, grand_total: 50 },
  ];

  const fieldMap: Record<string, FieldDefinition> = {
    department: { id: "department", label: "Department", category: "dimension", dataType: "string" },
    camp: { id: "camp", label: "Camp", category: "dimension", dataType: "string" },
    presence_status: { id: "presence_status", label: "Status", category: "dimension", dataType: "string" },
    inmates_count: { id: "inmates_count", label: "Headcount", category: "measure", dataType: "number", format: "number" },
    grand_total: { id: "grand_total", label: "Total SAR", category: "measure", dataType: "number", format: "currency" },
  };

  it("computes 1D rows aggregation correctly", () => {
    const config: ReportConfig = {
      dataset: "inmates",
      rows: ["department"],
      columns: [],
      values: [{ fieldId: "inmates_count", aggregation: "count" }],
      filters: {},
      showSubtotals: true,
      showGrandTotals: true,
      chartType: "bar",
    };

    const res = computePivotMatrix(sampleRecords, config, fieldMap);
    expect(res.rows.length).toBe(2);
    expect(res.rows[0].value).toBe("EMBS");
    expect(res.rows[0].rowTotal.raw).toBe(3);
    expect(res.rows[1].value).toBe("HERD");
    expect(res.rows[1].rowTotal.raw).toBe(2);
    expect(res.grandTotal.raw).toBe(5);
  });

  it("computes 2D Cross-Tab matrix (rows x columns) with sums correctly", () => {
    const config: ReportConfig = {
      dataset: "billing",
      rows: ["department"],
      columns: ["presence_status"],
      values: [{ fieldId: "grand_total", aggregation: "sum" }],
      filters: {},
      showSubtotals: true,
      showGrandTotals: true,
      chartType: "bar",
    };

    const res = computePivotMatrix(sampleRecords, config, fieldMap);
    // Columns: active, on_site, vacation
    expect(res.columnHeaders.length).toBe(3);

    // EMBS total sum = 100 + 120 + 150 = 370
    expect(res.rows[0].rowTotal.raw).toBe(370);
    // HERD total sum = 200 + 50 = 250
    expect(res.rows[1].rowTotal.raw).toBe(250);
    // Grand total = 370 + 250 = 620
    expect(res.grandTotal.raw).toBe(620);
    expect(res.grandTotal.formatted).toBe("SAR 620.00");
  });

  it("filters records based on active criteria", () => {
    const config: ReportConfig = {
      dataset: "inmates",
      rows: ["department"],
      columns: [],
      values: [{ fieldId: "inmates_count", aggregation: "count" }],
      filters: { presence_status: ["active"] },
      showSubtotals: true,
      showGrandTotals: true,
      chartType: "bar",
    };

    const res = computePivotMatrix(sampleRecords, config, fieldMap);
    // EMBS has 2 active, HERD has 1 active
    expect(res.rows[0].rowTotal.raw).toBe(2);
    expect(res.rows[1].rowTotal.raw).toBe(1);
    expect(res.grandTotal.raw).toBe(3);
  });

  it("formats currency, numbers, and decimals properly", () => {
    expect(formatPivotValue(1234.56, "currency")).toBe("SAR 1,234.56");
    expect(formatPivotValue(1500, "number")).toBe("1,500");
    expect(formatPivotValue(85.4, "percentage")).toBe("85.4%");
  });
});
