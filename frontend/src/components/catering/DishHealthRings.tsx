import React, { useState } from "react";
import { ComputedDishHealth, ComputedIngredientStatus } from "@/data/pantryCommandData";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Utensils, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface DishHealthRingsProps {
  dishes: ComputedDishHealth[];
  onSelectIngredient: (item: ComputedIngredientStatus) => void;
}

export default function DishHealthRings({ dishes, onSelectIngredient }: DishHealthRingsProps) {
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedDishId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Upcoming Menu Dish Health Rings
          </h3>
          <span className="text-xs text-slate-400">
            (Impact on scheduled meal sessions)
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Click any dish to inspect key ingredient threshold stack
        </span>
      </div>

      {/* Horizontal Scrollable or Wrap Grid of Dish Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {dishes.map((dh) => {
          const isExpanded = expandedDishId === dh.dish.id;
          const isRed = dh.overallStatus === "red";
          const isAmber = dh.overallStatus === "amber";

          return (
            <div
              key={dh.dish.id}
              onClick={() => toggleExpand(dh.dish.id)}
              className={`rounded-2xl p-3.5 border transition-all cursor-pointer backdrop-blur-md relative overflow-hidden group ${
                isRed
                  ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                  : isAmber
                  ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  : "bg-slate-900/60 border-white/10 hover:border-emerald-500/40"
              }`}
            >
              {/* Dish Header & Status Ring */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                    {dh.dish.scheduledDay} · {dh.dish.mealSession}
                  </span>
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors mt-0.5 leading-snug">
                    {dh.dish.name}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {dh.dish.expectedPortions} portions
                  </span>
                </div>

                {/* Glowing Circular Health Ring */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                    isRed
                      ? "border-rose-500 bg-rose-500/20 text-rose-400 shadow-[0_0_10px_#ef4444]"
                      : isAmber
                      ? "border-amber-500 bg-amber-500/20 text-amber-400 shadow-[0_0_10px_#f59e0b]"
                      : "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_8px_#10b981]"
                  }`}
                >
                  {isRed ? (
                    <AlertCircle className="h-4 w-4 animate-pulse" />
                  ) : isAmber ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </div>
              </div>

              {/* Weakest Ingredient Alert Callout */}
              <div className="mt-2.5 pt-2 border-t border-white/5">
                <span
                  className={`text-[10px] font-mono leading-tight block truncate ${
                    isRed
                      ? "text-rose-300 font-bold"
                      : isAmber
                      ? "text-amber-300 font-semibold"
                      : "text-emerald-300"
                  }`}
                  title={dh.canServeMessage}
                >
                  {dh.canServeMessage}
                </span>
              </div>

              {/* Key Ingredients Pill Previews */}
              <div className="mt-2 flex flex-wrap gap-1">
                {dh.keyIngredientStatuses.map((k) => (
                  <span
                    key={k.item.id}
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      k.status === "red"
                        ? "bg-rose-500/30 text-rose-300 border border-rose-500/50 font-bold"
                        : k.status === "amber"
                        ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {k.item.icon} {k.daysOfCoverLeft}d
                  </span>
                ))}
              </div>

              {/* Expand Toggle */}
              <div className="mt-2 flex items-center justify-between text-[10px] text-cyan-400 font-mono">
                <span>{isExpanded ? "Collapse" : "Inspect Stock"}</span>
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>

              {/* Expanded Ingredient Breakdown Card */}
              {isExpanded && (
                <div
                  className="mt-3 pt-3 border-t border-white/10 space-y-2 animate-in fade-in duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                    Key Ingredients Cover:
                  </p>
                  <div className="space-y-1.5">
                    {dh.keyIngredientStatuses.map((k) => {
                      const isWeakest = k.item.id === dh.weakestIngredient.item.id;
                      return (
                        <div
                          key={k.item.id}
                          onClick={() => onSelectIngredient(k)}
                          className={`p-1.5 rounded-lg border text-[11px] flex items-center justify-between hover:bg-slate-800 transition-colors ${
                            isWeakest
                              ? "border-rose-500/50 bg-rose-950/30 font-bold"
                              : "border-white/5 bg-slate-900/50"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-white">
                            <span>{k.item.icon}</span>
                            <span>{k.item.name}</span>
                            {isWeakest && (
                              <span className="text-[8px] bg-rose-500/30 text-rose-300 px-1 rounded uppercase">
                                Weakest
                              </span>
                            )}
                          </span>

                          <div className="text-right font-mono">
                            <span
                              className={
                                k.status === "red"
                                  ? "text-rose-400"
                                  : k.status === "amber"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }
                            >
                              {k.daysOfCoverLeft}d cover
                            </span>
                            <span className="text-slate-500 text-[9px] block">
                              limit: {k.effectiveThreshold}d
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
