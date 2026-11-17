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

  // Divide the 19 visuals cleanly into 2 balanced rows of 10 and 9
  const row1 = VISUAL_OPTIONS.slice(0, 10);
  const row2 = VISUAL_OPTIONS.slice(10);

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden transition-all">
      {/* Top Ribbon Control Bar */}
      <div className="px-3.5 py-1.5 bg-muted/30 border-b border-border/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-primary/10 text-primary">
            <BarChart3 size={13} />
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
              <Sparkles size={9} /> 3D Active
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
                className="h-6.5 text-[11px] font-semibold gap-1.5 px-2 bg-background shadow-2xs border-border/80"
              >
                <Palette size={11} className="text-primary" />
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
              className="h-6.5 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
              title="Hide visual chart to view Matrix Table only"
            >
              <EyeOff size={11} />
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
            className="h-6.5 w-6.5 p-0 text-muted-foreground hover:text-foreground"
            title={isCollapsed ? "Expand Visualizations Ribbon" : "Minimize Visualizations Ribbon"}
          >
            {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </Button>
        </div>
      </div>

      {/* Visual Options 2-Row Compact Grid: No Scrolling */}
      {!isCollapsed && (
        <div className="p-2 bg-card space-y-1 border-t border-border/40">
          <TooltipProvider delayDuration={150}>
            {/* Row 1: Columns, Bars, Lines, Areas, Pie (10 visuals) */}
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-1 w-full">
              {row1.map((opt) => (
                <CompactVisualButton
                  key={opt.id}
                  opt={opt}
                  isSelected={currentChartType === opt.id}
                  onClick={() => handleSelectChart(opt.id)}
                />
              ))}
            </div>

            {/* Row 2: Donut, Treemap, Gauges, 3D Studio, Matrix (9 visuals) */}
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-1 w-full">
              {row2.map((opt) => (
                <CompactVisualButton
                  key={opt.id}
                  opt={opt}
                  isSelected={currentChartType === opt.id}
                  onClick={() => handleSelectChart(opt.id)}
                />
              ))}
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}

function CompactVisualButton({
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
          className={`h-7 px-1.5 rounded-md flex items-center justify-center gap-1 transition-all relative group text-[10px] font-semibold border truncate w-full ${
            isSelected
              ? "bg-primary text-primary-foreground shadow-2xs border-primary font-bold ring-1 ring-primary"
              : opt.is3D
              ? "bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-400/30"
              : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
          }`}
          aria-pressed={isSelected}
        >
          <IconComponent
            size={13}
            className={`shrink-0 ${
              isSelected
                ? "text-primary-foreground"
                : opt.is3D
                ? "text-sky-600 dark:text-sky-400"
                : "text-foreground/80 group-hover:text-foreground"
            }`}
          />
          <span className="truncate leading-none">
            {opt.label.split(" ")[0]}
          </span>
          {opt.is3D && !isSelected && (
            <span className="text-[7px] font-black px-0.5 rounded bg-sky-500 text-white leading-tight shrink-0">
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
