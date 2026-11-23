import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from "recharts";
import { PROJECT_DMC_DATA, ProjectDmcRecord } from "@/data/enterpriseCateringSuiteData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Users,
  Flame,
  Download,
  FileSpreadsheet,
  Info,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";

interface DmcCostDashboard2DProps {
  className?: string;
}

export default function DmcCostDashboard2D({ className }: DmcCostDashboard2DProps) {
  // Interactive Budget Cap Slider (defaults to SAR 19.50 as seen in standard Aramco contracts)
  const [budgetCap, setBudgetCap] = useState<number>(19.5);
  const [selectedProject, setSelectedProject] = useState<ProjectDmcRecord>(PROJECT_DMC_DATA[0]);
  const [chartMode, setChartMode] = useState<"stacked" | "total" | "variance">("stacked");
  const [exportNotice, setExportNotice] = useState<boolean>(false);

  // Portfolio-wide Calculations
  const stats = useMemo(() => {
    const totalDailySpend = PROJECT_DMC_DATA.reduce((acc, p) => acc + p.totalDailyDmcSAR, 0);
    const totalHeadcount = PROJECT_DMC_DATA.reduce((acc, p) => acc + p.headcount, 0);
    const avgCph = Number((totalDailySpend / totalHeadcount).toFixed(2));
    const overBudgetProjects = PROJECT_DMC_DATA.filter((p) => p.overallCphSAR > budgetCap);
    const underBudgetProjects = PROJECT_DMC_DATA.filter((p) => p.overallCphSAR <= budgetCap);

    return {
      totalDailySpend,
      totalHeadcount,
      avgCph,
      overBudgetCount: overBudgetProjects.length,
      underBudgetCount: underBudgetProjects.length,
      varianceVsCap: Number((avgCph - budgetCap).toFixed(2)),
    };
  }, [budgetCap]);

  // Selected Project dynamic variance against currently set Budget Cap
  const selectedVariance = Number((selectedProject.overallCphSAR - budgetCap).toFixed(2));
  const isSelectedOver = selectedVariance > 0;

  // Chart Data Preparation
  const chartData = PROJECT_DMC_DATA.map((p) => {
    const variance = Number((p.overallCphSAR - budgetCap).toFixed(2));
    const isOver = variance > 0;

    return {
      code: p.projectCode,
      name: p.projectName,
      client: p.contractClient,
      headcount: p.headcount,
      totalCph: p.overallCphSAR,
      budgetCap: budgetCap,
      variance: variance,
      isOver,
      breakfast: p.sessions.breakfast.cph,
      lunch: p.sessions.lunch.cph,
      dinner: p.sessions.dinner.cph,
      fieldPack: p.sessions.fieldPack.cph,
      totalDailyDmc: p.totalDailyDmcSAR,
      costDriver: p.topCostDriver,
    };
  });

  const handleExport = () => {
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3500);
  };

  return (
    <div className={`space-y-4 font-sans ${className || ""}`}>
      {/* ================================================================== */}
      {/* 1. TOP HEADER BANNER WITH DYNAMIC BUDGET CAP SLIDER                 */}
      {/* ================================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c2340] text-white shadow-md border border-[#fe932c]/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#fe932c]/20 text-[#fe932c]">
                <DollarSign className="h-5 w-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Food Cost & DMC Matrix (CPH vs Budget Ceiling)
              </h2>
              <Badge className="bg-[#fe932c] text-slate-950 font-black text-[10px] tracking-wider uppercase">
                Financial Control Hub
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Track Direct Material Cost Per Head (CPH) per project and meal session against contractual client caps.
              Towers and bars exceeding the cap represent contractual cost overruns.
            </p>
          </div>

          {/* Interactive Budget Cap Slider Widget */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 min-w-[280px]">
            <Sliders className="h-4 w-4 text-[#fe932c] shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold text-[11px]">Contract Budget Cap:</span>
                <strong className="text-[#fe932c] font-black text-sm font-mono">
                  SAR {budgetCap.toFixed(2)}
                </strong>
              </div>
              <Slider
                value={[budgetCap]}
                min={15.0}
                max={25.0}
                step={0.25}
                onValueChange={(val) => setBudgetCap(val[0])}
                className="py-1 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                <span>SAR 15.00</span>
                <span>SAR 20.00</span>
                <span>SAR 25.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Executive KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/10 text-xs font-mono">
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Total Daily Food Cost</span>
            <strong className="text-white font-black text-sm">
              SAR {stats.totalDailySpend.toLocaleString()} / day
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Portfolio Avg CPH</span>
            <strong className="text-[#fe932c] font-black text-sm">
              SAR {stats.avgCph.toFixed(2)} / head
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Cap Compliance</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-emerald-400 font-bold">{stats.underBudgetCount} Under</span>
              <span className="text-slate-500">•</span>
              <span className="text-rose-400 font-bold">{stats.overBudgetCount} Over</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">Tracked Workforce</span>
            <strong className="text-slate-200 font-black text-sm">
              {stats.totalHeadcount.toLocaleString()} Inmates
            </strong>
          </div>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Project DMC Audit Statement exported to Excel/PDF!</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-600">DMC-STATEMENT-2026.xlsx</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. MAIN 2D ANALYTICAL STAGE & DETAIL PANEL                         */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: 2D CHART CANVAS (7 of 12 cols) */}
        <div className="lg:col-span-7 bg-card rounded-2xl border border-border/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            {/* Chart View Switcher & Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setChartMode("stacked")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    chartMode === "stacked"
                      ? "bg-[#0c2340] text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Stacked Sessions
                </button>
                <button
                  onClick={() => setChartMode("total")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    chartMode === "total"
                      ? "bg-[#0c2340] text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Total CPH (Status Color)
                </button>
                <button
                  onClick={() => setChartMode("variance")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    chartMode === "variance"
                      ? "bg-[#0c2340] text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Variance from Cap
                </button>
              </div>

              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <Info className="h-3.5 w-3.5 text-primary" /> Click any bar to inspect
              </span>
            </div>

            {/* Recharts Container */}
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === "stacked" ? (
                  <BarChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="code" tick={{ fontSize: 11, fill: "currentColor" }} />
                    <YAxis unit=" SAR" domain={[0, 26]} tick={{ fontSize: 11, fill: "currentColor" }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          const varAmount = Number((d.totalCph - budgetCap).toFixed(2));
                          const over = varAmount > 0;
                          return (
                            <div className="bg-[#0c2340] text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-[#fe932c]/40 font-sans min-w-[220px]">
                              <div className="flex items-center justify-between border-b border-white/10 pb-1">
                                <strong className="text-[#fe932c] font-bold">{d.code}</strong>
                                <span className="text-[10px] text-slate-300">{d.headcount} Pax</span>
                              </div>
                              <p className="font-semibold text-slate-100 text-xs">{d.name}</p>
                              <div className="grid grid-cols-2 gap-1 pt-1 text-[11px]">
                                <div>
                                  <span className="text-slate-400 block text-[10px]">Total CPH:</span>
                                  <strong className="text-white font-mono">SAR {d.totalCph.toFixed(2)}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px]">Budget Cap:</span>
                                  <strong className="text-[#fe932c] font-mono">SAR {budgetCap.toFixed(2)}</strong>
                                </div>
                              </div>
                              <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Variance:</span>
                                <strong className={over ? "text-rose-400" : "text-emerald-400"}>
                                  {over ? `+SAR ${varAmount} OVER` : `-SAR ${Math.abs(varAmount)} UNDER`}
                                </strong>
                              </div>
                              <div className="text-[10px] text-slate-300 pt-1 space-y-0.5 border-t border-white/10">
                                <div>Breakfast: SAR {d.breakfast.toFixed(2)}</div>
                                <div>Lunch: SAR {d.lunch.toFixed(2)}</div>
                                <div>Dinner: SAR {d.dinner.toFixed(2)}</div>
                                <div>Field Pack: SAR {d.fieldPack.toFixed(2)}</div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <ReferenceLine
                      y={budgetCap}
                      stroke="#fe932c"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{
                        value: `Budget Cap: SAR ${budgetCap.toFixed(2)}`,
                        position: "insideTopRight",
                        fill: "#fe932c",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                    <Bar
                      dataKey="breakfast"
                      name="Breakfast"
                      stackId="cph"
                      fill="#eab308"
                      onClick={(entry) => {
                        const found = PROJECT_DMC_DATA.find((p) => p.projectCode === entry.code);
                        if (found) setSelectedProject(found);
                      }}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="lunch"
                      name="Lunch"
                      stackId="cph"
                      fill="#0ea5e9"
                      onClick={(entry) => {
                        const found = PROJECT_DMC_DATA.find((p) => p.projectCode === entry.code);
                        if (found) setSelectedProject(found);
                      }}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="dinner"
                      name="Dinner"
                      stackId="cph"
                      fill="#8b5cf6"
                      onClick={(entry) => {
                        const found = PROJECT_DMC_DATA.find((p) => p.projectCode === entry.code);
                        if (found) setSelectedProject(found);
                      }}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="fieldPack"
                      name="Field Pack"
                      stackId="cph"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      onClick={(entry) => {
                        const found = PROJECT_DMC_DATA.find((p) => p.projectCode === entry.code);
                        if (found) setSelectedProject(found);
                      }}
                      cursor="pointer"
                    />
                  </BarChart>
                ) : chartMode === "total" ? (
                  <BarChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="code" tick={{ fontSize: 11, fill: "currentColor" }} />
                    <YAxis unit=" SAR" domain={[0, 26]} tick={{ fontSize: 11, fill: "currentColor" }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          const varAmount = Number((d.totalCph - budgetCap).toFixed(2));
                          const over = varAmount > 0;
                          return (
                            <div className="bg-[#0c2340] text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-[#fe932c]/40 font-sans min-w-[220px]">
                              <strong className="text-[#fe932c] font-bold block">{d.code} - {d.name}</strong>
                              <div className="flex items-center justify-between pt-1">
                                <span>Actual CPH:</span>
                                <strong className="font-mono text-white">SAR {d.totalCph.toFixed(2)}</strong>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Budget Cap:</span>
                                <strong className="font-mono text-[#fe932c]">SAR {budgetCap.toFixed(2)}</strong>
                              </div>
                              <div className="pt-1 border-t border-white/10 flex items-center justify-between">
                                <span>Status:</span>
                                <strong className={over ? "text-rose-400" : "text-emerald-400"}>
                                  {over ? `+SAR ${varAmount} OVER BUDGET` : `SAR ${Math.abs(varAmount)} UNDER BUDGET`}
                                </strong>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={budgetCap}
                      stroke="#fe932c"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{
                        value: `Cap: SAR ${budgetCap.toFixed(2)}`,
                        position: "insideTopRight",
                        fill: "#fe932c",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                    <Bar
                      dataKey="totalCph"
                      name="Total CPH (SAR)"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry) => {
                        const found = PROJECT_DMC_DATA.find((p) => p.projectCode === entry.code);
                        if (found) setSelectedProject(found);
                      }}
                      cursor="pointer"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.totalCph > budgetCap ? "#ef4444" : "#10b981"}
                          opacity={selectedProject.projectCode === entry.code ? 1 : 0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="code" tick={{ fontSize: 11, fill: "currentColor" }} />
                    <YAxis unit=" SAR" tick={{ fontSize: 11, fill: "currentColor" }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          const varAmount = Number((d.totalCph - budgetCap).toFixed(2));
                          const over = varAmount > 0;
                          return (
                            <div className="bg-[#0c2340] text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-[#fe932c]/40 min-w-[200px]">
                              <strong className="text-[#fe932c] font-bold block">{d.code}</strong>
                              <div>Actual: SAR {d.totalCph.toFixed(2)} / Cap: SAR {budgetCap.toFixed(2)}</div>
                              <div className={over ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                                Variance: {over ? `+SAR ${varAmount}` : `-SAR ${Math.abs(varAmount)}`}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={0} stroke="currentColor" opacity={0.3} />
                    <Bar
                      dataKey="variance"
                      name="Variance from Cap (SAR)"
                      radius={[4, 4, 0, 0]}
                      onClick={(entry) => {
                        const found = PROJECT_DMC_DATA.find((p) => p.projectCode === entry.code);
                        if (found) setSelectedProject(found);
                      }}
                      cursor="pointer"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`var-cell-${index}`}
                          fill={entry.variance > 0 ? "#ef4444" : "#10b981"}
                          opacity={selectedProject.projectCode === entry.code ? 1 : 0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Select Project Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-border/60">
            {PROJECT_DMC_DATA.map((p) => {
              const isSelected = selectedProject.projectCode === p.projectCode;
              const isOver = p.overallCphSAR > budgetCap;
              return (
                <button
                  key={p.projectCode}
                  onClick={() => setSelectedProject(p)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-[#0c2340] text-white border-[#fe932c] shadow-xs"
                      : "bg-muted/20 border-border/60 hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{p.projectCode}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isOver ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                    />
                  </div>
                  <div className="font-mono font-bold text-xs mt-1">
                    SAR {p.overallCphSAR.toFixed(2)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: PROJECT DETAIL CARD (5 of 12 cols - Matches User's Screenshot Layout!) */}
        <div className="lg:col-span-5 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header: Client & Project Name & Big CPH */}
            <div className="border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {selectedProject.contractClient}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono font-bold">
                  Daily CPH
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <h3 className="text-lg font-black text-foreground tracking-tight">
                  {selectedProject.projectName}
                </h3>
                <span
                  className={`text-2xl font-black font-mono tracking-tight ${
                    isSelectedOver ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  SAR {selectedProject.overallCphSAR.toFixed(2)}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold flex items-center gap-1 border-primary/40">
                  <Users className="h-3 w-3 text-primary" />
                  {selectedProject.headcount} Workers On Site
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  Code: {selectedProject.projectCode}
                </Badge>
              </div>
            </div>

            {/* Over/Under Budget Status Alert Box (Exact Replica of Screenshot) */}
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                isSelectedOver
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {isSelectedOver ? (
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                )}
                <strong className="font-bold text-xs">
                  {isSelectedOver
                    ? `Over Budget by +SAR ${selectedVariance.toFixed(2)} / head`
                    : `Under Budget by -SAR ${Math.abs(selectedVariance).toFixed(2)} / head (Compliant)`}
                </strong>
              </div>
              <p className="text-[11px] opacity-90 pl-6">
                <strong>Top Cost Driver:</strong> {selectedProject.topCostDriver}
              </p>
            </div>

            {/* Direct Material Cost by Meal Session Grid (2x2 Grid) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Direct Material Cost by Meal Session
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block font-medium">Breakfast</span>
                  <strong className="text-sm font-black font-mono text-foreground block mt-0.5">
                    SAR {selectedProject.sessions.breakfast.cph.toFixed(2)}
                  </strong>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    SAR {selectedProject.sessions.breakfast.totalCostSAR.toLocaleString()} total
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block font-medium">Lunch</span>
                  <strong className="text-sm font-black font-mono text-foreground block mt-0.5">
                    SAR {selectedProject.sessions.lunch.cph.toFixed(2)}
                  </strong>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    SAR {selectedProject.sessions.lunch.totalCostSAR.toLocaleString()} total
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block font-medium">Dinner</span>
                  <strong className="text-sm font-black font-mono text-foreground block mt-0.5">
                    SAR {selectedProject.sessions.dinner.cph.toFixed(2)}
                  </strong>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    SAR {selectedProject.sessions.dinner.totalCostSAR.toLocaleString()} total
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block font-medium">Field Pack</span>
                  <strong className="text-sm font-black font-mono text-foreground block mt-0.5">
                    SAR {selectedProject.sessions.fieldPack.cph.toFixed(2)}
                  </strong>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    SAR {selectedProject.sessions.fieldPack.totalCostSAR.toLocaleString()} total
                  </span>
                </div>
              </div>
            </div>

            {/* Total Daily DMC & Actions */}
            <div className="p-3.5 rounded-xl bg-[#0c2340] text-white flex items-center justify-between border border-[#fe932c]/30">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Daily DMC</span>
                <span className="text-xs text-slate-300">Contractual material burn</span>
              </div>
              <strong className="text-lg font-black font-mono text-[#fe932c]">
                SAR {selectedProject.totalDailyDmcSAR.toLocaleString()} / day
              </strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              Aramco Vendor Contract #660004921
            </span>
            <Button
              size="sm"
              onClick={handleExport}
              className="h-8 text-xs bg-[#0c2340] hover:bg-[#0c2340]/90 text-white font-bold gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-[#fe932c]" />
              Export Project DMC
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
