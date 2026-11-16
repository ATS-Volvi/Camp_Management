import React, { useState } from "react";
import { AggregationFunction, FieldDefinition, ReportConfig, ValueMeasure } from "@/lib/dynamicReports/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Rows, Columns, Sigma, Filter, X, ChevronDown, GripVertical } from "lucide-react";

interface DropZoneSectionProps {
  config: ReportConfig;
  fieldMap: Record<string, FieldDefinition>;
  onConfigChange: (newConfig: ReportConfig) => void;
}

export default function DropZoneSection({ config, fieldMap, onConfigChange }: DropZoneSectionProps) {
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (activeDropZone !== zone) setActiveDropZone(zone);
  };

  const handleDragLeave = () => {
    setActiveDropZone(null);
  };

  const handleDrop = (e: React.DragEvent, zone: "rows" | "columns" | "values" | "filters") => {
    e.preventDefault();
    setActiveDropZone(null);
    const fieldId = e.dataTransfer.getData("text/plain");
    if (!fieldId) return;

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

  const handleChangeAggregation = (fieldId: string, agg: AggregationFunction) => {
    onConfigChange({
      ...config,
      values: config.values.map((v) => (v.fieldId === fieldId ? { ...v, aggregation: agg } : v)),
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Rows Zone */}
      <div
        onDragOver={(e) => handleDragOver(e, "rows")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "rows")}
        className={`bg-card border-2 rounded-xl p-3 transition-colors min-h-[92px] flex flex-col justify-between ${
          activeDropZone === "rows" ? "border-blue-500 bg-blue-50/20" : "border-border/80"
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Rows size={14} className="text-blue-500" />
            <span>Rows (Hierarchy)</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">{config.rows.length}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start">
          {config.rows.length === 0 ? (
            <span className="text-[11px] text-muted-foreground/70 italic py-1">
              Drag dimension fields here (e.g. Dept, Camp)
            </span>
          ) : (
            config.rows.map((rowId, index) => (
              <Badge
                key={rowId}
                variant="secondary"
                className="bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 flex items-center gap-1 pl-2 pr-1 py-1 text-xs"
              >
                <span className="font-semibold">{fieldMap[rowId]?.label || rowId}</span>
                {index < config.rows.length - 1 && <span className="text-muted-foreground text-[10px]">➔</span>}
                <button
                  type="button"
                  onClick={() => handleRemoveField("rows", rowId)}
                  className="hover:bg-blue-200/50 rounded-full p-0.5 ml-0.5 text-blue-700 dark:text-blue-300"
                >
                  <X size={11} />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* 2. Columns Zone */}
      <div
        onDragOver={(e) => handleDragOver(e, "columns")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "columns")}
        className={`bg-card border-2 rounded-xl p-3 transition-colors min-h-[92px] flex flex-col justify-between ${
          activeDropZone === "columns" ? "border-indigo-500 bg-indigo-50/20" : "border-border/80"
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Columns size={14} className="text-indigo-500" />
            <span>Columns (Matrix Slicers)</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">{config.columns.length}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start">
          {config.columns.length === 0 ? (
            <span className="text-[11px] text-muted-foreground/70 italic py-1">
              Optional: Drag columns (e.g. Status, Room Tier)
            </span>
          ) : (
            config.columns.map((colId) => (
              <Badge
                key={colId}
                variant="secondary"
                className="bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 flex items-center gap-1 pl-2 pr-1 py-1 text-xs"
              >
                <span className="font-semibold">{fieldMap[colId]?.label || colId}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveField("columns", colId)}
                  className="hover:bg-indigo-200/50 rounded-full p-0.5 ml-0.5 text-indigo-700 dark:text-indigo-300"
                >
                  <X size={11} />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* 3. Values Zone */}
      <div
        onDragOver={(e) => handleDragOver(e, "values")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "values")}
        className={`bg-card border-2 rounded-xl p-3 transition-colors min-h-[92px] flex flex-col justify-between ${
          activeDropZone === "values" ? "border-emerald-500 bg-emerald-50/20" : "border-border/80"
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Sigma size={14} className="text-emerald-500" />
            <span>Values (Metrics)</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">{config.values.length}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start">
          {config.values.length === 0 ? (
            <span className="text-[11px] text-muted-foreground/70 italic py-1">
              Drag metric fields here (e.g. Headcount, SAR Total)
            </span>
          ) : (
            config.values.map((valConfig) => (
              <div
                key={valConfig.fieldId}
                className="bg-emerald-50 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 rounded-md flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5 hover:underline"
                    >
                      {valConfig.aggregation}
                      <ChevronDown size={10} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="text-xs">
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "sum")}>
                      SUM (Total)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "count")}>
                      COUNT (Portions / Inmates)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "avg")}>
                      AVG (Average)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "min")}>
                      MIN (Minimum)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "max")}>
                      MAX (Maximum)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <span className="font-semibold text-foreground/90">
                  {fieldMap[valConfig.fieldId]?.label || valConfig.fieldId}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveField("values", valConfig.fieldId)}
                  className="hover:bg-emerald-200/50 rounded-full p-0.5 ml-0.5 text-emerald-800 dark:text-emerald-300"
                >
                  <X size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Filters Zone */}
      <div
        onDragOver={(e) => handleDragOver(e, "filters")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "filters")}
        className={`bg-card border-2 rounded-xl p-3 transition-colors min-h-[92px] flex flex-col justify-between ${
          activeDropZone === "filters" ? "border-amber-500 bg-amber-50/20" : "border-border/80"
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Filter size={14} className="text-amber-500" />
            <span>Filters</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {Object.keys(config.filters).length}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start">
          {Object.keys(config.filters).length === 0 ? (
            <span className="text-[11px] text-muted-foreground/70 italic py-1">
              Drag fields to filter data
            </span>
          ) : (
            Object.keys(config.filters).map((fId) => (
              <Badge
                key={fId}
                variant="secondary"
                className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 flex items-center gap-1 pl-2 pr-1 py-1 text-xs"
              >
                <span className="font-semibold">{fieldMap[fId]?.label || fId}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveField("filters", fId)}
                  className="hover:bg-amber-200/50 rounded-full p-0.5 ml-0.5 text-amber-700 dark:text-amber-300"
                >
                  <X size={11} />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
