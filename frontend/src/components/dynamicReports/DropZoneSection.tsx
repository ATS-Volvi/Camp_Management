import React, { useState } from "react";
import { AggregationFunction, FieldDefinition, ReportConfig, ValueMeasure } from "@/lib/dynamicReports/types";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Rows, Columns, Sigma, Filter, X, ChevronDown } from "lucide-react";

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
        className={`bg-card rounded-xl p-3 transition-all min-h-[96px] flex flex-col justify-between border-2 ${
          activeDropZone === "rows"
            ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-400/20"
            : "border-dashed border-border/80 hover:border-border"
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Rows size={13} className="text-blue-600 dark:text-blue-400" />
            <span className="uppercase tracking-wide text-[11px]">Rows (Hierarchy)</span>
          </div>
          <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
            {config.rows.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start">
          {config.rows.length === 0 ? (
            <span className="text-[11px] text-muted-foreground/60 italic py-1">
              Drop row dimensions here (e.g. Dept, Camp)
            </span>
          ) : (
            config.rows.map((rowId, index) => (
              <div
                key={rowId}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1] dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200 text-xs shadow-2xs font-medium"
              >
                <span>{fieldMap[rowId]?.label || rowId}</span>
                {index < config.rows.length - 1 && <span className="text-blue-400 text-[10px]">➔</span>}
                <button
                  type="button"
                  onClick={() => handleRemoveField("rows", rowId)}
                  className="hover:bg-blue-200/60 dark:hover:bg-blue-900 rounded-full p-0.5 text-blue-700 dark:text-blue-300"
                >
                  <X size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Columns Zone */}
      <div
        onDragOver={(e) => handleDragOver(e, "columns")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "columns")}
        className={`bg-card rounded-xl p-3 transition-all min-h-[96px] flex flex-col justify-between border-2 ${
          activeDropZone === "columns"
            ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-400/20"
            : "border-dashed border-border/80 hover:border-border"
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Columns size={13} className="text-indigo-600 dark:text-indigo-400" />
            <span className="uppercase tracking-wide text-[11px]">Columns (Slicers)</span>
          </div>
          <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
            {config.columns.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start">
          {config.columns.length === 0 ? (
            <span className="text-[11px] text-muted-foreground/60 italic py-1">
              Drop column dimensions (e.g. Status, Room Tier)
            </span>
          ) : (
            config.columns.map((colId) => (
              <div
                key={colId}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1] dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200 text-xs shadow-2xs font-medium"
              >
                <span>{fieldMap[colId]?.label || colId}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveField("columns", colId)}
                  className="hover:bg-blue-200/60 dark:hover:bg-blue-900 rounded-full p-0.5 text-blue-700 dark:text-blue-300"
                >
                  <X size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Values Zone */}
      <div
        onDragOver={(e) => handleDragOver(e, "values")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "values")}
        className={`bg-card rounded-xl p-3 transition-all min-h-[96px] flex flex-col justify-between border-2 ${
          activeDropZone === "values"
            ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-400/20"
            : "border-dashed border-border/80 hover:border-border"
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Sigma size={13} className="text-amber-600 dark:text-amber-400" />
            <span className="uppercase tracking-wide text-[11px]">Values (Measures)</span>
          </div>
          <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
            {config.values.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start">
          {config.values.length === 0 ? (
            <span className="text-[11px] text-muted-foreground/60 italic py-1">
              Drop metric fields here (e.g. Headcount, SAR)
            </span>
          ) : (
            config.values.map((valConfig) => (
              <div
                key={valConfig.fieldId}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#fde68a] bg-[#fffbeb] text-[#b45309] dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200 text-xs shadow-2xs font-medium"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="font-mono font-bold uppercase tracking-wider text-[10px] bg-amber-200/60 dark:bg-amber-900/60 px-1 rounded flex items-center gap-0.5 hover:bg-amber-200"
                    >
                      {valConfig.aggregation}
                      <ChevronDown size={9} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="text-xs">
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "sum")}>
                      SUM (Total)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeAggregation(valConfig.fieldId, "count")}>
                      COUNT (Records / Inmates)
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

                <span>{fieldMap[valConfig.fieldId]?.label || valConfig.fieldId}</span>

                <button
                  type="button"
                  onClick={() => handleRemoveField("values", valConfig.fieldId)}
                  className="hover:bg-amber-200/60 dark:hover:bg-amber-900 rounded-full p-0.5 text-amber-800 dark:text-amber-300"
                >
                  <X size={10} />
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
        className={`bg-card rounded-xl p-3 transition-all min-h-[96px] flex flex-col justify-between border-2 ${
          activeDropZone === "filters"
            ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-400/20"
            : "border-dashed border-border/80 hover:border-border"
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Filter size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span className="uppercase tracking-wide text-[11px]">Filters (Slicers)</span>
          </div>
          <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
            {Object.keys(config.filters).length}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 flex-1 items-start content-start">
          {Object.keys(config.filters).length === 0 ? (
            <span className="text-[11px] text-muted-foreground/60 italic py-1">
              Drop fields here to slice dataset
            </span>
          ) : (
            Object.keys(config.filters).map((fId) => (
              <Badge
                key={fId}
                variant="secondary"
                className="bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs font-medium"
              >
                <span>{fieldMap[fId]?.label || fId}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveField("filters", fId)}
                  className="hover:bg-emerald-200/50 rounded-full p-0.5 ml-0.5 text-emerald-700 dark:text-emerald-300"
                >
                  <X size={10} />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
