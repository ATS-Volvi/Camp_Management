import React, { useState, useMemo } from "react";
import { ComputedIngredientStatus } from "@/data/pantryCommandData";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  BarChart3,
  Layers,
  LayoutGrid,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";

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
  // View mode: standard bar graph, stacked supply graph, or card grid
  const [chartMode, setChartMode] = useState<"bar" | "stacked" | "cards">("bar");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "red" | "amber" | "green">("all");
  const [sortBy, setSortBy] = useState<"cover" | "name" | "status">("cover");

  // Filter ingredients
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

  // Sort ingredients
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "cover") return a.daysOfCoverLeft - b.daysOfCoverLeft;
      if (sortBy === "name") return a.item.name.localeCompare(b.item.name);
      const score = (s: string) => (s === "red" ? 0 : s === "amber" ? 1 : 2);
      return score(a.status) - score(b.status);
    });
  }, [filtered, sortBy]);

  // Transform for Recharts
  const chartData = useMemo(() => {
    return sorted.map((ing) => {
      const targetBufferDays = 12; // Standard reorder buffer target
      const restockNeededDays = Math.max(0, targetBufferDays - ing.daysOfCoverLeft);

      return {
        id: ing.item.id,
        name: ing.item.name,
        shortName: `${ing.item.icon} ${ing.item.name.split(" ")[0]}`,
        icon: ing.item.icon,
        currentDays: ing.daysOfCoverLeft,
        safetyThreshold: ing.effectiveThreshold,
        restockBufferDays: Number(restockNeededDays.toFixed(1)),
        status: ing.status,
        remainingStock: ing.remainingStock,
        unit: ing.item.unit,
        dailyUsage: ing.effectiveDailyUsage,
        supplier: ing.item.supplierName,
        urgencyLabel: ing.urgencyLabel,
        rawIngredient: ing,
      };
    });
  }, [sorted]);

  const redCount = ingredients.filter((i) => i.status === "red").length;
  const amberCount = ingredients.filter((i) => i.status === "amber").length;
  const greenCount = ingredients.filter((i) => i.status === "green").length;

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isRed = data.status === "red";
      const isAmber = data.status === "amber";

      return (
        <div className="rounded-xl border border-border bg-card/95 p-3.5 shadow-xl text-xs space-y-2 backdrop-blur-md min-w-[220px]">
          <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
            <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <span>{data.icon}</span>
              <span>{data.name}</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                isRed
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                  : isAmber
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {isRed ? "Buy Today" : isAmber ? "Running Low" : "Plenty"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center py-1">
            <div className="p-1.5 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Food Remaining</span>
              <span
                className={`text-base font-extrabold font-mono ${
                  isRed ? "text-rose-600 dark:text-rose-400" : isAmber ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {data.currentDays} Days
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Safety Line</span>
              <span className="text-base font-bold font-mono text-primary">
                {data.safetyThreshold} Days
              </span>
            </div>
          </div>

          <div className="space-y-1 text-[11px] text-muted-foreground pt-1">
            <div className="flex justify-between">
              <span>Kitchen Stock:</span>
              <strong className="text-foreground">{data.remainingStock} {data.unit}</strong>
            </div>
            <div className="flex justify-between">
              <span>Daily Usage:</span>
              <strong className="text-foreground">{data.dailyUsage} {data.unit} / day</strong>
            </div>
            <div className="flex justify-between">
              <span>Supplier:</span>
              <span className="text-foreground truncate max-w-[120px]">{data.supplier}</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-border/50 text-[10px] text-primary flex items-center justify-between font-semibold">
            <span>{data.urgencyLabel}</span>
            <span>Click to inspect &rarr;</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full rounded-xl border border-border/70 bg-card p-4 md:p-6 shadow-sm space-y-4 text-foreground">
      {/* Header & View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#fe932c]" />
            <h3 className="text-base font-bold text-foreground">
              Food Supply & Safety Threshold Graph
            </h3>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-semibold">
              14 Core Ingredients
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Height indicates <strong>Days of Food Remaining</strong>. The dashed amber line is the <strong>5-Day Safety Threshold</strong>.
          </p>
        </div>

        {/* View Mode Switcher (Dynamic Reports Style) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1 rounded-lg bg-muted border border-border flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setChartMode("bar")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                chartMode === "bar"
                  ? "bg-card text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Bar Chart with Safety Line"
            >
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span>Bar Chart</span>
            </button>

            <button
              onClick={() => setChartMode("stacked")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                chartMode === "stacked"
                  ? "bg-card text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Stacked Supply vs Required Buffer"
            >
              <Layers className="h-3.5 w-3.5 text-[#fe932c]" />
              <span>Stacked Graph</span>
            </button>

            <button
              onClick={() => setChartMode("cards")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                chartMode === "cards"
                  ? "bg-card text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Individual Cards View"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filterStatus === "all"
                ? "bg-[#0c2340] text-white dark:bg-primary dark:text-primary-foreground font-bold shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All Items ({ingredients.length})
          </button>
          <button
            onClick={() => setFilterStatus("red")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterStatus === "red"
                ? "bg-rose-600 text-white font-bold shadow-xs"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Buy Today ({redCount})
          </button>
          <button
            onClick={() => setFilterStatus("amber")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterStatus === "amber"
                ? "bg-amber-600 text-white font-bold shadow-xs"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Running Low ({amberCount})
          </button>
          <button
            onClick={() => setFilterStatus("green")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterStatus === "green"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Plenty / Safe ({greenCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search ingredient or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* VIEW 1: RECHARTS BAR GRAPH (WITH 5-DAY SAFETY LINE) */}
      {chartMode === "bar" && (
        <div className="space-y-3">
          <div className="h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 15, left: -10, bottom: 35 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    onSelectIngredient(e.activePayload[0].payload.rawIngredient);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  domain={[0, 14]}
                  unit="d"
                />
                <Tooltip content={<CustomTooltip />} />

                {/* 5-Day Safety Threshold Reference Line */}
                <ReferenceLine
                  y={5}
                  stroke="#fe932c"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  label={{
                    value: "SAFETY LINE (5 DAYS)",
                    position: "right",
                    fill: "#fe932c",
                    fontSize: 10,
                    fontWeight: "bold",
                  }}
                />

                <Bar
                  dataKey="currentDays"
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  animationDuration={600}
                >
                  {chartData.map((entry) => {
                    const isSelected = selectedIngredientId === entry.id;
                    let fill = "#10b981"; // green
                    if (entry.status === "red") fill = "#ef4444";
                    else if (entry.status === "amber") fill = "#f59e0b";

                    return (
                      <Cell
                        key={entry.id}
                        fill={fill}
                        stroke={isSelected ? "#0c2340" : "none"}
                        strokeWidth={isSelected ? 3 : 0}
                        opacity={isSelected ? 1 : 0.9}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Graph Legend & Status Callouts */}
          <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-border/50 text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-emerald-500 inline-block" />
                <span>Plenty (&gt; 7 Days)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-amber-500 inline-block" />
                <span>Running Low (5–7 Days)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-rose-500 inline-block" />
                <span>Buy Urgently (&lt; 5 Days)</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#fe932c] font-bold">
                <span className="h-0.5 w-4 bg-[#fe932c] inline-block border-t-2 border-dashed border-[#fe932c]" />
                <span>Safety Line (5 Days)</span>
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Tip: Click any bar to open supplier & reorder specs
            </span>
          </div>
        </div>
      )}

      {/* VIEW 2: STACKED SUPPLY GRAPH */}
      {chartMode === "stacked" && (
        <div className="space-y-3">
          <div className="h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 15, left: -10, bottom: 35 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    onSelectIngredient(e.activePayload[0].payload.rawIngredient);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  domain={[0, 14]}
                  unit="d"
                />
                <Tooltip content={<CustomTooltip />} />

                {/* 5-Day Safety Threshold Reference Line */}
                <ReferenceLine
                  y={5}
                  stroke="#fe932c"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{
                    value: "Safety Line (5d)",
                    position: "right",
                    fill: "#fe932c",
                    fontSize: 10,
                  }}
                />

                {/* Stack 1: Current Supply */}
                <Bar
                  dataKey="currentDays"
                  stackId="pantry"
                  radius={[0, 0, 0, 0]}
                  cursor="pointer"
                  name="Current Food Supply"
                >
                  {chartData.map((entry) => {
                    let fill = "#10b981";
                    if (entry.status === "red") fill = "#ef4444";
                    else if (entry.status === "amber") fill = "#f59e0b";
                    return <Cell key={entry.id} fill={fill} />;
                  })}
                </Bar>

                {/* Stack 2: Restock Gap to 12-Day Buffer */}
                <Bar
                  dataKey="restockBufferDays"
                  stackId="pantry"
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  fill="#94a3b8"
                  opacity={0.35}
                  name="Buffer Deficit (Restock Target)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-border/50 text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-emerald-500 inline-block" />
                <span>Current Supply</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-slate-400/50 inline-block" />
                <span>Restock Deficit (to reach 12-day storage buffer)</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#fe932c] font-bold">
                <span className="h-0.5 w-4 bg-[#fe932c] inline-block border-t-2 border-dashed border-[#fe932c]" />
                <span>Safety Line (5 Days)</span>
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Total stack height represents 12-day standard buffer
            </span>
          </div>
        </div>
      )}

      {/* VIEW 3: CARD GRID VIEW */}
      {chartMode === "cards" && (
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
