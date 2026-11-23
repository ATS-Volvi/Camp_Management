import { useState } from "react";
import {
  Building2,
  Download,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  FileCheck2,
  PieChart,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CURRENT_ARAMCO_BILLING_PACK,
  SAMPLE_PROJECT_PROFITABILITY,
  ProjectProfitabilityRecord,
} from "@/data/enterpriseCateringSuiteData";

export function ReportingBilling2D() {
  const [activeTab, setActiveTab] = useState<"billing_pack" | "project_profitability" | "sap_reconciliation">("billing_pack");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportBilling = () => {
    setExportNotice(
      "Aramco Master Billing Dossier (SAP VF01 Verified, PDF & CSV) successfully generated and dispatched to Aramco Contractor Affairs Portal."
    );
    setTimeout(() => setExportNotice(null), 4500);
  };

  const totalBilledPortfolioSAR = SAMPLE_PROJECT_PROFITABILITY.reduce((acc, p) => acc + p.billedRevenueSAR, 0);
  const totalFoodDmcSAR = SAMPLE_PROJECT_PROFITABILITY.reduce((acc, p) => acc + p.foodDmcCostSAR, 0);
  const totalGrossProfitSAR = SAMPLE_PROJECT_PROFITABILITY.reduce((acc, p) => acc + p.grossProfitSAR, 0);
  const avgGrossMarginPct = ((totalGrossProfitSAR / totalBilledPortfolioSAR) * 100).toFixed(1);

  return (
    <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0c2340] text-[#fe932c]">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-foreground">
                Pillar 6: Reporting, Billing & SAP Financial Reconciliation
              </h2>
              <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                SAP Reconciled (0.00 Variance)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automated management dashboards, project-wise profitability, client billing binder, and SAP VF01/MIGO reconciliation.
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60">
          <Button
            size="sm"
            variant={activeTab === "billing_pack" ? "default" : "ghost"}
            onClick={() => setActiveTab("billing_pack")}
            className={`h-8 text-xs font-bold ${
              activeTab === "billing_pack" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
            }`}
          >
            <Receipt className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
            Aramco Client Billing Pack
          </Button>

          <Button
            size="sm"
            variant={activeTab === "project_profitability" ? "default" : "ghost"}
            onClick={() => setActiveTab("project_profitability")}
            className={`h-8 text-xs font-bold ${
              activeTab === "project_profitability" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
            Project-Wise Profitability
          </Button>

          <Button
            size="sm"
            variant={activeTab === "sap_reconciliation" ? "default" : "ghost"}
            onClick={() => setActiveTab("sap_reconciliation")}
            className={`h-8 text-xs font-bold ${
              activeTab === "sap_reconciliation" ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90" : "text-muted-foreground"
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5 mr-1 text-[#fe932c]" />
            SAP Financial Ledger
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* SUB-TAB 1: ARAMCO MASTER BILLING PACK */}
      {activeTab === "billing_pack" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/20 rounded-xl border border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Active Contract:</span>
              <strong className="text-foreground font-mono text-sm">{CURRENT_ARAMCO_BILLING_PACK.contractNumber}</strong>
              <span className="text-muted-foreground block mt-0.5">{CURRENT_ARAMCO_BILLING_PACK.clientName}</span>
            </div>

            <div className="text-right">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Billing Cycle:</span>
              <strong className="text-foreground font-mono text-sm">{CURRENT_ARAMCO_BILLING_PACK.billingMonth}</strong>
              <Badge className="bg-emerald-500 text-slate-950 font-bold text-[9px] mt-0.5">
                SAP Verified (Doc: {CURRENT_ARAMCO_BILLING_PACK.sapPostingDocument})
              </Badge>
            </div>
          </div>

          {/* 4-Layer Billing Breakdown Table */}
          <div className="rounded-xl border border-border/60 overflow-hidden text-xs">
            <div className="bg-[#0c2340] text-white p-3 font-bold flex items-center justify-between">
              <span>Audit Layer & Commercial Description</span>
              <span>Units × Contract Rate = Subtotal (SAR)</span>
            </div>

            <div className="divide-y divide-border/60 bg-card">
              <div className="p-3 flex items-center justify-between hover:bg-muted/20">
                <div>
                  <strong className="block text-foreground font-semibold">1. Inmate Bed-Nights</strong>
                  <span className="text-[10px] text-muted-foreground">Contractual accommodation bed-night occupancy</span>
                </div>
                <span className="font-mono font-bold text-foreground">
                  34,500 × SAR 45.00 = <strong className="text-primary font-black">SAR 1,552,500.00</strong>
                </span>
              </div>

              <div className="p-3 flex items-center justify-between hover:bg-muted/20">
                <div>
                  <strong className="block text-foreground font-semibold">2. Scanned Dining Meals</strong>
                  <span className="text-[10px] text-muted-foreground">Turnstile verified breakfast, lunch, dinner</span>
                </div>
                <span className="font-mono font-bold text-foreground">
                  72,400 × SAR 12.00 = <strong className="text-primary font-black">SAR 868,800.00</strong>
                </span>
              </div>

              <div className="p-3 flex items-center justify-between hover:bg-muted/20">
                <div>
                  <strong className="block text-foreground font-semibold">3. Approved Field Lunches</strong>
                  <span className="text-[10px] text-muted-foreground">Heavy remote site packed meals (rigs & pipeline)</span>
                </div>
                <span className="font-mono font-bold text-foreground">
                  18,200 × SAR 14.50 = <strong className="text-primary font-black">SAR 263,900.00</strong>
                </span>
              </div>

              <div className="p-3 flex items-center justify-between bg-rose-500/5 hover:bg-rose-500/10">
                <div>
                  <strong className="block text-rose-600 dark:text-rose-400 font-semibold">4. Deducted Cancellations</strong>
                  <span className="text-[10px] text-muted-foreground">Advance shift cancellations credited back to client</span>
                </div>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  2,150 × -SAR 10.00 = <strong>-SAR 21,500.00</strong>
                </span>
              </div>
            </div>

            {/* Net Billing Total */}
            <div className="p-3 bg-muted/40 flex items-center justify-between border-t border-border/80">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Net Approved Client Invoice
                </span>
                <strong className="text-foreground font-black text-lg font-mono">
                  SAR {CURRENT_ARAMCO_BILLING_PACK.netInvoicedSAR.toLocaleString()}.00
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block font-bold">Variance vs SAP GL</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm">
                  0.00 SAR (Exact Match)
                </strong>
              </div>
            </div>
          </div>

          {/* Audit Sign-Off Stamp */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground block font-bold uppercase">Dual Audit Sign-Off:</span>
              <div className="text-foreground font-semibold">
                Camp Director: {CURRENT_ARAMCO_BILLING_PACK.auditSignOff.campManager}
              </div>
              <div className="text-muted-foreground text-[11px]">
                Aramco Representative: {CURRENT_ARAMCO_BILLING_PACK.auditSignOff.clientRepresentative} • {CURRENT_ARAMCO_BILLING_PACK.auditSignOff.timestamp}
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleExportBilling}
              className="h-8 bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5 text-[#fe932c]" />
              Export Aramco Billing Dossier (PDF & CSV)
            </Button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PROJECT-WISE PROFITABILITY */}
      {activeTab === "project_profitability" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Executive Overview KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Total Portfolio Revenue</span>
              <strong className="text-lg font-black text-foreground font-mono block mt-1">
                SAR {(totalBilledPortfolioSAR / 1000).toFixed(0)}k
              </strong>
              <span className="text-[10px] text-muted-foreground">5 active contract projects</span>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Total Food DMC Cost</span>
              <strong className="text-lg font-black text-foreground font-mono block mt-1">
                SAR {(totalFoodDmcSAR / 1000).toFixed(0)}k
              </strong>
              <span className="text-[10px] text-muted-foreground">Direct kitchen food consumption</span>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Gross Operational Profit</span>
              <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
                SAR {(totalGrossProfitSAR / 1000).toFixed(0)}k
              </strong>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">After DMC, Labor & Power</span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block">Portfolio Gross Margin</span>
              <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
                {avgGrossMarginPct}%
              </strong>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">+2.4% above corporate target</span>
            </div>
          </div>

          {/* Table: Project-wise Profitability */}
          <div className="rounded-xl border border-border/60 overflow-hidden text-xs">
            <div className="bg-[#0c2340] text-white p-3 font-bold grid grid-cols-12 gap-2 items-center">
              <span className="col-span-3">Project & Client</span>
              <span className="col-span-2 text-right">Billed Revenue</span>
              <span className="col-span-2 text-right">Food DMC</span>
              <span className="col-span-1 text-right">Labor</span>
              <span className="col-span-2 text-right font-black">Gross Profit</span>
              <span className="col-span-2 text-center">Margin % & Status</span>
            </div>

            <div className="divide-y divide-border/60 bg-card">
              {SAMPLE_PROJECT_PROFITABILITY.map((project) => (
                <div key={project.projectCode} className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/30">
                  <div className="col-span-3">
                    <strong className="font-bold text-foreground block">{project.projectName}</strong>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="font-mono text-[9px] px-1 py-0">
                        {project.projectCode}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate">{project.client}</span>
                    </div>
                  </div>

                  <div className="col-span-2 text-right font-mono font-bold text-foreground">
                    SAR {project.billedRevenueSAR.toLocaleString()}
                  </div>

                  <div className="col-span-2 text-right font-mono font-medium text-foreground">
                    SAR {project.foodDmcCostSAR.toLocaleString()}
                  </div>

                  <div className="col-span-1 text-right font-mono font-medium text-muted-foreground">
                    SAR {(project.kitchenLaborSAR / 1000).toFixed(0)}k
                  </div>

                  <div className="col-span-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    SAR {project.grossProfitSAR.toLocaleString()}
                  </div>

                  <div className="col-span-2 text-center">
                    <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px]">
                      {project.grossMarginPct}% ({project.marginVarianceTargetPct >= 0 ? `+${project.marginVarianceTargetPct}%` : `${project.marginVarianceTargetPct}%`})
                    </Badge>
                    <span className="text-[9px] text-muted-foreground block mt-0.5">
                      {project.sapReconciliationStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SAP FINANCIAL LEDGER */}
      {activeTab === "sap_reconciliation" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border/60 overflow-hidden text-xs">
            <div className="bg-[#0c2340] text-white p-3 font-bold grid grid-cols-12 gap-2 items-center">
              <span className="col-span-2">SAP Doc Ref</span>
              <span className="col-span-2">Transaction Type</span>
              <span className="col-span-4">Cost Center / Target Description</span>
              <span className="col-span-2 text-right">Amount (SAR)</span>
              <span className="col-span-2 text-center">Audit Status</span>
            </div>

            <div className="divide-y divide-border/60 bg-card">
              <div className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20">
                <div className="col-span-2 font-mono font-bold text-primary">VF01-2026-9004821</div>
                <div className="col-span-2">
                  <Badge variant="outline" className="font-semibold text-[10px]">SD Client Invoice</Badge>
                </div>
                <div className="col-span-4 text-foreground">Saudi Aramco Master Catering Invoice (Nov 2026)</div>
                <div className="col-span-2 text-right font-mono font-bold text-emerald-600">SAR 2,663,700.00</div>
                <div className="col-span-2 text-center">
                  <Badge className="bg-emerald-500 text-slate-950 font-bold text-[9px]">POSTED & CLEARED</Badge>
                </div>
              </div>

              <div className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20">
                <div className="col-span-2 font-mono font-bold text-primary">MIGO-201-2026-0819</div>
                <div className="col-span-2">
                  <Badge variant="outline" className="font-semibold text-[10px]">MM Stock Issuance</Badge>
                </div>
                <div className="col-span-4 text-foreground">Kitchen Raw Goods Issue (Cost Center CC-404-KIT)</div>
                <div className="col-span-2 text-right font-mono font-bold text-foreground">SAR 8,420.00</div>
                <div className="col-span-2 text-center">
                  <Badge className="bg-emerald-500 text-slate-950 font-bold text-[9px]">POSTED</Badge>
                </div>
              </div>

              <div className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20">
                <div className="col-span-2 font-mono font-bold text-primary">MIGO-301-2026-4402</div>
                <div className="col-span-2">
                  <Badge variant="outline" className="font-semibold text-[10px]">Inter-Plant Transfer</Badge>
                </div>
                <div className="col-span-4 text-foreground">Camp-04 Rig Central Hub to Camp-01 Tanajib (Corn Oil)</div>
                <div className="col-span-2 text-right font-mono font-bold text-foreground">SAR 480.00</div>
                <div className="col-span-2 text-center">
                  <Badge className="bg-emerald-500 text-slate-950 font-bold text-[9px]">TRANSFERRED</Badge>
                </div>
              </div>

              <div className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20">
                <div className="col-span-2 font-mono font-bold text-primary">MI07-DOC-2026-7719</div>
                <div className="col-span-2">
                  <Badge variant="outline" className="font-semibold text-[10px]">Physical Count Adj.</Badge>
                </div>
                <div className="col-span-4 text-foreground">Chiller 1 Inventory Reconciliation Variance (Thawing Loss)</div>
                <div className="col-span-2 text-right font-mono font-bold text-rose-600">-SAR 104.00</div>
                <div className="col-span-2 text-center">
                  <Badge className="bg-emerald-500 text-slate-950 font-bold text-[9px]">RECONCILED</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
