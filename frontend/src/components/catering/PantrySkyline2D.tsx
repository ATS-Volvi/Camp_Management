import React, { useState } from "react";
import { ComputedIngredientStatus } from "@/data/pantryCommandData";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

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
    <div className="w-full rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-4 md:p-6 shadow-2xl backdrop-blur-xl space-y-4">
      {/* 2D Header & Sorter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>2D Inventory Cover Skyline</span>
            <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-300">
              Mobile & Export Mode
            </Badge>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Days of cover compared against safety threshold line (5-6 days).
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">Sort by:</span>
          {(["cover", "status", "name"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortBy(mode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
                sortBy === mode
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              {mode}
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
                  ? "border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "border-white/10 bg-slate-900/60 hover:bg-slate-900 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ing.item.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {ing.item.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ing.remainingStock} {ing.item.unit} ({ing.effectiveDailyUsage}/day)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className={`text-sm font-bold font-mono ${
                        ing.status === "red"
                          ? "text-rose-400"
                          : ing.status === "amber"
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {ing.daysOfCoverLeft}d
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">cover</span>
                  </div>
                  <span
                    className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                      ing.status === "red"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : ing.status === "amber"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {ing.status === "red" ? "CRITICAL BUY" : ing.status === "amber" ? "NEAR THRESHOLD" : "OPTIMAL"}
                  </span>
                </div>
              </div>

              {/* Bar Comparison with Threshold Marker */}
              <div className="mt-3 relative pt-1">
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ing.status === "red"
                        ? "bg-rose-500 shadow-[0_0_8px_#ef4444]"
                        : ing.status === "amber"
                        ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                        : "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                    }`}
                    style={{ width: `${coverPct}%` }}
                  />
                </div>

                {/* Vertical Floating Threshold Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10 shadow-[0_0_6px_#38bdf8]"
                  style={{ left: `${thresholdPct}%` }}
                  title={`Safety Threshold: ${ing.effectiveThreshold} days`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 -translate-x-[2px] -translate-y-[2px]" />
                </div>
              </div>

              {/* Sub-label */}
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{ing.urgencyLabel}</span>
                <span className="text-slate-500">Threshold: {ing.effectiveThreshold}d</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
