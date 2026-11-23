import React from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function EnterpriseCateringHub() {
  const navigate = useNavigate();

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
        {/* PILLAR 1: MENU & PRODUCTION PLANNING                               */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <MenuProductionPlanning2D />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 2: INVENTORY & PROCUREMENT (SAP MM INTEGRATED)              */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <InventoryProcurement2D />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 3: FOOD COST & DMC CONTROL (PURE 2D EXECUTIVE DASHBOARD)    */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <DmcCostDashboard2D />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 4: MEAL MANAGEMENT & CLIENT CONSUMPTION RECORDS             */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <MealManagement2D />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 5: WASTE & QUALITY CONTROL (HACCP & BATCH TRACEABILITY)     */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <WasteQualityControl2D />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PILLAR 6: REPORTING, BILLING & SAP RECONCILIATION                  */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <ReportingBilling2D />
        </div>
      </div>
    </div>
  );
}
