import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Bookmark,
  Trash2,
  RefreshCw,
  Sparkles,
  Loader2,
  TrendingUp,
  UtensilsCrossed,
  DollarSign,
  Users,
  Recycle,
  Building2,
  Box,
  Share2,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Table,
  Columns,
  BarChart3,
  Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function CateringDynamicReports() {
  const navigate = useNavigate();

  // Saved & Built-in presets
  const [presets, setPresets] = useState<PresetTemplate[]>(() => getSavedReports());

  // Find the default 3D catering preset
  const defaultCateringPreset = useMemo(() => {
    return (
      BUILT_IN_PRESETS.find((p) => p.id === "catering-3d-project-cph") ||
      BUILT_IN_PRESETS.find((p) => p.id === "catering-daily-dmc-breakdown") ||
      BUILT_IN_PRESETS[0]
    );
  }, []);

  const [selectedPresetId, setSelectedPresetId] = useState<string>("catering-3d-project-cph");

  // Current report configuration (defaults to 3D Catering CPH Skyline)
  const [config, setConfig] = useState<ReportConfig>(() => defaultCateringPreset.config);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [fieldsCollapsed, setFieldsCollapsed] = useState(false);
  const [visualsCollapsed, setVisualsCollapsed] = useState(false);
  const [wellsCollapsed, setWellsCollapsed] = useState(false);
  const [canvasViewMode, setCanvasViewMode] = useState<"split" | "table" | "chart">("split");

  // AI Report Generator state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Handle AI Report Generation
  const handleAiGenerate = async (customPrompt?: string) => {
    const promptToSend = (customPrompt ?? aiPrompt).trim();
    if (!promptToSend || isGeneratingAi) return;

    setIsGeneratingAi(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken");
      const resp = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api"}/ai/generate-report-config`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt: promptToSend }),
        }
      );

      if (!resp.ok) {
        throw new Error("AI generation endpoint failed");
      }

      const data = await resp.json();
      if (data.config) {
        setConfig(data.config);
        setAiExplanation(data.explanation || data.name);
        toast.success(`✨ Catering AI Report Configured: ${data.name || promptToSend}`);
        setAiPrompt("");
      }
    } catch {
      // Smart offline fallback for catering prompts
      const lower = promptToSend.toLowerCase();
      let matched = defaultCateringPreset;

      if (lower.includes("3d") || lower.includes("skyline") || lower.includes("tower")) {
        matched =
          BUILT_IN_PRESETS.find((p) => p.id === "catering-3d-project-cph") ||
          BUILT_IN_PRESETS.find((p) => p.id === "catering-3d-session-donut") ||
          defaultCateringPreset;
      } else if (lower.includes("waste") || lower.includes("haccp") || lower.includes("scrap")) {
        matched = BUILT_IN_PRESETS.find((p) => p.id === "catering-haccp-wastage-audit") || defaultCateringPreset;
      } else if (lower.includes("headcount") || lower.includes("entitle") || lower.includes("client")) {
        matched = BUILT_IN_PRESETS.find((p) => p.id === "catering-headcount-matrix") || defaultCateringPreset;
      } else if (lower.includes("bill") || lower.includes("vf01") || lower.includes("aramco")) {
        matched = BUILT_IN_PRESETS.find((p) => p.id === "catering-aramco-billing-pack") || defaultCateringPreset;
      } else if (lower.includes("dmc") || lower.includes("cost") || lower.includes("cph")) {
        matched = BUILT_IN_PRESETS.find((p) => p.id === "catering-daily-dmc-breakdown") || defaultCateringPreset;
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
  const activeDatasetDef = DATASET_DEFINITIONS[config.dataset] || DATASET_DEFINITIONS.catering_dmc || DATASET_DEFINITIONS.catering;
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
      chartType: "3d_bar",
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
      const alreadyHas = config.values.some((v) => v.fieldId === fieldId);
      if (!alreadyHas) {
        const fieldDef = fieldMap[fieldId];
        const defaultAgg = fieldDef?.dataType === "number" ? "sum" : "count";
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

  // Reset report
  const handleReset = () => {
    setConfig(defaultCateringPreset.config);
    setSelectedPresetId("catering-3d-project-cph");
    toast.info("Report reset to 3D Catering CPH Skyline layout.");
  };

  // Excel & CSV Exports
  const handleExportExcel = () => {
    exportPivotToExcel(matrixResult, config, `Catering_Report_${config.dataset}`);
    toast.success("Exported Catering Pivot Matrix to Excel (.xlsx)");
  };

  const handleExportCsv = () => {
    exportPivotToCsv(matrixResult, config, `Catering_Report_${config.dataset}`);
    toast.success("Exported Catering Pivot Matrix to CSV");
  };

  // Save Custom Report
  const handleSaveReport = (name: string, description: string) => {
    const newPreset = saveCustomReport(name, description, config);
    setPresets(getSavedReports());
    setSelectedPresetId(newPreset.id);
    setSaveModalOpen(false);
    toast.success(`Custom report "${name}" saved!`);
  };

  // Delete Custom Report
  const handleDeleteCustomReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomReport(id);
    setPresets(getSavedReports());
    if (selectedPresetId === id) {
      setSelectedPresetId("catering-3d-project-cph");
      setConfig(defaultCateringPreset.config);
    }
    toast.info("Custom report deleted.");
  };

  // Catering specific presets vs General presets
  const cateringPresets = BUILT_IN_PRESETS.filter((p) => p.id.startsWith("catering-"));
  const otherPresets = BUILT_IN_PRESETS.filter((p) => !p.id.startsWith("catering-"));

  const is3DActive =
    config.chartType === "3d_bar" ||
    config.chartType === "3d_line" ||
    config.chartType === "3d_donut" ||
    (config.chartType as string) === "3d_matrix" ||
    (config.chartType as string) === "3d_network";

  return (
    <div className="space-y-4 pb-12 font-sans max-w-[1800px] mx-auto p-4 md:p-6 text-foreground">
      {/* ==================================================================== */}
      {/* 1. TOP HEADER & BREADCRUMB (DYNAMIC REPORTS NAVY THEME)             */}
      {/* ==================================================================== */}
      <div className="bg-[#0c2340] text-white rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <button
              onClick={() => navigate("/mess-catering")}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Mess Catering
            </button>
            <span>/</span>
            <button
              onClick={() => navigate("/catering/enterprise-hub")}
              className="hover:text-white transition-colors"
            >
              Enterprise Catering Hub
            </button>
            <span>/</span>
            <span className="text-white font-semibold">Catering BI Reports</span>
          </div>

          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            <BarChart3 size={22} className="text-[#fe932c]" />
            <h1 className="text-xl font-bold tracking-tight">Catering & Mess Dynamic BI Reports</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fe932c]/20 text-[#fe932c] border border-[#fe932c]/30">
              <Sparkles size={10} /> Power BI Suite
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-cyan-400/30 text-cyan-300">
              3D WebGL Studio Ready
            </Badge>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Dynamic pivot analytics for food cost (DMC), Cost Per Head (CPH), headcount variance, HACCP wastage, and SAP reconciliation with interactive 3D studio.
          </p>
        </div>

        {/* Global Toolbar Commands */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-xs"
              >
                <Bookmark size={13} className="text-[#fe932c]" />
                <span className="truncate max-w-[170px]">
                  {BUILT_IN_PRESETS.find((p) => p.id === selectedPresetId)?.name ||
                    presets.find((p) => p.id === selectedPresetId)?.name ||
                    "Select Report Preset"}
                </span>
                <ChevronDown size={11} className="opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto text-xs">
              <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                🍽️ Catering & Mess Presets (3D & 2D)
              </div>
              {cateringPresets.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`flex flex-col items-start gap-0.5 py-2 cursor-pointer ${
                    selectedPresetId === p.id ? "bg-accent text-accent-foreground font-semibold" : ""
                  }`}
                >
                  <span className="font-medium text-xs flex items-center gap-1">
                    {p.name.includes("3D") && <Box size={11} className="text-cyan-500" />}
                    {p.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">{p.description}</span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                🏢 Facility & Inmate Presets
              </div>
              {otherPresets.slice(0, 4).map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`flex flex-col items-start gap-0.5 py-1.5 cursor-pointer ${
                    selectedPresetId === p.id ? "bg-accent text-accent-foreground font-semibold" : ""
                  }`}
                >
                  <span className="font-medium text-xs">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">{p.description}</span>
                </DropdownMenuItem>
              ))}

              {presets.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    ⭐ My Saved Reports
                  </div>
                  {presets.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => handleSelectPreset(p)}
                      className={`flex items-center justify-between py-2 cursor-pointer ${
                        selectedPresetId === p.id ? "bg-accent font-semibold" : ""
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">{p.description}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteCustomReport(p.id, e)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        title="Delete report"
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
            className="h-8 text-xs font-semibold gap-1.5 bg-[#fe932c] hover:bg-[#e68222] text-slate-950 shadow-xs font-bold"
            title="Save current layout as a custom template"
          >
            <BookmarkPlus size={13} />
            <span>Save Report</span>
          </Button>

          {/* 3D Interactive Studio Toggle */}
          <Button
            size="sm"
            onClick={() => {
              setConfig({
                ...config,
                chartType: is3DActive ? "bar" : "3d_bar",
              });
            }}
            className={`h-8 text-xs font-semibold gap-1.5 transition-all shadow-xs ${
              is3DActive
                ? "bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold border border-cyan-300 ring-2 ring-cyan-400/30"
                : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
            }`}
            title="Toggle 3D Interactive WebGL Studio (3D Bar Towers, 3D Donut)"
          >
            <Box size={13} className={is3DActive ? "text-slate-950" : "text-cyan-400"} />
            <span>{is3DActive ? "← Exit 3D (2D View)" : "3D View"}</span>
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
            title="Toggle Focus Mode: collapse side panels to expand report canvas"
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

          {/* Export Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-xs"
              >
                <Download size={13} />
                <span>Export</span>
                <ChevronDown size={11} className="opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet size={14} className="text-emerald-500" />
                <span>Export to Excel (.xlsx)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv} className="gap-2 cursor-pointer">
                <Download size={14} className="text-blue-500" />
                <span>Export to CSV (.csv)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.print()} className="gap-2 cursor-pointer">
                <Share2 size={14} className="text-purple-500" />
                <span>Print / Save as PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset Layout */}
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

      {/* ==================================================================== */}
      {/* 2. CATERING AI REPORT ARCHITECT COPILOT BAR                         */}
      {/* ==================================================================== */}
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
                  Catering AI Report Architect
                </span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-cyan-400/40 text-cyan-300 font-mono">
                  Natural Language → 3D/2D Pivot
                </Badge>
              </div>
              <p className="text-[10px] text-slate-300">
                Ask in plain English — AI configures catering datasets, session breakdowns, and 3D WebGL towers automatically.
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
                placeholder='e.g. "3D towers comparing project CPH across meal sessions" or "HACCP wastage by station"'
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
        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/10 overflow-x-auto scrollbar-none">
          <span className="text-[10px] text-slate-400 shrink-0 font-medium">Quick Prompts:</span>
          {[
            { label: "✨ 3D Project CPH Skyline", prompt: "Show 3D towers comparing project Cost Per Head across meal sessions" },
            { label: "✨ Daily DMC Variance", prompt: "Analyze project food cost and variance from budget cap" },
            { label: "✨ 3D Session Donut", prompt: "Display 3D donut for meal session expenditure distribution" },
            { label: "✨ HACCP Wastage Audit", prompt: "Audit 3-bucket wastage and loss in SAR by kitchen station" },
            { label: "✨ Client Entitlements Matrix", prompt: "Cross-tabulate client entitlements vs actual scanned headcount" },
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

      {/* ==================================================================== */}
      {/* 3. DATASET & LIVE KPI CARDS                                          */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Dataset Topic Selector */}
        <Card className="border-border bg-card shadow-2xs border-t-2 border-t-[#0c2340] h-[74px] flex flex-col justify-between">
          <CardContent className="p-3 pb-2.5 h-full flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Catering Report Topic
            </span>
            <Select value={config.dataset} onValueChange={(val) => handleDatasetChange(val as DatasetId)}>
              <SelectTrigger className="h-7 text-xs font-semibold bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="catering_dmc">💰 Food Cost & CPH (3D Ready)</SelectItem>
                <SelectItem value="catering_headcount">👥 Meal Headcount & Entitlements</SelectItem>
                <SelectItem value="catering_wastage">♻️ HACCP Food Wastage & Loss</SelectItem>
                <SelectItem value="catering_billing">🏢 Aramco Billing (SAP VF01)</SelectItem>
                <SelectItem value="catering">🍽️ Mess Catering Orders</SelectItem>
                <SelectItem value="billing">💳 General Accommodation Billing</SelectItem>
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
            <span className="text-[10px] text-blue-700 dark:text-blue-400">Live catering telemetry</span>
          </CardContent>
        </Card>

        {/* Metric 2: Hierarchy Depth */}
        <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 border-t-2 border-t-emerald-600 shadow-2xs h-[74px] flex flex-col justify-between">
          <CardContent className="p-3 pb-2.5 h-full flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">
              Active Hierarchy
            </span>
            <div className="text-lg font-bold font-mono text-emerald-950 dark:text-emerald-200 leading-none truncate">
              {config.rows.length} Rows × {config.columns.length} Cols
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
              {config.values.map((v) => `${v.aggregation.toUpperCase()}(${v.fieldId})`).join(", ")}
            </span>
          </CardContent>
        </Card>

        {/* Metric 3: Visual Mode */}
        <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 border-t-2 border-t-amber-600 shadow-2xs h-[74px] flex flex-col justify-between">
          <CardContent className="p-3 pb-2.5 h-full flex flex-col justify-between">
            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
              Visualization Engine
            </span>
            <div className="text-lg font-bold font-mono text-amber-950 dark:text-amber-200 leading-none flex items-center gap-1.5">
              {is3DActive ? <Box size={16} className="text-cyan-500" /> : <BarChart3 size={16} className="text-amber-500" />}
              <span>{is3DActive ? "3D WebGL Studio" : config.chartType.toUpperCase()}</span>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400">
              {is3DActive ? "Interactive Camera & Lighting" : "2D Recharts Canvas"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* ==================================================================== */}
      {/* 4. VISUALIZATIONS TOP RIBBON (POWER BI GALLERY)                      */}
      {/* ==================================================================== */}
      <div className="bg-card border border-border rounded-xl p-2.5 shadow-2xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-primary" />
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">
              Power BI Visual Gallery (Including 3D WebGL Studio)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setVisualsCollapsed(!visualsCollapsed)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {visualsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {!visualsCollapsed && (
          <div className="pt-2">
            <VisualizationsTopRibbon
              config={config}
              onConfigChange={(newConfig) => {
                if (newConfig.chartType !== config.chartType && canvasViewMode === "table" && newConfig.chartType !== "none") {
                  setCanvasViewMode("split");
                }
                setConfig(newConfig);
              }}
            />
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 5. DROPZONE SECTION (POWER BI FIELD WELLS)                           */}
      {/* ==================================================================== */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Columns size={14} className="text-primary" />
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">
              Field Wells (Rows, Columns, Values, Filters)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setWellsCollapsed(!wellsCollapsed)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {wellsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {!wellsCollapsed && (
          <div className="pt-1">
            <DropZoneSection
              config={config}
              fieldMap={fieldMap}
              onConfigChange={setConfig}
            />
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 6. MAIN WORKSPACE: FIELD CATALOG + PIVOT CANVAS / 3D STUDIO          */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Field Catalog Pane */}
        {!fieldsCollapsed && (
          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                Catering Fields Catalog
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {activeDatasetDef.fields.length} Fields
              </Badge>
            </div>
            <FieldCatalogPane
              fields={activeDatasetDef.fields}
              onAddField={handleAddField}
              collapsed={fieldsCollapsed}
              onToggleCollapse={() => setFieldsCollapsed(!fieldsCollapsed)}
            />
          </div>
        )}

        {/* Right: Pivot Matrix & Chart Canvas */}
        <div className={fieldsCollapsed ? "lg:col-span-12" : "lg:col-span-9"}>
          <div className="space-y-4">
            {/* View Mode Switcher */}
            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-xl border border-border/60 text-xs">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={canvasViewMode === "split" ? "default" : "ghost"}
                  onClick={() => setCanvasViewMode("split")}
                  className={`h-7 text-xs font-bold ${
                    canvasViewMode === "split" ? "bg-[#0c2340] text-white" : "text-muted-foreground"
                  }`}
                >
                  <Columns size={13} className="mr-1" /> Split (Visual + Table)
                </Button>
                <Button
                  size="sm"
                  variant={canvasViewMode === "chart" ? "default" : "ghost"}
                  onClick={() => setCanvasViewMode("chart")}
                  className={`h-7 text-xs font-bold ${
                    canvasViewMode === "chart" ? "bg-[#0c2340] text-white" : "text-muted-foreground"
                  }`}
                >
                  <Box size={13} className="mr-1" /> {is3DActive ? "3D Studio Only" : "Chart Only"}
                </Button>
                <Button
                  size="sm"
                  variant={canvasViewMode === "table" ? "default" : "ghost"}
                  onClick={() => setCanvasViewMode("table")}
                  className={`h-7 text-xs font-bold ${
                    canvasViewMode === "table" ? "bg-[#0c2340] text-white" : "text-muted-foreground"
                  }`}
                >
                  <Table size={13} className="mr-1" /> Table Only
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {(matrixResult?.rows?.length ?? 0)} Row Nodes | {(matrixResult?.columnHeaders?.length ?? 0)} Column Headers
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refetch()}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Refresh Data"
                >
                  <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                </Button>
              </div>
            </div>

            {/* Visual Preview (2D Recharts or 3D WebGL Studio) */}
            {config.chartType !== "none" && (canvasViewMode === "split" || canvasViewMode === "chart") && (
              <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
                <PivotChartPreview
                  matrix={matrixResult}
                  config={config}
                  onChartTypeChange={(t) => setConfig({ ...config, chartType: t })}
                  onConfigChange={setConfig}
                  rawRecords={rawRecords}
                />
              </div>
            )}

            {/* Pivot Matrix Table */}
            {(canvasViewMode === "split" || canvasViewMode === "table") && (
              <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
                <PivotMatrixTable
                  matrix={matrixResult}
                  config={config}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Custom Report Modal */}
      <SaveReportModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        onSave={handleSaveReport}
        currentConfig={config}
      />
    </div>
  );
}
