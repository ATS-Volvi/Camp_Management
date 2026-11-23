import React, { useState } from "react";
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
import { DollarSign, AlertTriangle, CheckCircle2, TrendingDown, Users, Flame } from "lucide-react";

export default function DmcChart2D() {
  const [selectedSession, setSelectedSession] = useState<"overall" | "breakfast" | "lunch" | "dinner" | "fieldPack">("overall");
  const [selectedProject, setSelectedProject] = useState<ProjectDmcRecord>(PROJECT_DMC_DATA[0]);

  const chartData = PROJECT_DMC_DATA.map((p) => {
    let cphValue = p.overallCphSAR;
    if (selectedSession === "breakfast") cphValue = p.sessions.breakfast.cph;
    if (selectedSession === "lunch") cphValue = p.sessions.lunch.cph;
    if (selectedSession === "dinner") cphValue = p.sessions.dinner.cph;
    if (selectedSession === "fieldPack") cphValue = p.sessions.fieldPack.cph;

    const isOver = cphValue > p.budgetCeilingCphSAR;

    return {
      code: p.projectCode,
      name: p.projectName,
      cph: cphValue,
      budget: p.budgetCeilingCphSAR,
      headcount: p.headcount,
      variance: Number((cphValue - p.budgetCeilingCphSAR).toFixed(2)),
      isOver,
      costDriver: p.topCostDriver,
      totalDaily: p.totalDailyDmcSAR,
    };
  });

  const avgBudget = Number(
    (PROJECT_DMC_DATA.reduce((acc, p) => acc + p.budgetCeilingCphSAR, 0) / PROJECT_DMC_DATA.length).toFixed(2)
  );

  return (
    <div className="space-y-4">
      {/* Session Filter Pills & Summary KPIs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg text-xs font-medium">
          {(
            [
              { id: "overall", label: "Full Day CPH" },
              { id: "lunch", label: "Lunch" },
              { id: "dinner", label: "Dinner" },
              { id: "breakfast", label: "Breakfast" },
              { id: "fieldPack", label: "Field Pack" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSession(s.id)}
              className={`px-2.5 py-1 rounded-md transition-all text-xs font-semibold ${
                selectedSession === s.id
                  ? "bg-[#0c2340] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> 3 Under Budget
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" /> 2 Over Budget
          </span>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="h-64 w-full bg-card/50 rounded-xl p-2 border border-border/60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="code" tick={{ fontSize: 11, fill: "currentColor" }} />
            <YAxis
              unit=" SAR"
              domain={[0, 26]}
              tick={{ fontSize: 11, fill: "currentColor" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#0c2340] text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-[#fe932c]/40 font-sans min-w-[210px]">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1">
                        <strong className="text-[#fe932c] font-bold">{d.code}</strong>
                        <span className="text-[10px] text-slate-300">{d.headcount} Pax</span>
                      </div>
                      <p className="font-semibold text-slate-100 text-xs">{d.name}</p>
                      <div className="grid grid-cols-2 gap-1 pt-1 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Actual CPH:</span>
                          <span className="font-bold text-white">SAR {d.cph.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Contract Cap:</span>
                          <span className="font-bold text-emerald-300">SAR {d.budget.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Variance:</span>
                        <span
                          className={`font-bold ${
                            d.variance > 0 ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {d.variance > 0 ? `+SAR ${d.variance}` : `-SAR ${Math.abs(d.variance)}`}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-300 italic pt-0.5">
                        Driver: {d.costDriver}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={avgBudget}
              stroke="#fe932c"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Contract Ceiling Avg: SAR ${avgBudget}`,
                position: "insideTopRight",
                fill: "#fe932c",
                fontSize: 10,
                fontWeight: 700,
              }}
            />
            <Bar
              dataKey="cph"
              name="Cost Per Head (SAR)"
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
                  fill={entry.isOver ? "#ef4444" : "#10b981"}
                  opacity={selectedProject.projectCode === entry.code ? 1 : 0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Project Deep-Dive Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {PROJECT_DMC_DATA.map((p) => {
          const isSelected = selectedProject.projectCode === p.projectCode;
          const isOver = p.overallCphSAR > p.budgetCeilingCphSAR;
          return (
            <div
              key={p.projectCode}
              onClick={() => setSelectedProject(p)}
              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                isSelected
                  ? "bg-[#0c2340] text-white border-[#fe932c] shadow-sm"
                  : "bg-muted/30 border-border/60 hover:bg-muted/60 text-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs truncate">{p.projectCode}</span>
                <Badge
                  className={`text-[9px] px-1.5 py-0 font-bold ${
                    isOver
                      ? "bg-rose-500 text-white"
                      : "bg-emerald-500 text-slate-950"
                  }`}
                >
                  {isOver ? `+SAR ${p.varianceSAR} OVER` : `SAVING SAR ${Math.abs(p.varianceSAR)}`}
                </Badge>
              </div>

              <p className={`text-[11px] truncate mt-1 ${isSelected ? "text-slate-300" : "text-muted-foreground"}`}>
                {p.projectName}
              </p>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-current/10">
                <span className="font-mono font-bold text-sm">
                  SAR {p.overallCphSAR.toFixed(2)}
                  <span className={`text-[10px] font-normal ml-1 ${isSelected ? "text-slate-300" : "text-muted-foreground"}`}>
                    / cap {p.budgetCeilingCphSAR.toFixed(2)}
                  </span>
                </span>
                <span className={`text-[10px] flex items-center gap-1 ${isSelected ? "text-slate-300" : "text-muted-foreground"}`}>
                  <Users className="h-3 w-3" /> {p.headcount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
