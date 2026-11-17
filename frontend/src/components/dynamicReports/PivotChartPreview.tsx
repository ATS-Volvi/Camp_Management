import React from "react";
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
import { BarChart3, EyeOff, Sparkles, TrendingUp, Hash } from "lucide-react";
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

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
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
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChartTypeChange("none")}
            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            title="Hide Chart"
          >
            <EyeOff size={12} className="mr-1" />
            <span className="text-[10px]">Hide Visual</span>
          </Button>
        </div>
      </div>

      {/* Responsive Canvas */}
      <div className="h-[460px] sm:h-[500px] lg:h-[520px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {/* 1. Clustered Column (Vertical Bar) */}
          {config.chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 28 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
            <BarChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 28 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 70, bottom: 10 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />}
              <XAxis type="number" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} width={80} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 70, bottom: 10 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />}
              <XAxis type="number" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} width={80} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
            <BarChart data={percentStackedData} margin={{ top: 12, right: 20, left: 10, bottom: 28 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} angle={-15} textAnchor="end" />
              <YAxis tickFormatter={(val) => `${val}%`} domain={[0, 100]} tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip
                formatter={(val: any) => `${val}%`}
                contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }}
              />
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
            <LineChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 28 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
            <AreaChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 28 }}>
              <defs>
                {chartSeriesKeys.map((k, i) => (
                  <linearGradient key={k} id={`colorArea-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={palette[i % palette.length]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={palette[i % palette.length]} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
            <AreaChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 28 }}>
              <defs>
                {chartSeriesKeys.map((k, i) => (
                  <linearGradient key={k} id={`colorAreaStacked-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={palette[i % palette.length]} stopOpacity={0.7} />
                    <stop offset="95%" stopColor={palette[i % palette.length]} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
            <ComposedChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 28 }}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />}
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: "var(--card)" }} />
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
              {showLegend && <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />}
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
  );
}
