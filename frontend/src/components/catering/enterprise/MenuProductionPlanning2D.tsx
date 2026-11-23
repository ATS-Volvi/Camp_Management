import React, { useState } from "react";
import {
  ENTERPRISE_RECIPES,
  scaleRecipe,
  DishRecipeMaster,
  SAMPLE_PORTION_SPECS,
  SAMPLE_PRODUCTION_LOGS,
  ProductionVarianceRecord,
  PortionControlSpec,
} from "@/data/enterpriseCateringSuiteData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ChefHat,
  Scale,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
  Thermometer,
  Layers,
  Utensils,
  ArrowRight,
  TrendingDown,
  Clock,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  Check,
} from "lucide-react";

interface MenuProductionPlanning2DProps {
  className?: string;
}

export default function MenuProductionPlanning2D({ className }: MenuProductionPlanning2DProps) {
  // Master Recipe Selection & Scaling
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("dish-biryani");
  const [paxCount, setPaxCount] = useState<number>(650);
  const [safetyBufferPct, setSafetyBufferPct] = useState<number>(4.0);

  // Active Sub-Tab: "bom-scaler" | "portion-control" | "meal-forecast" | "planned-vs-actual"
  const [activeTab, setActiveTab] = useState<
    "bom-scaler" | "portion-control" | "meal-forecast" | "planned-vs-actual"
  >("planned-vs-actual");

  // Production Logs State
  const [productionLogs, setProductionLogs] = useState<ProductionVarianceRecord[]>(SAMPLE_PRODUCTION_LOGS);
  const [selectedLog, setSelectedLog] = useState<ProductionVarianceRecord>(productionLogs[0]);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [workOrderNotice, setWorkOrderNotice] = useState<string | null>(null);

  // New Production Log Form State
  const [newActualCooked, setNewActualCooked] = useState<number>(660);
  const [newActualConsumed, setNewActualConsumed] = useState<number>(640);
  const [newDisposition, setNewDisposition] = useState<"blast_chill_reuse" | "consumed_perfect" | "haccp_discard">(
    "blast_chill_reuse"
  );
  const [newDispositionNotes, setNewDispositionNotes] = useState<string>(
    "Chilled to 3°C in blast chiller; allocated to cold buffet salad."
  );

  // Recipe calculation
  const currentRecipe = ENTERPRISE_RECIPES.find((r) => r.id === selectedRecipeId) || ENTERPRISE_RECIPES[0];
  const targetCookPax = Math.round(paxCount * (1 + safetyBufferPct / 100));
  const scaledData = scaleRecipe(currentRecipe, targetCookPax);
  const portionSpecs: PortionControlSpec[] = SAMPLE_PORTION_SPECS[selectedRecipeId] || [];

  // Summary KPIs across production logs
  const totalPlannedPortions = productionLogs.reduce((acc, l) => acc + l.plannedPax, 0);
  const totalCookedPortions = productionLogs.reduce((acc, l) => acc + l.actualCookedPax, 0);
  const totalConsumedPortions = productionLogs.reduce((acc, l) => acc + l.actualConsumedPax, 0);
  const totalLeftoverPortions = totalCookedPortions - totalConsumedPortions;
  const avgLeftoverPct = Number(((totalLeftoverPortions / totalCookedPortions) * 100).toFixed(1));
  const totalVarianceSAR = productionLogs.reduce((acc, l) => acc + l.varianceSAR, 0);

  const handlePrintWorkOrder = () => {
    setWorkOrderNotice(`Kitchen Production Work Order dispatched for ${targetCookPax} portions of ${currentRecipe.name}!`);
    setTimeout(() => setWorkOrderNotice(null), 4000);
  };

  const handleLogShiftProduction = (e: React.FormEvent) => {
    e.preventDefault();
    const leftover = Math.max(0, newActualCooked - newActualConsumed);
    const leftoverPct = Number(((leftover / newActualCooked) * 100).toFixed(1));
    const cph = scaledData.costPerPersonSAR;
    const varianceSAR = Number((leftover * cph).toFixed(2));

    const newRecord: ProductionVarianceRecord = {
      id: `PROD-2026-1123-L0${productionLogs.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      mealSession: currentRecipe.mealSession as "Breakfast" | "Lunch" | "Dinner",
      dishId: currentRecipe.id,
      dishName: currentRecipe.name,
      forecastPax: 1250,
      plannedPax: paxCount,
      safetyBufferPct: safetyBufferPct,
      targetCookPax: targetCookPax,
      actualCookedPax: newActualCooked,
      actualConsumedPax: newActualConsumed,
      leftoverPax: leftover,
      leftoverPct: leftoverPct,
      costPerHeadSAR: cph,
      varianceSAR: varianceSAR,
      disposition: newDisposition,
      dispositionNotes: newDispositionNotes,
      headChefSignOff: "Executive Chef Tariq Al-Sayed",
      status: "reconciled",
    };

    setProductionLogs([newRecord, ...productionLogs]);
    setSelectedLog(newRecord);
    setShowLogModal(false);
    setWorkOrderNotice(`Shift Production Shift closed! Leftover variance: ${leftover} portions (${leftoverPct}%).`);
    setTimeout(() => setWorkOrderNotice(null), 4000);
  };

  return (
    <div className={`space-y-4 font-sans ${className || ""}`}>
      {/* ================================================================== */}
      {/* 1. TOP HEADER BANNER (DYNAMIC REPORT THEME)                         */}
      {/* ================================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c2340] text-white shadow-md border border-[#fe932c]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#fe932c]/20 text-[#fe932c]">
                <ChefHat className="h-5 w-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Menu & Production Planning Suite
              </h2>
              <Badge className="bg-[#fe932c] text-slate-950 font-black text-[10px] tracking-wider uppercase">
                Pillar 1 Core
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Standard recipe BOMs, strict grams portion control, occupancy meal forecasting, and planned vs. actual production variance reporting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrintWorkOrder}
              className="bg-white/10 hover:bg-white/20 text-white font-bold gap-1.5 text-xs border border-white/20"
            >
              <Printer className="h-3.5 w-3.5 text-[#fe932c]" /> Print Work Order
            </Button>
            <Button
              size="sm"
              onClick={() => setShowLogModal(true)}
              className="bg-[#fe932c] hover:bg-[#fe932c]/90 text-slate-950 font-bold gap-1 text-xs shrink-0"
            >
              <Plus className="h-4 w-4" /> Reconcile Shift Batch
            </Button>
          </div>
        </div>

        {/* Global Operational KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/10 text-xs font-mono">
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Planned vs Actual Cooked</span>
            <strong className="text-white font-black text-sm">
              {totalPlannedPortions} &rarr; {totalCookedPortions} Pax
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Actual Consumed (Turnstiles)</span>
            <strong className="text-emerald-400 font-black text-sm">
              {totalConsumedPortions} Pax ({( (totalConsumedPortions / totalCookedPortions) * 100 ).toFixed(1)}%)
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Kitchen Overproduction</span>
            <strong className="text-[#fe932c] font-black text-sm">
              {totalLeftoverPortions} Portions ({avgLeftoverPct}%)
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Variance Financial Cost</span>
            <strong className="text-slate-200 font-black text-sm">
              SAR {totalVarianceSAR.toFixed(2)} (HACCP Safe)
            </strong>
          </div>
        </div>
      </div>

      {workOrderNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{workOrderNotice}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. SUB-MODULE NAVIGATION PILLS                                      */}
      {/* ================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-muted/40 rounded-xl border border-border/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("planned-vs-actual")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "planned-vs-actual"
                ? "bg-[#0c2340] text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 text-[#fe932c]" />
            1. Planned vs. Actual Production & Variance
          </button>
          <button
            onClick={() => setActiveTab("bom-scaler")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "bom-scaler"
                ? "bg-[#0c2340] text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            2. Standard Recipes & Scaled BOM
          </button>
          <button
            onClick={() => setActiveTab("portion-control")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "portion-control"
                ? "bg-[#0c2340] text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            3. Grams Portion Control & Serving Utensils
          </button>
          <button
            onClick={() => setActiveTab("meal-forecast")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "meal-forecast"
                ? "bg-[#0c2340] text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            4. Occupancy Meal Forecasting
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground font-mono px-2">
          Target: &lt;3.0% Overproduction Variance
        </span>
      </div>

      {/* ================================================================== */}
      {/* TAB 1: PLANNED VS. ACTUAL PRODUCTION & VARIANCE LOG                */}
      {/* ================================================================== */}
      {activeTab === "planned-vs-actual" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Shift Production Log Table (8 of 12 cols) */}
            <div className="lg:col-span-8 bg-card rounded-2xl border border-border/80 shadow-xs p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-black text-foreground">
                    Kitchen Daily Production Reconciliation Log
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Turnstile Verified Consumption
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0c2340] text-white font-bold text-[11px] rounded-lg">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Shift Batch #</th>
                      <th className="p-2.5">Dish & Session</th>
                      <th className="p-2.5 text-center">Planned</th>
                      <th className="p-2.5 text-center">Cooked</th>
                      <th className="p-2.5 text-center">Consumed</th>
                      <th className="p-2.5 text-center">Variance (Leftover)</th>
                      <th className="p-2.5 text-right rounded-r-lg">Disposition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {productionLogs.map((log) => {
                      const isSelected = selectedLog.id === log.id;
                      const isWithinBenchmark = log.leftoverPct <= 5.0;
                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-primary/10 font-medium"
                              : "hover:bg-muted/30 text-foreground"
                          }`}
                        >
                          <td className="p-2.5 font-mono font-bold text-foreground">
                            {log.id}
                            <span className="text-[10px] text-muted-foreground block font-normal font-sans">
                              {log.date}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <strong className="block text-foreground">{log.dishName}</strong>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {log.mealSession} • CPH SAR {log.costPerHeadSAR.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold">
                            {log.plannedPax}
                            <span className="text-[9px] text-muted-foreground block">
                              +{log.safetyBufferPct}% buf
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-foreground">
                            {log.actualCookedPax}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {log.actualConsumedPax}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                isWithinBenchmark
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              +{log.leftoverPax} ({log.leftoverPct}%)
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            <Badge
                              className={`text-[9px] font-bold uppercase ${
                                log.disposition === "blast_chill_reuse"
                                  ? "bg-cyan-600 text-white"
                                  : log.disposition === "consumed_perfect"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-rose-600 text-white"
                              }`}
                            >
                              {log.disposition.replace(/_/g, " ")}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Selected Batch Audit & Disposition Slip (4 of 12 cols) */}
            <div className="lg:col-span-4 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="border-b border-border/60 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                      Shift Audit Dossier
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/40">
                      HACCP Verified
                    </Badge>
                  </div>
                  <h4 className="text-base font-black text-foreground mt-1">
                    {selectedLog.dishName}
                  </h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    Batch: {selectedLog.id} • Session: {selectedLog.mealSession}
                  </p>
                </div>

                {/* Variance Metric Cards */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold block">
                      Leftover Portions
                    </span>
                    <strong className="text-foreground text-sm font-black block mt-0.5">
                      +{selectedLog.leftoverPax} Pax
                    </strong>
                    <span className="text-[10px] text-amber-600">
                      {selectedLog.leftoverPct}% of batch
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold block">
                      Variance Cost (SAR)
                    </span>
                    <strong className="text-[#fe932c] text-sm font-black block mt-0.5">
                      SAR {selectedLog.varianceSAR.toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-muted-foreground">
                      @ SAR {selectedLog.costPerHeadSAR.toFixed(2)} CPH
                    </span>
                  </div>
                </div>

                {/* Disposition & HACCP Protocol */}
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Food Disposition:</span>
                    <Badge className="bg-cyan-600 text-white text-[9px] font-bold uppercase">
                      {selectedLog.disposition.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedLog.dispositionNotes}
                  </p>
                </div>

                {/* Sign-off Seal */}
                <div className="p-3 rounded-xl bg-[#0c2340] text-white text-xs space-y-1">
                  <div className="flex items-center justify-between text-[#fe932c] font-bold">
                    <span>Shift Verification</span>
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-[11px] text-slate-200">
                    Sign-off: <strong>{selectedLog.headChefSignOff}</strong>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Reconciled with gate RFID turnstiles at 14:15 UTC+3
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setWorkOrderNotice(`Production Reconciliation Certificate for #${selectedLog.id} exported!`);
                  setTimeout(() => setWorkOrderNotice(null), 3000);
                }}
                className="w-full text-xs font-bold gap-1.5 border-primary/40 text-primary"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Batch Reconciliation (PDF/Excel)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 2: STANDARD RECIPES & SCALED BILL OF MATERIALS (BOM)           */}
      {/* ================================================================== */}
      {activeTab === "bom-scaler" && (
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center border-b border-border/60 pb-4">
            <div className="sm:col-span-5">
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Select Master Standard Recipe
              </label>
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-lg bg-muted border border-border/70 text-foreground font-sans"
              >
                {ENTERPRISE_RECIPES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.arabicName}) - {r.mealSession}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-7 space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-muted-foreground font-sans">Portions to Cook:</span>
                <strong className="text-foreground text-sm font-black">
                  {targetCookPax} Portions ({paxCount} + {safetyBufferPct}% safety buffer)
                </strong>
              </div>
              <Slider
                value={[paxCount]}
                min={100}
                max={2000}
                step={25}
                onValueChange={(val) => setPaxCount(val[0])}
                className="py-1 cursor-pointer"
              />
            </div>
          </div>

          {/* Scaled BOM Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>Ingredient Bill of Materials (BOM)</span>
              <span>Warehouse Stock vs Scaled Requirement</span>
            </div>
            <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden text-xs">
              {scaledData.ingredients.map((item) => (
                <div
                  key={item.bom.ingredientId}
                  className={`p-3 flex items-center justify-between ${
                    item.hasStockShortage ? "bg-rose-500/10" : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.bom.colorHex }}
                    />
                    <div>
                      <strong className="block text-foreground font-semibold">
                        {item.bom.name}
                      </strong>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Prep Station: {item.bom.prepStation} • Category: {item.bom.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <strong className="text-sm font-bold text-foreground">
                      {item.scaledQty} {item.bom.unit}
                    </strong>
                    <div className="text-[10px]">
                      {item.hasStockShortage ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 justify-end">
                          <AlertTriangle className="h-3 w-3" /> Short by {item.shortageQty} {item.bom.unit} (Store has {item.bom.warehouseStock})
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          In Store: {item.bom.warehouseStock} {item.bom.unit} (Sufficient)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 3: GRAMS PORTION CONTROL SPECIFICATION                         */}
      {/* ================================================================== */}
      {activeTab === "portion-control" && (
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-[#fe932c]" />
              <div>
                <h3 className="text-sm font-black text-foreground">
                  Standard Portion Control & Serving Utensil Guide
                </h3>
                <p className="text-xs text-muted-foreground">
                  Prevents over-serving variance and ensures nutritional consistency per Saudi Aramco standards.
                </p>
              </div>
            </div>
            <Badge className="bg-[#0c2340] text-[#fe932c] text-xs font-mono">
              Target: {currentRecipe.name}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {portionSpecs.map((spec, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <strong className="font-bold text-foreground text-xs">{spec.componentName}</strong>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Thermometer className="h-3 w-3" /> &ge;{spec.targetTempServingC}°C
                  </span>
                </div>

                <div className="space-y-1 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-sans">Target Portion:</span>
                    <strong className="text-sm font-black text-foreground">
                      {spec.targetServingGrams} grams
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-sans">Tolerance Bound:</span>
                    <span className="text-primary font-bold">&plusmn;{spec.toleranceGrams}g</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-card border border-border/60 text-[11px]">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                    Serving Utensil / Scoop
                  </span>
                  <strong className="text-foreground font-semibold flex items-center gap-1 mt-0.5">
                    <Utensils className="h-3 w-3 text-[#fe932c]" /> {spec.ladleScoopSize}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 4: OCCUPANCY MEAL FORECASTING                                  */}
      {/* ================================================================== */}
      {activeTab === "meal-forecast" && (
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-sm font-black text-foreground">
                  Camp Occupancy & Meal Session Headcount Forecasting
                </h3>
                <p className="text-xs text-muted-foreground">
                  Projects dining hall participation by meal session based on room check-ins and shift rosters.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Active Camp: Tanajib Main (1,250 Inmates)
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {(
              [
                { session: "Breakfast", rate: "84%", forecasted: 1050, menu: "Eggs, Foul, Bread, Tea" },
                { session: "Lunch (Dining)", rate: "52%", forecasted: 650, menu: "Chicken Dum Biryani" },
                { session: "Field Packed Lunch", rate: "40%", forecasted: 500, menu: "Sandwiches, Fruit, Juice" },
                { session: "Dinner", rate: "94%", forecasted: 1175, menu: "Lamb Kabsa & Lentil Soup" },
              ] as const
            ).map((s) => (
              <div key={s.session} className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="font-bold text-foreground text-xs">{s.session}</strong>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {s.rate}
                  </Badge>
                </div>
                <div className="font-mono">
                  <span className="text-[10px] text-muted-foreground uppercase font-sans block">Forecast Headcount</span>
                  <strong className="text-base font-black text-foreground">{s.forecasted} Pax</strong>
                </div>
                <div className="text-[11px] text-muted-foreground truncate border-t border-border/40 pt-1">
                  Menu: {s.menu}
                </div>
              </div>
            ))}
          </div>

          {/* Safety Buffer Setting */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">Safety Buffer Margin Allowance:</span>
              <strong className="font-mono font-bold text-primary text-sm">+{safetyBufferPct}%</strong>
            </div>
            <Slider
              value={[safetyBufferPct]}
              min={1.0}
              max={8.0}
              step={0.5}
              onValueChange={(val) => setSafetyBufferPct(val[0])}
              className="py-1"
            />
            <p className="text-[11px] text-muted-foreground">
              A safety buffer of 4.0% ensures field teams returning unexpectedly from offshore platforms receive hot meals without causing a kitchen stock-out.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SHIFT RECONCILIATION MODAL DIALOG                                  */}
      {/* ================================================================== */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-[#fe932c]" />
                <h3 className="text-base font-bold text-foreground">
                  Reconcile Shift Kitchen Production Batch
                </h3>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogShiftProduction} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Recipe Target</span>
                  <strong className="text-foreground">{currentRecipe.name} ({currentRecipe.mealSession})</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Planned Portions</span>
                  <strong className="text-foreground font-mono">{paxCount} + {safetyBufferPct}% = {targetCookPax} Pax</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Actually Cooked (Pots Batched)
                  </label>
                  <input
                    type="number"
                    value={newActualCooked}
                    onChange={(e) => setNewActualCooked(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-muted border border-border/70 text-foreground font-semibold font-mono"
                    min={100}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Actually Consumed (Turnstile Scans)
                  </label>
                  <input
                    type="number"
                    value={newActualConsumed}
                    onChange={(e) => setNewActualConsumed(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-muted border border-border/70 text-foreground font-semibold font-mono"
                    min={0}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  Leftover Disposition (HACCP Safe Protocol)
                </label>
                <select
                  value={newDisposition}
                  onChange={(e) =>
                    setNewDisposition(
                      e.target.value as "blast_chill_reuse" | "consumed_perfect" | "haccp_discard"
                    )
                  }
                  className="w-full p-2 rounded-lg bg-muted border border-border/70 text-foreground font-semibold"
                >
                  <option value="blast_chill_reuse">Blast Chill & Reuse for Next Shift (HACCP 3°C)</option>
                  <option value="consumed_perfect">Consumed Perfect (&lt;1% leftover)</option>
                  <option value="haccp_discard">HACCP Discard (Exceeded 4h Hot-Holding Limit)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  Disposition Notes & Temperature Log
                </label>
                <textarea
                  value={newDispositionNotes}
                  onChange={(e) => setNewDispositionNotes(e.target.value)}
                  className="w-full p-2 rounded-lg bg-muted border border-border/70 text-foreground font-semibold resize-none h-16"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowLogModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold text-xs"
                >
                  Verify & Close Production Shift
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
