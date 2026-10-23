import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Package, CheckCircle2, Wrench, AlertTriangle, UserCheck, Boxes, RotateCcw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PastelKpiCard } from "@/components/ui/pastel-kpi";

interface Props { assets: any[]; camps: any[]; rooms: any[] }

const ALL = "all";
const UNASSIGNED = "__unassigned";
const condLabel: Record<string, string> = { good: "In Use", repair: "Repair", damaged: "Damaged" };
const condColor: Record<string, string> = { good: "hsl(var(--campman-green))", repair: "hsl(var(--campman-amber))", damaged: "hsl(var(--destructive))" };

function FilterSelect({ label, value, onChange, options, allLabel }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; allLabel: string }) {
  return (
    <div className="space-y-1 min-w-[160px] flex-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function AssetDashboard({ assets, camps, rooms }: Props) {
  const [camp, setCamp] = useState(ALL);
  const [block, setBlock] = useState(ALL);
  const [room, setRoom] = useState(ALL);
  const [assetName, setAssetName] = useState(ALL);
  const [assignee, setAssignee] = useState(ALL);

  const roomMap = useMemo(() => Object.fromEntries(rooms.map((r: any) => [r.id, r])), [rooms]);
  const campName = useMemo(() => Object.fromEntries(camps.map((c: any) => [c.id, c.name])), [camps]);
  const blockOf = (a: any) => roomMap[a.room_id]?.building_id as string | undefined;

  // Cascading options
  const blockOptions = useMemo(() => {
    const m = new Map<string, string>();
    rooms.forEach((r: any) => { if (r.building_id && (camp === ALL || r.camp_id === camp)) m.set(r.building_id, r.buildings?.name || "Block"); });
    return [...m].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [rooms, camp]);
  const roomOptions = useMemo(() => rooms
    .filter((r: any) => (camp === ALL || r.camp_id === camp) && (block === ALL || r.building_id === block))
    .map((r: any) => ({ value: r.id, label: r.room_number }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })), [rooms, camp, block]);
  const nameOptions = useMemo(() => [...new Set(assets.map(a => a.name))].sort().map(n => ({ value: n, label: n })), [assets]);
  const assigneeOptions = useMemo(() => [
    { value: UNASSIGNED, label: "Unassigned" },
    ...[...new Set(assets.map(a => a.assigned_to).filter(Boolean))].sort().map(n => ({ value: n, label: n })),
  ], [assets]);

  const filtered = assets.filter(a =>
    (camp === ALL || a.camp_id === camp) &&
    (block === ALL || blockOf(a) === block) &&
    (room === ALL || a.room_id === room) &&
    (assetName === ALL || a.name === assetName) &&
    (assignee === ALL || (assignee === UNASSIGNED ? !a.assigned_to : a.assigned_to === assignee))
  );

  const count = (c: string) => filtered.filter(a => a.condition === c).length;
  const assigned = filtered.filter(a => a.assigned_to).length;
  const categories = new Set(filtered.map(a => a.category)).size;

  const pieData = ["good", "repair", "damaged"].map(c => ({ key: c, name: condLabel[c], value: count(c), color: condColor[c] })).filter(d => d.value > 0);
  const byCategory = Object.entries(filtered.reduce<Record<string, number>>((m, a) => { m[a.category] = (m[a.category] || 0) + 1; return m; }, {}))
    .map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const byCamp = Object.entries(filtered.reduce<Record<string, Record<string, number>>>((m, a) => {
    const k = campName[a.camp_id] || "—"; m[k] = m[k] || { good: 0, repair: 0, damaged: 0 }; m[k][a.condition]++; return m;
  }, {})).map(([name, v]) => ({ name, ...v }));
  const attention = filtered.filter(a => a.condition !== "good").slice(0, 8);

  const reset = () => { setCamp(ALL); setBlock(ALL); setRoom(ALL); setAssetName(ALL); setAssignee(ALL); };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-3 items-end">
          <FilterSelect label="Camp Name" value={camp} allLabel="All Camps" onChange={v => { setCamp(v); setBlock(ALL); setRoom(ALL); }} options={camps.map((c: any) => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Block Name" value={block} allLabel="All Blocks" onChange={v => { setBlock(v); setRoom(ALL); }} options={blockOptions} />
          <FilterSelect label="Room" value={room} allLabel="All Rooms" onChange={setRoom} options={roomOptions} />
          <FilterSelect label="Asset Name" value={assetName} allLabel="All Assets" onChange={setAssetName} options={nameOptions} />
          <FilterSelect label="Assigned To" value={assignee} allLabel="Everyone" onChange={setAssignee} options={assigneeOptions} />
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw size={14} className="mr-1" /> Reset</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <PastelKpiCard compact label="Total Assets" value={filtered.length} icon={Package} tone="blue" />
        <PastelKpiCard compact label="In Use" value={count("good")} icon={CheckCircle2} tone="mint" />
        <PastelKpiCard compact label="Needs Repair" value={count("repair")} icon={Wrench} tone="amber" />
        <PastelKpiCard compact label="Damaged" value={count("damaged")} icon={AlertTriangle} tone="rose" />
        <PastelKpiCard compact label="Assigned" value={assigned} icon={UserCheck} tone="violet" hint={`${filtered.length - assigned} unassigned`} />
        <PastelKpiCard compact label="Categories" value={categories} icon={Boxes} tone="teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Condition</CardTitle></CardHeader>
          <CardContent>
            {pieData.length ? (
              <div className="flex items-center justify-center gap-6">
                <ResponsiveContainer width={150} height={150}>
                  <PieChart><Pie data={pieData} innerRadius={42} outerRadius={68} dataKey="value" strokeWidth={0}>
                    {pieData.map(d => <Cell key={d.key} fill={d.color} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 text-sm">{pieData.map(d => (
                  <div key={d.key} className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />{d.name}: <b>{d.value}</b></div>
                ))}</div>
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-10">No assets match these filters</p>}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Assets by Category</CardTitle></CardHeader>
          <CardContent className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Condition by Camp</CardTitle></CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCamp}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
                {["good", "repair", "damaged"].map(c => <Bar key={c} dataKey={c} name={condLabel[c]} stackId="a" fill={condColor[c]} />)}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Needs Attention</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Location</TableHead><TableHead>Assigned To</TableHead><TableHead>Last Maint.</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {attention.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">All assets in good condition</TableCell></TableRow>
                ) : attention.map(a => {
                  const r = roomMap[a.room_id];
                  return (
                    <TableRow key={a.id}>
                      <TableCell><Link to={`/assets/${a.id}`} className="font-medium text-primary hover:underline">{a.name}</Link><div className="text-xs text-muted-foreground font-mono">{a.asset_id}</div></TableCell>
                      <TableCell className="text-xs">{campName[a.camp_id] || "—"}{r ? ` · ${r.buildings?.name || ""} ${r.room_number}` : ""}</TableCell>
                      <TableCell className="text-xs">{a.assigned_to || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{a.last_maintenance_date || "—"}</TableCell>
                      <TableCell><Badge variant={a.condition === "damaged" ? "destructive" : "secondary"}>{condLabel[a.condition]}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
