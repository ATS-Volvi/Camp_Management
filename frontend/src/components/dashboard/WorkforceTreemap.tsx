import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { LayoutGrid, PieChart as PieIcon, Globe2, Users, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NationalityItem {
  name: string;
  value: number;
}

interface Props {
  data: NationalityItem[];
  totalCount: number;
}

const NATIONALITY_METADATA: Record<string, { flag: string; code: string; gradient: string; text: string }> = {
  india: { flag: "🇮🇳", code: "IND", gradient: "from-blue-600/90 to-indigo-700/90 text-white", text: "India" },
  indian: { flag: "🇮🇳", code: "IND", gradient: "from-blue-600/90 to-indigo-700/90 text-white", text: "India" },
  philippines: { flag: "🇵🇭", code: "PHL", gradient: "from-teal-600/90 to-emerald-700/90 text-white", text: "Philippines" },
  filipino: { flag: "🇵🇭", code: "PHL", gradient: "from-teal-600/90 to-emerald-700/90 text-white", text: "Philippines" },
  egypt: { flag: "🇪🇬", code: "EGY", gradient: "from-amber-600/90 to-orange-700/90 text-white", text: "Egypt" },
  egyptian: { flag: "🇪🇬", code: "EGY", gradient: "from-amber-600/90 to-orange-700/90 text-white", text: "Egypt" },
  nepal: { flag: "🇳🇵", code: "NPL", gradient: "from-rose-600/90 to-pink-700/90 text-white", text: "Nepal" },
  nepali: { flag: "🇳🇵", code: "NPL", gradient: "from-rose-600/90 to-pink-700/90 text-white", text: "Nepal" },
  bangladesh: { flag: "🇧🇩", code: "BGD", gradient: "from-emerald-700/90 to-green-800/90 text-white", text: "Bangladesh" },
  bangladeshi: { flag: "🇧🇩", code: "BGD", gradient: "from-emerald-700/90 to-green-800/90 text-white", text: "Bangladesh" },
  pakistan: { flag: "🇵🇰", code: "PAK", gradient: "from-cyan-700/90 to-blue-800/90 text-white", text: "Pakistan" },
  pakistani: { flag: "🇵🇰", code: "PAK", gradient: "from-cyan-700/90 to-blue-800/90 text-white", text: "Pakistan" },
  saudi: { flag: "🇸🇦", code: "SAU", gradient: "from-green-600/90 to-emerald-700/90 text-white", text: "Saudi Arabia" },
  saudi_arabia: { flag: "🇸🇦", code: "SAU", gradient: "from-green-600/90 to-emerald-700/90 text-white", text: "Saudi Arabia" },
  sri_lanka: { flag: "🇱🇰", code: "LKA", gradient: "from-purple-600/90 to-indigo-800/90 text-white", text: "Sri Lanka" },
  sri_lankan: { flag: "🇱🇰", code: "LKA", gradient: "from-purple-600/90 to-indigo-800/90 text-white", text: "Sri Lanka" },
  yemen: { flag: "🇾🇪", code: "YEM", gradient: "from-red-600/90 to-amber-700/90 text-white", text: "Yemen" },
  yemeni: { flag: "🇾🇪", code: "YEM", gradient: "from-red-600/90 to-amber-700/90 text-white", text: "Yemen" },
};

const DEFAULT_GRADIENT = "from-slate-600/90 to-gray-700/90 text-white";

const PIE_COLORS = [
  "hsl(221 83% 53%)", "hsl(142 71% 45%)", "hsl(35 92% 55%)",
  "hsl(340 75% 55%)", "hsl(262 83% 58%)", "hsl(175 80% 40%)",
  "hsl(0 0% 60%)",
];

function getMeta(name: string) {
  const key = name.toLowerCase().trim().replace(/[\s-]/g, "_");
  return (
    NATIONALITY_METADATA[key] || {
      flag: "🌐",
      code: name.slice(0, 3).toUpperCase(),
      gradient: DEFAULT_GRADIENT,
      text: name,
    }
  );
}

export default function WorkforceTreemap({ data, totalCount }: Props) {
  const [viewMode, setViewMode] = useState<"mosaic" | "donut">("mosaic");
  const [activeNationality, setActiveNationality] = useState<string | null>(null);

  const safeTotal = totalCount > 0 ? totalCount : 1;

  return (
    <Card className="overflow-hidden border border-border/80 shadow-xs">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Globe2 size={18} className="text-primary" />
            Workforce Demographic Mosaic
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Breakdown across {data.length} nationalities ({totalCount.toLocaleString()} total inmates)
          </p>
        </div>

        {/* View Switcher: Mosaic Treemap vs Donut */}
        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border/60">
          <button
            onClick={() => setViewMode("mosaic")}
            title="Mosaic Treemap View"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "mosaic"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid size={12} />
            Mosaic
          </button>
          <button
            onClick={() => setViewMode("donut")}
            title="Donut Chart View"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "donut"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PieIcon size={12} />
            Donut
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-xs">
            No demographic data available for active occupants.
          </div>
        ) : viewMode === "mosaic" ? (
          /* MOSAIC TREEMAP VIEW */
          <div className="space-y-3">
            {/* Treemap Grid: Main 2 large tiles + flexible smaller tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-h-[220px]">
              {data.map((item, idx) => {
                const meta = getMeta(item.name);
                const pct = Math.round((item.value / safeTotal) * 100);
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isSelected = activeNationality === item.name;

                return (
                  <div
                    key={item.name}
                    onClick={() => setActiveNationality(isSelected ? null : item.name)}
                    className={`group relative flex flex-col justify-between p-3 rounded-xl bg-gradient-to-br ${meta.gradient} transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02] ${
                      isTop1
                        ? "col-span-2 row-span-2 md:col-span-2 min-h-[140px]"
                        : isTop2
                        ? "col-span-2 md:col-span-2 min-h-[100px]"
                        : "col-span-1 min-h-[85px]"
                    } ${isSelected ? "ring-4 ring-primary ring-offset-2 scale-[1.03]" : ""}`}
                  >
                    {/* Top Row: Flag + ISO Badge + Percentage */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl leading-none drop-shadow-xs">{meta.flag}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black/25 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          {meta.code}
                        </span>
                      </div>
                      <Badge className="bg-white/20 text-white font-bold text-[10px] px-1.5 py-0.2 border-0 backdrop-blur-xs">
                        {pct}%
                      </Badge>
                    </div>

                    {/* Bottom Row: Country Name & Headcount */}
                    <div className="mt-2">
                      <p className={`font-bold tracking-tight drop-shadow-xs ${isTop1 ? "text-base" : "text-xs"}`}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-white/80 font-medium flex items-center gap-1 mt-0.5">
                        <Users size={10} className="opacity-80" />
                        {item.value.toLocaleString()} occupants
                      </p>
                    </div>

                    {/* Subtle hover sparkle */}
                    <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Sparkles size={11} className="text-white/60" />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
              <span className="text-[11px] font-medium text-foreground">
                Top Demographic: <strong className="text-primary">{data[0]?.name || "—"} ({Math.round(((data[0]?.value || 0) / safeTotal) * 100)}%)</strong>
              </span>
              <span className="text-[11px]">
                Click any tile to highlight
              </span>
            </div>
          </div>
        ) : (
          /* DONUT CHART VIEW (Fallback / Alternative) */
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {data.map((n, i) => (
                <div key={n.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{n.name}</span>
                  <span className="font-semibold">{Math.round((n.value / safeTotal) * 100)}%</span>
                </div>
              ))}
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={2} stroke="none">
                    {data.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
