import React, { useState } from "react";
import { ComputedDishHealth, ComputedIngredientStatus } from "@/data/pantryCommandData";
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
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-[#fe932c]" />
          <h3 className="text-sm font-bold text-foreground tracking-tight">
            Upcoming Menu Dishes & Meal Availability
          </h3>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            (Will we have enough food to cook these scheduled dishes?)
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Click any dish to see its key ingredient stock
        </span>
      </div>

      {/* Grid of Dish Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {dishes.map((dh) => {
          const isExpanded = expandedDishId === dh.dish.id;
          const isRed = dh.overallStatus === "red";
          const isAmber = dh.overallStatus === "amber";

          return (
            <div
              key={dh.dish.id}
              onClick={() => toggleExpand(dh.dish.id)}
              className={`rounded-xl p-3 border transition-all cursor-pointer relative overflow-hidden group ${
                isRed
                  ? "bg-rose-500/5 border-rose-500/40 hover:border-rose-500/70 hover:shadow-md"
                  : isAmber
                  ? "bg-amber-500/5 border-amber-500/40 hover:border-amber-500/70 hover:shadow-md"
                  : "bg-muted/20 border-border/70 hover:border-emerald-500/50 hover:shadow-md"
              }`}
            >
              {/* Dish Header & Status Ring */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    {dh.dish.scheduledDay} · {dh.dish.mealSession}
                  </span>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors mt-0.5 leading-snug">
                    {dh.dish.name}
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {dh.dish.expectedPortions} portions planned
                  </span>
                </div>

                {/* Status Indicator Circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                    isRed
                      ? "border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-xs"
                      : isAmber
                      ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs"
                      : "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  }`}
                  title={
                    isRed
                      ? "Cannot cook - missing ingredients"
                      : isAmber
                      ? "At risk - stock running low"
                      : "Ready to cook - plenty of ingredients"
                  }
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
              <div className="mt-2.5 pt-2 border-t border-border/40">
                <span
                  className={`text-[11px] leading-tight block truncate ${
                    isRed
                      ? "text-rose-600 dark:text-rose-400 font-bold"
                      : isAmber
                      ? "text-amber-600 dark:text-amber-400 font-semibold"
                      : "text-emerald-600 dark:text-emerald-400"
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
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      k.status === "red"
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold"
                        : k.status === "amber"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {k.item.icon} {k.daysOfCoverLeft}d
                  </span>
                ))}
              </div>

              {/* Expand Toggle */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-primary font-medium">
                <span>{isExpanded ? "Hide Details" : "Check Ingredients"}</span>
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>

              {/* Expanded Ingredient Breakdown Card */}
              {isExpanded && (
                <div
                  className="mt-3 pt-3 border-t border-border/60 space-y-2 animate-in fade-in duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">
                    Required Ingredients & Days Left:
                  </p>
                  <div className="space-y-1.5">
                    {dh.keyIngredientStatuses.map((k) => {
                      const isWeakest = k.item.id === dh.weakestIngredient.item.id;
                      return (
                        <div
                          key={k.item.id}
                          onClick={() => onSelectIngredient(k)}
                          className={`p-1.5 rounded-lg border text-xs flex items-center justify-between hover:bg-muted/80 transition-colors ${
                            isWeakest
                              ? "border-rose-500/40 bg-rose-500/10 font-bold"
                              : "border-border/50 bg-background"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-foreground">
                            <span>{k.item.icon}</span>
                            <span>{k.item.name}</span>
                            {isWeakest && (
                              <span className="text-[9px] bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1 py-0.5 rounded uppercase font-bold">
                                Low
                              </span>
                            )}
                          </span>

                          <div className="text-right font-mono text-[11px]">
                            <span
                              className={
                                k.status === "red"
                                  ? "text-rose-600 dark:text-rose-400 font-bold"
                                  : k.status === "amber"
                                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }
                            >
                              {k.daysOfCoverLeft} days
                            </span>
                            <span className="text-muted-foreground text-[10px] block">
                              safety: {k.effectiveThreshold}d
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
