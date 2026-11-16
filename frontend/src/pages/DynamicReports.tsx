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
} from "lucide-react";
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

    // Pick reasonable default rows and values for the new dataset
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={22} className="text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Dynamic Reports & Pivot Studio</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              <Sparkles size={11} /> PowerBI-Style
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Drag & drop dimensions into rows, columns, and metric values to cross-tabulate live operations and billing.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5 bg-card">
                <Bookmark size={13} className="text-orange-500" />
                <span>
                  {presets.find((p) => p.id === selectedPresetId)?.name || "Select Preset"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto text-xs">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Standard Corporate Templates
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
            variant="outline"
            onClick={() => setSaveModalOpen(true)}
            className="h-8 text-xs font-medium gap-1.5"
            title="Save current layout as a custom template"
          >
            <BookmarkPlus size={13} className="text-primary" />
            <span>Save Report</span>
          </Button>

          {/* Excel Export */}
          <Button
            size="sm"
            onClick={handleExportExcel}
            className="h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs gap-1.5"
          >
            <FileSpreadsheet size={13} />
            <span>Export Excel</span>
          </Button>

          {/* CSV Export */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="h-8 text-xs font-medium gap-1.5"
          >
            <Download size={13} />
            <span>CSV</span>
          </Button>

          {/* Reset */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            title="Reset layout"
          >
            <RotateCcw size={13} />
          </Button>
        </div>
      </div>

      {/* Dataset Selector Bar */}
      <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Dataset:
            </span>
          </div>

          <Select
            value={config.dataset}
            onValueChange={(val) => handleDatasetChange(val as DatasetId)}
          >
            <SelectTrigger className="w-[280px] h-8 text-xs bg-background font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="inmates">👥 Inmates & Room Occupancy</SelectItem>
              <SelectItem value="billing">💰 Accommodation & Catering Billing</SelectItem>
              <SelectItem value="movements">🔄 Check-In & Check-Out Movements</SelectItem>
              <SelectItem value="catering">🍽️ Mess & Catering Costing</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            • {activeDatasetDef.description}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground font-mono">
            {isLoading ? "Querying database..." : `${rawRecords.length.toLocaleString()} records loaded`}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => refetch()}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Refresh dataset from database"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Main Studio Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Field Palette (3 cols) */}
        <div className="lg:col-span-3 sticky top-4">
          <FieldCatalogPane
            fields={activeDatasetDef.fields}
            onAddField={handleAddField}
          />
        </div>

        {/* Right Column: Drop Zones & Matrix Workspace (9 cols) */}
        <div className="lg:col-span-9 space-y-5">
          {/* Drop Zones */}
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

          {/* Interactive Pivot Matrix Table */}
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
