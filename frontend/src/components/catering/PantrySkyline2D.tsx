import React, { useState, useMemo } from "react";
import { ComputedIngredientStatus } from "@/data/pantryCommandData";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, Clock, Layers, Search, Filter } from "lucide-react";

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
  const [filterStatus, setFilterStatus] = useState<"all" | "red" | "amber" | "green">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchSearch =
        ing.item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ing.item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ing.item.supplierName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = filterStatus === "all" ? true : ing.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [ingredients, searchQuery, filterStatus]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "cover") return a.daysOfCoverLeft - b.daysOfCoverLeft;
      if (sortBy === "name") return a.item.name.localeCompare(b.item.name);
      // status: red first, then amber, then green
      const score = (s: string) => (s === "red" ? 0 : s === "amber" ? 1 : 2);
      return score(a.status) - score(b.status);
    });
  }, [filtered, sortBy]);

  const redCount = ingredients.filter((i) => i.status === "red").length;
  const amberCount = ingredients.filter((i) => i.status === "amber").length;
  const greenCount = ingredients.filter((i) => i.status === "green").length;

  return (
    <div className="w-full rounded-xl border border-border/70 bg-card p-4 md:p-6 shadow-sm space-y-4 text-foreground">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#fe932c]" />
            <span>Pantry Food Inventory & Safety Monitor</span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-semibold">
              14 Essential Ingredients
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time kitchen inventory measured in <strong>Days of Supply</strong> against the 5-day safety line.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-44">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground text-[11px] mr-1">Sort:</span>
            {[
              { id: "cover", label: "Lowest First" },
              { id: "status", label: "Urgency" },
              { id: "name", label: "A-Z" },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSortBy(mode.id as any)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  sortBy === mode.id
                    ? "bg-[#0c2340] text-white dark:bg-primary dark:text-primary-foreground font-bold shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            filterStatus === "all"
              ? "bg-foreground text-background font-bold"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All Items ({ingredients.length})
        </button>
        <button
          onClick={() => setFilterStatus("red")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            filterStatus === "red"
              ? "bg-rose-600 text-white font-bold"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Buy Today ({redCount})
        </button>
        <button
          onClick={() => setFilterStatus("amber")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            filterStatus === "amber"
              ? "bg-amber-600 text-white font-bold"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Running Low ({amberCount})
        </button>
        <button
          onClick={() => setFilterStatus("green")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            filterStatus === "green"
              ? "bg-emerald-600 text-white font-bold"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Plenty / Safe ({greenCount})
        </button>
      </div>

      {/* Grid of 2D Item Cards */}
      {sorted.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No ingredients found matching your search.
        </div>
      ) : (
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
                    ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30"
                    : "border-border/70 bg-card hover:bg-muted/30 hover:border-border hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-1.5 rounded-lg bg-muted/60 border border-border/50">
                      {ing.item.icon}
                    </span>
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
                            ? "text-rose-600 dark:text-rose-400 font-extrabold"
                            : ing.status === "amber"
                            ? "text-amber-600 dark:text-amber-400 font-bold"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {ing.daysOfCoverLeft} Days
                      </span>
                    </div>
                    <span
                      className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
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

                {/* Progress Bar with Safety Line Marker */}
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

                  {/* Vertical Safety Line Indicator */}
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
                  <span className="font-semibold text-foreground">{ing.urgencyLabel}</span>
                  <span className="font-medium">Safety Line: {ing.effectiveThreshold} Days</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
