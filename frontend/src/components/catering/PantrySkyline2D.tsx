import React, { useState } from "react";
import { ComputedIngredientStatus } from "@/data/pantryCommandData";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, AlertTriangle, CheckCircle2, Clock, BarChart3 } from "lucide-react";

interface PantrySkyline2DProps {
  ingredients: ComputedIngredientStatus[];
  onSelectIngredient: (item: ComputedIngredientStatus) => void;
  selectedIngredientId?: string | null;
}

export default function PantrySkyline2D({
  ingredients,
  onSelectIngredient,
  selectedIngredientId,
}: PantrySkyline2DProps) {
  const [sortBy, setSortBy] = useState<"cover" | "name" | "status">("cover");

  const sorted = [...ingredients].sort((a, b) => {
    if (sortBy === "cover") return a.daysOfCoverLeft - b.daysOfCoverLeft;
    if (sortBy === "name") return a.item.name.localeCompare(b.item.name);
    // status: red first, then amber, then green
    const score = (s: string) => (s === "red" ? 0 : s === "amber" ? 1 : 2);
    return score(a.status) - score(b.status);
  });

  return (
    <div className="w-full rounded-xl border border-border/70 bg-card p-4 md:p-6 shadow-sm space-y-4 text-foreground">
      {/* 2D Header & Sorter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#fe932c]" />
            <span>2D Food Supply Overview (Bar View)</span>
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
              Quick Mobile & Print View
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compares days of food remaining against the 5-day safety line for each kitchen ingredient.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Sort by:</span>
          {[
            { id: "cover", label: "Lowest Food First" },
            { id: "status", label: "Urgency" },
            { id: "name", label: "Name" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSortBy(mode.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                sortBy === mode.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of 2D Bar Visualizers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {sorted.map((ing) => {
          const isSelected = selectedIngredientId === ing.item.id;
          const maxScaleDays = 15;
          const coverPct = Math.min(100, (ing.daysOfCoverLeft / maxScaleDays) * 100);
          const thresholdPct = Math.min(100, (ing.effectiveThreshold / maxScaleDays) * 100);

          return (
            <div
              key={ing.item.id}
              onClick={() => onSelectIngredient(ing)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40"
                  : "border-border/70 bg-muted/20 hover:bg-muted/40 hover:border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ing.item.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {ing.item.name}
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {ing.remainingStock} {ing.item.unit} in pantry ({ing.effectiveDailyUsage}/day)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span
                      className={`text-sm font-bold font-mono ${
                        ing.status === "red"
                          ? "text-rose-600 dark:text-rose-400"
                          : ing.status === "amber"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {ing.daysOfCoverLeft} Days
                    </span>
                  </div>
                  <span
                    className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                      ing.status === "red"
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                        : ing.status === "amber"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {ing.status === "red" ? "Buy Today" : ing.status === "amber" ? "Running Low" : "Plenty"}
                  </span>
                </div>
              </div>

              {/* Bar Comparison with Threshold Marker */}
              <div className="mt-3 relative pt-1">
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ing.status === "red"
                        ? "bg-rose-500"
                        : ing.status === "amber"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${coverPct}%` }}
                  />
                </div>

                {/* Vertical Floating Threshold Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#fe932c] z-10"
                  style={{ left: `${thresholdPct}%` }}
                  title={`Safety Line: ${ing.effectiveThreshold} days`}
                >
                  <div className="w-2 h-2 rounded-full bg-[#fe932c] -translate-x-[3px] -translate-y-[2px]" />
                </div>
              </div>

              {/* Sub-label */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{ing.urgencyLabel}</span>
                <span>Safety Line: {ing.effectiveThreshold} Days</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
