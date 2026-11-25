import React, { useState, useMemo } from "react";
import { ComputedDishHealth, ComputedIngredientStatus } from "@/data/pantryCommandData";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Utensils,
  ChevronDown,
  ChevronUp,
  Search,
  LayoutGrid,
  ListFilter,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DishHealthRingsProps {
  dishes: ComputedDishHealth[];
  selectedDishFilter?: string;
  onSelectDishFilter?: (dishId: string) => void;
  onSelectIngredient: (item: ComputedIngredientStatus) => void;
}

export default function DishHealthRings({
  dishes,
  selectedDishFilter = "all",
  onSelectDishFilter,
  onSelectIngredient,
}: DishHealthRingsProps) {
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "green" | "amber" | "red">("all");
  const [sessionFilter, setSessionFilter] = useState<"all" | "Breakfast" | "Lunch" | "Dinner">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const toggleExpand = (id: string) => {
    setExpandedDishId((prev) => (prev === id ? null : id));
  };

  // Overall Counts
  const counts = useMemo(() => {
    let green = 0;
    let amber = 0;
    let red = 0;
    dishes.forEach((d) => {
      if (d.overallStatus === "green") green++;
      else if (d.overallStatus === "amber") amber++;
      else red++;
    });
    return { total: dishes.length, green, amber, red };
  }, [dishes]);

  // Filtered Dishes
  const filteredDishes = useMemo(() => {
    return dishes.filter((dh) => {
      const matchesStatus = statusFilter === "all" || dh.overallStatus === statusFilter;
      const matchesSession = sessionFilter === "all" || dh.dish.mealSession === sessionFilter;
      const matchesSearch =
        !searchQuery ||
        dh.dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dh.dish.mealSession.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dh.weakestIngredient.item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSession && matchesSearch;
    });
  }, [dishes, statusFilter, sessionFilter, searchQuery]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
      {/* 1. Header & Overall Health Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Utensils className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                Menu Dishes & Kitchen Readiness
                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {filteredDishes.length} / {dishes.length}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Inventory coverage for upcoming meal sessions based on active warehouse stock.
              </p>
            </div>
          </div>
        </div>

        {/* Readiness Metric Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              statusFilter === "all"
                ? "bg-foreground text-background border-foreground shadow-2xs"
                : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            All ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter("green")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              statusFilter === "green"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ready ({counts.green})
          </button>
          <button
            onClick={() => setStatusFilter("amber")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              statusFilter === "amber"
                ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Low Stock ({counts.amber})
          </button>
          <button
            onClick={() => setStatusFilter("red")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              statusFilter === "red"
                ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Needs Restock ({counts.red})
          </button>
        </div>
      </div>

      {/* 2. Search, Session Tabs & View Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/60">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dish or ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary w-48 sm:w-56 text-foreground font-medium"
            />
          </div>

          {/* Session filter */}
          <div className="flex items-center bg-card p-0.5 rounded-lg border border-border/70 text-xs">
            {(["all", "Breakfast", "Lunch", "Dinner"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSessionFilter(s)}
                className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all capitalize ${
                  sessionFilter === s
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "All Meals" : s}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-card p-0.5 rounded-lg border border-border/70">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === "grid"
                ? "bg-muted text-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid Cards View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === "table"
                ? "bg-muted text-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Compact Table View"
          >
            <ListFilter className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Empty State */}
      {filteredDishes.length === 0 && (
        <div className="py-12 text-center border border-dashed rounded-2xl bg-muted/10 space-y-2">
          <Utensils className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <h4 className="text-sm font-bold text-foreground">No dishes matching your filter</h4>
          <p className="text-xs text-muted-foreground">
            Try switching to "All Meals" or clearing your search term.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setStatusFilter("all");
              setSessionFilter("all");
              setSearchQuery("");
            }}
            className="text-xs mt-2"
          >
            Reset Filters
          </Button>
        </div>
      )}

      {/* 4A. GRID CARDS VIEW */}
      {viewMode === "grid" && filteredDishes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredDishes.map((dh) => {
            const isExpanded = expandedDishId === dh.dish.id;
            const isRed = dh.overallStatus === "red";
            const isAmber = dh.overallStatus === "amber";
            const isGreen = dh.overallStatus === "green";
            const isFiltered = selectedDishFilter === dh.dish.id;

            // Calculate readiness progress
            const totalIngredients = dh.keyIngredientStatuses.length;
            const readyIngredients = dh.keyIngredientStatuses.filter(
              (k) => k.status === "green"
            ).length;
            const readinessPct = totalIngredients > 0
              ? Math.round((readyIngredients / totalIngredients) * 100)
              : 100;

            return (
              <div
                key={dh.dish.id}
                className={`rounded-2xl border transition-all duration-200 bg-card flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md ${
                  isFiltered
                    ? "ring-2 ring-primary border-primary"
                    : isRed
                    ? "border-l-4 border-l-rose-500 border-border/80"
                    : isAmber
                    ? "border-l-4 border-l-amber-500 border-border/80"
                    : "border-l-4 border-l-emerald-500 border-border/80"
                }`}
              >
                {/* Top Card Section */}
                <div className="p-4 space-y-3">
                  {/* Top Header: Schedule & Status Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                      {dh.dish.scheduledDay} • {dh.dish.mealSession}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                        isRed
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          : isAmber
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {isRed ? (
                        <>
                          <AlertCircle className="h-3 w-3" /> Shortage
                        </>
                      ) : isAmber ? (
                        <>
                          <Clock className="h-3 w-3" /> Low Stock
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> 100% Ready
                        </>
                      )}
                    </span>
                  </div>

                  {/* Dish Name & Portions Planned */}
                  <div>
                    <h4 className="text-sm font-bold text-foreground leading-snug">
                      {dh.dish.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span>{dh.dish.expectedPortions.toLocaleString()} portions</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">
                        {readinessPct}% stocked
                      </span>
                    </p>
                  </div>

                  {/* Readiness Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          readinessPct === 100
                            ? "bg-emerald-500"
                            : readinessPct >= 70
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${readinessPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Bottleneck or All Clear Callout */}
                  <div className="text-xs pt-1">
                    {isRed ? (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>Bottleneck:</span>
                          <span className="font-mono">
                            {dh.weakestIngredient.daysOfCoverLeft}d left
                          </span>
                        </div>
                        <p className="text-xs font-semibold leading-tight">
                          {dh.weakestIngredient.item.name}
                        </p>
                      </div>
                    ) : isAmber ? (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
                        Running low on {dh.weakestIngredient.item.name} ({dh.weakestIngredient.daysOfCoverLeft}d)
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>All {totalIngredients} ingredients stocked for session</span>
                      </div>
                    )}
                  </div>

                  {/* Key Ingredients Pill Previews */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {dh.keyIngredientStatuses.map((k) => (
                      <span
                        key={k.item.id}
                        onClick={() => onSelectIngredient(k)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium cursor-pointer transition-colors border flex items-center gap-1 ${
                          k.status === "red"
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold"
                            : k.status === "amber"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : "bg-muted/60 text-muted-foreground border-border hover:text-foreground"
                        }`}
                        title={`${k.item.name}: ${k.daysOfCoverLeft} days cover left`}
                      >
                        <span>{k.item.icon}</span>
                        <span>{k.item.name.split(" ")[0]}</span>
                        <span className="font-mono opacity-80">({k.daysOfCoverLeft}d)</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectDishFilter?.(isFiltered ? "all" : dh.dish.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      isFiltered
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                    }`}
                  >
                    <Utensils className="h-3 w-3" />
                    <span>{isFiltered ? "Active Filter" : "Filter Pantry"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpand(dh.dish.id)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1"
                  >
                    <span>{isExpanded ? "Less" : "Ingredients"}</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>

                {/* Expanded Breakdown */}
                {isExpanded && (
                  <div className="p-3.5 bg-muted/30 border-t border-border/60 space-y-2 animate-in fade-in duration-200 text-xs">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Ingredient Breakdown & Coverage:
                    </p>
                    <div className="space-y-1.5">
                      {dh.keyIngredientStatuses.map((k) => (
                        <div
                          key={k.item.id}
                          onClick={() => onSelectIngredient(k)}
                          className="p-2 rounded-lg bg-card border border-border/60 flex items-center justify-between hover:bg-muted cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span>{k.item.icon}</span>
                            <div>
                              <strong className="block text-foreground text-xs">{k.item.name}</strong>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                In store: {k.remainingStock} {k.item.unit}
                              </span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span
                              className={`text-xs font-bold ${
                                k.status === "red"
                                  ? "text-rose-600"
                                  : k.status === "amber"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {k.daysOfCoverLeft} days
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              safety: {k.effectiveThreshold}d
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4B. COMPACT TABLE VIEW */}
      {viewMode === "table" && filteredDishes.length > 0 && (
        <div className="border border-border/70 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 font-bold">Dish Name</th>
                <th className="p-3 font-bold">Session & Day</th>
                <th className="p-3 font-bold text-right">Portions Planned</th>
                <th className="p-3 font-bold text-center">Status</th>
                <th className="p-3 font-bold">Key Bottleneck</th>
                <th className="p-3 font-bold">Ingredients Ready</th>
                <th className="p-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {filteredDishes.map((dh) => {
                const isRed = dh.overallStatus === "red";
                const isAmber = dh.overallStatus === "amber";
                const isFiltered = selectedDishFilter === dh.dish.id;
                const totalIngredients = dh.keyIngredientStatuses.length;
                const readyIngredients = dh.keyIngredientStatuses.filter(
                  (k) => k.status === "green"
                ).length;

                return (
                  <tr
                    key={dh.dish.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      isFiltered ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="p-3 font-bold text-foreground text-sm">
                      {dh.dish.name}
                    </td>
                    <td className="p-3 text-muted-foreground font-medium">
                      <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-bold text-foreground">
                        {dh.dish.scheduledDay}
                      </span>{" "}
                      {dh.dish.mealSession}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-foreground">
                      {dh.dish.expectedPortions.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isRed
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : isAmber
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {isRed ? "Shortage" : isAmber ? "Low Buffer" : "100% Ready"}
                      </span>
                    </td>
                    <td className="p-3">
                      {isRed ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {dh.weakestIngredient.item.name} ({dh.weakestIngredient.daysOfCoverLeft}d)
                        </span>
                      ) : isAmber ? (
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {dh.weakestIngredient.item.name} ({dh.weakestIngredient.daysOfCoverLeft}d)
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> All Stocked
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {readyIngredients} / {totalIngredients} stocked
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant={isFiltered ? "default" : "outline"}
                        onClick={() => onSelectDishFilter?.(isFiltered ? "all" : dh.dish.id)}
                        className="h-7 text-xs px-2.5"
                      >
                        {isFiltered ? "Filtering" : "Filter"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
