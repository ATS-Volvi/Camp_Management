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
  TrendingUp,
  Users,
  Building2,
  Receipt,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
            <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto text-xs">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Standard BI Templates
              </div>
              {presets
                .filter((p) => p.isBuiltIn)
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
                    Saved Custom Templates
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

      {/* Dataset & Live Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Dataset Card */}
        <Card className="border-border bg-card shadow-2xs">
          <CardContent className="p-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
              Data Model
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
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Metric 1: Total Records */}
        <Card className="border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 border-t-2 border-t-blue-600 shadow-2xs">
          <CardContent className="p-3">
            <span className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
              Records Analyzed
            </span>
            <div className="text-lg font-bold font-mono text-blue-950 dark:text-blue-200 mt-0.5">
              {isLoading ? "..." : rawRecords.length.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Primary Grand Total */}
        <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 border-t-2 border-t-amber-500 shadow-2xs">
          <CardContent className="p-3">
            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
              Grand Total Metric ({config.values[0]?.aggregation.toUpperCase() || "SUM"})
            </span>
            <div className="text-lg font-bold font-mono text-amber-950 dark:text-amber-200 mt-0.5 truncate">
              {matrixResult.grandTotal?.formatted || "0"}
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Active Groups */}
        <Card className="border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 border-t-2 border-t-slate-700 shadow-2xs">
          <CardContent className="p-3">
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider block">
              Active Hierarchy
            </span>
            <div className="text-xs font-semibold text-foreground mt-1 truncate">
              {config.rows.map((r) => fieldMap[r]?.label || r).join(" ➔ ") || "All Data"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Studio Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Field Palette (3 cols) */}
        <div className="lg:col-span-3 sticky top-4">
          <FieldCatalogPane
            fields={activeDatasetDef.fields}
            onAddField={handleAddField}
          />
        </div>

        {/* Right Column: Drop Wells & Matrix Workspace (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Magnetic Drop Wells */}
          <DropZoneSection
            config={config}
            fieldMap={fieldMap}
            onConfigChange={setConfig}
          />

          {/* Dynamic Linked Chart Visualizer */}
          <PivotChartPreview
            matrix={matrixResult}
            config={config}
            onChartTypeChange={(chartType) => setConfig({ ...config, chartType })}
          />

          {/* High-Density Pivot Matrix Table */}
          <PivotMatrixTable
            matrix={matrixResult}
            config={config}
          />
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
