import React from "react";
import { PivotMatrixResult, ReportConfig, ChartType } from "@/lib/dynamicReports/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Layers, EyeOff, Box, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThreeDimensionMatrixView from "./ThreeDimensionMatrixView";

interface PivotChartPreviewProps {
  matrix: PivotMatrixResult;
  config: ReportConfig;
  onChartTypeChange: (type: ChartType) => void;
}

const PALETTE = [
  "#2563eb", // blue
  "#f97316", // orange
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#eab308", // amber
  "#64748b", // slate
];

export default function PivotChartPreview({
  matrix,
  config,
  onChartTypeChange,
}: PivotChartPreviewProps) {
  const { chartData, chartSeriesKeys } = matrix;

  if (config.chartType === "none") return null;

  if (!chartData || chartData.length === 0 || chartSeriesKeys.length === 0) {
    return null;
  }

  // Render 3D WebGL Studio directly if 3D mode is active
  if (config.chartType === "3d_matrix" || config.chartType === "3d_network") {
    return (
      <ThreeDimensionMatrixView
        matrix={matrix}
        config={config}
        onChartTypeChange={onChartTypeChange}
      />
    );
  }

  // Format donut data
  const donutData =
    config.chartType === "donut"
      ? chartData.map((d) => {
          const firstKey = chartSeriesKeys[0];
          return { name: d.name, value: Number(d[firstKey]) || 0 };
        })
      : [];

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} className="text-primary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wide">
            Chart Visualization ({config.chartType.replace("_", " ")})
          </span>
        </div>

        {/* Chart Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
          <Button
            size="sm"
            variant={config.chartType === "bar" ? "default" : "ghost"}
            onClick={() => onChartTypeChange("bar")}
            className="h-6 px-2 text-[11px]"
            title="Grouped Bar Chart"
          >
            <BarChart3 size={12} className="mr-1" /> Bar
          </Button>
          <Button
            size="sm"
            variant={config.chartType === "stacked_bar" ? "default" : "ghost"}
            onClick={() => onChartTypeChange("stacked_bar")}
            className="h-6 px-2 text-[11px]"
            title="Stacked Bar Chart"
          >
            <Layers size={12} className="mr-1" /> Stacked
          </Button>
          <Button
            size="sm"
            variant={config.chartType === "line" ? "default" : "ghost"}
            onClick={() => onChartTypeChange("line")}
            className="h-6 px-2 text-[11px]"
            title="Line Trend"
          >
            <LineIcon size={12} className="mr-1" /> Line
          </Button>
          <Button
            size="sm"
            variant={config.chartType === "donut" ? "default" : "ghost"}
            onClick={() => onChartTypeChange("donut")}
            className="h-6 px-2 text-[11px]"
            title="Donut Distribution"
          >
            <PieIcon size={12} className="mr-1" /> Donut
          </Button>

          {/* 3D Mode Switchers */}
          <Button
            size="sm"
            variant={config.chartType === "3d_matrix" ? "default" : "ghost"}
            onClick={() => onChartTypeChange("3d_matrix")}
            className="h-6 px-2 text-[11px] text-sky-600 dark:text-sky-400 font-semibold"
            title="Interactive 3D Isometric Bar Grid (WebGL)"
          >
            <Box size={12} className="mr-1 text-sky-500" /> 3D Towers
          </Button>
          <Button
            size="sm"
            variant={config.chartType === "3d_network" ? "default" : "ghost"}
            onClick={() => onChartTypeChange("3d_network")}
            className="h-6 px-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold"
            title="Interactive 3D Force-Directed Constellation Graph"
          >
            <Share2 size={12} className="mr-1 text-emerald-500" /> 3D Network
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChartTypeChange("none")}
            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            title="Hide Chart"
          >
            <EyeOff size={12} />
          </Button>
        </div>
      </div>

      <div className="h-[280px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {config.chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, backgroundColor: "var(--card)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {chartSeriesKeys.map((seriesKey, i) => (
                <Bar
                  key={seriesKey}
                  dataKey={seriesKey}
                  fill={PALETTE[i % PALETTE.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          ) : config.chartType === "stacked_bar" ? (
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, backgroundColor: "var(--card)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {chartSeriesKeys.map((seriesKey, i) => (
                <Bar
                  key={seriesKey}
                  dataKey={seriesKey}
                  stackId="a"
                  fill={PALETTE[i % PALETTE.length]}
                />
              ))}
            </BarChart>
          ) : config.chartType === "line" ? (
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, backgroundColor: "var(--card)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {chartSeriesKeys.map((seriesKey, i) => (
                <Line
                  key={seriesKey}
                  type="monotone"
                  dataKey={seriesKey}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, backgroundColor: "var(--card)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

