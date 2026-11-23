import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import MenuProductionPlanning2D from "@/components/catering/enterprise/MenuProductionPlanning2D";
import InventoryProcurement2D from "@/components/catering/enterprise/InventoryProcurement2D";
import DmcCostDashboard2D from "@/components/catering/enterprise/DmcCostDashboard2D";
import { MealManagement2D } from "@/components/catering/enterprise/MealManagement2D";
import { WasteQualityControl2D } from "@/components/catering/enterprise/WasteQualityControl2D";
import { ReportingBilling2D } from "@/components/catering/enterprise/ReportingBilling2D";

import {
  Compass,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Utensils,
  PackageSearch,
  DollarSign,
  Users,
  Recycle,
  Building2,
  Layers,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PillarConfig {
  id: string;
  number: number;
  title: string;
  shortLabel: string;
  badge: string;
  description: string;
  icon: React.ElementType;
}

const PILLARS: PillarConfig[] = [
  {
    id: "pillar-1",
    number: 1,
    title: "Pillar 1: Menu & Production Planning",
    shortLabel: "1. Menu & Production",
    badge: "Recipes & Grams",
    description: "Standard recipes, strict gram portion control, meal forecasting, and planned vs actual production reconciliation.",
    icon: Utensils,
  },
  {
    id: "pillar-2",
    number: 2,
    title: "Pillar 2: Inventory & Procurement",
    shortLabel: "2. Inventory & SAP",
    badge: "SAP MM Integrated",
    description: "SAP MIGO 201/301, kitchen stock issuance, consumption velocity, inter-site logistics, and MI07 physical count reconciliation.",
    icon: PackageSearch,
  },
  {
    id: "pillar-3",
    number: 3,
    title: "Pillar 3: Food Cost & DMC Control",
    shortLabel: "3. Food Cost & DMC",
    badge: "CPH Budget Ceiling",
    description: "Project-wise daily food costs, dynamic cost per head (CPH) budget cap slider, session breakdown, and variance driver reporting.",
    icon: DollarSign,
  },
  {
    id: "pillar-4",
    number: 4,
    title: "Pillar 4: Meal Management & Entitlements",
    shortLabel: "4. Meal Entitlements",
    badge: "Duplicate Shield",
    description: "Actual headcount vs entitlements, client-wise consumption records, remote packed meals, and double-billing turnstile shield.",
    icon: Users,
  },
  {
    id: "pillar-5",
    number: 5,
    title: "Pillar 5: Waste & Quality Control",
    shortLabel: "5. Waste & Quality",
    badge: "HACCP & 3-Bucket",
    description: "Daily 3-bucket food wastage audit (prep, overproduction, plate scraps), batch lot traceability, and zero-waste recipe rescue.",
    icon: Recycle,
  },
  {
    id: "pillar-6",
    number: 6,
    title: "Pillar 6: Reporting & SAP Billing",
    shortLabel: "6. Billing & SAP",
    badge: "VF01 Reconciled",
    description: "Automated executive dashboards, project-wise gross profitability, Aramco 4-tier client billing binder, and SAP posting verification.",
    icon: Building2,
  },
];

export default function EnterpriseCateringHub() {
  const navigate = useNavigate();
  const [selectedFeature, setSelectedFeature] = useState<string>("all");

  const currentPillarIndex = PILLARS.findIndex((p) => p.id === selectedFeature);
  const currentPillar = currentPillarIndex >= 0 ? PILLARS[currentPillarIndex] : null;

  const handlePrevPillar = () => {
    if (selectedFeature === "all") {
      setSelectedFeature(PILLARS[PILLARS.length - 1].id);
    } else if (currentPillarIndex > 0) {
      setSelectedFeature(PILLARS[currentPillarIndex - 1].id);
    } else {
      setSelectedFeature("all");
    }
  };

  const handleNextPillar = () => {
    if (selectedFeature === "all") {
      setSelectedFeature(PILLARS[0].id);
    } else if (currentPillarIndex < PILLARS.length - 1) {
      setSelectedFeature(PILLARS[currentPillarIndex + 1].id);
    } else {
      setSelectedFeature("all");
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans max-w-7xl mx-auto">
      {/* ==================================================================== */}
      {/* TOP HEADER & NAVIGATION                                              */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
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

          <div className="flex items-center gap-3 mt-2 flex-wrap">
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
        <div className="flex items-center gap-2 flex-wrap">
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
      {/* FEATURE DROPDOWN SELECTOR & PAGINATION CONTROL BAR                  */}
      {/* ==================================================================== */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Dropdown Selector for Fast Feature Jumping */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground shrink-0">
              <Filter className="h-3.5 w-3.5 text-[#fe932c]" />
              <span>Select Feature:</span>
            </div>
            <div className="w-full sm:w-80">
              <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-muted/30 border-border/70">
                  <SelectValue placeholder="Choose Feature..." />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border-border/80">
                  <SelectItem value="all" className="text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-[#fe932c]" />
                      All 6 Operations Features (Master View)
                    </span>
                  </SelectItem>
                  {PILLARS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.title}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right: Step Pagination Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-mono font-medium hidden sm:inline">
              {selectedFeature === "all" ? (
                <span className="font-bold text-foreground">Viewing All (6 Features)</span>
              ) : (
                <span>
                  Feature <strong className="text-foreground">{currentPillarIndex + 1}</strong> of{" "}
                  <strong className="text-foreground">6</strong>
                </span>
              )}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrevPillar}
                className="h-8 px-2.5 text-xs font-bold border-border/70 hover:bg-muted/40 gap-1"
                title="Go to previous feature"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Previous</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleNextPillar}
                className="h-8 px-2.5 text-xs font-bold border-border/70 hover:bg-muted/40 gap-1"
                title="Go to next feature"
              >
                <span className="hidden xs:inline">Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Pills (Clean Alignment) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-border/50 scrollbar-none">
          <Button
            size="sm"
            variant={selectedFeature === "all" ? "default" : "ghost"}
            onClick={() => setSelectedFeature("all")}
            className={`h-7 px-3 text-xs font-bold shrink-0 transition-all ${
              selectedFeature === "all"
                ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90 shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3 w-3 mr-1 text-[#fe932c]" />
            All Features
          </Button>

          {PILLARS.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedFeature === p.id;
            return (
              <Button
                key={p.id}
                size="sm"
                variant={isSelected ? "default" : "ghost"}
                onClick={() => setSelectedFeature(p.id)}
                className={`h-7 px-2.5 text-xs font-bold shrink-0 transition-all ${
                  isSelected
                    ? "bg-[#0c2340] text-white hover:bg-[#0c2340]/90 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-3 w-3 mr-1 ${isSelected ? "text-[#fe932c]" : "text-muted-foreground"}`} />
                {p.shortLabel}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ACTIVE FEATURE BANNER (WHEN A SPECIFIC PILLAR IS SELECTED)            */}
      {/* ==================================================================== */}
      {currentPillar && (
        <div className="p-3.5 rounded-xl bg-muted/20 border border-border/70 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0c2340] text-[#fe932c]">
              {React.createElement(currentPillar.icon, { className: "h-4 w-4" })}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-foreground">{currentPillar.title}</span>
                <Badge className="bg-[#0c2340] text-[#fe932c] text-[10px] font-bold">
                  {currentPillar.badge}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{currentPillar.description}</p>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedFeature("all")}
            className="h-7 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            Show All 6 Features
          </Button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6 OPERATIONAL PILLARS (PAGINATED OR MASTER VIEW)                     */}
      {/* ==================================================================== */}
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 1: MENU & PRODUCTION PLANNING                               */}
        {/* ------------------------------------------------------------------ */}
        {(selectedFeature === "all" || selectedFeature === "pillar-1") && (
          <div id="pillar-1">
            <MenuProductionPlanning2D />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 2: INVENTORY & PROCUREMENT (SAP MM INTEGRATED)              */}
        {/* ------------------------------------------------------------------ */}
        {(selectedFeature === "all" || selectedFeature === "pillar-2") && (
          <div id="pillar-2">
            <InventoryProcurement2D />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 3: FOOD COST & DMC CONTROL (PURE 2D EXECUTIVE DASHBOARD)    */}
        {/* ------------------------------------------------------------------ */}
        {(selectedFeature === "all" || selectedFeature === "pillar-3") && (
          <div id="pillar-3">
            <DmcCostDashboard2D />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 4: MEAL MANAGEMENT & CLIENT CONSUMPTION RECORDS             */}
        {/* ------------------------------------------------------------------ */}
        {(selectedFeature === "all" || selectedFeature === "pillar-4") && (
          <div id="pillar-4">
            <MealManagement2D />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 5: WASTE & QUALITY CONTROL (HACCP & BATCH TRACEABILITY)     */}
        {/* ------------------------------------------------------------------ */}
        {(selectedFeature === "all" || selectedFeature === "pillar-5") && (
          <div id="pillar-5">
            <WasteQualityControl2D />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 6: REPORTING, BILLING & SAP RECONCILIATION                  */}
        {/* ------------------------------------------------------------------ */}
        {(selectedFeature === "all" || selectedFeature === "pillar-6") && (
          <div id="pillar-6">
            <ReportingBilling2D />
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* BOTTOM PAGINATION BAR (WHEN VIEWING A SINGLE FEATURE)                */}
      {/* ==================================================================== */}
      {selectedFeature !== "all" && (
        <div className="bg-card rounded-xl border border-border/80 p-3.5 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrevPillar}
            className="h-8 font-bold gap-1 border-border/70"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Feature
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              Feature <strong className="text-foreground">{currentPillarIndex + 1}</strong> of{" "}
              <strong className="text-foreground">6</strong>
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedFeature("all")}
              className="h-7 text-xs font-bold"
            >
              View All
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleNextPillar}
            className="h-8 font-bold gap-1 border-border/70"
          >
            Next Feature
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
