import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DmcCostDashboard2D from "@/components/catering/enterprise/DmcCostDashboard2D";
import InterCampTransfer2D from "@/components/catering/enterprise/InterCampTransfer2D";

import {
  ENTERPRISE_RECIPES,
  scaleRecipe,
  CAMP_CLUSTER_NODES,
  SAMPLE_TRANSFERS,
  SERVING_LINES,
  SIMULATED_RECENT_SCANS,
  INVENTORY_BATCH_LOTS,
  CURRENT_ARAMCO_BILLING_PACK,
  EmployeeMealScanRecord,
} from "@/data/enterpriseCateringSuiteData";

import {
  DollarSign,
  Truck,
  ChefHat,
  Users,
  Recycle,
  Building2,
  Sparkles,
  ArrowLeft,
  Sliders,
  ShieldCheck,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Download,
  BarChart2,
  Layers,
  Clock,
  ShieldAlert,
  FileText,
  Check,
  ChevronRight,
  Send,
  Thermometer,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function EnterpriseCateringHub() {
  const navigate = useNavigate();

  // Recipe Scaler Interactive State
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("dish-biryani");
  const [paxCount, setPaxCount] = useState<number>(650);
  const [workOrderPrinted, setWorkOrderPrinted] = useState<boolean>(false);

  // Meal Management Scans State
  const [scanList, setScanList] = useState<EmployeeMealScanRecord[]>(SIMULATED_RECENT_SCANS);
  const [overrideNotice, setOverrideNotice] = useState<string | null>(null);

  // FIFO Rescue State
  const [rescuedBatchId, setRescuedBatchId] = useState<string | null>(null);

  // Billing Pack Export State
  const [exportNotice, setExportNotice] = useState<boolean>(false);

  // Scaled Recipe Calculation
  const currentRecipe = ENTERPRISE_RECIPES.find((r) => r.id === selectedRecipeId) || ENTERPRISE_RECIPES[0];
  const scaledData = scaleRecipe(currentRecipe, paxCount);

  // Handlers
  const handleRescueBatch = (lotId: string, recipeSuggested?: string) => {
    setRescuedBatchId(lotId);
    if (recipeSuggested?.includes("Biryani")) {
      setSelectedRecipeId("dish-biryani");
    } else if (recipeSuggested?.includes("Dal")) {
      setSelectedRecipeId("dish-dal-tadka");
    }
    setTimeout(() => setRescuedBatchId(null), 4000);
  };

  const handleSupervisorOverride = (empId: string) => {
    setScanList((prev) =>
      prev.map((s) =>
        s.employeeId === empId
          ? {
              ...s,
              scanResult: "override_allowed",
              overrideReason: "Supervisor Authorized (Overtime Field Shift)",
            }
          : s
      )
    );
    setOverrideNotice(`Access Override Approved for Employee #${empId}`);
    setTimeout(() => setOverrideNotice(null), 3500);
  };

  const handleExportBilling = () => {
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 4000);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ==================================================================== */}
      {/* TOP HEADER & NAVIGATION                                              */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              onClick={() => navigate("/catering/pantry-command-center")}
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Pantry Command Center
            </button>
            <span>/</span>
            <button
              onClick={() => navigate("/mess-catering")}
              className="hover:text-foreground transition-colors"
            >
              Mess Catering
            </button>
            <span>/</span>
            <span className="text-foreground font-semibold">Enterprise Catering Hub</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="p-2.5 rounded-xl bg-[#0c2340] text-white shadow-sm border border-[#fe932c]/30">
              <Compass className="h-6 w-6 text-[#fe932c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  Camp-365 Enterprise Catering Command Hub
                </h1>
                <Badge className="bg-[#fe932c] text-slate-950 font-black text-[10px] tracking-wider uppercase">
                  Executive Suite
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Centralized catering operations, 2D financial cost control, inter-site logistics, and Aramco SAP compliance.
              </p>
            </div>
          </div>
        </div>

        {/* Global Executive Stats Ribbon */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl border border-border/70 bg-card text-xs shadow-2xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Workforce Headcount</span>
            <strong className="text-foreground font-black text-sm">3,710 Pax</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-border/70 bg-card text-xs shadow-2xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Avg Daily CPH</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">SAR 19.10</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-border/70 bg-card text-xs shadow-2xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Inter-Camp Savings</span>
            <strong className="text-[#fe932c] font-black text-sm">+SAR 3,550</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-border/70 bg-card text-xs shadow-2xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">SAP Outbox</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              VF01 Verified
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6 OPERATIONAL PILLARS (100% PURE 2D EXECUTIVE ARCHITECTURE)           */}
      {/* ==================================================================== */}
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 3: FOOD COST & DMC CONTROL (PURE 2D EXECUTIVE DASHBOARD)    */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <DmcCostDashboard2D />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 2: INTER-SITE STOCK TRANSFERS & REGIONAL LOGISTICS          */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <InterCampTransfer2D />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 1 & 5: KITCHEN PRODUCTION & SHELF-LIFE RESCUE               */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card: Recipe BOM & Headcount Scaler (Pillar 1) */}
          <div className="lg:col-span-7 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#0c2340] text-[#fe932c]">
                    <ChefHat className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-foreground">
                        Pillar 1: Recipe BOM & Headcount Scaler
                      </h2>
                      <Badge className="bg-[#fe932c] text-slate-950 text-[10px] font-bold">
                        Stock Collision Check
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Standard recipes, automated portion conversion, and prep station weight distribution.
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs font-mono border-border">
                  Base: 100 Portions
                </Badge>
              </div>

              {/* Interactive Controls Bar */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Recipe Picker */}
                <div className="sm:col-span-5">
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Target Master Recipe
                  </label>
                  <select
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="w-full text-xs font-semibold p-2 rounded-lg bg-muted/40 border border-border/70 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-hidden"
                  >
                    {ENTERPRISE_RECIPES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.mealSession})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pax Slider & Number */}
                <div className="sm:col-span-7 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-muted-foreground">Headcount Scaling:</span>
                    <strong className="text-foreground font-mono text-sm font-black">
                      {paxCount} Pax
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
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <button onClick={() => setPaxCount(350)} className="hover:text-foreground">350 Pax</button>
                    <button onClick={() => setPaxCount(650)} className="hover:text-foreground">650 Pax</button>
                    <button onClick={() => setPaxCount(1000)} className="hover:text-foreground">1,000 Pax</button>
                    <button onClick={() => setPaxCount(1500)} className="hover:text-foreground">1,500 Pax</button>
                  </div>
                </div>
              </div>

              {/* Cost KPI Ribbon */}
              <div className="mt-4 grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs text-center font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Scaled Batch Cost</span>
                  <strong className="text-foreground font-black text-sm">
                    SAR {scaledData.totalCostSAR.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Cost Per Head</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                    SAR {scaledData.costPerPersonSAR.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Scale Factor</span>
                  <strong className="text-primary font-black text-sm">
                    {scaledData.scaleFactor}× Base
                  </strong>
                </div>
              </div>

              {/* Ingredient BOM & Stock Collision Table */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>Ingredient Bill of Materials (BOM)</span>
                  <span>Warehouse Availability</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {scaledData.ingredients.map((item) => (
                    <div
                      key={item.bom.ingredientId}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                        item.hasStockShortage
                          ? "bg-rose-500/10 border-rose-500/40 text-foreground"
                          : "bg-card border-border/50 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.bom.colorHex }}
                        />
                        <div>
                          <strong className="font-semibold block">{item.bom.name}</strong>
                          <span className="text-[10px] text-muted-foreground">
                            Station: {item.bom.prepStation}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold">
                          {item.scaledQty} {item.bom.unit}
                        </div>
                        {item.hasStockShortage ? (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 justify-end">
                            <AlertTriangle className="h-3 w-3" /> Short by {item.shortageQty} {item.bom.unit}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Stock: {item.bom.warehouseStock} {item.bom.unit} (OK)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Station Workload Preview */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">Station Workloads:</span>
                  {scaledData.stationWorkload.map((sw) => (
                    <span key={sw.station} className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
                      {sw.station}: {sw.totalWeightKg} kg
                    </span>
                  ))}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setWorkOrderPrinted(true);
                    setTimeout(() => setWorkOrderPrinted(false), 3000);
                  }}
                  className="h-7 text-xs font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Printer className="h-3 w-3" />
                  {workOrderPrinted ? "Order Dispatched!" : "Print Kitchen Work Order"}
                </Button>
              </div>
            </div>
          </div>

          {/* Card: FIFO Freshness Vault & Recipe Rescue (Pillar 5) */}
          <div className="lg:col-span-5 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#0c2340] text-[#fe932c]">
                    <Recycle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-foreground">
                        Pillar 5: FIFO Quality & Shelf-Life Rescue
                      </h2>
                      <Badge className="bg-rose-500 text-white text-[10px] font-bold">
                        HACCP Monitored
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Batch traceability, storage zone temperatures, and zero-waste recipe rescue.
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                  98.4% Zero Waste
                </Badge>
              </div>

              {rescuedBatchId && (
                <div className="mt-3 p-2.5 rounded-xl bg-[#0c2340] text-white text-xs font-semibold flex items-center gap-2 border border-[#fe932c]/50 animate-in fade-in">
                  <Sparkles className="h-4 w-4 shrink-0 text-[#fe932c]" />
                  <span>Batch assigned to tomorrow&apos;s lunch production run! Waste eliminated.</span>
                </div>
              )}

              {/* Batch Lots Feed */}
              <div className="mt-4 space-y-3">
                {INVENTORY_BATCH_LOTS.map((lot) => {
                  const isCritical = lot.status === "critical_rescue";
                  return (
                    <div
                      key={lot.lotId}
                      className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                        isCritical
                          ? "bg-rose-500/5 border-rose-500/40"
                          : "bg-muted/20 border-border/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <strong className="font-mono text-foreground font-bold">{lot.lotId}</strong>
                          <Badge
                            className={`text-[9px] font-bold uppercase ${
                              isCritical
                                ? "bg-rose-500 text-white animate-pulse"
                                : lot.status === "warning"
                                ? "bg-amber-500 text-slate-950"
                                : "bg-emerald-500 text-slate-950"
                            }`}
                          >
                            {lot.hoursUntilExpiry < 48 ? `${lot.hoursUntilExpiry}h Left` : "Fresh"}
                          </Badge>
                        </div>
                        <span className="font-mono text-muted-foreground flex items-center gap-1 text-[11px]">
                          <Thermometer className="h-3 w-3 text-cyan-500" />
                          {lot.haccpChillerTempC}°C
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">{lot.ingredientName}</span>
                        <span className="font-mono font-bold text-foreground">
                          {lot.remainingQty} / {lot.initialQty} {lot.unit}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{lot.storageZone}</span>
                        <span>Supplier: {lot.supplierName}</span>
                      </div>

                      {lot.suggestedRescueRecipe && (
                        <div className="p-2 rounded-lg bg-card border border-border/60 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            Suggested: <strong className="text-foreground">{lot.suggestedRescueRecipe}</strong>
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleRescueBatch(lot.lotId, lot.suggestedRescueRecipe)}
                            className="h-6 px-2 text-[10px] bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold gap-1 shrink-0"
                          >
                            <Zap className="h-2.5 w-2.5 text-[#fe932c]" /> Rescue Recipe
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Zero-Waste Scorecard */}
              <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Zero-Waste Efficiency</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                    98.4% Prevention Rate
                  </strong>
                </div>
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  HACCP Grade A+
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 4 & 6: DINING ACCESS CONTROL & CLIENT BILLING PACK          */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card: Meal Management & Zero-Duplicate Shield (Pillar 4) */}
          <div className="lg:col-span-6 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#0c2340] text-[#fe932c]">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-foreground">
                        Pillar 4: Dining Turnstiles & Duplicate Shield
                      </h2>
                      <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                        100% Shielded
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Biometric/RFID gate scans prevent double meal issuance when packed lunches are taken.
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs font-mono">
                  4 Active Lines
                </Badge>
              </div>

              {overrideNotice && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>{overrideNotice}</span>
                </div>
              )}

              {/* Serving Lines Live Status */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SERVING_LINES.map((line) => (
                  <div
                    key={line.lineId}
                    className="p-2.5 rounded-xl border border-border/60 bg-muted/20 text-xs text-center"
                  >
                    <span className="text-[10px] text-muted-foreground block truncate">{line.lineName}</span>
                    <strong className="text-sm font-black text-foreground font-mono block mt-0.5">
                      {line.queueCount} Waiting
                    </strong>
                    <span
                      className={`text-[9px] font-bold uppercase mt-1 inline-block px-1.5 py-0.2 rounded ${
                        line.status === "congested"
                          ? "bg-rose-500 text-white"
                          : line.status === "busy"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-500 text-slate-950"
                      }`}
                    >
                      {line.estWaitMins}m Wait
                    </span>
                  </div>
                ))}
              </div>

              {/* Turnstile Live Scan Feed */}
              <div className="mt-4 space-y-2">
                <span className="text-xs font-bold text-muted-foreground block">
                  Live Turnstile Scan Logs (Preventing Double Billing)
                </span>
                <div className="space-y-2">
                  {scanList.map((scan) => {
                    const isBlocked = scan.scanResult === "blocked_duplicate";
                    const isOverride = scan.scanResult === "override_allowed";
                    return (
                      <div
                        key={scan.employeeId}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          isBlocked
                            ? "bg-rose-500/10 border-rose-500/40 text-foreground"
                            : isOverride
                            ? "bg-amber-500/10 border-amber-500/40 text-foreground"
                            : "bg-muted/30 border-border/50 text-foreground"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="font-bold">{scan.employeeName}</strong>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              #{scan.employeeId} • {scan.department}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Scan at {scan.scanTime} ({scan.mealSession})
                            {scan.hasApprovedPackedLunch && (
                              <span className="ml-1 text-rose-600 dark:text-rose-400 font-semibold">
                                [Packed Lunch #{scan.packedLunchRef} already issued]
                              </span>
                            )}
                            {scan.overrideReason && (
                              <span className="ml-1 text-amber-600 dark:text-amber-400 italic">
                                ({scan.overrideReason})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isBlocked ? (
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-rose-500 text-white text-[9px] font-bold">
                                BLOCKED DUPLICATE
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSupervisorOverride(scan.employeeId)}
                                className="h-6 text-[9px] border-amber-500/50 text-amber-600 hover:bg-amber-500/10 font-bold"
                              >
                                Override
                              </Button>
                            </div>
                          ) : isOverride ? (
                            <Badge className="bg-amber-500 text-slate-950 text-[9px] font-bold">
                              OVERRIDE OK
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500 text-slate-950 text-[9px] font-bold">
                              GRANTED
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Aramco Master Billing Pack & SAP Reconciliation (Pillar 6) */}
          <div className="lg:col-span-6 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#0c2340] text-[#fe932c]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-foreground">
                        Pillar 6: Aramco Master Billing Pack
                      </h2>
                      <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                        SAP Reconciled
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Transparent 4-tier client billing binder verified against SAP VF01 document.
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs font-mono text-emerald-600">
                  VF01 Posted
                </Badge>
              </div>

              {exportNotice && (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>Aramco Audit Dossier (PDF & CSV) exported to client billing portal!</span>
                </div>
              )}

              {/* 4-Layer Billing Breakdown Table */}
              <div className="mt-4 rounded-xl border border-border/60 overflow-hidden text-xs">
                <div className="bg-[#0c2340] text-white p-2.5 font-bold flex items-center justify-between">
                  <span>Audit Layer</span>
                  <span>Units × Contract Rate = Subtotal (SAR)</span>
                </div>
                <div className="divide-y divide-border/60 bg-card">
                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <strong className="block text-foreground font-semibold">1. Inmate Bed-Nights</strong>
                      <span className="text-[10px] text-muted-foreground">Contractual accommodation occupancy</span>
                    </div>
                    <span className="font-mono font-bold text-foreground">
                      34,500 × SAR 45.00 = <strong className="text-primary font-black">SAR 1,552,500</strong>
                    </span>
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <strong className="block text-foreground font-semibold">2. Scanned Dining Meals</strong>
                      <span className="text-[10px] text-muted-foreground">Turnstile verified breakfast, lunch, dinner</span>
                    </div>
                    <span className="font-mono font-bold text-foreground">
                      72,400 × SAR 12.00 = <strong className="text-primary font-black">SAR 868,800</strong>
                    </span>
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <strong className="block text-foreground font-semibold">3. Approved Field Lunches</strong>
                      <span className="text-[10px] text-muted-foreground">Heavy remote site packed meals</span>
                    </div>
                    <span className="font-mono font-bold text-foreground">
                      18,200 × SAR 14.50 = <strong className="text-primary font-black">SAR 263,900</strong>
                    </span>
                  </div>

                  <div className="p-2.5 flex items-center justify-between bg-rose-500/5">
                    <div>
                      <strong className="block text-rose-600 dark:text-rose-400 font-semibold">4. Deducted Cancellations</strong>
                      <span className="text-[10px] text-muted-foreground">Advance cancellation credit applied</span>
                    </div>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      2,150 × -SAR 10.00 = <strong>-SAR 21,500</strong>
                    </span>
                  </div>
                </div>

                {/* Net Billing Total */}
                <div className="p-3 bg-muted/40 flex items-center justify-between border-t border-border/80">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Net Approved Billing Amount
                    </span>
                    <strong className="text-foreground font-black text-base font-mono">
                      SAR {CURRENT_ARAMCO_BILLING_PACK.netInvoicedSAR.toLocaleString()}.00
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block font-bold">Variance vs SAP</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm">
                      0.00 SAR (Exact Match)
                    </strong>
                  </div>
                </div>
              </div>

              {/* SAP Posting & Sign-off Stamp */}
              <div className="mt-3 p-3 rounded-xl bg-muted/20 border border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-[10px]">SAP Doc:</span>
                    <code className="font-bold text-primary bg-primary/10 px-1 py-0.5 rounded text-[11px]">
                      {CURRENT_ARAMCO_BILLING_PACK.sapPostingDocument}
                    </code>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Sign-off: {CURRENT_ARAMCO_BILLING_PACK.auditSignOff.campManager}
                  </span>
                </div>

                <Button
                  size="sm"
                  onClick={handleExportBilling}
                  className="h-8 bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold gap-1 text-xs"
                >
                  <Download className="h-3.5 w-3.5 text-[#fe932c]" />
                  Export Aramco Billing Pack
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
