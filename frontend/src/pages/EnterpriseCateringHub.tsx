import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DmcSkyline3D from "@/components/catering/enterprise/DmcSkyline3D";
import LogisticsRadar3D from "@/components/catering/enterprise/LogisticsRadar3D";
import CulinaryReactor3D from "@/components/catering/enterprise/CulinaryReactor3D";
import DiningHallDigitalTwin3D from "@/components/catering/enterprise/DiningHallDigitalTwin3D";
import FifoExpiryVault3D from "@/components/catering/enterprise/FifoExpiryVault3D";
import AramcoAuditCube3D from "@/components/catering/enterprise/AramcoAuditCube3D";
import DmcChart2D from "@/components/catering/enterprise/DmcChart2D";

import {
  ENTERPRISE_RECIPES,
  scaleRecipe,
  CAMP_CLUSTER_NODES,
  SAMPLE_TRANSFERS,
  SERVING_LINES,
  SIMULATED_RECENT_SCANS,
  INVENTORY_BATCH_LOTS,
  CURRENT_ARAMCO_BILLING_PACK,
  InterCampTransferManifest,
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
  Box,
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

export type ViewMode = "unified" | "deepdive";
export type EnterpriseModuleKey =
  | "dmc-skyline"
  | "logistics-radar"
  | "culinary-reactor"
  | "dining-twin"
  | "fifo-vault"
  | "audit-cube";

export default function EnterpriseCateringHub() {
  const navigate = useNavigate();

  // Primary Mode: Unified Executive Command vs 3D Deep-Dive Modules
  const [viewMode, setViewMode] = useState<ViewMode>("unified");
  const [active3DModule, setActive3DModule] = useState<EnterpriseModuleKey>("dmc-skyline");

  // DMC Section 2D vs 3D Toggle in Unified View
  const [dmcVisualMode, setDmcVisualMode] = useState<"2d" | "3d">("2d");

  // Recipe Scaler Interactive State
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("dish-biryani");
  const [paxCount, setPaxCount] = useState<number>(650);
  const [workOrderPrinted, setWorkOrderPrinted] = useState<boolean>(false);

  // Inter-Camp Transfer State
  const [transfers, setTransfers] = useState<InterCampTransferManifest[]>(SAMPLE_TRANSFERS);
  const [dispatchedId, setDispatchedId] = useState<string | null>(null);

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
  const handleDispatch = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: "in_transit" } : t))
    );
    setDispatchedId(transferId);
    setTimeout(() => setDispatchedId(null), 3000);
  };

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

  const modules = [
    {
      key: "dmc-skyline" as const,
      name: "Food Cost & DMC Matrix",
      subtitle: "3D CPH vs Budget Ceiling",
      icon: DollarSign,
      badge: "Financial Twin",
      component: <DmcSkyline3D />,
    },
    {
      key: "logistics-radar" as const,
      name: "Inter-Camp Transfer Radar",
      subtitle: "3D Regional Redistribution",
      icon: Truck,
      badge: "Saves SAR 3,550",
      component: <LogisticsRadar3D />,
    },
    {
      key: "culinary-reactor" as const,
      name: "Recipe BOM Scaler",
      subtitle: "Kitchen Station Workloads",
      icon: ChefHat,
      badge: "Collision Check",
      component: <CulinaryReactor3D />,
    },
    {
      key: "dining-twin" as const,
      name: "Dining Hall Twin",
      subtitle: "Queue Heatmap & Turnstiles",
      icon: Users,
      badge: "Zero-Duplicate Shield",
      component: <DiningHallDigitalTwin3D />,
    },
    {
      key: "fifo-vault" as const,
      name: "FIFO Freshness Vault",
      subtitle: "Perishable Expiry & Rescue",
      icon: Recycle,
      badge: "HACCP Lot Control",
      component: <FifoExpiryVault3D />,
    },
    {
      key: "audit-cube" as const,
      name: "Aramco Audit Cube",
      subtitle: "Exploding Billing Binder",
      icon: Building2,
      badge: "SAP Reconciled",
      component: <AramcoAuditCube3D />,
    },
  ];

  const current3DMod = modules.find((m) => m.key === active3DModule) || modules[0];

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
            <span className="text-foreground font-semibold">Enterprise Catering Suite</span>
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
                Centralized operations, financial control, and audit compliance built to Saudi Aramco contractor specifications.
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
      {/* VIEW MODE TOGGLE BAR (Unified Executive vs 3D Deep-Dive)             */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-muted/40 rounded-2xl border border-border/60">
        <div className="flex items-center gap-1.5 bg-card p-1 rounded-xl border border-border/60 shadow-2xs">
          <button
            onClick={() => setViewMode("unified")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === "unified"
                ? "bg-[#0c2340] text-white shadow-sm ring-1 ring-[#fe932c]/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Layers className="h-4 w-4 text-[#fe932c]" />
            Unified Executive Command (2D + Hybrid)
          </button>
          <button
            onClick={() => setViewMode("deepdive")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === "deepdive"
                ? "bg-[#0c2340] text-white shadow-sm ring-1 ring-[#fe932c]/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Box className="h-4 w-4 text-[#fe932c]" />
            Interactive 3D Deep Dives (6 Modules)
          </button>
        </div>

        <div className="text-xs text-muted-foreground px-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#fe932c]" />
          <span>
            {viewMode === "unified"
              ? "All 6 operational pillars on a single actionable executive canvas."
              : "Explore full 3D spatial environments for each catering function."}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODE 1: UNIFIED EXECUTIVE DASHBOARD (DEFAULT)                        */}
      {/* ==================================================================== */}
      {viewMode === "unified" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* ---------------------------------------------------------------- */}
          {/* SECTION 1: FINANCIAL CONTROL & REGIONAL REDISTRIBUTION           */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Card 1: Food Cost & DMC Matrix (Pillar 3) */}
            <div className="lg:col-span-7 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#0c2340] text-[#fe932c]">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-foreground">
                          Pillar 3: Daily Food Cost & DMC Matrix
                        </h2>
                        <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                          Cost Per Head (CPH)
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Contractual budget ceiling vs actual kitchen consumption across projects.
                      </p>
                    </div>
                  </div>

                  {/* 2D vs 3D Matrix View Switcher */}
                  <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setDmcVisualMode("2d")}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                        dmcVisualMode === "2d"
                          ? "bg-[#0c2340] text-white shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      2D Analytical
                    </button>
                    <button
                      onClick={() => setDmcVisualMode("3d")}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                        dmcVisualMode === "3d"
                          ? "bg-[#0c2340] text-white shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Box className="h-3.5 w-3.5 text-[#fe932c]" />
                      3D Spatial Skyline
                    </button>
                  </div>
                </div>

                {/* Body: Render 2D Chart or 3D Skyline based on toggle */}
                <div className="mt-4">
                  {dmcVisualMode === "2d" ? (
                    <DmcChart2D />
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-border/60">
                      <div className="p-2 bg-muted/50 text-[11px] text-muted-foreground flex items-center justify-between border-b border-border/40">
                        <span>Click any 3D pillar to view session breakdown. Drag to orbit.</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-primary"
                          onClick={() => {
                            setViewMode("deepdive");
                            setActive3DModule("dmc-skyline");
                          }}
                        >
                          Full-Screen 3D &rarr;
                        </Button>
                      </div>
                      <div className="h-80">
                        <DmcSkyline3D />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Inter-Camp Transfer Radar & SAP Logistics (Pillar 2) */}
            <div className="lg:col-span-5 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#0c2340] text-[#fe932c]">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-foreground">
                          Pillar 2: Inter-Camp Redistribution
                        </h2>
                        <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                          Saves SAR 3,550
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Avoid emergency supplier re-orders via camp-to-camp truck transfers.
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary"
                    onClick={() => {
                      setViewMode("deepdive");
                      setActive3DModule("logistics-radar");
                    }}
                  >
                    3D Radar &rarr;
                  </Button>
                </div>

                {dispatchedId && (
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Waybill generated and dispatched to driver mobile terminal!</span>
                  </div>
                )}

                {/* Transfer Manifest List */}
                <div className="mt-4 space-y-3">
                  {transfers.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <strong className="font-mono text-foreground font-bold">{t.transferNumber}</strong>
                          <Badge
                            className={`text-[9px] font-bold uppercase ${
                              t.status === "in_transit"
                                ? "bg-amber-500 text-slate-950"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {t.status === "in_transit" ? "En Route" : "Ready to Dispatch"}
                          </Badge>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{t.savingsVsSupplierSAR} SAR Saved
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground font-bold">{t.sourceCamp.code}</span>
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span className="text-foreground font-bold">{t.destCamp.code}</span>
                        </div>
                        <span>
                          {t.distanceKm} km • ~{t.estimatedDriveMins} mins
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-card border border-border/60 flex items-center justify-between">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Cargo Item</span>
                          <strong className="text-foreground font-semibold">
                            {t.qty} {t.unit} × {t.item}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground block text-[10px]">Driver</span>
                          <span className="text-xs font-medium text-foreground">{t.driverName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Plate: {t.plateNumber}
                        </span>
                        {t.status === "proposed" ? (
                          <Button
                            size="sm"
                            onClick={() => handleDispatch(t.id)}
                            className="h-7 text-xs bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold gap-1"
                          >
                            <Send className="h-3 w-3 text-[#fe932c]" /> Dispatch Waybill
                          </Button>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 animate-spin" /> Truck In Transit
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Camp Cluster Summary */}
                <div className="mt-4 p-3 rounded-xl bg-[#0c2340] text-white text-xs space-y-1.5 border border-[#fe932c]/30">
                  <div className="flex items-center justify-between text-[#fe932c] font-bold">
                    <span>Cluster Hub Coverage</span>
                    <span>5 Active Sites</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Rig Central Hub (RIG-04) holds 14.5 days cooking oil cover; replenishing Tanajib Main (1.8 days left) prevents SAR 1,450 local emergency courier surcharge.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* SECTION 2: KITCHEN FLOOR & QUALITY CONTROL                       */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Card 3: Recipe BOM & Headcount Scaler (Pillar 1) */}
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

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary"
                    onClick={() => {
                      setViewMode("deepdive");
                      setActive3DModule("culinary-reactor");
                    }}
                  >
                    3D Reactor &rarr;
                  </Button>
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
                      className="py-1"
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

            {/* Card 4: FIFO Freshness Vault & Recipe Rescue (Pillar 5) */}
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

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary"
                    onClick={() => {
                      setViewMode("deepdive");
                      setActive3DModule("fifo-vault");
                    }}
                  >
                    3D Vault &rarr;
                  </Button>
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

          {/* ---------------------------------------------------------------- */}
          {/* SECTION 3: MEAL ACCESS CONTROL & CLIENT BILLING                  */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Card 5: Meal Management & Zero-Duplicate Shield (Pillar 4) */}
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

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary"
                    onClick={() => {
                      setViewMode("deepdive");
                      setActive3DModule("dining-twin");
                    }}
                  >
                    3D Twin &rarr;
                  </Button>
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

            {/* Card 6: Aramco Master Billing Pack & SAP Reconciliation (Pillar 6) */}
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

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary"
                    onClick={() => {
                      setViewMode("deepdive");
                      setActive3DModule("audit-cube");
                    }}
                  >
                    3D Audit Cube &rarr;
                  </Button>
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
      )}

      {/* ==================================================================== */}
      {/* MODE 2: INTERACTIVE 3D DEEP-DIVE MODULES                             */}
      {/* ==================================================================== */}
      {viewMode === "deepdive" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* 6-Module Switcher Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {modules.map((m) => {
              const Icon = m.icon;
              const isActive = m.key === active3DModule;
              return (
                <button
                  key={m.key}
                  onClick={() => setActive3DModule(m.key)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                    isActive
                      ? "bg-[#0c2340] text-white border-[#fe932c] ring-2 ring-[#fe932c]/40 shadow-md"
                      : "bg-card border-border/70 hover:border-primary/50 text-foreground hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-4 w-4 ${isActive ? "text-[#fe932c]" : "text-primary"}`} />
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        isActive
                          ? "bg-[#fe932c] text-slate-950"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {m.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs mt-2 truncate">{m.name}</h4>
                  <p className={`text-[10px] truncate mt-0.5 ${isActive ? "text-slate-300" : "text-muted-foreground"}`}>
                    {m.subtitle}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active 3D Visualizer Canvas */}
          <div className="rounded-2xl overflow-hidden border border-border/80 shadow-md bg-card">
            {current3DMod.component}
          </div>
        </div>
      )}
    </div>
  );
}
