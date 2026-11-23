import { useState } from "react";
import {
  Recycle,
  Sparkles,
  Thermometer,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ShieldCheck,
  ClipboardList,
  UtensilsCrossed,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  INVENTORY_BATCH_LOTS,
  InventoryBatchLot,
  SAMPLE_DAILY_WASTAGE_LOGS,
  DailyWastageMonitoringRecord,
} from "@/data/enterpriseCateringSuiteData";

export function WasteQualityControl2D() {
  const [activeTab, setActiveTab] = useState<"daily_wastage" | "batch_traceability" | "recipe_rescue">("daily_wastage");
  const [lots, setLots] = useState<InventoryBatchLot[]>(INVENTORY_BATCH_LOTS);
  const [rescuedBatchId, setRescuedBatchId] = useState<string | null>(null);
  const [rescueSuccessMsg, setRescueSuccessMsg] = useState<string | null>(null);
  const [wastageLogs, setWastageLogs] = useState<DailyWastageMonitoringRecord[]>(SAMPLE_DAILY_WASTAGE_LOGS);

  const handleRescueBatch = (lotId: string, recipeName: string, savingsSAR: number) => {
    setLots((prev) =>
      prev.map((lot) =>
        lot.lotId === lotId
          ? {
              ...lot,
              status: "fresh" as const,
              hoursUntilExpiry: 72,
              suggestedRescueRecipe: undefined,
            }
          : lot
      )
    );
    setRescuedBatchId(lotId);
    setRescueSuccessMsg(
      `Batch ${lotId} successfully assigned to tomorrow's production: "${recipeName}". Saved SAR ${savingsSAR.toFixed(2)} in food write-offs!`
    );
    setTimeout(() => {
      setRescueSuccessMsg(null);
      setRescuedBatchId(null);
    }, 4500);
  };

  const totalWasteTodayKg = wastageLogs
    .filter((w) => w.logDate === "2026-11-23")
    .reduce((acc, w) => acc + w.totalWasteKg, 0);

  const totalLossSAR = wastageLogs
    .filter((w) => w.logDate === "2026-11-23")
    .reduce((acc, w) => acc + w.financialLossSAR, 0);

  const totalServedPax = wastageLogs
    .filter((w) => w.logDate === "2026-11-23")
    .reduce((acc, w) => acc + w.totalServedPax, 0);

  const avgGramsPerPax = totalServedPax > 0 ? ((totalWasteTodayKg * 1000) / totalServedPax).toFixed(1) : "0";

  return (
    <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0c2340] text-[#fe932c]">
            <Recycle className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-foreground">
                Pillar 5: Waste & Quality Control (HACCP & Accountability)
              </h2>
              <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                Aramco ESG Standard
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Food wastage monitoring, 3-bucket audit, batch lot traceability, expiry tracking, and zero-waste recipe rescue.
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60">
          <Button
            size="sm"
            variant={activeTab === "daily_wastage" ? "default" : "ghost"}
            onClick={() => setActiveTab("daily_wastage")}
            className={`h-8 text-xs font-bold ${
              activeTab === "daily_wastage" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
            }`}
          >
            <Scale className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
            Food Wastage Monitoring
          </Button>

          <Button
            size="sm"
            variant={activeTab === "batch_traceability" ? "default" : "ghost"}
            onClick={() => setActiveTab("batch_traceability")}
            className={`h-8 text-xs font-bold ${
              activeTab === "batch_traceability" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
            Batch Traceability & Expiry
          </Button>

          <Button
            size="sm"
            variant={activeTab === "recipe_rescue" ? "default" : "ghost"}
            onClick={() => setActiveTab("recipe_rescue")}
            className={`h-8 text-xs font-bold ${
              activeTab === "recipe_rescue" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
            }`}
          >
            <Zap className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
            Recipe Rescue Engine
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {rescueSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{rescueSuccessMsg}</span>
        </div>
      )}

      {/* SUB-TAB 1: DAILY 3-BUCKET FOOD WASTAGE MONITORING */}
      {activeTab === "daily_wastage" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* 3-Bucket Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Bucket 1: Prep Waste</span>
                <Trash2 className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <strong className="text-lg font-black text-foreground font-mono block mt-1">19.7 kg</strong>
              <span className="text-[10px] text-muted-foreground">Kitchen trimmings & peelings</span>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Bucket 2: Overproduction</span>
                <UtensilsCrossed className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <strong className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono block mt-1">12.0 kg</strong>
              <span className="text-[10px] text-muted-foreground">Unserved hot counter food</span>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Bucket 3: Plate Scraps</span>
                <Scale className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <strong className="text-lg font-black text-foreground font-mono block mt-1">16.5 kg</strong>
              <span className="text-[10px] text-muted-foreground">Post-dining diner leftovers</span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase">Waste Rate / Pax</span>
                <Badge className="bg-emerald-500 text-slate-950 text-[9px] font-bold">Within Target</Badge>
              </div>
              <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
                {avgGramsPerPax} g / pax
              </strong>
              <span className="text-[10px] text-muted-foreground">Target: &lt; 28.0 g (Aramco ESG)</span>
            </div>
          </div>

          {/* Table: Daily Food Wastage Logs */}
          <div className="rounded-xl border border-border/60 overflow-hidden text-xs">
            <div className="bg-[#0c2340] text-white p-3 font-bold grid grid-cols-12 gap-2 items-center">
              <span className="col-span-2">Log ID & Date</span>
              <span className="col-span-1">Session</span>
              <span className="col-span-1 text-right">Prep (kg)</span>
              <span className="col-span-1 text-right">Overprod (kg)</span>
              <span className="col-span-1 text-right">Scraps (kg)</span>
              <span className="col-span-1 text-right font-black">Total (kg)</span>
              <span className="col-span-1 text-right">Loss (SAR)</span>
              <span className="col-span-2 text-center">Disposal Method</span>
              <span className="col-span-2 text-right">Station & Chef Auditor</span>
            </div>

            <div className="divide-y divide-border/60 bg-card">
              {wastageLogs.map((log) => (
                <div key={log.logId} className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/30">
                  <div className="col-span-2">
                    <strong className="font-mono text-primary font-bold block">{log.logId}</strong>
                    <span className="text-[10px] text-muted-foreground">{log.logDate}</span>
                  </div>

                  <div className="col-span-1">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {log.mealSession}
                    </Badge>
                  </div>

                  <div className="col-span-1 text-right font-mono font-medium text-foreground">
                    {log.prepWasteKg.toFixed(1)}
                  </div>

                  <div className="col-span-1 text-right font-mono font-medium text-foreground">
                    {log.buffetOverproductionKg.toFixed(1)}
                  </div>

                  <div className="col-span-1 text-right font-mono font-medium text-foreground">
                    {log.plateScrapKg.toFixed(1)}
                  </div>

                  <div className="col-span-1 text-right font-mono font-black text-foreground">
                    {log.totalWasteKg.toFixed(1)} kg
                  </div>

                  <div className="col-span-1 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                    SAR {log.financialLossSAR}
                  </div>

                  <div className="col-span-2 text-center">
                    <span className="text-[10px] font-semibold text-muted-foreground block truncate">
                      {log.haccpDisposalMethod}
                    </span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {log.wasteGramsPerPax} g/pax (Target: {log.targetGramsPerPax}g)
                    </span>
                  </div>

                  <div className="col-span-2 text-right">
                    <strong className="text-foreground block truncate">{log.responsibleStation}</strong>
                    <span className="text-[10px] text-muted-foreground truncate block">
                      Auditor: {log.chefAuditor}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-muted/40 border-t border-border/80 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                All food scraps weighed post-service and recorded under Aramco Environmental Standard SAEP-327.
              </span>
              <Badge className="bg-emerald-500 text-slate-950 font-bold">
                ESG Audit Compliant
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BATCH TRACEABILITY & EXPIRY TRACKING */}
      {activeTab === "batch_traceability" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border/60 overflow-hidden text-xs">
            <div className="bg-[#0c2340] text-white p-3 font-bold grid grid-cols-12 gap-2 items-center">
              <span className="col-span-2">Lot Number</span>
              <span className="col-span-3">Ingredient & Supplier</span>
              <span className="col-span-2">Storage Zone & Temp</span>
              <span className="col-span-2 text-right">Remaining Stock</span>
              <span className="col-span-2 text-center">Shelf-Life Status</span>
              <span className="col-span-1 text-right">Action</span>
            </div>

            <div className="divide-y divide-border/60 bg-card">
              {lots.map((lot) => {
                const isCritical = lot.status === "critical_rescue";
                const isWarning = lot.status === "warning";

                return (
                  <div
                    key={lot.lotId}
                    className={`p-3 grid grid-cols-12 gap-2 items-center transition-colors ${
                      isCritical ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="col-span-2">
                      <strong className="font-mono text-foreground font-bold block">{lot.lotId}</strong>
                      <span className="text-[10px] text-muted-foreground">{lot.invoiceRef}</span>
                    </div>

                    <div className="col-span-3">
                      <strong className="text-foreground block font-bold">{lot.ingredientName}</strong>
                      <span className="text-[10px] text-muted-foreground">{lot.supplierName} • {lot.category}</span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-foreground block font-medium">{lot.storageZone}</span>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold flex items-center gap-1">
                        <Thermometer className="h-3 w-3" />
                        {lot.haccpChillerTempC}°C (HACCP Safe)
                      </span>
                    </div>

                    <div className="col-span-2 text-right font-mono">
                      <strong className="text-foreground font-bold">
                        {lot.remainingQty} {lot.unit}
                      </strong>
                      <span className="text-[10px] text-muted-foreground block">
                        of {lot.initialQty} {lot.unit}
                      </span>
                    </div>

                    <div className="col-span-2 text-center">
                      <Badge
                        className={`text-[9px] font-bold uppercase ${
                          isCritical
                            ? "bg-rose-500 text-white animate-pulse"
                            : isWarning
                            ? "bg-amber-500 text-slate-950"
                            : "bg-emerald-500 text-slate-950"
                        }`}
                      >
                        {lot.hoursUntilExpiry < 48 ? `${lot.hoursUntilExpiry}h to Expiry` : "Fresh Stock"}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        Exp: {lot.expiryDate}
                      </span>
                    </div>

                    <div className="col-span-1 text-right">
                      {lot.suggestedRescueRecipe ? (
                        <Button
                          size="sm"
                          onClick={() => handleRescueBatch(lot.lotId, lot.suggestedRescueRecipe!, 450)}
                          className="h-6 px-2 text-[10px] bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold"
                        >
                          Rescue
                        </Button>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold">OK</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ZERO-WASTE RECIPE RESCUE */}
      {activeTab === "recipe_rescue" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-300">
              <Zap className="h-4 w-4 text-[#fe932c]" />
              Automated Recipe Rescue Engine (Zero-Food-Loss Protocol)
            </div>
            <p className="mt-1 text-muted-foreground">
              Identifies inventory batches approaching their 48-hour shelf-life limit and automatically matches them with tomorrow&apos;s planned production recipes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lots
              .filter((l) => l.suggestedRescueRecipe)
              .map((lot) => (
                <div key={lot.lotId} className="p-4 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="font-mono text-primary font-bold">{lot.lotId}</strong>
                      <h3 className="text-sm font-bold text-foreground mt-0.5">{lot.ingredientName}</h3>
                    </div>
                    <Badge className="bg-rose-500 text-white font-bold text-[10px]">
                      {lot.hoursUntilExpiry} Hours Left
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs space-y-1">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                      Matched Rescue Recipe:
                    </span>
                    <strong className="text-foreground text-sm font-bold block">
                      {lot.suggestedRescueRecipe}
                    </strong>
                    <span className="text-muted-foreground block text-[11px]">
                      Utilizes {lot.remainingQty} {lot.unit} currently in {lot.storageZone}.
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Estimated Loss Avoidance:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm">
                        SAR 450.00 Saved
                      </strong>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleRescueBatch(lot.lotId, lot.suggestedRescueRecipe!, 450)}
                      className="bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold text-xs gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#fe932c]" />
                      Authorize Recipe Rescue
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
