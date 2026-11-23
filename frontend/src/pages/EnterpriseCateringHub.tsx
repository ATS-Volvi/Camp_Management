import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DmcSkyline3D from "@/components/catering/enterprise/DmcSkyline3D";
import LogisticsRadar3D from "@/components/catering/enterprise/LogisticsRadar3D";
import CulinaryReactor3D from "@/components/catering/enterprise/CulinaryReactor3D";
import DiningHallDigitalTwin3D from "@/components/catering/enterprise/DiningHallDigitalTwin3D";
import FifoExpiryVault3D from "@/components/catering/enterprise/FifoExpiryVault3D";
import AramcoAuditCube3D from "@/components/catering/enterprise/AramcoAuditCube3D";
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
  Play,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type EnterpriseModuleKey =
  | "dmc-skyline"
  | "logistics-radar"
  | "culinary-reactor"
  | "dining-twin"
  | "fifo-vault"
  | "audit-cube";

export default function EnterpriseCateringHub() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<EnterpriseModuleKey>("dmc-skyline");

  const modules = [
    {
      key: "dmc-skyline" as const,
      name: "Food Cost & DMC Skyline",
      subtitle: "3D CPH vs Budget Ceiling",
      icon: DollarSign,
      badge: "Financial 3D Twin",
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
      name: "3D Recipe BOM Scaler",
      subtitle: "Kitchen Station Workloads",
      icon: ChefHat,
      badge: "Stock Collision Check",
      component: <CulinaryReactor3D />,
    },
    {
      key: "dining-twin" as const,
      name: "Dining Hall Digital Twin",
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

  const currentMod = modules.find((m) => m.key === activeModule) || modules[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation & Header */}
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
            <span className="text-foreground font-semibold">Enterprise 3D Suite</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="p-2 rounded-xl bg-[#0c2340] text-white shadow-sm">
              <Compass className="h-6 w-6 text-[#fe932c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  Camp-365 Enterprise Catering Command Hub
                </h1>
                <Badge className="bg-[#fe932c] text-slate-950 font-black text-[10px] tracking-wider uppercase">
                  6-Module 3D Suite
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Executive 3D operations twin designed for remote contractor camp management (Saudi Aramco standards).
              </p>
            </div>
          </div>
        </div>

        {/* Global Executive Stats Strip */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs shadow-2xs font-mono">
            <span className="text-muted-foreground block text-[10px]">Active Workforce</span>
            <strong className="text-foreground font-bold">3,710 Inmates</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs shadow-2xs font-mono">
            <span className="text-muted-foreground block text-[10px]">Avg Daily CPH</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">SAR 19.10</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs shadow-2xs font-mono">
            <span className="text-muted-foreground block text-[10px]">SAP Outbox</span>
            <span className="text-primary font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Synced (VF01)
            </span>
          </div>
        </div>
      </div>

      {/* 6-Module Switcher Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {modules.map((m) => {
          const Icon = m.icon;
          const isActive = m.key === activeModule;
          return (
            <button
              key={m.key}
              onClick={() => setActiveModule(m.key)}
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

      {/* Active 3D Visualizer Stage */}
      <div className="animate-in fade-in duration-200">
        {currentMod.component}
      </div>
    </div>
  );
}
