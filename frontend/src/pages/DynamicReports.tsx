import React, { useState, useMemo } from "react";
import { DATASET_DEFINITIONS, BUILT_IN_PRESETS } from "@/lib/dynamicReports/datasets";
import { DatasetId, ReportConfig, PresetTemplate } from "@/lib/dynamicReports/types";
import { computePivotMatrix } from "@/lib/dynamicReports/pivotEngine";
import { exportPivotToExcel, exportPivotToCsv } from "@/lib/dynamicReports/pivotExcelExport";
import { getSavedReports, saveCustomReport, deleteCustomReport } from "@/lib/dynamicReports/storage";
import { useDynamicReportData } from "@/hooks/useDynamicReportData";
import FieldCatalogPane from "@/components/dynamicReports/FieldCatalogPane";
import DropZoneSection from "@/components/dynamicReports/DropZoneSection";
import PivotMatrixTable from "@/components/dynamicReports/PivotMatrixTable";
import PivotChartPreview from "@/components/dynamicReports/PivotChartPreview";
import VisualizationsTopRibbon from "@/components/dynamicReports/VisualizationsTopRibbon";
import SaveReportModal from "@/components/dynamicReports/SaveReportModal";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileSpreadsheet,
  Download,
  RotateCcw,
  BookmarkPlus,
  SlidersHorizontal,
  Bookmark,
  Database,
  Trash2,
  RefreshCw,
  Sparkles,
  Loader2,
  TrendingUp,
  Users,
  Building2,
  Receipt,
  Layers,
  Box,
  Share2,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Table,
  Columns,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function DynamicReports() {
  const [presets, setPresets] = useState<PresetTemplate[]>(() => getSavedReports());
  const [selectedPresetId, setSelectedPresetId] = useState<string>("dept-occupancy-by-status");

  // Current report configuration
  const [config, setConfig] = useState<ReportConfig>(() => {
    const initialPreset = BUILT_IN_PRESETS[0];
    return initialPreset.config;
  });

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [fieldsCollapsed, setFieldsCollapsed] = useState(false);
  const [visualsCollapsed, setVisualsCollapsed] = useState(false);
  const [wellsCollapsed, setWellsCollapsed] = useState(false);
  const [canvasViewMode, setCanvasViewMode] = useState<"split" | "table" | "chart">("split");

  // AI Report Generator state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  const handleAiGenerate = async (customPrompt?: string) => {
    const promptToSend = (customPrompt ?? aiPrompt).trim();
    if (!promptToSend || isGeneratingAi) return;

    setIsGeneratingAi(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api"}/ai/generate-report-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: promptToSend }),
      });

      if (!resp.ok) {
        throw new Error("AI generation endpoint failed");
      }

      const data = await resp.json();
      if (data.config) {
        setConfig(data.config);
        setAiExplanation(data.explanation || data.name);
        toast.success(`✨ AI Report Configured: ${data.name || promptToSend}`);
        setAiPrompt("");
      }
    } catch {
      // Smart offline fallback
      const lower = promptToSend.toLowerCase();
      let matched = BUILT_IN_PRESETS[0];
      if (lower.includes("3d") || lower.includes("tower") || lower.includes("predict")) {
        matched = BUILT_IN_PRESETS.find((p) => p.id === "ai-predictive-occupancy-attrition") || BUILT_IN_PRESETS[4];
      } else if (lower.includes("leak") || lower.includes("bill") || lower.includes("charge")) {
        matched = BUILT_IN_PRESETS.find((p) => p.id === "ai-cross-dept-billing-leaks") || BUILT_IN_PRESETS[3];
      } else if (lower.includes("cater") || lower.includes("food") || lower.includes("meal")) {
        matched = BUILT_IN_PRESETS.find((p) => p.id === "ai-catering-cost-variance") || BUILT_IN_PRESETS[7];
      } else if (lower.includes("diversity") || lower.includes("nationality")) {
        matched = BUILT_IN_PRESETS.find((p) => p.id === "ai-workforce-clustering-diversity") || BUILT_IN_PRESETS[2];
      }
      setConfig(matched.config);
      setAiExplanation(matched.description);
      toast.success(`✨ Loaded AI Report: ${matched.name}`);
      setAiPrompt("");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Active dataset definition & field map
  const activeDatasetDef = DATASET_DEFINITIONS[config.dataset] || DATASET_DEFINITIONS.inmates;
  const fieldMap = useMemo(() => {
    const map: Record<string, any> = {};
    activeDatasetDef.fields.forEach((f) => {
      map[f.id] = f;
    });
    return map;
  }, [activeDatasetDef]);

  // Query records for active dataset
  const { data: rawRecords = [], isLoading, refetch } = useDynamicReportData(config.dataset);

  // Compute live matrix
  const matrixResult = useMemo(() => {
    return computePivotMatrix(rawRecords, config, fieldMap);
  }, [rawRecords, config, fieldMap]);

  // Handle dataset switch
  const handleDatasetChange = (newDataset: DatasetId) => {
    const def = DATASET_DEFINITIONS[newDataset];
    if (!def) return;

    const defaultMeasure = def.fields.find((f) => f.category === "measure") || def.fields[def.fields.length - 1];
    const defaultDim = def.fields.find((f) => f.category === "dimension") || def.fields[0];

    setConfig({
      dataset: newDataset,
      rows: [defaultDim.id],
      columns: [],
      values: [{ fieldId: defaultMeasure.id, aggregation: defaultMeasure.dataType === "number" ? "sum" : "count" }],
      filters: {},
      showSubtotals: true,
      showGrandTotals: true,
      chartType: "bar",
    });
    setSelectedPresetId("");
  };

  // Handle preset selection
  const handleSelectPreset = (preset: PresetTemplate) => {
    setConfig(preset.config);
    setSelectedPresetId(preset.id);
    toast.success(`Loaded "${preset.name}" preset`);
  };

  // Add field to zone
  const handleAddField = (fieldId: string, targetZone: "rows" | "columns" | "values" | "filters") => {
    if (targetZone === "rows") {
      if (!config.rows.includes(fieldId)) {
        setConfig({ ...config, rows: [...config.rows, fieldId] });
      }
    } else if (targetZone === "columns") {
      if (!config.columns.includes(fieldId)) {
        setConfig({ ...config, columns: [...config.columns, fieldId] });
      }
    } else if (targetZone === "values") {
      const exists = config.values.some((v) => v.fieldId === fieldId);
      if (!exists) {
        const fDef = fieldMap[fieldId];
        const defaultAgg = fDef?.dataType === "number" ? "sum" : "count";
        setConfig({
          ...config,
          values: [...config.values, { fieldId, aggregation: defaultAgg }],
        });
      }
    } else if (targetZone === "filters") {
      if (!config.filters[fieldId]) {
        setConfig({
          ...config,
          filters: { ...config.filters, [fieldId]: [] },
        });
      }
    }
  };

  // Save custom report preset
  const handleSavePreset = (name: string, description: string) => {
    const created = saveCustomReport(name, description, config);
    setPresets(getSavedReports());
    setSelectedPresetId(created.id);
    toast.success(`Saved custom report "${name}"!`);
  };

  // Delete custom preset
  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomReport(id);
    setPresets(getSavedReports());
    if (selectedPresetId === id) {
      setSelectedPresetId("dept-occupancy-by-status");
      setConfig(BUILT_IN_PRESETS[0].config);
    }
    toast.success("Report preset removed.");
  };

  // Reset to default
  const handleReset = () => {
    const defaultPreset = BUILT_IN_PRESETS[0];
    setConfig(defaultPreset.config);
    setSelectedPresetId(defaultPreset.id);
    toast.info("Report configuration reset.");
  };

  // Export handlers
  const handleExportExcel = () => {
    const currentPreset = presets.find((p) => p.id === selectedPresetId);
    const title = currentPreset?.name || `${config.dataset}_dynamic_report`;
    exportPivotToExcel(matrixResult, config, title);
    toast.success("Excel (.xlsx) file exported successfully!");
  };

  const handleExportCsv = () => {
    const currentPreset = presets.find((p) => p.id === selectedPresetId);
    const title = currentPreset?.name || `${config.dataset}_dynamic_report`;
    exportPivotToCsv(matrixResult, config, title);
    toast.success("CSV file exported successfully!");
  };

  return (
    <div className="space-y-5">
      {/* PowerBI Top Command Ribbon */}
      <div className="bg-[#0c2340] text-white rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-[#fe932c]" />
            <h1 className="text-xl font-bold tracking-tight">Dynamic Reports & Pivot Studio</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fe932c]/20 text-[#fe932c] border border-[#fe932c]/30">
              <Sparkles size={10} /> Stitch BI Suite
            </span>
          </div>
          <p className="text-slate-300 text-xs mt-0.5">
            Interactive multi-dimensional cross-tabulation, magnetic drop wells, and synced drill-down visualizations.
          </p>
        </div>

        {/* Global Toolbar Commands */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20">
                <Bookmark size={13} className="text-amber-400" />
                <span>
                  {presets.find((p) => p.id === selectedPresetId)?.name || "Select Preset"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 max-h-96 overflow-y-auto text-xs">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <Sparkles size={11} />
                <span>AI & Predictive Reports</span>
              </div>
              {presets
                .filter((p) => p.isBuiltIn && p.id.startsWith("ai-"))
                .map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="flex flex-col items-start gap-0.5 py-1.5 cursor-pointer bg-cyan-500/5 hover:bg-cyan-500/10 mb-0.5"
                  >
                    <span className="font-semibold text-cyan-700 dark:text-cyan-300">{preset.name}</span>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.description}</span>
                  </DropdownMenuItem>
                ))}

              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Standard Operational Presets
              </div>
              {presets
                .filter((p) => p.isBuiltIn && !p.id.startsWith("ai-"))
                .map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="flex flex-col items-start gap-0.5 py-1.5 cursor-pointer"
                  >
                    <span className="font-semibold">{preset.name}</span>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.description}</span>
                  </DropdownMenuItem>
                ))}

              {presets.some((p) => !p.isBuiltIn) && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    My Saved Reports
                  </div>
                  {presets
                    .filter((p) => !p.isBuiltIn)
                    .map((preset) => (
                      <DropdownMenuItem
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className="flex items-center justify-between py-1.5 cursor-pointer group"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-semibold truncate">{preset.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{preset.description}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePreset(preset.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 rounded"
                          title="Delete saved report"
                        >
                          <Trash2 size={12} />
                        </button>
                      </DropdownMenuItem>
                    ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save Report Modal Trigger */}
          <Button
            size="sm"
            onClick={() => setSaveModalOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
            title="Save current layout as a custom template"
          >
            <BookmarkPlus size={13} />
            <span>Save Report</span>
          </Button>

          {/* 3D Interactive Studio Toggle */}
          <Button
            size="sm"
            onClick={() => {
              const is3D =
                config.chartType === "3d_bar" ||
                config.chartType === "3d_line" ||
                config.chartType === "3d_donut";
              setConfig({
                ...config,
                chartType: is3D ? "bar" : "3d_bar",
              });
            }}
            className={`h-8 text-xs font-semibold gap-1.5 transition-all shadow-xs ${
              config.chartType === "3d_bar" ||
              config.chartType === "3d_line" ||
              config.chartType === "3d_donut"
                ? "bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold border border-sky-300 ring-2 ring-sky-400/30"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
            }`}
            title="Toggle 3D Interactive WebGL Studio (3D Bar, 3D Line, 3D Donut)"
          >
            <Box
              size={13}
              className={
                config.chartType === "3d_bar" ||
                config.chartType === "3d_line" ||
                config.chartType === "3d_donut"
                  ? "text-slate-950"
                  : "text-sky-400"
              }
            />
            <span>
              {config.chartType === "3d_bar" ||
              config.chartType === "3d_line" ||
              config.chartType === "3d_donut"
                ? "← Exit 3D (2D View)"
                : "3D View"}
            </span>
          </Button>

          {/* Focus Mode (75%+ Canvas Toggle) */}
          <Button
            size="sm"
            onClick={() => {
              const nextCollapsed = !(fieldsCollapsed && visualsCollapsed);
              setFieldsCollapsed(nextCollapsed);
              setVisualsCollapsed(nextCollapsed);
              if (nextCollapsed) {
                toast.info("Focus Mode: side panels collapsed to maximize report canvas to 90%.");
              }
            }}
            className={`h-8 text-xs font-semibold gap-1.5 transition-all shadow-xs ${
              fieldsCollapsed && visualsCollapsed
                ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
            }`}
            title="Toggle Focus Mode: collapse side panels to expand report canvas to 90% of screen"
          >
            {fieldsCollapsed && visualsCollapsed ? (
              <>
                <Minimize2 size={13} className="text-white" />
                <span>Restore Panels</span>
              </>
            ) : (
              <>
                <Maximize2 size={13} className="text-indigo-300" />
                <span>Focus View (75%+)</span>
              </>
            )}
          </Button>

          {/* Excel Export */}
          <Button
            size="sm"
            onClick={handleExportExcel}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs gap-1.5"
          >
            <FileSpreadsheet size={13} />
            <span>Export Excel</span>
          </Button>

          {/* CSV Export */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="h-8 text-xs font-semibold gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <Download size={13} />
            <span>CSV</span>
          </Button>

          {/* Reset */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="h-8 text-xs text-slate-300 hover:text-white hover:bg-white/10"
            title="Reset layout"
          >
            <RotateCcw size={13} />
          </Button>
        </div>
      </div>

      {/* AI Report Architect Copilot Bar */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3 border border-indigo-500/30 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-md">
              <span className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 animate-spin blur-[1px]" />
              <span className="absolute inset-0.5 bg-slate-950 rounded-full" />
              <Sparkles size={14} className="relative z-10 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wide bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-clip-text text-transparent">
                  AI Report Architect
                </span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-cyan-400/40 text-cyan-300 font-mono">
                  Natural Language → Pivot
                </Badge>
              </div>
              <p className="text-[10px] text-slate-300">
                Describe the report in plain English — AI configures datasets, rows, columns, and 3D/2D views automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAiGenerate();
                  }
                }}
                placeholder='e.g. "Compare HERD vs PMTA 2x1 room costs with 3D towers" or "Predict vacancies"'
                className="w-full bg-slate-950/80 border border-indigo-400/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </div>
            <Button
              size="sm"
              disabled={!aiPrompt.trim() || isGeneratingAi}
              onClick={() => handleAiGenerate()}
              className="h-8 px-3 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white gap-1.5 shrink-0 shadow-md disabled:opacity-50"
            >
              {isGeneratingAi ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{isGeneratingAi ? "Generating..." : "Generate AI Report"}</span>
            </Button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/10 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-slate-400 shrink-0 font-medium">Quick Prompts:</span>
          {[
            { label: "✨ 3D Dept Towers", prompt: "Show 3D towers for department workforce across room categories" },
            { label: "✨ Billing Leak Audit", prompt: "Audit accommodation and holding charges to detect potential billing leaks" },
            { label: "✨ Catering Variance", prompt: "Detect meal spend variances and catering opt-outs by department" },
            { label: "✨ Predict Vacancies", prompt: "Predict available beds and room category occupancy for incoming contracts" },
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isGeneratingAi}
              onClick={() => handleAiGenerate(chip.prompt)}
              className="whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10 hover:bg-white/20 text-cyan-200 border border-white/15 transition-all shrink-0"
            >
              {chip.label}
            </button>
          ))}
          {aiExplanation && (
            <span className="ml-auto text-[10px] text-cyan-300 font-mono truncate max-w-sm pl-2">
              💡 {aiExplanation}
            </span>
          )}
        </div>
      </div>

      {/* Dataset & Live Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Dataset Card */}
        <Card className="border-border bg-card shadow-2xs border-t-2 border-t-[#0c2340] h-[74px] flex flex-col justify-between">
          <CardContent className="p-3 pb-2.5 h-full flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Report Topic
            </span>
            <Select
              value={config.dataset}
              onValueChange={(val) => handleDatasetChange(val as DatasetId)}
            >
              <SelectTrigger className="h-7 text-xs font-semibold bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="inmates">👥 Inmates & Occupancy</SelectItem>
                <SelectItem value="billing">💰 Billing & Charges</SelectItem>
                <SelectItem value="movements">🔄 In/Out Movements</SelectItem>
                <SelectItem value="catering">🍽️ Mess & Catering</SelectItem>
                <SelectItem value="catering_dishes">🍲 Dishes & Standard Recipes</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Metric 1: Total Records */}
        <Card className="border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 border-t-2 border-t-blue-600 shadow-2xs h-[74px] flex flex-col justify-between">
          <CardContent className="p-3 pb-2.5 h-full flex flex-col justify-between">
            <span className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
              Total Records Loaded
            </span>
            <div className="text-lg font-bold font-mono text-blue-950 dark:text-blue-200 leading-none">
              {isLoading ? "..." : rawRecords.length.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Primary Grand Total */}
        <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 border-t-2 border-t-amber-500 shadow-2xs h-[74px] flex flex-col justify-between">
          <CardContent className="p-3 pb-2.5 h-full flex flex-col justify-between">
            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
              Overall Total ({config.values[0]?.aggregation.toUpperCase() || "SUM"})
            </span>
            <div className="text-lg font-bold font-mono text-amber-950 dark:text-amber-200 leading-none truncate">
              {matrixResult.grandTotal?.formatted || "0"}
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Active Groups */}
        <Card className="border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 border-t-2 border-t-slate-700 shadow-2xs h-[74px] flex flex-col justify-between">
          <CardContent className="p-3 pb-2.5 h-full flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider block">
              Grouped By
            </span>
            <div className="text-xs font-semibold text-foreground truncate leading-none pb-0.5">
              {config.rows.map((r) => fieldMap[r]?.label || r).join(" ➔ ") || "All Data"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Studio Work Area: Power BI 3-Pane Layout */}
      <div className="flex flex-col lg:flex-row gap-3.5 items-start w-full">
        {/* Left Pane: Fields & Measures Palette */}
        <div
          className={`${
            fieldsCollapsed ? "w-11" : "w-full lg:w-52 xl:w-56"
          } shrink-0 lg:sticky lg:top-4 transition-all duration-200`}
        >
          <FieldCatalogPane
            fields={activeDatasetDef.fields}
            onAddField={handleAddField}
            collapsed={fieldsCollapsed}
            onToggleCollapse={() => setFieldsCollapsed(!fieldsCollapsed)}
          />
        </div>

        {/* Center Canvas: Drop Wells, Visualizer & Pivot Matrix */}
        <div className="flex-1 min-w-0 w-full space-y-3.5">
          {/* Unified Field Wells Container Card */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="px-3.5 py-2.5 bg-muted/30 border-b border-border/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <SlidersHorizontal size={13} />
                </div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Field Wells & Slicers
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground bg-background/80 px-2 py-0 border-border/70">
                  {config.rows.length} rows • {config.columns.length} cols • {config.values.length} measures
                </Badge>
              </div>

              {/* View Switcher: Split (Graph on Top + Report Table) / Table Only / Chart Only */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-background rounded-lg p-0.5 border border-border shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCanvasViewMode("split")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      canvasViewMode === "split"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Graph on Top with Report Matrix underneath (Default)"
                  >
                    <Columns size={12} />
                    <span>Graph & Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasViewMode("table")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      canvasViewMode === "table"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Report Table Only (Full Canvas)"
                  >
                    <Table size={12} />
                    <span>Report Matrix Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasViewMode("chart")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      canvasViewMode === "chart"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Visual Graph Only"
                  >
                    <BarChart3 size={12} />
                    <span>Graph Only</span>
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWellsCollapsed(!wellsCollapsed)}
                  className="h-6 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1 px-2 hover:bg-muted"
                  title="Toggle Drop Wells to maximize vertical space"
                >
                  {wellsCollapsed ? (
                    <>
                      <ChevronDown size={13} />
                      <span>Show Wells</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp size={13} />
                      <span>Minimize Wells</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Magnetic Drop Wells Grid */}
            {!wellsCollapsed && (
              <div className="p-3 bg-card">
                <DropZoneSection
                  config={config}
                  fieldMap={fieldMap}
                  onConfigChange={setConfig}
                />
              </div>
            )}
          </div>

          {/* Visualizations Ribbon - Shifted to Top below Field Wells */}
          <VisualizationsTopRibbon
            config={config}
            onConfigChange={(newConfig) => {
              if (newConfig.chartType !== config.chartType && canvasViewMode === "table" && newConfig.chartType !== "none") {
                setCanvasViewMode("split");
                toast.info(`Showing "${newConfig.chartType.replace("_", " ")}" visual on top`);
              }
              setConfig(newConfig);
            }}
          />

          {/* Canvas Main Body based on canvasViewMode */}
          {canvasViewMode === "chart" ? (
            /* Visual Chart View */
            <PivotChartPreview
              matrix={matrixResult}
              config={config}
              onChartTypeChange={(chartType) => setConfig({ ...config, chartType })}
              onConfigChange={setConfig}
              rawRecords={rawRecords}
            />
          ) : canvasViewMode === "split" ? (
            /* Split View: Chart on Top + Report Matrix below */
            <>
              {config.chartType !== "none" && (
                <PivotChartPreview
                  matrix={matrixResult}
                  config={config}
                  onChartTypeChange={(chartType) => setConfig({ ...config, chartType })}
                  onConfigChange={setConfig}
                  rawRecords={rawRecords}
                />
              )}
              <PivotMatrixTable
                matrix={matrixResult}
                config={config}
              />
            </>
          ) : (
            /* Table Mode: Pivot Matrix Table Prominent on Page */
            <PivotMatrixTable
              matrix={matrixResult}
              config={config}
            />
          )}
        </div>
      </div>

      {/* Save Report Modal */}
      <SaveReportModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        onSave={handleSavePreset}
      />
    </div>
  );
}
