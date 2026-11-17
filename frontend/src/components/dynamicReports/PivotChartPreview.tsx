import React, { useState } from "react";
import { PivotMatrixResult, ReportConfig, ChartType } from "@/lib/dynamicReports/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBarChart,
  RadialBar,
  Treemap,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { BarChart3, EyeOff, Sparkles, TrendingUp, Hash, Columns, ArrowRightLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThreeDimensionMatrixView from "./ThreeDimensionMatrixView";
import { COLOR_THEMES } from "./VisualizationsPane";

interface PivotChartPreviewProps {
  matrix: PivotMatrixResult;
  config: ReportConfig;
  onChartTypeChange: (type: ChartType) => void;
  onConfigChange?: (config: ReportConfig) => void;
  rawRecords?: Array<Record<string, any>>;
}

export default function PivotChartPreview({
  matrix,
  config,
  onChartTypeChange,
  onConfigChange,
  rawRecords,
}: PivotChartPreviewProps) {
  const { chartData, chartSeriesKeys, grandTotal } = matrix;

  if (config.chartType === "none") return null;

  if (!chartData || chartData.length === 0 || chartSeriesKeys.length === 0) {
    return null;
  }

  // Active theme palette
  const activeThemeId = config.colorTheme || "powerbi";
  const matchedTheme = COLOR_THEMES.find((t) => t.id === activeThemeId) || COLOR_THEMES[0];
  const palette = matchedTheme.colors;

  // Render 3D WebGL Studio directly if any 3D mode is active
  if (
    config.chartType === "3d_bar" ||
    config.chartType === "3d_line" ||
    config.chartType === "3d_donut" ||
    (config.chartType as string) === "3d_matrix" ||
    (config.chartType as string) === "3d_network"
  ) {
    return (
      <ThreeDimensionMatrixView
        matrix={matrix}
        config={config}
        onChartTypeChange={onChartTypeChange}
        onConfigChange={onConfigChange}
        rawRecords={rawRecords}
      />
    );
  }

  // KPI Card View
  if (config.chartType === "kpi_card") {
    const totalVal = grandTotal?.formatted || grandTotal?.value?.toLocaleString() || "0";
    const primarySeries = chartSeriesKeys[0] || "Value";

    return (
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
              Power BI KPI Metrics Card Visual
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChartTypeChange("none")}
            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            title="Hide Visual"
          >
            <EyeOff size={12} />
          </Button>
        </div>

        {/* Hero Metric Banner */}
        <div className="bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Overall Grand Total ({config.values[0]?.aggregation.toUpperCase() || "SUM"})
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono text-primary tracking-tight mt-1">
            {totalVal}
          </div>
          <span className="text-xs font-semibold text-foreground/80 mt-1">
            Across {chartData.length} {config.rows.join(", ") || "categories"}
          </span>
        </div>

        {/* Category Breakdown Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {chartData.slice(0, 12).map((item, idx) => {
            const itemVal = Number(item[primarySeries]) || 0;
            const grandNumeric = grandTotal?.value || 1;
            const pct = Math.round((itemVal / grandNumeric) * 1000) / 10;
            const color = palette[idx % palette.length];

            return (
              <div
                key={item.name}
                className="bg-background border border-border/80 rounded-lg p-3 hover:border-primary/40 transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground truncate">
                  <span className="font-semibold text-foreground truncate">{item.name}</span>
                  <span className="font-mono text-[10px] font-bold text-primary">{pct}%</span>
                </div>
                <div className="text-lg font-bold font-mono text-foreground mt-1">
                  {itemVal.toLocaleString()}
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, pct))}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Format single-series slice data for Pie & Donut
  const firstKey = chartSeriesKeys[0] || "";
  const singleSeriesData = chartData.map((d) => ({
    name: d.name,
    value: Number(d[firstKey]) || 0,
  }));

  // Format 100% stacked data
  const percentStackedData = chartData.map((row) => {
    const rowTotal = chartSeriesKeys.reduce((sum, k) => sum + (Number(row[k]) || 0), 0) || 1;
    const res: Record<string, any> = { name: row.name };
    chartSeriesKeys.forEach((k) => {
      res[k] = Math.round(((Number(row[k]) || 0) / rowTotal) * 1000) / 10;
    });
    return res;
  });

  // Treemap data format
  const treemapData = chartData.map((d, i) => ({
    name: d.name,
    size: Number(d[firstKey]) || 1,
    fill: palette[i % palette.length],
  }));

  // Radial Bar Data format
  const radialData = chartData.slice(0, 7).map((d, i) => ({
    name: d.name,
    val: Number(d[firstKey]) || 0,
    fill: palette[i % palette.length],
  }));

  const showGrid = config.showGridlines !== false;
  const showLegend = config.showLegend !== false;
  const showLabels = config.showDataLabels === true;

  // Spacing mode for dense categories: "scroll" gives every bar 56px min-width; "fit" compresses into viewport
  const [barSpacingMode, setBarSpacingMode] = useState<"scroll" | "fit">(
    chartData.length > 10 ? "scroll" : "fit"
  );

  // Height mode: "compact" (340px) leaves maximum prominence for the report matrix below; "full" (480px) for deep analysis
  const [chartHeightMode, setChartHeightMode] = useState<"compact" | "full">("compact");
  const [isChartMinimized, setIsChartMinimized] = useState(false);

  // Shorten excessively long axis labels with ellipsis so they never collide
  const formatAxisLabel = (value: any) => {
    if (!value) return "";
    const str = String(value);
    if (str.length > 16) {
      return str.slice(0, 14) + "…";
    }
    return str;
  };

  const isVerticalBarOrLine = [
    "bar",
    "stacked_bar",
    "percent_stacked_bar",
    "line",
    "area",
    "stacked_area",
    "combo",
  ].includes(config.chartType);

  const isHorizontalBar = [
    "horizontal_bar",
    "stacked_horizontal_bar",
  ].includes(config.chartType);

  // Each column gets 56px minimum in scroll mode so ticks never collide
  const minColWidth = 56;
  const scrollWidth = Math.max(760, chartData.length * minColWidth);
  const activeChartWidth = isVerticalBarOrLine && barSpacingMode === "scroll" ? scrollWidth : "100%";

  // Interval calculation so rotated X-axis category labels never collide
  const computedInterval = barSpacingMode === "fit"
    ? (chartData.length > 30 ? 2 : chartData.length > 15 ? 1 : 0)
    : 0;

  // In horizontal bar mode, each category gets 30px height so Y-axis labels aren't squished
  const minRowHeight = 30;
  const scrollHeight = Math.max(340, chartData.length * minRowHeight);
  const activeChartHeight = isHorizontalBar
    ? scrollHeight
    : chartHeightMode === "compact"
    ? 340
    : 480;

  const chartTitle =
    config.chartType === "horizontal_bar"
      ? "Clustered Bar (Horizontal)"
      : config.chartType === "stacked_horizontal_bar"
      ? "Stacked Bar (Horizontal)"
      : config.chartType === "percent_stacked_bar"
      ? "100% Stacked Column"
      : config.chartType === "combo"
      ? "Combo (Line & Column)"
      : config.chartType === "radial_bar"
      ? "Radial Gauge"
      : config.chartType === "radar"
      ? "Radar / Spider"
      : config.chartType === "area"
      ? "Area Chart"
      : config.chartType === "stacked_area"
      ? "Stacked Area"
      : config.chartType === "pie"
      ? "Pie Chart"
      : config.chartType === "donut"
      ? "Donut Chart"
      : config.chartType === "treemap"
      ? "Treemap"
      : config.chartType === "scatter"
      ? "Scatter Plot"
      : `Visual Chart (${config.chartType.replace("_", " ")})`;

  // Minimized Bar: Quick 1-click expand so user can focus 100% on the report table
  if (isChartMinimized) {
    return (
      <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} className="text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
            {chartTitle}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {matchedTheme.name}
          </span>
          <span className="text-[11px] text-muted-foreground font-semibold">
            (Minimized — {chartData.length} categories)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsChartMinimized(false)}
            className="h-7 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10"
          >
            <ChevronDown size={13} />
            <span>Expand Graph</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChartTypeChange("none")}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Hide Visual"
          >
            <EyeOff size={13} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
      {/* Visual Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} className="text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
            {chartTitle}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {matchedTheme.name}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground font-semibold">
            ({chartData.length} categories)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Height Mode Switcher: Compact (keeps table visible) vs Full */}
          <div className="flex items-center bg-muted/50 border border-border rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartHeightMode("compact")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                chartHeightMode === "compact"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Compact 340px height keeps the data report table visible on screen"
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setChartHeightMode("full")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                chartHeightMode === "full"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Full 480px height for detailed inspection"
            >
              Full
            </button>
          </div>

          {/* Spacing Switcher for dense vertical charts */}
          {isVerticalBarOrLine && chartData.length > 8 && (
            <div className="flex items-center bg-muted/50 border border-border rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setBarSpacingMode("scroll")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  barSpacingMode === "scroll"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Every category gets dedicated width with smooth horizontal scrolling so all labels are 100% readable"
              >
                <span>↔ Spaced</span>
              </button>
              <button
                type="button"
                onClick={() => setBarSpacingMode("fit")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  barSpacingMode === "fit"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Fit all categories inside visible canvas width"
              >
                <span>⇥ Fit</span>
              </button>
            </div>
          )}

          {/* Quick Switch to Horizontal Bar view when many categories */}
          {isVerticalBarOrLine && chartData.length > 10 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChartTypeChange("horizontal_bar")}
              className="h-6 text-[10px] font-semibold gap-1 px-1.5 text-primary border-primary/30 hover:bg-primary/10"
              title="Switch to Horizontal Bar layout where category names are listed cleanly on the vertical axis"
            >
              <TrendingUp size={11} />
              <span className="hidden sm:inline">Horizontal</span>
            </Button>
          )}

          {/* Minimize Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsChartMinimized(true)}
            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
            title="Minimize Graph to give full prominence to the Report Matrix Table"
          >
            <ChevronUp size={12} />
            <span className="hidden sm:inline">Minimize</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChartTypeChange("none")}
            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            title="Hide Visual"
          >
            <EyeOff size={12} />
          </Button>
        </div>
      </div>

      {/* Information Banner for Dense Categories in Scroll Mode */}
      {isVerticalBarOrLine && barSpacingMode === "scroll" && chartData.length > 10 && (
        <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-lg flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-semibold">
              Showing {chartData.length} categories with readable spacing.
            </span>
            <span className="text-muted-foreground hidden md:inline">
              Scroll horizontally with trackpad, mouse wheel, or bottom scrollbar ➔
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChartTypeChange("horizontal_bar")}
            className="text-[11px] font-bold text-primary underline underline-offset-2 hover:opacity-80"
          >
            Prefer vertical list? Switch to Horizontal Bars
          </button>
        </div>
      )}

      {/* Responsive Canvas Container */}
      <div
        className={`w-full rounded-lg border border-border/40 bg-background/50 ${
          isVerticalBarOrLine && barSpacingMode === "scroll"
            ? "overflow-x-auto pb-3"
            : isHorizontalBar
            ? "overflow-y-auto max-h-[580px]"
            : "overflow-hidden"
        }`}
      >
        <div
          style={{
            width: typeof activeChartWidth === "number" ? `${activeChartWidth}px` : activeChartWidth,
            minWidth: "100%",
            height: `${activeChartHeight}px`,
          }}
          className="pt-2"
        >
        <ResponsiveContainer width="100%" height="100%">
          {/* 1. Clustered Column (Vertical Bar) */}
          {config.chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 80 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                angle={-35}
                textAnchor="end"
                height={75}
                interval={computedInterval}
                tickFormatter={formatAxisLabel}
              />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) => (
                <Bar
                  key={seriesKey}
                  dataKey={seriesKey}
                  fill={palette[i % palette.length]}
                  radius={[4, 4, 0, 0]}
                  label={showLabels ? { position: "top", fontSize: 10, fill: "#334155" } : undefined}
                />
              ))}
            </BarChart>
          ) : /* 2. Stacked Column */
          config.chartType === "stacked_bar" ? (
            <BarChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 80 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                angle={-35}
                textAnchor="end"
                height={75}
                interval={computedInterval}
                tickFormatter={formatAxisLabel}
              />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) => (
                <Bar
                  key={seriesKey}
                  dataKey={seriesKey}
                  stackId="a"
                  fill={palette[i % palette.length]}
                />
              ))}
            </BarChart>
          ) : /* 3. Clustered Bar (Horizontal) */
          config.chartType === "horizontal_bar" ? (
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 130, bottom: 10 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />}
              <XAxis type="number" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                width={130}
                tickFormatter={formatAxisLabel}
              />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) => (
                <Bar
                  key={seriesKey}
                  dataKey={seriesKey}
                  fill={palette[i % palette.length]}
                  radius={[0, 4, 4, 0]}
                  label={showLabels ? { position: "right", fontSize: 10, fill: "#334155" } : undefined}
                />
              ))}
            </BarChart>
          ) : /* 4. Stacked Bar (Horizontal) */
          config.chartType === "stacked_horizontal_bar" ? (
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 130, bottom: 10 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />}
              <XAxis type="number" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                width={130}
                tickFormatter={formatAxisLabel}
              />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) => (
                <Bar
                  key={seriesKey}
                  dataKey={seriesKey}
                  stackId="a"
                  fill={palette[i % palette.length]}
                />
              ))}
            </BarChart>
          ) : /* 5. 100% Stacked Column */
          config.chartType === "percent_stacked_bar" ? (
            <BarChart data={percentStackedData} margin={{ top: 12, right: 20, left: 10, bottom: 80 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                angle={-35}
                textAnchor="end"
                height={75}
                interval={computedInterval}
                tickFormatter={formatAxisLabel}
              />
              <YAxis tickFormatter={(val) => `${val}%`} domain={[0, 100]} tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip
                formatter={(val: any) => `${val}%`}
                contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }}
              />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) => (
                <Bar
                  key={seriesKey}
                  dataKey={seriesKey}
                  stackId="a"
                  fill={palette[i % palette.length]}
                />
              ))}
            </BarChart>
          ) : /* 6. Line Chart */
          config.chartType === "line" ? (
            <LineChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 80 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                angle={-35}
                textAnchor="end"
                height={75}
                interval={computedInterval}
                tickFormatter={formatAxisLabel}
              />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) => (
                <Line
                  key={seriesKey}
                  type="monotone"
                  dataKey={seriesKey}
                  stroke={palette[i % palette.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  label={showLabels ? { position: "top", fontSize: 10, fill: "#334155" } : undefined}
                />
              ))}
            </LineChart>
          ) : /* 7. Area Chart */
          config.chartType === "area" ? (
            <AreaChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 80 }}>
              <defs>
                {chartSeriesKeys.map((k, i) => (
                  <linearGradient key={k} id={`colorArea-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={palette[i % palette.length]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={palette[i % palette.length]} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                angle={-35}
                textAnchor="end"
                height={75}
                interval={computedInterval}
                tickFormatter={formatAxisLabel}
              />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) => (
                <Area
                  key={seriesKey}
                  type="monotone"
                  dataKey={seriesKey}
                  stroke={palette[i % palette.length]}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#colorArea-${i})`}
                />
              ))}
            </AreaChart>
          ) : /* 8. Stacked Area Chart */
          config.chartType === "stacked_area" ? (
            <AreaChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 80 }}>
              <defs>
                {chartSeriesKeys.map((k, i) => (
                  <linearGradient key={k} id={`colorAreaStacked-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={palette[i % palette.length]} stopOpacity={0.7} />
                    <stop offset="95%" stopColor={palette[i % palette.length]} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                angle={-35}
                textAnchor="end"
                height={75}
                interval={computedInterval}
                tickFormatter={formatAxisLabel}
              />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) => (
                <Area
                  key={seriesKey}
                  type="monotone"
                  dataKey={seriesKey}
                  stackId="1"
                  stroke={palette[i % palette.length]}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#colorAreaStacked-${i})`}
                />
              ))}
            </AreaChart>
          ) : /* 9. Combo Chart (Line + Column) */
          config.chartType === "combo" ? (
            <ComposedChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 80 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                angle={-35}
                textAnchor="end"
                height={75}
                interval={computedInterval}
                tickFormatter={formatAxisLabel}
              />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) =>
                i === 0 ? (
                  <Bar
                    key={seriesKey}
                    dataKey={seriesKey}
                    fill={palette[i % palette.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ) : (
                  <Line
                    key={seriesKey}
                    type="monotone"
                    dataKey={seriesKey}
                    stroke={palette[i % palette.length]}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                )
              )}
            </ComposedChart>
          ) : /* 10. Pie Chart */
          config.chartType === "pie" ? (
            <PieChart>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              <Pie
                data={singleSeriesData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={105}
                label={showLabels ? { fontSize: 11, fontWeight: 600 } : false}
              >
                {singleSeriesData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : /* 11. Radar / Spider Chart */
          config.chartType === "radar" ? (
            <RadarChart cx="50%" cy="50%" outerRadius={95} data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} />
              <PolarRadiusAxis angle={30} domain={[0, "auto"]} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) => (
                <Radar
                  key={seriesKey}
                  name={seriesKey}
                  dataKey={seriesKey}
                  stroke={palette[i % palette.length]}
                  fill={palette[i % palette.length]}
                  fillOpacity={0.4}
                />
              ))}
            </RadarChart>
          ) : /* 12. Radial Bar / Gauge Chart */
          config.chartType === "radial_bar" ? (
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="95%" barSize={12} data={radialData}>
              <RadialBar
                background
                dataKey="val"
                label={showLabels ? { position: "insideStart", fill: "#fff", fontSize: 10 } : false}
              />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11 }} />}
            </RadialBarChart>
          ) : /* 13. Treemap */
          config.chartType === "treemap" ? (
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill={palette[0]}
            >
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
            </Treemap>
          ) : /* 14. Scatter Plot */
          config.chartType === "scatter" ? (
            <ScatterChart margin={{ top: 12, right: 20, left: 10, bottom: 28 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              {chartSeriesKeys.map((seriesKey, i) => (
                <Scatter
                  key={seriesKey}
                  name={seriesKey}
                  data={chartData}
                  fill={palette[i % palette.length]}
                />
              ))}
            </ScatterChart>
          ) : (
            /* 15. Default: Donut Chart */
            <PieChart>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 600 }} />}
              <Pie
                data={singleSeriesData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={2}
                label={showLabels ? { fontSize: 11, fontWeight: 600 } : false}
              >
                {singleSeriesData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
