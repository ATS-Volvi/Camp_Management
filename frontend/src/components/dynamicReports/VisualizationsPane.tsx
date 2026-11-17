import React, { useState } from "react";
import { ChartType, ReportConfig } from "@/lib/dynamicReports/types";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Layers,
  AlignLeft,
  Percent,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  TrendingUp,
  Activity,
  PieChart as PieIcon,
  CircleDot,
  Target,
  Gauge,
  LayoutGrid,
  Hash,
  Box,
  Disc,
  Table,
  ChevronRight,
  ChevronLeft,
  Palette,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface VisualOption {
  id: ChartType;
  label: string;
  category: "bars" | "lines" | "pie" | "gauges" | "3d" | "table";
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  is3D?: boolean;
}

export const VISUAL_OPTIONS: VisualOption[] = [
  // Column & Bar
  {
    id: "bar",
    label: "Clustered Column",
    category: "bars",
    icon: BarChart3,
    description: "Vertical columns comparing values across categories side-by-side",
  },
  {
    id: "stacked_bar",
    label: "Stacked Column",
    category: "bars",
    icon: Layers,
    description: "Vertical stacked segments showing the composition of each category",
  },
  {
    id: "horizontal_bar",
    label: "Clustered Bar",
    category: "bars",
    icon: AlignLeft,
    description: "Horizontal bars; ideal for long department, camp, or room names",
  },
  {
    id: "stacked_horizontal_bar",
    label: "Stacked Bar",
    category: "bars",
    icon: AlignLeft,
    description: "Horizontal stacked segments displaying cumulative segment totals",
  },
  {
    id: "percent_stacked_bar",
    label: "100% Stacked",
    category: "bars",
    icon: Percent,
    description: "Normalized 100% proportions across all category series",
  },

  // Line & Area
  {
    id: "line",
    label: "Line Chart",
    category: "lines",
    icon: LineIcon,
    description: "Continuous trend line connecting category data points",
  },
  {
    id: "area",
    label: "Area Chart",
    category: "lines",
    icon: AreaIcon,
    description: "Filled gradient area displaying volume progression",
  },
  {
    id: "stacked_area",
    label: "Stacked Area",
    category: "lines",
    icon: TrendingUp,
    description: "Stacked filled layers illustrating cumulative growth",
  },
  {
    id: "combo",
    label: "Combo (Line + Col)",
    category: "lines",
    icon: Activity,
    description: "Dual-perspective visual pairing bars with an overlaid trend curve",
  },

  // Circular & Proportions
  {
    id: "pie",
    label: "Pie Chart",
    category: "pie",
    icon: PieIcon,
    description: "Circular chart displaying relative slice proportions",
  },
  {
    id: "donut",
    label: "Donut Chart",
    category: "pie",
    icon: CircleDot,
    description: "Ring distribution with center total summary badge",
  },
  {
    id: "treemap",
    label: "Treemap",
    category: "pie",
    icon: LayoutGrid,
    description: "Nested rectangular tiles sized by category magnitude",
  },

  // Gauges & Multi-axis
  {
    id: "radar",
    label: "Radar / Spider",
    category: "gauges",
    icon: Target,
    description: "Multi-axis radial web comparing dimensions",
  },
  {
    id: "radial_bar",
    label: "Radial Gauge",
    category: "gauges",
    icon: Gauge,
    description: "Circular progress gauge bars displaying capacity fill",
  },
  {
    id: "kpi_card",
    label: "KPI Metric Cards",
    category: "gauges",
    icon: Hash,
    description: "Power BI style hero total callout with metric breakdown tiles",
  },

  // 3D Studio
  {
    id: "3d_bar",
    label: "3D Bar Towers",
    category: "3d",
    icon: Box,
    description: "Interactive WebGL 3D bar towers with orbit controls and limit ceiling",
    is3D: true,
  },
  {
    id: "3d_line",
    label: "3D Floating Ribbons",
    category: "3d",
    icon: TrendingUp,
    description: "Interactive WebGL 3D undulating ribbons with altitude comparisons",
    is3D: true,
  },
  {
    id: "3d_donut",
    label: "3D Donut Cylinders",
    category: "3d",
    icon: Disc,
    description: "Interactive WebGL 3D extruded donut cylinders with center metric",
    is3D: true,
  },

  // Table
  {
    id: "none",
    label: "Matrix Table Only",
    category: "table",
    icon: Table,
    description: "Hide chart to maximize the high-density pivot matrix table",
  },
];

export const COLOR_THEMES = [
  { id: "powerbi", name: "Power BI Classic", colors: ["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"] },
  { id: "vibrant", name: "Stitch Vibrant", colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"] },
  { id: "ocean", name: "Ocean Indigo", colors: ["#1e3a8a", "#0284c7", "#06b6d4", "#38bdf8", "#0369a1", "#60a5fa"] },
  { id: "sunset", name: "Warm Sunset", colors: ["#ea580c", "#f97316", "#fb923c", "#f59e0b", "#e11d48", "#f43f5e"] },
  { id: "emerald", name: "Forest Emerald", colors: ["#047857", "#059669", "#10b981", "#34d399", "#065f46", "#022c22"] },
] as const;

interface VisualizationsPaneProps {
  config: ReportConfig;
  onConfigChange: (config: ReportConfig) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function VisualizationsPane({
  config,
  onConfigChange,
  collapsed = false,
  onToggleCollapse,
}: VisualizationsPaneProps) {
  const currentChartType = config.chartType;

  const handleSelectChart = (chartType: ChartType) => {
    onConfigChange({
      ...config,
      chartType,
    });
  };

  const handleSelectTheme = (themeId: "powerbi" | "vibrant" | "ocean" | "sunset" | "emerald") => {
    onConfigChange({
      ...config,
      colorTheme: themeId,
    });
  };

  const toggleOption = (key: "showDataLabels" | "showGridlines" | "showLegend") => {
    const current = config[key] ?? (key === "showGridlines" || key === "showLegend");
    onConfigChange({
      ...config,
      [key]: !current,
    });
  };

  if (collapsed) {
    return (
      <div className="bg-card border border-border rounded-xl p-2 flex flex-col items-center gap-3 shadow-xs w-12 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Expand Visualizations Pane"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="writing-vertical text-[10px] font-bold text-muted-foreground uppercase tracking-widest py-2 select-none">
          Visualizations
        </div>
        <div className="w-full h-px bg-border" />
        <TooltipProvider delayDuration={200}>
          {VISUAL_OPTIONS.filter((v) => v.id === currentChartType).map((opt) => (
            <Tooltip key={opt.id}>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/30">
                  <opt.icon size={16} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <span className="font-semibold text-xs">{opt.label}</span> (Active)
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col shrink-0 w-full">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 bg-muted/30 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-primary/10 text-primary">
            <BarChart3 size={15} />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground tracking-wide block">
              Visualizations
            </span>
            <span className="text-[10px] text-muted-foreground">Power BI Visuals</span>
          </div>
        </div>

        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Collapse pane"
          >
            <ChevronRight size={14} />
          </Button>
        )}
      </div>

      <div className="p-3 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Visuals Grid: 4 columns like Power BI */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Select Chart ({VISUAL_OPTIONS.length})
            </span>
            {config.chartType.startsWith("3d_") && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-400/30 flex items-center gap-0.5">
                <Sparkles size={8} /> 3D Studio Active
              </span>
            )}
          </div>

          <TooltipProvider delayDuration={150}>
            <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-muted/40 rounded-lg border border-border">
              {VISUAL_OPTIONS.map((opt) => {
                const isSelected = currentChartType === opt.id;
                const IconComponent = opt.icon;

                return (
                  <Tooltip key={opt.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleSelectChart(opt.id)}
                        className={`h-11 rounded-md flex flex-col items-center justify-center transition-all relative group ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary ring-offset-1 ring-offset-background font-bold scale-[1.02]"
                            : opt.is3D
                            ? "bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/20"
                            : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                        }`}
                        aria-pressed={isSelected}
                      >
                        <IconComponent
                          size={18}
                          className={`${
                            isSelected
                              ? "text-primary-foreground"
                              : opt.is3D
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-foreground/80 group-hover:text-foreground"
                          }`}
                        />
                        <span className="text-[8px] font-medium leading-none mt-1 line-clamp-1 px-0.5 truncate max-w-full">
                          {opt.label.split(" ")[0]}
                        </span>
                        {opt.is3D && !isSelected && (
                          <span className="absolute -top-1 -right-1 text-[7px] font-extrabold px-1 rounded bg-sky-500 text-white leading-tight shadow-2xs">
                            3D
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[200px] text-xs">
                      <div className="font-bold text-foreground">{opt.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {opt.description}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Active Visual Name Banner */}
          <div className="mt-2 px-2 py-1.5 rounded-md bg-muted/60 border border-border text-[11px] font-medium flex items-center justify-between text-foreground">
            <span className="text-muted-foreground text-[10px] uppercase font-bold">Active:</span>
            <span className="font-bold text-primary flex items-center gap-1">
              {VISUAL_OPTIONS.find((v) => v.id === currentChartType)?.label || currentChartType}
            </span>
          </div>
        </div>

        {/* Visual Formatting Options Section (like Power BI Format Visual Pane) */}
        <div className="pt-2 border-t border-border space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Palette size={12} className="text-primary" />
            <span>Format & Color Themes</span>
          </div>

          {/* Theme Palette Buttons */}
          <div className="space-y-1.5">
            {COLOR_THEMES.map((th) => {
              const activeTheme = config.colorTheme || "powerbi";
              const isChosen = activeTheme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => handleSelectTheme(th.id)}
                  className={`w-full px-2 py-1.5 rounded-md border text-left text-xs flex items-center justify-between transition-colors ${
                    isChosen
                      ? "border-primary bg-primary/10 font-bold text-primary"
                      : "border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="text-[11px]">{th.name}</span>
                  <div className="flex items-center gap-0.5">
                    {th.colors.slice(0, 5).map((c, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Display Controls Toggles */}
          <div className="space-y-2 pt-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Display Elements
            </div>

            <label className="flex items-center justify-between cursor-pointer text-xs text-foreground p-1.5 rounded hover:bg-muted">
              <span className="text-[11px]">Data Labels</span>
              <input
                type="checkbox"
                checked={config.showDataLabels ?? false}
                onChange={() => toggleOption("showDataLabels")}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-xs text-foreground p-1.5 rounded hover:bg-muted">
              <span className="text-[11px]">Gridlines</span>
              <input
                type="checkbox"
                checked={config.showGridlines ?? true}
                onChange={() => toggleOption("showGridlines")}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-xs text-foreground p-1.5 rounded hover:bg-muted">
              <span className="text-[11px]">Legend</span>
              <input
                type="checkbox"
                checked={config.showLegend ?? true}
                onChange={() => toggleOption("showLegend")}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
