export type AggregationFunction = "sum" | "count" | "avg" | "min" | "max";

export type FieldCategory = "dimension" | "measure";
export type FieldDataType = "string" | "number" | "date";
export type FieldDisplayFormat = "currency" | "number" | "percentage" | "date";

export interface FieldDefinition {
  id: string;
  label: string;
  category: FieldCategory;
  dataType: FieldDataType;
  format?: FieldDisplayFormat;
  description?: string;
}

export interface ValueMeasure {
  fieldId: string;
  aggregation: AggregationFunction;
  customLabel?: string;
}

export type DatasetId = "inmates" | "billing" | "movements" | "catering";

export interface DatasetDefinition {
  id: DatasetId;
  name: string;
  description: string;
  fields: FieldDefinition[];
}

export type ChartType =
  | "bar"
  | "stacked_bar"
  | "line"
  | "donut"
  | "3d_bar"
  | "3d_line"
  | "3d_donut"
  | "none";

export interface ReportConfig {
  dataset: DatasetId;
  rows: string[];
  columns: string[];
  values: ValueMeasure[];
  filters: Record<string, string[]>;
  showSubtotals: boolean;
  showGrandTotals: boolean;
  chartType: ChartType;
}

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  config: ReportConfig;
  isBuiltIn?: boolean;
}

export interface PivotCell {
  raw: number;
  formatted: string;
  count: number;
}

export interface PivotColumnHeader {
  key: string;
  label: string;
  fieldId?: string;
  subHeaders?: PivotColumnHeader[];
}

export interface PivotRowNode {
  key: string;
  dimensionId: string;
  value: string;
  level: number;
  cells: Record<string, PivotCell>;
  rowTotal: PivotCell;
  children?: PivotRowNode[];
  isSubtotal?: boolean;
}

export interface PivotMatrixResult {
  columnHeaders: string[];
  columnLabels: Record<string, string>;
  rows: PivotRowNode[];
  columnTotals: Record<string, PivotCell>;
  grandTotal: PivotCell;
  chartData: Array<Record<string, any>>;
  chartSeriesKeys: string[];
}

