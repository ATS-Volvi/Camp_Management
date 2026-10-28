import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface Props {
  rows: Record<string, string | number>[];
  series: string[];
  money?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  onDrillDown?: (row: Record<string, string | number>, series: string) => void;
}

export function DashboardBarChart({ rows, series, money = false, stacked = false, horizontal = false, onDrillDown }: Props) {
  if (!rows.length) return <p className="py-12 text-center text-sm text-muted-foreground">No records in this selection</p>;
  return <div className="h-[250px] min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 12, right: 8, bottom: 10, left: 0 }}>
    <CartesianGrid stroke="hsl(var(--border))" vertical={horizontal} horizontal={!horizontal} strokeDasharray="3 3" />
    {horizontal ? <><XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={money} tickFormatter={v => money ? `${(Number(v) / 1000).toFixed(0)}k` : String(v)} /><YAxis type="category" dataKey="name" width={90} interval={0} tick={{ fontSize: 10 }} tickFormatter={v => String(v).length > 14 ? `${String(v).slice(0, 12)}…` : String(v)} /></> : <><XAxis dataKey="name" interval={0} tick={{ fontSize: 10 }} height={40} /><YAxis width={48} tick={{ fontSize: 10 }} allowDecimals={money} tickFormatter={v => money ? `${(Number(v) / 1000).toFixed(0)}k` : String(v)} /></>}
    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: 8 }} formatter={v => money ? `SAR ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : Number(v).toLocaleString()} />
    <Legend wrapperStyle={{ fontSize: 11 }} />
    {series.map((key, i) => <Bar key={key} dataKey={key} stackId={stacked ? "total" : undefined} fill={`hsl(var(--chart-${i % 5 + 1}))`} maxBarSize={32} radius={[3, 3, 0, 0]} cursor={onDrillDown ? "pointer" : undefined} onClick={entry => { if (entry?.payload) onDrillDown?.(entry.payload, key); }} />)}
  </BarChart></ResponsiveContainer></div>;
}