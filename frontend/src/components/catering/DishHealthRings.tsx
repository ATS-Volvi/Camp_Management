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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Layers,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DishHealthRingsProps {
  dishes: ComputedDishHealth[];
  selectedDishFilter?: string;
  onSelectDishFilter?: (dishId: string) => void;
  onSelectIngredient: (item: ComputedIngredientStatus) => void;
}

type SortOption = "readiness_asc" | "readiness_desc" | "portions_desc" | "name_asc";

// Helper to infer regional cuisine tag
function getCuisineTag(dishName: string): string {
  const name = dishName.toLowerCase();
  if (name.includes("kabsa") || name.includes("mandi") || name.includes("shakshuka") || name.includes("falafel") || name.includes("shawarma")) {
    return "Arabic Gulf";
  }
  if (name.includes("biryani") || name.includes("parota") || name.includes("dosa") || name.includes("dal") || name.includes("chapati") || name.includes("curry") || name.includes("paneer")) {
    return "Subcontinental";
  }
  if (name.includes("croissant") || name.includes("toast") || name.includes("cheese") || name.includes("omelette") || name.includes("sandwich")) {
    return "Continental";
  }
  return "International";
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
  const [sortOption, setSortOption] = useState<SortOption>("readiness_asc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

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

  // Filtered and Sorted Dishes
  const filteredAndSortedDishes = useMemo(() => {
    const list = dishes.filter((dh) => {
      const matchesStatus = statusFilter === "all" || dh.overallStatus === statusFilter;
      const matchesSession = sessionFilter === "all" || dh.dish.mealSession === sessionFilter;
      const matchesSearch =
        !searchQuery ||
        dh.dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dh.dish.mealSession.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dh.weakestIngredient.item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSession && matchesSearch;
    });

    // Sort
    return list.sort((a, b) => {
      const totalA = a.keyIngredientStatuses.length || 1;
      const readyA = a.keyIngredientStatuses.filter((k) => k.status === "green").length;
      const pctA = readyA / totalA;

      const totalB = b.keyIngredientStatuses.length || 1;
      const readyB = b.keyIngredientStatuses.filter((k) => k.status === "green").length;
      const pctB = readyB / totalB;

      if (sortOption === "readiness_asc") {
        return pctA - pctB || a.weakestIngredient.daysOfCoverLeft - b.weakestIngredient.daysOfCoverLeft;
      }
      if (sortOption === "readiness_desc") {
        return pctB - pctA || b.weakestIngredient.daysOfCoverLeft - a.weakestIngredient.daysOfCoverLeft;
      }
      if (sortOption === "portions_desc") {
        return b.dish.expectedPortions - a.dish.expectedPortions;
      }
      if (sortOption === "name_asc") {
        return a.dish.name.localeCompare(b.dish.name);
      }
      return 0;
    });
  }, [dishes, statusFilter, sessionFilter, searchQuery, sortOption]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [statusFilter, sessionFilter, searchQuery, sortOption, pageSize]);

  // Paginated Slices
  const totalItems = filteredAndSortedDishes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentDishes = filteredAndSortedDishes.slice(startIndex, endIndex);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
      {/* 1. Header & Readiness Summary Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Utensils className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                Menu Dishes & Pantry Readiness Explorer
                <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/50">
                  {totalItems} Available
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Kitchen execution confidence based on live warehouse ingredient coverage and consumption velocity.
              </p>
            </div>
          </div>
        </div>

        {/* Status Segmented Tabs with live counts */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              statusFilter === "all"
                ? "bg-foreground text-background border-foreground shadow-2xs"
                : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            All Dishes ({counts.total})
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
            Low Buffer ({counts.amber})
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

      {/* 2. High-Density Filter & Toolbar (Stitch Inspired) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/60">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Meal Session Filter Chips */}
          <div className="flex items-center bg-card p-0.5 rounded-lg border border-border/70 text-xs">
            {(["all", "Breakfast", "Lunch", "Dinner"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSessionFilter(s)}
                className={`px-3 py-1 rounded-md font-semibold text-xs transition-all capitalize ${
                  sessionFilter === s
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "All Sessions" : s}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dishes or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary w-48 sm:w-60 text-foreground font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-lg px-2.5 py-1 text-xs font-medium">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground text-[11px] hidden sm:inline">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer"
            >
              <option value="readiness_asc">Readiness (Lowest First)</option>
              <option value="readiness_desc">Readiness (Highest First)</option>
              <option value="portions_desc">Portions (High to Low)</option>
              <option value="name_asc">Dish Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* View Mode & Page Size Controls */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {/* Per Page Selector */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-[11px] hidden sm:inline">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-card border border-border/70 rounded-lg px-2 py-1 text-xs font-bold text-foreground cursor-pointer"
            >
              <option value={8}>8 / page</option>
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
              <option value={48}>48 / page</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-card p-0.5 rounded-lg border border-border/70">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-muted text-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Cards Grid View"
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
      </div>

      {/* 3. Empty State */}
      {totalItems === 0 && (
        <div className="py-12 text-center border border-dashed rounded-2xl bg-muted/10 space-y-2">
          <Utensils className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <h4 className="text-sm font-bold text-foreground">No dishes matching active filters</h4>
          <p className="text-xs text-muted-foreground">
            Try resetting your search query or selecting "All Sessions".
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
            Reset All Filters
          </Button>
        </div>
      )}

      {/* 4A. GRID CARDS VIEW (Stitch Layout: 3-4 Dense Column Responsive Grid) */}
      {viewMode === "grid" && totalItems > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {currentDishes.map((dh) => {
            const isExpanded = expandedDishId === dh.dish.id;
            const isRed = dh.overallStatus === "red";
            const isAmber = dh.overallStatus === "amber";
            const isFiltered = selectedDishFilter === dh.dish.id;
            const cuisineTag = getCuisineTag(dh.dish.name);

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
                {/* Top Content */}
                <div className="p-4 space-y-3">
                  {/* Top Meta: Day + Session + Cuisine + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        {dh.dish.scheduledDay} • {dh.dish.mealSession}
                      </span>
                      <span className="text-[9px] font-semibold text-muted-foreground/90 bg-muted/40 px-1.5 py-0.5 rounded">
                        {cuisineTag}
                      </span>
                    </div>

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
                      <span className="font-semibold text-foreground">
                        {readinessPct}% staged
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

                  {/* Key Bottleneck or Staged Callout */}
                  <div className="text-xs pt-1">
                    {isRed ? (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span>Bottleneck Alert:</span>
                          <span className="font-mono">
                            {dh.weakestIngredient.daysOfCoverLeft}d cover
                          </span>
                        </div>
                        <p className="text-xs font-semibold leading-tight">
                          {dh.weakestIngredient.item.name}
                        </p>
                      </div>
                    ) : isAmber ? (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
                        Running low on {dh.weakestIngredient.item.name} ({dh.weakestIngredient.daysOfCoverLeft}d left)
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>All {totalIngredients} ingredients staged for session</span>
                      </div>
                    )}
                  </div>

                  {/* Key Ingredients Pill Chips with readable names */}
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
                        title={`${k.item.name}: ${k.daysOfCoverLeft} days of cover`}
                      >
                        <span>{k.item.icon}</span>
                        <span>{k.item.name.split(" ")[0]}</span>
                        <span className="font-mono opacity-80">({k.daysOfCoverLeft}d)</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions */}
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
                    <span>{isExpanded ? "Hide" : "Breakdown"}</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>

                {/* Expanded Ingredient Breakdown */}
                {isExpanded && (
                  <div className="p-3.5 bg-muted/30 border-t border-border/60 space-y-2 animate-in fade-in duration-200 text-xs">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Required Ingredients & Days Left:
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
      {viewMode === "table" && totalItems > 0 && (
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
              {currentDishes.map((dh) => {
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

      {/* 5. Stitch-Designed Pagination Footer Bar */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs">
          {/* Left: Summary text */}
          <div className="text-muted-foreground">
            Showing <strong className="text-foreground">{startIndex + 1}</strong> to{" "}
            <strong className="text-foreground">{endIndex}</strong> of{" "}
            <strong className="text-foreground">{totalItems}</strong> dishes
          </div>

          {/* Center: Pagination Controls */}
          <div className="flex items-center gap-1 justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              Prev
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              // Show first, last, and window around current page
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return (
                  <span key={pageNum} className="px-1 text-muted-foreground font-mono">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>

          {/* Right: Facility / Page Count Info */}
          <div className="text-muted-foreground text-right hidden sm:block">
            Page <strong className="text-foreground">{currentPage}</strong> of{" "}
            <strong className="text-foreground">{totalPages}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
