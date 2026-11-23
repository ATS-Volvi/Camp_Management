import React, { useState } from "react";
import {
  CAMP_CLUSTER_NODES,
  SAMPLE_TRANSFERS,
  InterCampTransferManifest,
  KitchenStockIssuanceRecord,
  SAMPLE_STOCK_ISSUANCES,
  InventoryConsumptionVelocity,
  SAMPLE_CONSUMPTION_VELOCITY,
  PhysicalInventoryReconciliationRecord,
  SAMPLE_PHYSICAL_RECONCILIATIONS,
} from "@/data/enterpriseCateringSuiteData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck,
  ArrowRight,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Plus,
  ShieldCheck,
  Building,
  Navigation,
  FileText,
  DollarSign,
  PackageCheck,
  RefreshCw,
  Boxes,
  Flame,
  FileSpreadsheet,
  Check,
  ArrowUpRight,
  TrendingDown,
  Layers,
  Database,
  Sliders,
  Scale,
} from "lucide-react";

interface InventoryProcurement2DProps {
  className?: string;
}

export default function InventoryProcurement2D({ className }: InventoryProcurement2DProps) {
  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<
    "inter-camp" | "stock-issuance" | "consumption-burn" | "reconciliation"
  >("inter-camp");

  // State: Transfers
  const [transfers, setTransfers] = useState<InterCampTransferManifest[]>(SAMPLE_TRANSFERS);
  const [selectedTransfer, setSelectedTransfer] = useState<InterCampTransferManifest>(transfers[0]);

  // State: Issuances
  const [issuances, setIssuances] = useState<KitchenStockIssuanceRecord[]>(SAMPLE_STOCK_ISSUANCES);
  const [selectedIssuance, setSelectedIssuance] = useState<KitchenStockIssuanceRecord>(issuances[0]);

  // State: Reconciliation
  const [reconciliations, setReconciliations] = useState<PhysicalInventoryReconciliationRecord[]>(
    SAMPLE_PHYSICAL_RECONCILIATIONS
  );
  const [selectedReconcil, setSelectedReconcil] = useState<PhysicalInventoryReconciliationRecord>(
    reconciliations[0]
  );

  // Notifications
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Actions
  const handleDispatchTransfer = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "in_transit" as const } : t))
    );
    if (selectedTransfer.id === id) {
      setSelectedTransfer((prev) => ({ ...prev, status: "in_transit" }));
    }
    setActionNotice(`Waybill #${selectedTransfer.transferNumber} dispatched! SAP MIGO 301 material doc generated.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleDeliverTransfer = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "delivered" as const } : t))
    );
    if (selectedTransfer.id === id) {
      setSelectedTransfer((prev) => ({ ...prev, status: "delivered" }));
    }
    setActionNotice(`Transfer #${selectedTransfer.transferNumber} confirmed delivered! Stock added to recipient plant.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handlePostSapAdjustment = (itemCode: string) => {
    setActionNotice(`Physical inventory variance for ${itemCode} successfully posted to SAP via transaction MI07!`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Aggregates
  const totalRegionalSavings = transfers.reduce((acc, t) => acc + t.savingsVsSupplierSAR, 0);
  const totalDailyBurnSAR = SAMPLE_CONSUMPTION_VELOCITY.reduce(
    (acc, c) => acc + c.dailyBurnRate * 12,
    0
  );
  const totalReconciledVarianceSAR = reconciliations.reduce((acc, r) => acc + r.varianceSAR, 0);

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
                <Truck className="h-5 w-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Inventory & Procurement Suite (SAP MM Integrated)
              </h2>
              <Badge className="bg-[#fe932c] text-slate-950 font-black text-[10px] tracking-wider uppercase">
                Pillar 2 Core
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              End-to-end camp warehouse governance: SAP MIGO 201 stock issuance, burn velocity consumption, regional inter-site transfers, and physical inventory reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 font-mono text-xs gap-1.5 py-1 px-3">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              SAP Plant 4100 / Storage Loc 0010 (Online)
            </Badge>
          </div>
        </div>

        {/* Global Executive Procurement KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/10 text-xs font-mono">
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Inter-Site Savings</span>
            <strong className="text-emerald-400 font-black text-sm">
              +SAR {totalRegionalSavings.toLocaleString()} Saved
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Kitchen Stock Issuance</span>
            <strong className="text-white font-black text-sm">
              SAR {issuances.reduce((a, i) => a + i.totalValueSAR, 0).toLocaleString()} (MIGO 201)
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Physical Count Variance</span>
            <strong className="text-[#fe932c] font-black text-sm">
              SAR {Math.abs(totalReconciledVarianceSAR).toFixed(2)} (0.8% Tolerance)
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Connected Camp Network</span>
            <strong className="text-slate-200 font-black text-sm">
              5 Sister Facilities Active
            </strong>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. SUB-PILLAR NAVIGATION TABS                                       */}
      {/* ================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-muted/40 rounded-xl border border-border/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("inter-camp")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "inter-camp"
                ? "bg-[#0c2340] text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Truck className="h-3.5 w-3.5 text-[#fe932c]" />
            1. Inter-Site Transfers (MIGO 301)
          </button>
          <button
            onClick={() => setActiveTab("stock-issuance")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "stock-issuance"
                ? "bg-[#0c2340] text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            2. Kitchen Stock Issuance (MIGO 201)
          </button>
          <button
            onClick={() => setActiveTab("consumption-burn")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "consumption-burn"
                ? "bg-[#0c2340] text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            3. Consumption Tracking & Burn Velocity
          </button>
          <button
            onClick={() => setActiveTab("reconciliation")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "reconciliation"
                ? "bg-[#0c2340] text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            4. Physical Inventory Reconciliation (MI07)
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground font-mono px-2">
          SAP Release: S/4HANA 2026 Material Ledger
        </span>
      </div>

      {/* ================================================================== */}
      {/* SUB-PILLAR 1: INTER-SITE TRANSFERS                                  */}
      {/* ================================================================== */}
      {activeTab === "inter-camp" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Regional Stock Cover Grid */}
          <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black text-foreground">
                  Regional Sister Camp Network: Days of Supply Cover
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Red (&lt;3 Days Deficit) • Amber (3-7 Days) • Green (&gt;7 Days Surplus)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {CAMP_CLUSTER_NODES.map((camp) => (
                <div
                  key={camp.id}
                  className={`p-3 rounded-xl border text-xs space-y-2 ${
                    camp.oilDaysCover < 3 ? "bg-rose-500/5 border-rose-500/40" : "bg-muted/20 border-border/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="font-bold text-foreground text-xs">{camp.code}</strong>
                    <Badge variant={camp.oilDaysCover < 3 ? "destructive" : "secondary"} className="text-[9px] font-bold">
                      {camp.oilDaysCover < 3 ? "DEFICIT" : "BALANCED"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate font-medium">{camp.name}</p>
                  <div className="space-y-1 font-mono text-[11px] pt-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-[10px]">Cooking Oil:</span>
                      <strong className={camp.oilDaysCover < 3 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                        {camp.oilDaysCover} Days
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-[10px]">Poultry:</span>
                      <strong className="text-foreground font-bold">{camp.chickenDaysCover} Days</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transfers Manifest 2-Col */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 bg-card rounded-2xl border border-border/80 shadow-xs p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h4 className="text-sm font-black text-foreground">Active Inter-Site Transfer Manifests</h4>
                <span className="text-[11px] text-muted-foreground font-mono">{transfers.length} Manifest(s)</span>
              </div>
              <div className="space-y-3">
                {transfers.map((t) => {
                  const isSelected = selectedTransfer.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTransfer(t)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2.5 ${
                        isSelected
                          ? "bg-[#0c2340] text-white border-[#fe932c] shadow-sm"
                          : "bg-muted/20 border-border/60 hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="font-mono text-xs font-bold">{t.transferNumber}</strong>
                        <span className="font-mono font-bold text-xs text-emerald-400">
                          +{t.savingsVsSupplierSAR} SAR Saved
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-bold">
                          <span>{t.sourceCamp.name}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-[#fe932c]" />
                          <span>{t.destCamp.name}</span>
                        </div>
                        <span className="text-[11px] opacity-80">{t.distanceKm} km • ~{t.estimatedDriveMins} mins</span>
                      </div>
                      <div className="p-2 rounded-lg bg-black/20 flex items-center justify-between text-xs font-mono">
                        <span>Cargo: {t.qty} {t.unit} × {t.item}</span>
                        <span>Driver: {t.driverName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="border-b border-border/60 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Transfer Manifest Inspection
                  </span>
                  <h4 className="text-base font-black text-foreground mt-1 font-mono">
                    {selectedTransfer.transferNumber}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Routing: {selectedTransfer.sourceCamp.name} &rarr; {selectedTransfer.destCamp.name}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item:</span>
                    <strong className="text-foreground font-bold">{selectedTransfer.item}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity:</span>
                    <strong className="text-foreground font-mono">{selectedTransfer.qty} {selectedTransfer.unit}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver / Plate:</span>
                    <span className="font-mono text-foreground font-semibold">
                      {selectedTransfer.driverName} ({selectedTransfer.plateNumber})
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border/40 pt-1.5">
                    <span className="text-muted-foreground">SAP Movement Type:</span>
                    <code className="text-primary font-bold font-mono">MIGO 301 (Plant to Plant)</code>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                  <span className="text-emerald-800 dark:text-emerald-300 font-bold block">Cost Avoidance:</span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-200 mt-0.5">
                    Avoids SAR {selectedTransfer.savingsVsSupplierSAR} commercial rush courier surcharge.
                  </p>
                </div>
              </div>

              {selectedTransfer.status === "proposed" && (
                <Button
                  onClick={() => handleDispatchTransfer(selectedTransfer.id)}
                  className="w-full bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold gap-2 text-xs h-9"
                >
                  <Send className="h-3.5 w-3.5 text-[#fe932c]" /> Dispatch Inter-Camp Waybill
                </Button>
              )}
              {selectedTransfer.status === "in_transit" && (
                <Button
                  onClick={() => handleDeliverTransfer(selectedTransfer.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-9"
                >
                  <PackageCheck className="h-4 w-4" /> Confirm Stock Receipt & Reconcile (SAP MIGO)
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-PILLAR 2: KITCHEN STOCK ISSUANCE (MIGO 201)                     */}
      {/* ================================================================== */}
      {activeTab === "stock-issuance" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-black text-foreground">
                    Store-to-Kitchen Goods Issue Log (MIGO 201)
                  </h3>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  Cost Center: CATERING-WIP-01
                </Badge>
              </div>

              <div className="space-y-3">
                {issuances.map((issue) => {
                  const isSelected = selectedIssuance.id === issue.id;
                  return (
                    <div
                      key={issue.id}
                      onClick={() => setSelectedIssuance(issue)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? "bg-[#0c2340] text-white border-[#fe932c] shadow-sm"
                          : "bg-muted/20 border-border/60 hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono">
                          <strong className="text-xs font-bold">{issue.id}</strong>
                          <Badge className="bg-primary text-white text-[9px]">
                            {issue.sapReservationDoc}
                          </Badge>
                        </div>
                        <strong className="font-mono font-bold text-xs">
                          SAR {issue.totalValueSAR.toLocaleString()}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold">{issue.targetDish}</span>
                        <span className="text-[11px] opacity-80">{issue.date}</span>
                      </div>
                      <div className="text-[11px] opacity-80">
                        Requested by: {issue.requestedByChef} &bull; Issued by: {issue.issuedByStorekeeper}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Issuance Detail Slip */}
            <div className="lg:col-span-5 bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="border-b border-border/60 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Goods Issue Material Slip
                  </span>
                  <h4 className="text-base font-black text-foreground mt-1 font-mono">
                    {selectedIssuance.id}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Target: {selectedIssuance.targetDish}
                  </p>
                </div>

                <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden text-xs">
                  {selectedIssuance.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between bg-card">
                      <div>
                        <strong className="block text-foreground">{item.name}</strong>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Zone: {item.storageZone} &bull; Code: {item.materialCode}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <strong>{item.qty} {item.unit}</strong>
                        <span className="text-[10px] text-muted-foreground block">
                          SAR {item.subtotalSAR.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Total Material Value:</span>
                  <strong className="text-base font-black font-mono text-primary">
                    SAR {selectedIssuance.totalValueSAR.toLocaleString()}
                  </strong>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActionNotice(`Material Issue Slip ${selectedIssuance.id} printed for Kitchen Pass!`);
                  setTimeout(() => setActionNotice(null), 3000);
                }}
                className="w-full text-xs font-bold gap-1.5 border-primary/40 text-primary"
              >
                <Printer className="h-3.5 w-3.5" /> Print SAP MIGO Issue Slip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-PILLAR 3: CONSUMPTION TRACKING & BURN VELOCITY                  */}
      {/* ================================================================== */}
      {activeTab === "consumption-burn" && (
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-[#fe932c]" />
              <div>
                <h3 className="text-sm font-black text-foreground">
                  Stock Burn Velocity & Days-of-Supply Depletion Monitor
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tracks daily kitchen consumption speeds to trigger automatic SAP Purchase Requisitions before stock-outs.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Tanajib Central Store
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SAMPLE_CONSUMPTION_VELOCITY.map((item) => {
              const isWarning = item.daysCoverRemaining < 3;
              return (
                <div
                  key={item.materialCode}
                  className={`p-4 rounded-xl border text-xs space-y-3 ${
                    isWarning ? "bg-rose-500/5 border-rose-500/40" : "bg-muted/20 border-border/60"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div>
                      <strong className="font-bold text-foreground block">{item.name}</strong>
                      <span className="text-[10px] text-muted-foreground font-mono">{item.materialCode}</span>
                    </div>
                    <Badge
                      className={`text-[9px] font-bold uppercase ${
                        item.status === "critical_stockout"
                          ? "bg-rose-500 text-white animate-pulse"
                          : item.status === "reorder_warning"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-500 text-slate-950"
                      }`}
                    >
                      {item.daysCoverRemaining} Days Left
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-sans">Current On-Hand</span>
                      <strong className="text-foreground text-sm font-black">{item.currentStock} {item.unit}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-sans">Daily Burn Rate</span>
                      <strong className="text-foreground text-sm font-black">{item.dailyBurnRate} {item.unit}/day</strong>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-card border border-border/50 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Reorder Point: {item.reorderPoint} {item.unit}</span>
                    <span className="text-primary font-bold">{item.lastSapPoRef}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-PILLAR 4: PHYSICAL INVENTORY RECONCILIATION (MI07)              */}
      {/* ================================================================== */}
      {activeTab === "reconciliation" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 bg-card rounded-2xl border border-border/80 shadow-xs p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-black text-foreground">
                    Physical Stock Count vs. System Book Inventory Reconciliation (MI07)
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Monthly Audit Cycle
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0c2340] text-white font-bold text-[11px] rounded-lg">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Item & Location</th>
                      <th className="p-2.5 text-center">Book Stock</th>
                      <th className="p-2.5 text-center">Physical Count</th>
                      <th className="p-2.5 text-center">Variance (Qty)</th>
                      <th className="p-2.5 text-center">Variance (SAR)</th>
                      <th className="p-2.5 text-right rounded-r-lg">Reason Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {reconciliations.map((rec) => {
                      const isSelected = selectedReconcil.itemCode === rec.itemCode;
                      const hasVariance = rec.varianceQty !== 0;
                      return (
                        <tr
                          key={rec.itemCode}
                          onClick={() => setSelectedReconcil(rec)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 font-medium" : "hover:bg-muted/30 text-foreground"
                          }`}
                        >
                          <td className="p-2.5">
                            <strong className="block text-foreground">{rec.name}</strong>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {rec.storageLocation} &bull; {rec.itemCode}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold">
                            {rec.bookStock} {rec.unit}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-foreground">
                            {rec.physicalCount} {rec.unit}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                hasVariance
                                  ? "bg-rose-500/10 text-rose-600 border border-rose-500/30"
                                  : "text-emerald-600"
                              }`}
                            >
                              {rec.varianceQty} {rec.unit} ({rec.variancePct}%)
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-foreground">
                            SAR {rec.varianceSAR.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-sans">
                            <span className="text-[10px] text-muted-foreground block">{rec.reasonCode}</span>
                            <code className="text-[9px] text-primary font-mono">{rec.sapAdjustmentDoc}</code>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reconciliation Detail & SAP Posting Action */}
            <div className="lg:col-span-4 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="border-b border-border/60 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Reconciliation Voucher
                  </span>
                  <h4 className="text-base font-black text-foreground mt-1">
                    {selectedReconcil.name}
                  </h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    Location: {selectedReconcil.storageLocation}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold block">
                      Variance Delta
                    </span>
                    <strong className="text-foreground text-sm font-black block mt-0.5">
                      {selectedReconcil.varianceQty} {selectedReconcil.unit}
                    </strong>
                    <span className="text-[10px] text-rose-600">
                      {selectedReconcil.variancePct}% variance
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold block">
                      Financial Impact
                    </span>
                    <strong className="text-foreground text-sm font-black block mt-0.5">
                      SAR {selectedReconcil.varianceSAR.toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-muted-foreground">
                      @ SAR {selectedReconcil.unitCostSAR.toFixed(2)}/{selectedReconcil.unit}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1.5 text-xs">
                  <span className="text-muted-foreground font-bold">Investigation Reason:</span>
                  <p className="text-[11px] text-foreground font-medium">
                    {selectedReconcil.reasonCode} observed during cold chain thaw cycle. Within normal allowable shrinkage &lt;2.0%.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0c2340] text-white text-xs space-y-1">
                  <div className="flex items-center justify-between text-[#fe932c] font-bold">
                    <span>SAP Ledger Status</span>
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-[11px] text-slate-200">
                    Document: <strong>{selectedReconcil.sapAdjustmentDoc}</strong>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Posted under MM Movement 701 (Physical Inventory Discrepancy)
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handlePostSapAdjustment(selectedReconcil.itemCode)}
                className="w-full bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold gap-1.5 text-xs h-9"
              >
                <Database className="h-3.5 w-3.5 text-[#fe932c]" /> Post Adjustment to SAP (MI07)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
