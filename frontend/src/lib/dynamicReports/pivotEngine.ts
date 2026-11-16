import {
  AggregationFunction,
  FieldDefinition,
  PivotCell,
  PivotMatrixResult,
  PivotRowNode,
  ReportConfig,
  ValueMeasure,
} from "./types";

export function formatPivotValue(val: number, format?: string): string {
  if (val === undefined || val === null || isNaN(val)) return "0";
  if (format === "currency") {
    return `SAR ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (format === "percentage") {
    return `${val.toFixed(1)}%`;
  }
  if (Number.isInteger(val)) {
    return val.toLocaleString("en-US");
  }
  return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function aggregateValues(values: number[], agg: AggregationFunction): number {
  if (!values.length) return 0;
  switch (agg) {
    case "count":
      return values.length;
    case "sum":
      return values.reduce((a, b) => a + (Number(b) || 0), 0);
    case "avg": {
      const sum = values.reduce((a, b) => a + (Number(b) || 0), 0);
      return sum / values.length;
    }
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    default:
      return values.length;
  }
}

export function computePivotMatrix(
  datasetRecords: Array<Record<string, any>>,
  config: ReportConfig,
  fieldMap: Record<string, FieldDefinition>
): PivotMatrixResult {
  const { rows, columns, values, filters } = config;

  // 1. Filter Records
  const filteredRecords = datasetRecords.filter((rec) => {
    for (const [filterField, allowedValues] of Object.entries(filters || {})) {
      if (allowedValues && allowedValues.length > 0) {
        const val = String(rec[filterField] ?? "");
        if (!allowedValues.includes(val)) return false;
      }
    }
    return true;
  });

  // Default values measure if none provided
  const activeValues: ValueMeasure[] =
    values && values.length > 0
      ? values
      : [{ fieldId: "count", aggregation: "count", customLabel: "Count" }];

  // 2. Discover Unique Column Keys
  // If columns are defined, combine their values into composite column headers
  const columnKeySet = new Set<string>();
  const columnLabelMap: Record<string, string> = {};

  if (!columns || columns.length === 0) {
    // Single default column category
    columnKeySet.add("total");
    columnLabelMap["total"] = "Total";
  } else {
    for (const rec of filteredRecords) {
      const colValues = columns.map((c) => String(rec[c] ?? "(Blank)"));
      const compositeKey = colValues.join(" / ");
      columnKeySet.add(compositeKey);
      columnLabelMap[compositeKey] = compositeKey;
    }
  }

  // Sort columns naturally
  const sortedColKeys = Array.from(columnKeySet).sort((a, b) => a.localeCompare(b));

  // Build matrix leaf column headers (incorporating multiple values if > 1 measure)
  const matrixColHeaders: string[] = [];
  const matrixColLabels: Record<string, string> = {};

  for (const cKey of sortedColKeys) {
    for (const vMeasure of activeValues) {
      const fDef = fieldMap[vMeasure.fieldId];
      const measureLabel = vMeasure.customLabel || fDef?.label || vMeasure.fieldId;
      const matrixColKey = `${cKey}__${vMeasure.fieldId}__${vMeasure.aggregation}`;
      matrixColHeaders.push(matrixColKey);

      if (sortedColKeys.length === 1 && sortedColKeys[0] === "total") {
        matrixColLabels[matrixColKey] = measureLabel;
      } else {
        matrixColLabels[matrixColKey] = `${columnLabelMap[cKey]} • ${measureLabel}`;
      }
    }
  }

  // 3. Build Row Tree Hierarchy recursively
  const primaryRowDimension = rows && rows.length > 0 ? rows[0] : "All";

  function buildTree(
    records: Array<Record<string, any>>,
    rowDimIndex: number,
    parentKey: string
  ): PivotRowNode[] {
    if (!rows || rows.length === 0) {
      // Single summary row
      const node = createLeafNode("All Records", "all", "All", 0, records);
      return [node];
    }

    const currentDim = rows[rowDimIndex];
    const grouped = new Map<string, Array<Record<string, any>>>();

    for (const rec of records) {
      const val = String(rec[currentDim] ?? "(Blank)");
      if (!grouped.has(val)) grouped.set(val, []);
      grouped.get(val)!.push(rec);
    }

    const sortedRowVals = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));
    const nodes: PivotRowNode[] = [];

    for (const val of sortedRowVals) {
      const groupRecs = grouped.get(val)!;
      const nodeKey = parentKey ? `${parentKey} > ${val}` : val;
      const isLeaf = rowDimIndex >= rows.length - 1;

      if (isLeaf) {
        nodes.push(createLeafNode(nodeKey, currentDim, val, rowDimIndex, groupRecs));
      } else {
        const children = buildTree(groupRecs, rowDimIndex + 1, nodeKey);
        const node = createSummaryNode(nodeKey, currentDim, val, rowDimIndex, groupRecs, children);
        nodes.push(node);
      }
    }

    return nodes;
  }

  function createLeafNode(
    key: string,
    dimensionId: string,
    value: string,
    level: number,
    records: Array<Record<string, any>>
  ): PivotRowNode {
    const cells: Record<string, PivotCell> = {};
    const allRowMeasureNumbers: Record<string, number[]> = {};

    for (const vMeasure of activeValues) {
      allRowMeasureNumbers[vMeasure.fieldId] = [];
    }

    // Partition records by column
    for (const cKey of sortedColKeys) {
      const matchingRecs =
        columns.length === 0
          ? records
          : records.filter((r) => {
              const comp = columns.map((c) => String(r[c] ?? "(Blank)")).join(" / ");
              return comp === cKey;
            });

      for (const vMeasure of activeValues) {
        const matrixColKey = `${cKey}__${vMeasure.fieldId}__${vMeasure.aggregation}`;
        const fDef = fieldMap[vMeasure.fieldId];
        const rawNumbers = matchingRecs.map((r) => Number(r[vMeasure.fieldId]) || 0);

        allRowMeasureNumbers[vMeasure.fieldId].push(...rawNumbers);
        const aggVal = aggregateValues(rawNumbers, vMeasure.aggregation);

        cells[matrixColKey] = {
          raw: aggVal,
          formatted: formatPivotValue(aggVal, fDef?.format),
          count: matchingRecs.length,
        };
      }
    }

    // Row Total (across all columns)
    const firstMeasure = activeValues[0];
    const totalNums = allRowMeasureNumbers[firstMeasure.fieldId] || [];
    const totalAgg = aggregateValues(totalNums, firstMeasure.aggregation);
    const rowTotal: PivotCell = {
      raw: totalAgg,
      formatted: formatPivotValue(totalAgg, fieldMap[firstMeasure.fieldId]?.format),
      count: records.length,
    };

    return {
      key,
      dimensionId,
      value,
      level,
      cells,
      rowTotal,
    };
  }

  function createSummaryNode(
    key: string,
    dimensionId: string,
    value: string,
    level: number,
    records: Array<Record<string, any>>,
    children: PivotRowNode[]
  ): PivotRowNode {
    // Summary node cells are the aggregation of all underlying records
    const leafRepresentation = createLeafNode(key, dimensionId, value, level, records);
    leafRepresentation.children = children;
    leafRepresentation.isSubtotal = true;
    return leafRepresentation;
  }

  const rowTree = buildTree(filteredRecords, 0, "");

  // 4. Compute Column Totals & Grand Total
  const columnTotals: Record<string, PivotCell> = {};
  for (const cKey of sortedColKeys) {
    const colRecords =
      columns.length === 0
        ? filteredRecords
        : filteredRecords.filter((r) => {
            const comp = columns.map((c) => String(r[c] ?? "(Blank)")).join(" / ");
            return comp === cKey;
          });

    for (const vMeasure of activeValues) {
      const matrixColKey = `${cKey}__${vMeasure.fieldId}__${vMeasure.aggregation}`;
      const fDef = fieldMap[vMeasure.fieldId];
      const nums = colRecords.map((r) => Number(r[vMeasure.fieldId]) || 0);
      const aggVal = aggregateValues(nums, vMeasure.aggregation);

      columnTotals[matrixColKey] = {
        raw: aggVal,
        formatted: formatPivotValue(aggVal, fDef?.format),
        count: colRecords.length,
      };
    }
  }

  const firstMeasure = activeValues[0];
  const allNums = filteredRecords.map((r) => Number(r[firstMeasure.fieldId]) || 0);
  const grandTotalAgg = aggregateValues(allNums, firstMeasure.aggregation);
  const grandTotal: PivotCell = {
    raw: grandTotalAgg,
    formatted: formatPivotValue(grandTotalAgg, fieldMap[firstMeasure.fieldId]?.format),
    count: filteredRecords.length,
  };

  // 5. Build Flat Chart Data Series for Recharts
  // x-axis represents the top row hierarchy, series bars represent each column category
  const chartData: Array<Record<string, any>> = [];
  const chartSeriesKeys: string[] = [];

  const mainMeasure = activeValues[0];
  for (const cKey of sortedColKeys) {
    const key = sortedColKeys.length === 1 && sortedColKeys[0] === "total"
      ? (mainMeasure.customLabel || mainMeasure.fieldId)
      : cKey;
    chartSeriesKeys.push(key);
  }

  for (const topNode of rowTree) {
    const point: Record<string, any> = { name: topNode.value };
    for (const cKey of sortedColKeys) {
      const matrixColKey = `${cKey}__${mainMeasure.fieldId}__${mainMeasure.aggregation}`;
      const seriesKey = sortedColKeys.length === 1 && sortedColKeys[0] === "total"
        ? (mainMeasure.customLabel || mainMeasure.fieldId)
        : cKey;
      point[seriesKey] = topNode.cells[matrixColKey]?.raw || 0;
    }
    chartData.push(point);
  }

  return {
    columnHeaders: matrixColHeaders,
    columnLabels: matrixColLabels,
    rows: rowTree,
    columnTotals,
    grandTotal,
    chartData,
    chartSeriesKeys,
  };
}
