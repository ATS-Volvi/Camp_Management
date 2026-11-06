import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface Props {
  rows: Record<string, string | number>[];
  series: string[];
  money?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  /** Full labels shown in the tooltip when the axis only has room for a short form. */
  tooltipLabels?: Record<string, string>;
  /** Minimum horizontal room per bar; the chart scrolls sideways when labels would collide. */
  minBarSlot?: number;
  onDrillDown?: (row: Record<string, string | number>, series: string) => void;
}

export function DashboardBarChart({ rows, series, money = false, stacked = false, horizontal = false, tooltipLabels, minBarSlot, onDrillDown }: Props) {
  if (!rows.length) return <p className="py-12 text-center text-sm text-muted-foreground">No records in this selection</p>;
  const chart = <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 12, right: minBarSlot ? 26 : 8, bottom: 10, left: 0 }}>
    <CartesianGrid stroke="hsl(var(--border))" vertical={horizontal} horizontal={!horizontal} strokeDasharray="3 3" />
    {horizontal ? <><XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={money} tickFormatter={v => money ? `${(Number(v) / 1000).toFixed(0)}k` : String(v)} /><YAxis type="category" dataKey="name" width={120} interval={0} tick={{ fontSize: 10 }} tickFormatter={v => String(v).length > 20 ? `${String(v).slice(0, 18)}…` : String(v)} /></> : <><XAxis dataKey="name" interval={0} tick={{ fontSize: 10 }} height={40} /><YAxis width={48} tick={{ fontSize: 10 }} allowDecimals={money} tickFormatter={v => money ? `${(Number(v) / 1000).toFixed(0)}k` : String(v)} /></>}
    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: 8 }} labelFormatter={v => tooltipLabels?.[String(v)] ?? String(v)} formatter={v => money ? `SAR ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : Number(v).toLocaleString()} />
    <Legend wrapperStyle={{ fontSize: 11 }} />
    {series.map((key, i) => <Bar key={key} dataKey={key} stackId={stacked ? "total" : undefined} fill={`hsl(var(--chart-${i % 5 + 1}))`} maxBarSize={32} radius={[3, 3, 0, 0]} cursor={onDrillDown ? "pointer" : undefined} onClick={entry => { if (entry?.payload) onDrillDown?.(entry.payload, key); }} />)}
  </BarChart></ResponsiveContainer>;
  if (!minBarSlot) return <div className="h-[250px] min-w-0">{chart}</div>;
  return <div className="h-[250px] min-w-0 overflow-x-auto"><div className="h-full" style={{ minWidth: rows.length * minBarSlot }}>{chart}</div></div>;
}
