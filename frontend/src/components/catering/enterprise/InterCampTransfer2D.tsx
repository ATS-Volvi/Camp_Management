import React, { useState } from "react";
import {
  CAMP_CLUSTER_NODES,
  SAMPLE_TRANSFERS,
  CampClusterNode,
  InterCampTransferManifest,
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
} from "lucide-react";

interface InterCampTransfer2DProps {
  className?: string;
}

export default function InterCampTransfer2D({ className }: InterCampTransfer2DProps) {
  const [transfers, setTransfers] = useState<InterCampTransferManifest[]>(SAMPLE_TRANSFERS);
  const [selectedTransfer, setSelectedTransfer] = useState<InterCampTransferManifest>(transfers[0]);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "in_transit" | "proposed" | "delivered">("all");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showNewTransferModal, setShowNewTransferModal] = useState<boolean>(false);

  // New transfer form state
  const [newSourceCampId, setNewSourceCampId] = useState<string>("camp-04");
  const [newDestCampId, setNewDestCampId] = useState<string>("camp-01");
  const [newItemName, setNewItemName] = useState<string>("Basmati Sella Rice");
  const [newQty, setNewQty] = useState<number>(50);
  const [newUnit, setNewUnit] = useState<string>("kg");

  // Filtered transfers
  const filteredTransfers = transfers.filter((t) => {
    if (selectedFilter === "all") return true;
    return t.status === selectedFilter;
  });

  // Total Regional Savings
  const totalSavings = transfers.reduce((acc, t) => acc + t.savingsVsSupplierSAR, 0);

  // Handlers
  const handleDispatch = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "in_transit" as const } : t))
    );
    if (selectedTransfer.id === id) {
      setSelectedTransfer((prev) => ({ ...prev, status: "in_transit" }));
    }
    setActionNotice(`Waybill #${selectedTransfer.transferNumber} marked IN TRANSIT. Driver gate pass generated.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleDeliver = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "delivered" as const } : t))
    );
    if (selectedTransfer.id === id) {
      setSelectedTransfer((prev) => ({ ...prev, status: "delivered" }));
    }
    setActionNotice(`Transfer #${selectedTransfer.transferNumber} DELIVERED. Inventory reconciled via SAP MIGO 301.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const source = CAMP_CLUSTER_NODES.find((c) => c.id === newSourceCampId) || CAMP_CLUSTER_NODES[3];
    const dest = CAMP_CLUSTER_NODES.find((c) => c.id === newDestCampId) || CAMP_CLUSTER_NODES[0];

    const newManifest: InterCampTransferManifest = {
      id: `tr-00${transfers.length + 1}`,
      transferNumber: `TR-2026-ARAMCO-00${44 + transfers.length}`,
      sourceCamp: source,
      destCamp: dest,
      item: newItemName,
      qty: newQty,
      unit: newUnit,
      valueSAR: newQty * 12,
      distanceKm: 26.5,
      estimatedDriveMins: 32,
      driverName: "Fahad Al-Dossary",
      plateNumber: "KSA-5519-RBL",
      status: "proposed",
      savingsVsSupplierSAR: 1250,
    };

    setTransfers([newManifest, ...transfers]);
    setSelectedTransfer(newManifest);
    setShowNewTransferModal(false);
    setActionNotice(`New Inter-Camp Transfer ${newManifest.transferNumber} created successfully!`);
    setTimeout(() => setActionNotice(null), 4000);
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
                <Truck className="h-5 w-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Inter-Site Transfers & Inventory Redistribution
              </h2>
              <Badge className="bg-[#fe932c] text-slate-950 font-black text-[10px] tracking-wider uppercase">
                SAP MIGO 301 / 311
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Track and dispatch emergency stock movements between regional camp stores. Resolves kitchen shortages in under 45 minutes without paying emergency supplier courier surcharges.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setShowNewTransferModal(true)}
            className="bg-[#fe932c] hover:bg-[#fe932c]/90 text-slate-950 font-bold gap-1 text-xs shrink-0"
          >
            <Plus className="h-4 w-4" /> Propose New Transfer
          </Button>
        </div>

        {/* Global Executive KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/10 text-xs font-mono">
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Total Regional Savings</span>
            <strong className="text-emerald-400 font-black text-sm">
              +SAR {totalSavings.toLocaleString()} Saved
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Connected Camps</span>
            <strong className="text-white font-black text-sm">
              5 Regional Sites
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Active Manifests</span>
            <strong className="text-[#fe932c] font-black text-sm">
              {transfers.filter((t) => t.status !== "delivered").length} Pending / In Transit
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Average Transit Time</span>
            <strong className="text-slate-200 font-black text-sm">
              32 Minutes (vs 4 Days Supplier)
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
      {/* 2. REGIONAL CAMP STOCK COVER MONITOR (CLEAN 2D TABLE / CARDS)      */}
      {/* ================================================================== */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-black text-foreground">
              Regional Camp Network: Days of Supply Cover
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Red (&lt;3 Days) = Deficit • Amber (3-7 Days) • Green (&gt;7 Days) = Surplus
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {CAMP_CLUSTER_NODES.map((camp) => {
            const isOilDeficit = camp.oilDaysCover < 3;
            const isChickenDeficit = camp.chickenDaysCover < 3;
            return (
              <div
                key={camp.id}
                className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                  isOilDeficit || isChickenDeficit
                    ? "bg-rose-500/5 border-rose-500/40"
                    : "bg-muted/20 border-border/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="font-bold text-foreground text-xs">{camp.code}</strong>
                  <Badge
                    variant={isOilDeficit ? "destructive" : "secondary"}
                    className="text-[9px] font-bold"
                  >
                    {isOilDeficit ? "DEFICIT" : "BALANCED"}
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground truncate font-medium">
                  {camp.name}
                </p>

                <div className="space-y-1.5 pt-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[10px]">Cooking Oil:</span>
                    <strong
                      className={
                        camp.oilDaysCover < 3
                          ? "text-rose-600 dark:text-rose-400 font-bold"
                          : camp.oilDaysCover > 10
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-foreground"
                      }
                    >
                      {camp.oilDaysCover} Days
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[10px]">Poultry:</span>
                    <strong
                      className={
                        camp.chickenDaysCover < 3
                          ? "text-rose-600 dark:text-rose-400 font-bold"
                          : camp.chickenDaysCover > 8
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-foreground"
                      }
                    >
                      {camp.chickenDaysCover} Days
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[10px]">Rice:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {camp.riceDaysCover} Days
                    </strong>
                  </div>
                </div>

                <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>Occupancy:</span>
                  <span className="font-semibold text-foreground">{camp.occupancy} Pax</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================== */}
      {/* 3. ACTIVE TRANSFERS & WAYBILL INSPECTION (2-COLUMN 2D LAYOUT)       */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: TRANSFER WAYBILLS LIST (7 of 12 cols) */}
        <div className="lg:col-span-7 bg-card rounded-2xl border border-border/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl text-xs font-semibold">
                {(
                  [
                    { id: "all", label: "All Transfers" },
                    { id: "proposed", label: "Ready to Dispatch" },
                    { id: "in_transit", label: "In Transit" },
                    { id: "delivered", label: "Delivered & Reconciled" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedFilter === f.id
                        ? "bg-[#0c2340] text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <span className="text-[11px] text-muted-foreground font-mono">
                {filteredTransfers.length} Manifest(s)
              </span>
            </div>

            {/* Transfers List */}
            <div className="mt-4 space-y-3">
              {filteredTransfers.map((t) => {
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
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-xs font-bold">{t.transferNumber}</strong>
                        <Badge
                          className={`text-[9px] font-bold uppercase ${
                            t.status === "in_transit"
                              ? "bg-amber-500 text-slate-950"
                              : t.status === "delivered"
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-[#fe932c] text-slate-950"
                          }`}
                        >
                          {t.status === "in_transit"
                            ? "In Transit"
                            : t.status === "delivered"
                            ? "Delivered & Reconciled"
                            : "Proposed Transfer"}
                        </Badge>
                      </div>

                      <span
                        className={`font-mono font-bold text-xs ${
                          isSelected ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        +{t.savingsVsSupplierSAR} SAR Saved
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{t.sourceCamp.name}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-[#fe932c]" />
                        <span className="font-bold">{t.destCamp.name}</span>
                      </div>
                      <span className={`text-[11px] ${isSelected ? "text-slate-300" : "text-muted-foreground"}`}>
                        {t.distanceKm} km • ~{t.estimatedDriveMins} mins
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                        isSelected
                          ? "bg-white/10 border-white/10"
                          : "bg-card border-border/50 text-foreground"
                      }`}
                    >
                      <div>
                        <span className={`block text-[10px] ${isSelected ? "text-slate-400" : "text-muted-foreground"}`}>
                          Relocation Item
                        </span>
                        <strong className="font-bold">
                          {t.qty} {t.unit} × {t.item}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className={`block text-[10px] ${isSelected ? "text-slate-400" : "text-muted-foreground"}`}>
                          Driver / Plate
                        </span>
                        <span className="font-medium text-[11px]">
                          {t.driverName} ({t.plateNumber})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: WAYBILL DETAIL & ACTIONS PANEL (5 of 12 cols) */}
        <div className="lg:col-span-5 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header: Transfer Title & Status */}
            <div className="border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Automated Transfer Manifest
                </span>
                <Badge
                  className={`text-[9px] font-bold uppercase ${
                    selectedTransfer.status === "in_transit"
                      ? "bg-amber-500 text-slate-950"
                      : selectedTransfer.status === "delivered"
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-[#fe932c] text-slate-950"
                  }`}
                >
                  {selectedTransfer.status.replace("_", " ")}
                </Badge>
              </div>

              <h3 className="text-lg font-black text-foreground tracking-tight mt-1 font-mono">
                {selectedTransfer.transferNumber}
              </h3>
            </div>

            {/* Route Summary Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase block">
                  From (Surplus)
                </span>
                <strong className="text-xs text-foreground font-black block mt-1">
                  {selectedTransfer.sourceCamp.name}
                </strong>
                <span className="text-[10px] text-emerald-600 font-mono mt-0.5 block">
                  {selectedTransfer.sourceCamp.oilDaysCover} Days Stock Cover
                </span>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-[10px] text-rose-800 dark:text-rose-300 font-bold uppercase block">
                  To (Deficit)
                </span>
                <strong className="text-xs text-foreground font-black block mt-1">
                  {selectedTransfer.destCamp.name}
                </strong>
                <span className="text-[10px] text-rose-600 font-mono mt-0.5 block">
                  {selectedTransfer.destCamp.oilDaysCover} Days Cover (Critical)
                </span>
              </div>
            </div>

            {/* Distance & Driving ETA */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold block">Distance</span>
                <strong className="text-foreground">{selectedTransfer.distanceKm} km</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold block">Transit Time</span>
                <strong className="text-foreground">~{selectedTransfer.estimatedDriveMins} mins</strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-sans font-bold block">Regional Savings</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                  +{selectedTransfer.savingsVsSupplierSAR} SAR
                </strong>
              </div>
            </div>

            {/* Item Details */}
            <div className="p-3.5 rounded-xl border border-border/60 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Item to Relocate
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-foreground text-sm font-black block">
                    {selectedTransfer.item}
                  </strong>
                  <span className="text-muted-foreground text-[11px]">
                    Quantity: {selectedTransfer.qty} {selectedTransfer.unit}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-muted-foreground block text-[10px]">Standard Value</span>
                  <strong className="text-foreground">SAR {selectedTransfer.valueSAR}</strong>
                </div>
              </div>
            </div>

            {/* Logistics & Driver Details */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assigned Driver:</span>
                <strong className="text-foreground font-semibold">{selectedTransfer.driverName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Vehicle Plate:</span>
                <code className="text-foreground font-bold font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                  {selectedTransfer.plateNumber}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">SAP Posting Ref:</span>
                <code className="text-primary font-bold font-mono text-[11px]">
                  MIGO-301-2026-TR
                </code>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
            {selectedTransfer.status === "proposed" && (
              <Button
                onClick={() => handleDispatch(selectedTransfer.id)}
                className="w-full bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold gap-2 text-xs h-9"
              >
                <Send className="h-3.5 w-3.5 text-[#fe932c]" />
                Dispatch Inter-Camp Waybill
              </Button>
            )}

            {selectedTransfer.status === "in_transit" && (
              <Button
                onClick={() => handleDeliver(selectedTransfer.id)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-9"
              >
                <PackageCheck className="h-4 w-4" />
                Confirm Stock Receipt & Reconcile (SAP MIGO)
              </Button>
            )}

            {selectedTransfer.status === "delivered" && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Delivery Completed & Inventory Reconciled</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 4. PROPOSE NEW TRANSFER MODAL DIALOG                               */}
      {/* ================================================================== */}
      {showNewTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#fe932c]" />
                <h3 className="text-base font-bold text-foreground">
                  Propose Inter-Camp Stock Transfer
                </h3>
              </div>
              <button
                onClick={() => setShowNewTransferModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Source Camp (Surplus)
                  </label>
                  <select
                    value={newSourceCampId}
                    onChange={(e) => setNewSourceCampId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-muted border border-border/70 text-foreground font-semibold"
                  >
                    {CAMP_CLUSTER_NODES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Destination Camp (Deficit)
                  </label>
                  <select
                    value={newDestCampId}
                    onChange={(e) => setNewDestCampId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-muted border border-border/70 text-foreground font-semibold"
                  >
                    {CAMP_CLUSTER_NODES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  Item to Relocate
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full p-2 rounded-lg bg-muted border border-border/70 text-foreground font-semibold"
                  placeholder="e.g. Corn Cooking Oil, Basmati Rice"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Transfer Quantity
                  </label>
                  <input
                    type="number"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-muted border border-border/70 text-foreground font-semibold"
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Unit
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full p-2 rounded-lg bg-muted border border-border/70 text-foreground font-semibold"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="L">L (Liters)</option>
                    <option value="bags">bags (50kg Bags)</option>
                    <option value="cartons">cartons</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c2340] text-white space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Estimated Benefit</span>
                <p className="text-[11px] text-slate-200">
                  Resolves shortage locally in ~35 mins and avoids SAR 1,250 emergency supplier courier fee.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewTransferModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold text-xs"
                >
                  Create & Propose Waybill
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
