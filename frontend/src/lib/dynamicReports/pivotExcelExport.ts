import * as XLSX from "xlsx";
import { PivotMatrixResult, ReportConfig, PivotRowNode } from "./types";

export function exportPivotToExcel(
  result: PivotMatrixResult,
  config: ReportConfig,
  reportName: string = "Dynamic_Pivot_Report"
) {
  const wb = XLSX.utils.book_new();

  // Build rows array for the sheet
  const rows: Array<Array<string | number>> = [];

  // Title & Metadata
  rows.push([reportName.toUpperCase()]);
  rows.push([`Dataset: ${config.dataset.toUpperCase()}`, `Generated: ${new Date().toLocaleString()}`]);
  rows.push([]);

  // Header Row
  const headerRow: Array<string | number> = ["Hierarchy / Dimension"];
  for (const cKey of result.columnHeaders) {
    headerRow.push(result.columnLabels[cKey] || cKey);
  }
  headerRow.push("Row Total");
  rows.push(headerRow);

  // Flatten row tree with indentations for hierarchy levels
  function addRowNodes(nodes: PivotRowNode[]) {
    for (const node of nodes) {
      const indent = "  ".repeat(node.level);
      const rowData: Array<string | number> = [`${indent}${node.value}`];

      for (const cKey of result.columnHeaders) {
        rowData.push(node.cells[cKey]?.raw ?? 0);
      }
      rowData.push(node.rowTotal.raw ?? 0);
      rows.push(rowData);

      if (node.children && node.children.length > 0) {
        addRowNodes(node.children);
      }
    }
  }

  addRowNodes(result.rows);

  // Grand Total Row
  if (config.showGrandTotals) {
    const totalRow: Array<string | number> = ["GRAND TOTAL"];
    for (const cKey of result.columnHeaders) {
      totalRow.push(result.columnTotals[cKey]?.raw ?? 0);
    }
    totalRow.push(result.grandTotal.raw ?? 0);
    rows.push([]);
    rows.push(totalRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  const colWidths = [{ wch: 32 }];
  for (let i = 0; i < result.columnHeaders.length + 1; i++) {
    colWidths.push({ wch: 18 });
  }
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Pivot Report");
  XLSX.writeFile(wb, `${reportName.replace(/\s+/g, "_")}.xlsx`);
}

export function exportPivotToCsv(
  result: PivotMatrixResult,
  config: ReportConfig,
  reportName: string = "Dynamic_Pivot_Report"
) {
  const lines: string[] = [];

  // Header
  const headers = ["Dimension", ...result.columnHeaders.map((c) => `"${(result.columnLabels[c] || c).replace(/"/g, '""')}"`), "Row Total"];
  lines.push(headers.join(","));

  function addRowNodes(nodes: PivotRowNode[]) {
    for (const node of nodes) {
      const indent = "  ".repeat(node.level);
      const row = [
        `"${(indent + node.value).replace(/"/g, '""')}"`,
        ...result.columnHeaders.map((c) => String(node.cells[c]?.raw ?? 0)),
        String(node.rowTotal.raw ?? 0),
      ];
      lines.push(row.join(","));

      if (node.children) addRowNodes(node.children);
    }
  }

  addRowNodes(result.rows);

  if (config.showGrandTotals) {
    const totals = [
      '"GRAND TOTAL"',
      ...result.columnHeaders.map((c) => String(result.columnTotals[c]?.raw ?? 0)),
      String(result.grandTotal.raw ?? 0),
    ];
    lines.push(totals.join(","));
  }

  const csvContent = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportName.replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
