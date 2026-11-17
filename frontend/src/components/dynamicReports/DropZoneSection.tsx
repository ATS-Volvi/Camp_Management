import React, { useState, useMemo } from "react";
import { AggregationFunction, FieldDefinition, ReportConfig } from "@/lib/dynamicReports/types";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Rows, Columns, Sigma, Filter, X, ChevronDown, Plus, RotateCcw, Hash, Calendar, Tag } from "lucide-react";

interface DropZoneSectionProps {
  config: ReportConfig;
  fieldMap: Record<string, FieldDefinition>;
  onConfigChange: (newConfig: ReportConfig) => void;
}

export default function DropZoneSection({ config, fieldMap, onConfigChange }: DropZoneSectionProps) {
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const allFields = useMemo(() => Object.values(fieldMap), [fieldMap]);

  // Unselected fields per zone for the "+ Add" dropdown
  const availableForRows = useMemo(
    () => allFields.filter((f) => !config.rows.includes(f.id)),
    [allFields, config.rows]
  );

  const availableForColumns = useMemo(
    () => allFields.filter((f) => !config.columns.includes(f.id)),
    [allFields, config.columns]
  );

  const availableForValues = useMemo(
    () => allFields.filter((f) => !config.values.some((v) => v.fieldId === f.id)),
    [allFields, config.values]
  );

  const availableForFilters = useMemo(
    () => allFields.filter((f) => !config.filters[f.id]),
    [allFields, config.filters]
  );

  const handleDragOver = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (activeDropZone !== zone) setActiveDropZone(zone);
  };

  const handleDragLeave = () => {
    setActiveDropZone(null);
  };

  const addFieldToZone = (zone: "rows" | "columns" | "values" | "filters", fieldId: string) => {
    if (zone === "rows") {
      if (!config.rows.includes(fieldId)) {
        onConfigChange({ ...config, rows: [...config.rows, fieldId] });
      }
    } else if (zone === "columns") {
      if (!config.columns.includes(fieldId)) {
        onConfigChange({ ...config, columns: [...config.columns, fieldId] });
      }
    } else if (zone === "values") {
      const exists = config.values.some((v) => v.fieldId === fieldId);
      if (!exists) {
        const fDef = fieldMap[fieldId];
        const defaultAgg: AggregationFunction = fDef?.dataType === "number" ? "sum" : "count";
        onConfigChange({
          ...config,
          values: [...config.values, { fieldId, aggregation: defaultAgg }],
        });
      }
    } else if (zone === "filters") {
      if (!config.filters[fieldId]) {
        onConfigChange({
          ...config,
          filters: { ...config.filters, [fieldId]: [] },
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent, zone: "rows" | "columns" | "values" | "filters") => {
    e.preventDefault();
    setActiveDropZone(null);
    const fieldId = e.dataTransfer.getData("text/plain");
    if (!fieldId) return;
    addFieldToZone(zone, fieldId);
  };

  const handleRemoveField = (zone: "rows" | "columns" | "values" | "filters", fieldId: string) => {
    if (zone === "rows") {
      onConfigChange({ ...config, rows: config.rows.filter((r) => r !== fieldId) });
    } else if (zone === "columns") {
      onConfigChange({ ...config, columns: config.columns.filter((c) => c !== fieldId) });
    } else if (zone === "values") {
      onConfigChange({ ...config, values: config.values.filter((v) => v.fieldId !== fieldId) });
    } else if (zone === "filters") {
      const copy = { ...config.filters };
      delete copy[fieldId];
      onConfigChange({ ...config, filters: copy });
    }
  };

  const handleClearZone = (zone: "rows" | "columns" | "values" | "filters") => {
    if (zone === "rows") onConfigChange({ ...config, rows: [] });
    else if (zone === "columns") onConfigChange({ ...config, columns: [] });
    else if (zone === "values") onConfigChange({ ...config, values: [] });
    else if (zone === "filters") onConfigChange({ ...config, filters: {} });
  };

  const handleChangeAggregation = (fieldId: string, agg: AggregationFunction) => {
    onConfigChange({
      ...config,
      values: config.values.map((v) => (v.fieldId === fieldId ? { ...v, aggregation: agg } : v)),
    });
  };

  const getFieldIcon = (field?: FieldDefinition) => {
    if (!field) return <Tag size={11} className="opacity-60" />;
    if (field.dataType === "number") return <Hash size={11} className="opacity-60" />;
    if (field.dataType === "date") return <Calendar size={11} className="opacity-60" />;
    return <Tag size={11} className="opacity-60" />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. ROWS ZONE (Hierarchy) - Blue Theme                      */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        onDragOver={(e) => handleDragOver(e, "rows")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "rows")}
        className={`group bg-card rounded-lg p-2.5 transition-all duration-200 min-h-[104px] h-full flex flex-col justify-between ${
          activeDropZone === "rows"
            ? "border-2 border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-400/25 scale-[1.01]"
            : config.rows.length > 0
            ? "border border-border/80 shadow-xs bg-card hover:border-blue-300 dark:hover:border-blue-800"
            : "border-2 border-dashed border-border/70 hover:border-blue-300/80 bg-muted/20"
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Rows size={12} strokeWidth={2.5} />
            </div>
            <span className="font-semibold uppercase tracking-wider text-[11px] text-foreground">
              Rows (Hierarchy)
            </span>
          </div>

          <div className="flex items-center gap-1">
            {config.rows.length > 0 && (
              <button
                type="button"
                onClick={() => handleClearZone("rows")}
                title="Clear rows"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted"
              >
                <RotateCcw size={11} />
              </button>
            )}
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full transition-colors ${
                config.rows.length > 0
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {config.rows.length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start min-h-[40px]">
          {config.rows.length === 0 ? (
            <div className="w-full flex items-center justify-center py-2.5 text-muted-foreground/60 text-[11px] gap-1.5">
              <Plus size={12} className="opacity-50" />
              <span>Drop row dimensions (e.g. Dept, Floor)</span>
            </div>
          ) : (
            config.rows.map((rowId, index) => (
              <div
                key={rowId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-200/90 bg-blue-50/80 text-blue-800 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-200 text-xs shadow-2xs font-medium hover:border-blue-300 transition-colors"
              >
                <span className="truncate max-w-[140px]">{fieldMap[rowId]?.label || rowId}</span>
                {index < config.rows.length - 1 && (
                  <span className="text-blue-400 dark:text-blue-500 text-[10px] font-bold">➔</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveField("rows", rowId)}
                  className="hover:bg-blue-200/70 dark:hover:bg-blue-800 rounded-full p-0.5 text-blue-600 dark:text-blue-300 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Quick Add Button */}
        <div className="pt-1.5 flex justify-end border-t border-border/30 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 py-0.5 px-1.5 rounded hover:bg-muted/60 transition-colors"
              >
                <Plus size={11} />
                <span>Add row</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs max-h-56 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Available Fields
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableForRows.length === 0 ? (
                <div className="p-2 text-center text-muted-foreground text-xs">All fields added</div>
              ) : (
                availableForRows.map((field) => (
                  <DropdownMenuItem
                    key={field.id}
                    onClick={() => addFieldToZone("rows", field.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {getFieldIcon(field)}
                    <span>{field.label}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. COLUMNS ZONE (Slicers) - Indigo / Purple Theme          */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        onDragOver={(e) => handleDragOver(e, "columns")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "columns")}
        className={`group bg-card rounded-lg p-2.5 transition-all duration-200 min-h-[104px] h-full flex flex-col justify-between ${
          activeDropZone === "columns"
            ? "border-2 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-400/25 scale-[1.01]"
            : config.columns.length > 0
            ? "border border-border/80 shadow-xs bg-card hover:border-indigo-300 dark:hover:border-indigo-800"
            : "border-2 border-dashed border-border/70 hover:border-indigo-300/80 bg-muted/20"
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Columns size={12} strokeWidth={2.5} />
            </div>
            <span className="font-semibold uppercase tracking-wider text-[11px] text-foreground">
              Columns (Slicers)
            </span>
          </div>

          <div className="flex items-center gap-1">
            {config.columns.length > 0 && (
              <button
                type="button"
                onClick={() => handleClearZone("columns")}
                title="Clear columns"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted"
              >
                <RotateCcw size={11} />
              </button>
            )}
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full transition-colors ${
                config.columns.length > 0
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {config.columns.length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start min-h-[40px]">
          {config.columns.length === 0 ? (
            <div className="w-full flex items-center justify-center py-2.5 text-muted-foreground/60 text-[11px] gap-1.5">
              <Plus size={12} className="opacity-50" />
              <span>Drop column dimensions (e.g. Status, Room Tier)</span>
            </div>
          ) : (
            config.columns.map((colId) => (
              <div
                key={colId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-200/90 bg-indigo-50/80 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-200 text-xs shadow-2xs font-medium hover:border-indigo-300 transition-colors"
              >
                <span className="truncate max-w-[140px]">{fieldMap[colId]?.label || colId}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveField("columns", colId)}
                  className="hover:bg-indigo-200/70 dark:hover:bg-indigo-800 rounded-full p-0.5 text-indigo-600 dark:text-indigo-300 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Quick Add Button */}
        <div className="pt-1.5 flex justify-end border-t border-border/30 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 py-0.5 px-1.5 rounded hover:bg-muted/60 transition-colors"
              >
                <Plus size={11} />
                <span>Add column</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs max-h-56 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Available Fields
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableForColumns.length === 0 ? (
                <div className="p-2 text-center text-muted-foreground text-xs">All fields added</div>
              ) : (
                availableForColumns.map((field) => (
                  <DropdownMenuItem
                    key={field.id}
                    onClick={() => addFieldToZone("columns", field.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {getFieldIcon(field)}
                    <span>{field.label}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. VALUES ZONE (Measures) - Amber / Orange Theme          */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        onDragOver={(e) => handleDragOver(e, "values")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "values")}
        className={`group bg-card rounded-lg p-2.5 transition-all duration-200 min-h-[104px] h-full flex flex-col justify-between ${
          activeDropZone === "values"
            ? "border-2 border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 shadow-md ring-2 ring-amber-400/25 scale-[1.01]"
            : config.values.length > 0
            ? "border border-border/80 shadow-xs bg-card hover:border-amber-300 dark:hover:border-amber-800"
            : "border-2 border-dashed border-border/70 hover:border-amber-300/80 bg-muted/20"
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sigma size={12} strokeWidth={2.5} />
            </div>
            <span className="font-semibold uppercase tracking-wider text-[11px] text-foreground">
              Values (Measures)
            </span>
          </div>

          <div className="flex items-center gap-1">
            {config.values.length > 0 && (
              <button
                type="button"
                onClick={() => handleClearZone("values")}
                title="Clear values"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted"
              >
                <RotateCcw size={11} />
              </button>
            )}
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full transition-colors ${
                config.values.length > 0
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {config.values.length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start min-h-[40px]">
          {config.values.length === 0 ? (
            <div className="w-full flex items-center justify-center py-2.5 text-muted-foreground/60 text-[11px] gap-1.5">
              <Plus size={12} className="opacity-50" />
              <span>Drop metric fields (e.g. Inmates Count, Headcount)</span>
            </div>
          ) : (
            config.values.map((valConfig) => (
              <div
                key={valConfig.fieldId}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-200/90 bg-amber-50/80 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200 text-xs shadow-2xs font-medium hover:border-amber-300 transition-colors"
              >
                {/* Aggregation Selector Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="font-mono font-bold uppercase tracking-wider text-[9px] bg-amber-200/80 dark:bg-amber-900/80 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 hover:bg-amber-300/80 dark:hover:bg-amber-800 transition-colors text-amber-900 dark:text-amber-100 shadow-2xs"
                    >
                      {valConfig.aggregation}
                      <ChevronDown size={8} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="text-xs w-44">
                    <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                      Aggregation
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "sum")}>
                      <span className="font-semibold w-12 font-mono text-[11px] text-amber-600">SUM</span> Total sum
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "count")}>
                      <span className="font-semibold w-12 font-mono text-[11px] text-amber-600">COUNT</span> Records count
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "avg")}>
                      <span className="font-semibold w-12 font-mono text-[11px] text-amber-600">AVG</span> Average value
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "min")}>
                      <span className="font-semibold w-12 font-mono text-[11px] text-amber-600">MIN</span> Minimum
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "max")}>
                      <span className="font-semibold w-12 font-mono text-[11px] text-amber-600">MAX</span> Maximum
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <span className="truncate max-w-[130px] font-medium">
                  {fieldMap[valConfig.fieldId]?.label || valConfig.fieldId}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveField("values", valConfig.fieldId)}
                  className="hover:bg-amber-200/70 dark:hover:bg-amber-800 rounded-full p-0.5 text-amber-700 dark:text-amber-300 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Quick Add Button */}
        <div className="pt-1.5 flex justify-end border-t border-border/30 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 py-0.5 px-1.5 rounded hover:bg-muted/60 transition-colors"
              >
                <Plus size={11} />
                <span>Add measure</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs max-h-56 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Available Metrics
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableForValues.length === 0 ? (
                <div className="p-2 text-center text-muted-foreground text-xs">All metrics added</div>
              ) : (
                availableForValues.map((field) => (
                  <DropdownMenuItem
                    key={field.id}
                    onClick={() => addFieldToZone("values", field.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Sigma size={11} className="text-amber-500" />
                    <span>{field.label}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. FILTERS ZONE (Slicers) - Emerald / Teal Theme           */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        onDragOver={(e) => handleDragOver(e, "filters")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "filters")}
        className={`group bg-card rounded-lg p-2.5 transition-all duration-200 min-h-[104px] h-full flex flex-col justify-between ${
          activeDropZone === "filters"
            ? "border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-400/25 scale-[1.01]"
            : Object.keys(config.filters).length > 0
            ? "border border-border/80 shadow-xs bg-card hover:border-emerald-300 dark:hover:border-emerald-800"
            : "border-2 border-dashed border-border/70 hover:border-emerald-300/80 bg-muted/20"
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Filter size={12} strokeWidth={2.5} />
            </div>
            <span className="font-semibold uppercase tracking-wider text-[11px] text-foreground">
              Filters (Slicers)
            </span>
          </div>

          <div className="flex items-center gap-1">
            {Object.keys(config.filters).length > 0 && (
              <button
                type="button"
                onClick={() => handleClearZone("filters")}
                title="Clear filters"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted"
              >
                <RotateCcw size={11} />
              </button>
            )}
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full transition-colors ${
                Object.keys(config.filters).length > 0
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {Object.keys(config.filters).length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start min-h-[40px]">
          {Object.keys(config.filters).length === 0 ? (
            <div className="w-full flex items-center justify-center py-2.5 text-muted-foreground/60 text-[11px] gap-1.5">
              <Plus size={12} className="opacity-50" />
              <span>Drop fields here to slice dataset</span>
            </div>
          ) : (
            Object.keys(config.filters).map((fId) => (
              <div
                key={fId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200/90 bg-emerald-50/80 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200 text-xs shadow-2xs font-medium hover:border-emerald-300 transition-colors"
              >
                <span className="truncate max-w-[140px]">{fieldMap[fId]?.label || fId}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveField("filters", fId)}
                  className="hover:bg-emerald-200/70 dark:hover:bg-emerald-800 rounded-full p-0.5 text-emerald-600 dark:text-emerald-300 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Quick Add Button */}
        <div className="pt-1.5 flex justify-end border-t border-border/30 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 py-0.5 px-1.5 rounded hover:bg-muted/60 transition-colors"
              >
                <Plus size={11} />
                <span>Add filter</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs max-h-56 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Available Fields
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableForFilters.length === 0 ? (
                <div className="p-2 text-center text-muted-foreground text-xs">All fields added</div>
              ) : (
                availableForFilters.map((field) => (
                  <DropdownMenuItem
                    key={field.id}
                    onClick={() => addFieldToZone("filters", field.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {getFieldIcon(field)}
                    <span>{field.label}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
