import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  UtensilsCrossed,
  Package,
  Layers,
  BarChart3,
  Building2,
  ArrowLeft,
  Compass,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CateringNavHeaderProps {
  activeTab: "grocery-config" | "pantry" | "enterprise-hub" | "reports";
  campId?: string;
  camps?: any[];
  onCampChange?: (campId: string) => void;
}

export default function CateringNavHeader({
  activeTab,
  campId = "",
  camps = [],
  onCampChange,
}: CateringNavHeaderProps) {
  const navigate = useNavigate();

  const handleTabClick = (targetTab: string) => {
    const query = campId ? `?campId=${encodeURIComponent(campId)}` : "";
    switch (targetTab) {
      case "grocery-config":
        navigate(`/mess-catering${query}`);
        break;
      case "pantry":
        navigate(`/catering/pantry-command-center${query}`);
        break;
      case "enterprise-hub":
        navigate(`/catering/enterprise-hub${query}`);
        break;
      case "reports":
        navigate(`/catering/reports${query}`);
        break;
    }
  };

  const navItems = [
    {
      id: "grocery-config",
      label: "Dishes & Grocery Config",
      shortLabel: "1. Dishes & Menu",
      description: "Ingredients, grams & recipe master",
      icon: UtensilsCrossed,
      color: "text-amber-500",
    },
    {
      id: "pantry",
      label: "Pantry & Stock Intelligence",
      shortLabel: "2. Pantry & Stock",
      description: "Days of cover & purchase orders",
      icon: Package,
      color: "text-cyan-500",
    },
    {
      id: "enterprise-hub",
      label: "Enterprise Operations Hub",
      shortLabel: "3. Production & BOM",
      description: "BOM scaler, reconciliation & DMC costs",
      icon: Layers,
      color: "text-[#fe932c]",
    },
    {
      id: "reports",
      label: "Catering BI Reports & 3D",
      shortLabel: "4. BI Reports & 3D",
      description: "Dynamic pivots & WebGL analytics",
      icon: BarChart3,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="bg-[#0c2340] text-white rounded-2xl p-4 sm:p-5 shadow-md border border-[#fe932c]/20 space-y-4">
      {/* Top Row: Suite Branding, Breadcrumbs & Camp Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <button
              onClick={() => navigate("/dashboard")}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Main Dashboard
            </button>
            <span>/</span>
            <span className="text-slate-400">Mess & Catering Division</span>
            <span>/</span>
            <span className="text-[#fe932c] font-semibold">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            <div className="p-2 rounded-xl bg-white/10 border border-white/10 text-[#fe932c]">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Catering & Kitchen Command Suite
                </h1>
                <Badge className="bg-[#fe932c] text-slate-950 font-black text-[10px] tracking-wider uppercase">
                  Camp-365
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Unified food operations: Recipes, warehouse store stock, production reconciliation, and executive reports.
              </p>
            </div>
          </div>
        </div>

        {/* Global Camp Selector */}
        {camps.length > 0 && (
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 self-start md:self-auto shrink-0">
            <Building2 className="h-4 w-4 text-[#fe932c]" />
            <span className="text-xs font-bold text-slate-200">Camp:</span>
            <select
              value={campId}
              onChange={(e) => onCampChange && onCampChange(e.target.value)}
              className="bg-[#0c2340] text-white text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/20 focus:ring-1 focus:ring-[#fe932c] outline-hidden cursor-pointer min-w-[190px]"
            >
              <option value="">All Camps (Network Master)</option>
              {camps.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.location || "Saudi Arabia"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bottom Row: 4 Master Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
                isActive
                  ? "bg-white/15 border-[#fe932c] shadow-md ring-1 ring-[#fe932c]"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#fe932c]" />
              )}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <strong className="text-xs font-bold text-white block">
                    {item.shortLabel}
                  </strong>
                </div>
                {isActive && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              <span className="text-[11px] text-slate-400 block truncate">
                {item.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
