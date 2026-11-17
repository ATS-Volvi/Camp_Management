import React, { useState } from "react";
import { ChartType, ReportConfig } from "@/lib/dynamicReports/types";
import { VISUAL_OPTIONS, COLOR_THEMES } from "./VisualizationsPane";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart3,
  Palette,
  Sliders,
  ChevronUp,
  ChevronDown,
  Sparkles,
  EyeOff,
  Check,
} from "lucide-react";

interface VisualizationsTopRibbonProps {
  config: ReportConfig;
  onConfigChange: (config: ReportConfig) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function VisualizationsTopRibbon({
  config,
  onConfigChange,
  collapsed = false,
  onToggleCollapsed,
}: VisualizationsTopRibbonProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = collapsed || internalCollapsed;

  const currentChartType = config.chartType;
  const activeVisual = VISUAL_OPTIONS.find((v) => v.id === currentChartType) || VISUAL_OPTIONS[0];
  const activeThemeId = config.colorTheme || "powerbi";
  const activeTheme = COLOR_THEMES.find((t) => t.id === activeThemeId) || COLOR_THEMES[0];

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

  // Group visual options by category for a clean, professional ribbon layout
  const barOptions = VISUAL_OPTIONS.filter((v) => v.category === "bars");
  const lineOptions = VISUAL_OPTIONS.filter((v) => v.category === "lines");
  const pieOptions = VISUAL_OPTIONS.filter((v) => v.category === "pie");
  const gaugeOptions = VISUAL_OPTIONS.filter((v) => v.category === "gauges");
  const threeDOptions = VISUAL_OPTIONS.filter((v) => v.category === "3d");
  const tableOption = VISUAL_OPTIONS.find((v) => v.category === "table");

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden transition-all">
      {/* Top Ribbon Control Bar */}
      <div className="px-3.5 py-2 bg-muted/30 border-b border-border/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-primary/10 text-primary">
            <BarChart3 size={14} />
          </div>
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Visualizations
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
          >
            Active: {activeVisual.label}
          </Badge>
          {activeVisual.is3D && (
            <Badge
              variant="outline"
              className="text-[10px] font-bold px-1.5 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-400/30 flex items-center gap-1"
            >
              <Sparkles size={10} /> 3D WebGL Active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Format & Themes Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] font-semibold gap-1.5 px-2.5 bg-background shadow-2xs border-border/80"
              >
                <Palette size={12} className="text-primary" />
                <span className="hidden sm:inline">Theme:</span>
                <span>{activeTheme.name}</span>
                <div className="flex items-center gap-0.5 ml-1">
                  {activeTheme.colors.slice(0, 4).map((c, i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs p-1.5">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
                Color Themes
              </DropdownMenuLabel>
              {COLOR_THEMES.map((th) => (
                <DropdownMenuItem
                  key={th.id}
                  onClick={() => handleSelectTheme(th.id)}
                  className={`flex items-center justify-between py-1.5 px-2 cursor-pointer rounded-md ${
                    activeThemeId === th.id ? "bg-primary/10 font-bold text-primary" : ""
                  }`}
                >
                  <span className="text-xs">{th.name}</span>
                  <div className="flex items-center gap-1">
                    {th.colors.slice(0, 5).map((c, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full border border-black/10"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    {activeThemeId === th.id && <Check size={12} className="ml-1 text-primary" />}
                  </div>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
                Visual Elements
              </DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={config.showDataLabels ?? false}
                onCheckedChange={() => toggleOption("showDataLabels")}
                className="text-xs cursor-pointer"
              >
                Data Labels
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={config.showGridlines ?? true}
                onCheckedChange={() => toggleOption("showGridlines")}
                className="text-xs cursor-pointer"
              >
                Gridlines
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={config.showLegend ?? true}
                onCheckedChange={() => toggleOption("showLegend")}
                className="text-xs cursor-pointer"
              >
                Legend
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Hide Chart button */}
          {config.chartType !== "none" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSelectChart("none")}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              title="Hide visual chart to view Matrix Table only"
            >
              <EyeOff size={12} />
              <span className="hidden sm:inline">Table Only</span>
            </Button>
          )}

          {/* Collapse Ribbon Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (onToggleCollapsed) onToggleCollapsed();
              else setInternalCollapsed(!internalCollapsed);
            }}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title={isCollapsed ? "Expand Visualizations Ribbon" : "Minimize Visualizations Ribbon"}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </Button>
        </div>
      </div>

      {/* Visual Options Ribbon Body */}
      {!isCollapsed && (
        <div className="p-2.5 bg-card overflow-x-auto scrollbar-thin">
          <TooltipProvider delayDuration={150}>
            <div className="flex items-center gap-3 min-w-max">
              {/* 1. Columns & Bars */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/70">
                <span className="text-[9px] font-bold text-muted-foreground uppercase px-1 select-none">
                  Bars
                </span>
                {barOptions.map((opt) => (
                  <VisualRibbonButton
                    key={opt.id}
                    opt={opt}
                    isSelected={currentChartType === opt.id}
                    onClick={() => handleSelectChart(opt.id)}
                  />
                ))}
              </div>

              {/* 2. Lines & Areas */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/70">
                <span className="text-[9px] font-bold text-muted-foreground uppercase px-1 select-none">
                  Lines
                </span>
                {lineOptions.map((opt) => (
                  <VisualRibbonButton
                    key={opt.id}
                    opt={opt}
                    isSelected={currentChartType === opt.id}
                    onClick={() => handleSelectChart(opt.id)}
                  />
                ))}
              </div>

              {/* 3. Slices & Proportions */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/70">
                <span className="text-[9px] font-bold text-muted-foreground uppercase px-1 select-none">
                  Slices
                </span>
                {pieOptions.map((opt) => (
                  <VisualRibbonButton
                    key={opt.id}
                    opt={opt}
                    isSelected={currentChartType === opt.id}
                    onClick={() => handleSelectChart(opt.id)}
                  />
                ))}
              </div>

              {/* 4. Metrics & Gauges */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/70">
                <span className="text-[9px] font-bold text-muted-foreground uppercase px-1 select-none">
                  Gauges
                </span>
                {gaugeOptions.map((opt) => (
                  <VisualRibbonButton
                    key={opt.id}
                    opt={opt}
                    isSelected={currentChartType === opt.id}
                    onClick={() => handleSelectChart(opt.id)}
                  />
                ))}
              </div>

              {/* 5. 3D WebGL Studio */}
              <div className="flex items-center gap-1 bg-sky-500/10 p-1 rounded-lg border border-sky-400/30">
                <span className="text-[9px] font-extrabold text-sky-700 dark:text-sky-300 uppercase px-1.5 flex items-center gap-0.5 select-none">
                  <Sparkles size={9} /> 3D
                </span>
                {threeDOptions.map((opt) => (
                  <VisualRibbonButton
                    key={opt.id}
                    opt={opt}
                    isSelected={currentChartType === opt.id}
                    onClick={() => handleSelectChart(opt.id)}
                  />
                ))}
              </div>

              {/* 6. Table Only */}
              {tableOption && (
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/70">
                  <VisualRibbonButton
                    opt={tableOption}
                    isSelected={currentChartType === tableOption.id}
                    onClick={() => handleSelectChart(tableOption.id)}
                  />
                </div>
              )}
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}

function VisualRibbonButton({
  opt,
  isSelected,
  onClick,
}: {
  opt: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  const IconComponent = opt.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`h-11 px-2.5 rounded-md flex flex-col items-center justify-center transition-all relative group shrink-0 ${
            isSelected
              ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary ring-offset-1 ring-offset-background font-bold scale-[1.02]"
              : opt.is3D
              ? "bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/30"
              : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
          }`}
          aria-pressed={isSelected}
        >
          <IconComponent
            size={16}
            className={`${
              isSelected
                ? "text-primary-foreground"
                : opt.is3D
                ? "text-sky-600 dark:text-sky-400"
                : "text-foreground/80 group-hover:text-foreground"
            }`}
          />
          <span className="text-[9px] font-medium leading-none mt-1 whitespace-nowrap">
            {opt.label.split(" ")[0]}
          </span>
          {opt.is3D && !isSelected && (
            <span className="absolute -top-1 -right-1 text-[7px] font-extrabold px-1 rounded bg-sky-500 text-white leading-tight shadow-2xs">
              3D
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-xs z-50">
        <div className="font-bold text-foreground flex items-center justify-between gap-2">
          <span>{opt.label}</span>
          {opt.is3D && (
            <span className="text-[9px] font-bold text-sky-500 uppercase">WebGL 3D</span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {opt.description}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
