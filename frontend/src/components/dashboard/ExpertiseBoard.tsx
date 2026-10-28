import { Link } from "react-router-dom";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardBarChart } from "./DashboardBarChart";

interface CampRow { id: string; name: string; cap: number; count: number; amount: number }
interface Props {
  onDrillDown: (kind: string, name?: string, series?: string) => void;
  camps: CampRow[];
  total: number;
  room: number;
  food: number;
  residents: number;
  capacity: number;
  nationalities: { name: string; value: number }[];
  roomStatus: { name: string; value: number }[];
  noFood: number;
  onSite: number;
  trend: Record<string, string | number>[];
  months: string[];
  heatMap: { name: string; values: (number | null)[] }[];
  loadingTrend: boolean;
}
const money = (value: number) => `SAR ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const share = (value: number, total: number) => `${(total ? value / total * 100 : 0).toFixed(1)}%`;
const colors = Array.from({ length: 5 }, (_, i) => `hsl(var(--chart-${i + 1}))`);
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card className="command-panel"><h2 className="text-base font-semibold mb-4">{title}</h2>{children}</Card>;
}
function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="min-w-0 py-2"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold mt-1 break-words">{value}</p>{detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}</div>;
}
export function ExpertiseBoard(props: Props) {
  const { camps, total, room, food, residents, capacity, nationalities, roomStatus, noFood, onSite, trend, months, heatMap, loadingTrend, onDrillDown } = props;
  const occupancy = capacity ? Math.min(100, residents / capacity * 100) : 0;
  const ranked = [...camps].sort((a, b) => b.amount - a.amount);
  const maximum = Math.max(0, ...heatMap.flatMap(row => row.values.map(v => v ?? 0)));
  return <>
    <div className="command-kpis grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Panel title="Total Revenue"><Stat label="Selected period" value={money(total)} /><DashboardBarChart rows={[{ name: "Revenue", Room: room, Food: food }]} series={["Room", "Food"]} money stacked onDrillDown={(_, series) => onDrillDown("revenue", undefined, series)} /></Panel>
      <Panel title="Camp Occupancy"><Stat label="Occupied / Designed beds" value={share(residents, capacity)} detail={`${residents.toLocaleString()} / ${capacity.toLocaleString()} beds`} /><div className="h-[200px] relative"><ResponsiveContainer><PieChart><Pie data={[{ value: occupancy }, { value: 100 - occupancy }]} onClick={(_, index) => onDrillDown(index === 0 ? "occupancy" : "roomStatus", "Vacant")} cursor="pointer" dataKey="value" startAngle={180} endAngle={0} cx="50%" cy="80%" innerRadius="65%" outerRadius="90%" stroke="none" isAnimationActive={false}><Cell fill="hsl(var(--chart-2))" /><Cell fill="hsl(var(--muted))" /></Pie></PieChart></ResponsiveContainer><p className="absolute bottom-8 inset-x-0 text-center text-2xl font-bold">{occupancy.toFixed(1)}%</p></div></Panel>
      <Panel title="Nationality & Faith Mix"><div className="h-[160px]"><ResponsiveContainer><PieChart><Pie data={nationalities} onClick={row => onDrillDown("nationality", row.name)} cursor="pointer" dataKey="value" nameKey="name" innerRadius={45} outerRadius={65} stroke="none">{nationalities.map((row, i) => <Cell key={row.name} fill={colors[i % 5]} />)}</Pie><Tooltip contentStyle={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" }} /></PieChart></ResponsiveContainer></div><div className="max-h-28 overflow-auto space-y-2">{nationalities.map((row, i) => <div key={row.name} className="text-xs flex items-center gap-2 cursor-pointer" role="button" tabIndex={0} onClick={() => onDrillDown("nationality", row.name)} onKeyDown={e => { if (e.key === "Enter") onDrillDown("nationality", row.name); }}><span className="h-2 w-2 rounded-full shrink-0" style={{ background: colors[i % 5] }} /><span className="flex-1">{row.name}</span><span>{share(row.value, residents)}</span></div>)}</div><p className="text-xs text-muted-foreground mt-4">Faith: Not recorded</p></Panel>
      <Panel title="Revenue Contributors"><Stat label="Highest contributor" value={ranked[0]?.name ?? "—"} detail={`${money(ranked[0]?.amount ?? 0)} · ${share(ranked[0]?.amount ?? 0, total)}`} /><div className="border-t my-3" /><Stat label="Lowest contributor" value={ranked.at(-1)?.name ?? "—"} detail={`${money(ranked.at(-1)?.amount ?? 0)} · ${share(ranked.at(-1)?.amount ?? 0, total)}`} /></Panel>
    </div>
    <h2 className="text-base font-semibold">Camps — Occupancy & Revenue</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{camps.map(camp => <Panel key={camp.id} title={camp.name}><Stat label="Occupancy" value={share(camp.count, camp.cap)} detail={`${camp.count} / ${camp.cap} beds`} /><div className="h-2 bg-muted rounded-full overflow-hidden my-2"><div className="h-full bg-campgreen" style={{ width: `${camp.cap ? Math.min(100, camp.count / camp.cap * 100) : 0}%` }} /></div><Stat label="Revenue" value={money(camp.amount)} /><Stat label="Revenue share" value={share(camp.amount, total)} /><Button asChild variant="ghost" size="sm" className="mt-2"><Link to={`/camps/${camp.id}`}>View camp</Link></Button></Panel>)}</div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Panel title="Room Status"><div className="grid grid-cols-2 gap-3">{roomStatus.map(row => <Button key={row.name} variant="ghost" className="h-auto justify-start text-left" onClick={() => onDrillDown("roomStatus", row.name)}><Stat label={row.name} value={row.value} /></Button>)}<Button variant="ghost" className="h-auto justify-start text-left" onClick={() => onDrillDown("roomStatus", "No food")}><Stat label="No food" value={noFood} /></Button><Button variant="ghost" className="h-auto justify-start text-left" onClick={() => onDrillDown("roomStatus", "On Site")}><Stat label="On Site" value={onSite} /></Button></div></Panel>
      <Panel title="Age Factor"><Stat label="Under 50" value="Not recorded" /><Stat label="50 & above" value="Not recorded" /><p className="text-sm text-muted-foreground mt-4">Birth dates are not available in employee records.</p></Panel>
      <Panel title="Revenue Trend & Heat Map">{loadingTrend ? <p role="status" className="text-sm text-muted-foreground">Loading monthly revenue…</p> : <><DashboardBarChart rows={trend} series={["Room", "Food"]} money stacked onDrillDown={(row, series) => onDrillDown("trend", String(row.name), series)} /><div className="overflow-x-auto"><table className="w-full text-xs border-separate border-spacing-1"><caption className="text-left text-muted-foreground mb-2">Monthly camp revenue · SAR</caption><thead><tr><th className="text-left font-medium">Camp</th>{months.map(month => <th className="font-normal text-muted-foreground" key={month}>{month}</th>)}</tr></thead><tbody>{heatMap.map(row => <tr key={row.name}><th className="text-left font-normal max-w-24 truncate" title={row.name}>{row.name}</th>{row.values.map((value, i) => <td key={i} title={`${row.name} · ${months[i]}: ${value === null ? "Future month" : money(value)}`} className="h-5 min-w-5 rounded-sm bg-muted">{value !== null && <Button variant="ghost" size="icon" aria-label={`${row.name} ${months[i]} revenue records`} className="h-5 w-full min-w-5 p-0" onClick={() => onDrillDown("heat", row.name, months[i])}>{value > 0 && <span className="block h-5 w-full rounded-sm bg-campgreen" style={{ opacity: 0.2 + 0.8 * (maximum ? value / maximum : 0) }} />}</Button>}</td>)}</tr>)}</tbody></table></div></>}</Panel>
    </div>
  </>;
}