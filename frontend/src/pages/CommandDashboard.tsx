import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { format, startOfYear, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Building2, DollarSign, Users, BedDouble, Globe2, FileClock, RefreshCw, ArrowUpRight, UtensilsCrossed, ShieldCheck, Sun, Moon } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useCommandDashboard } from "@/hooks/useCommandDashboard";
import { useRevenueData, buildRevenueRows } from "@/components/reports/RevenueReportTab";
import { residentsAt, contractStatus } from "@/lib/commandDashboard";
import "@/components/dashboard/command-dashboard.css";
import { DashboardBarChart } from "@/components/dashboard/DashboardBarChart";
import { ChartDrilldown, type ChartSelection } from "@/components/dashboard/ChartDrilldown";
import { employeeRecord, revenueRecord, roomRecord, selectChartRecords } from "@/lib/dashboardDrilldown";
import { ExpertiseBoard } from "@/components/dashboard/ExpertiseBoard";

type View = "board" | "utilization" | "snapshot" | "contracts" | "expertise";
const titles: Record<View, string> = { board: "Board Overview", utilization: "Camp Utilization & Departments", snapshot: "Monthly Board Snapshot", contracts: "Contract Overview", expertise: "Expertise Camps — Board Dashboard" };
const colors = [1, 2, 3, 4, 5].map(i => `hsl(var(--chart-${i}))`);
const money = (n: number) => `SAR ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const percent = (n: number, total: number) => total ? `${(n / total * 100).toFixed(1)}%` : "0.0%";
const tooltip = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: 8 };

function Panel({ title, icon, children, className = "" }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return <Card className={`command-panel ${className}`}><h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">{icon}<span>{title}</span></h2>{children}</Card>;
}
function Metric({ label, value, detail, tone = "" }: { label: string; value: ReactNode; detail?: ReactNode; tone?: string }) {
  return <div className="command-metric"><p className="text-xs text-muted-foreground mb-1">{label}</p><p className={`text-xl font-bold break-words ${tone}`}>{value}</p>{detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}</div>;
}
function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold text-foreground flex items-center gap-3"><span>{children}</span><span className="h-px bg-border flex-1" /></h2>;
}
function Donut({ rows, onDrillDown }: { rows: { name: string; value: number }[]; onDrillDown: (name: string) => void }) {
  return rows.length ? <><div className="h-[170px]"><ResponsiveContainer><PieChart><Pie data={rows} onClick={row => onDrillDown(row.name)} cursor="pointer" dataKey="value" innerRadius={49} outerRadius={70} paddingAngle={2} stroke="none">{rows.map((r, i) => <Cell key={r.name} fill={colors[i % colors.length]} />)}</Pie><Tooltip contentStyle={tooltip} /></PieChart></ResponsiveContainer></div><div className="space-y-2">{rows.map((r, i) => <Button variant="ghost" size="sm" key={r.name} className="flex w-full items-center gap-2 text-xs" onClick={() => onDrillDown(r.name)}><span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} /><span className="flex-1">{r.name}</span><span>{r.value.toLocaleString()}</span></Button>)}</div></> : <p className="py-12 text-center text-sm text-muted-foreground">No records in this selection</p>;
}

export default function CommandDashboard({ view }: { view: View }) {
  const [chartSelection, setChartSelection] = useState<ChartSelection | null>(null);
  const [dashboardTheme, setDashboardTheme] = useState<"light" | "dark">(() => {
    try { return localStorage.getItem("camp365-dashboard-theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });
  const changeDashboardTheme = (theme: "light" | "dark") => {
    setDashboardTheme(theme);
    try { localStorage.setItem("camp365-dashboard-theme", theme); } catch { /* Theme still works without storage. */ }
  };
  const today = format(new Date(), "yyyy-MM-dd");
  const [from, setFrom] = useState(format(startOfYear(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [camp, setCamp] = useState("all");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const monthDate = new Date(`${month || today.slice(0, 7)}-01T12:00:00`);
  const fromDate = view === "snapshot" ? format(startOfMonth(monthDate), "yyyy-MM-dd") : from;
  const toDate = view === "snapshot" ? format(endOfMonth(monthDate), "yyyy-MM-dd") : to;
  const validDates = Boolean(fromDate && toDate && fromDate <= toDate);
  const safeFrom = validDates ? fromDate : today;
  const safeTo = validDates ? toDate : today;
  const snapshotAt = `${safeTo < today ? safeTo : today}T23:59:59`;
  const query = useCommandDashboard();
  const revenue = useRevenueData(safeFrom, safeTo);
  const trendStart = format(startOfMonth(subMonths(new Date(`${safeTo}T12:00:00`), 5)), "yyyy-MM-dd");
  const trendQuery = useRevenueData(trendStart, safeTo);
  const yearStart = format(startOfYear(new Date(`${safeTo}T12:00:00`)), "yyyy-MM-dd");
  const boardRevenue = useRevenueData(view === "expertise" ? yearStart : trendStart, safeTo);
  const data = query.data;
  const empMap = useMemo(() => new Map((data?.employees ?? []).map(e => [e.id, e])), [data]);
  const departments = [...new Set((data?.employees ?? []).map(e => e.department).filter((d): d is string => Boolean(d)))].sort();
  const match = (campId: string | null | undefined, empId: string) => (camp === "all" || camp === campId) && (department === "all" || empMap.get(empId)?.department === department);
  const residents = residentsAt(data?.checkIns ?? [], data?.checkOuts ?? [], snapshotAt).filter(e => match(e.camp_id, e.employee_id));
  const rooms = (data?.rooms ?? []).filter(r => camp === "all" || camp === r.camp_id);
  const capacity = rooms.reduce((s, r) => s + r.max_capacity, 0);
  const sourceMap = new Map((revenue.data?.checkIns ?? []).map(ci => [ci.id, ci]));
  const costRows = buildRevenueRows(revenue.data, safeFrom, safeTo).filter(r => { const ci = sourceMap.get(r.id); return ci && match(ci.camp_id, ci.employee_id); });
  const total = costRows.reduce((s, r) => s + r.total, 0);
  const rent = costRows.reduce((s, r) => s + r.roomRevenue, 0);
  const food = costRows.reduce((s, r) => s + r.foodRevenue, 0);
  const selectedCamps = (data?.camps ?? []).filter(c => camp === "all" || camp === c.id);
  const camps = selectedCamps.map(c => {
    const cap = rooms.filter(r => r.camp_id === c.id).reduce((s, r) => s + r.max_capacity, 0);
    const count = residents.filter(r => r.camp_id === c.id).length;
    const amount = costRows.filter(r => sourceMap.get(r.id)?.camp_id === c.id).reduce((s, r) => s + r.total, 0);
    return { ...c, cap, count, amount };
  });
  const contributors = [...camps].sort((a, b) => b.amount - a.amount);
  const grouping = (key: "nationality" | "department") => {
    const map = new Map<string, number>();
    residents.forEach(r => { const name = empMap.get(r.employee_id)?.[key] || "Not recorded"; map.set(name, (map.get(name) ?? 0) + 1); });
    return [...map].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  const nationalities = grouping("nationality");
  const depts = grouping("department").map(d => ({ ...d, amount: costRows.filter(r => r.department === d.name).reduce((s, r) => s + r.total, 0) }));
  const occupiedRooms = new Set(residents.map(r => r.room_id)).size;
  const presence = residents.reduce<Record<string, number>>((acc, r) => {
    const log = (data?.presence ?? []).filter(l => l.employee_id === r.employee_id && l.effective_from <= snapshotAt && (!l.effective_to || l.effective_to > snapshotAt)).sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
    const key = log?.to_status ?? "active"; acc[key] = (acc[key] ?? 0) + 1; return acc;
  }, {});
  const trend = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(`${safeTo}T12:00:00`), 5 - i);
    const start = format(startOfMonth(date), "yyyy-MM-dd");
    const end = i === 5 ? safeTo : format(endOfMonth(date), "yyyy-MM-dd");
    const sources = new Map((trendQuery.data?.checkIns ?? []).map(ci => [ci.id, ci]));
    const rows = buildRevenueRows(trendQuery.data, start, end).filter(r => { const ci = sources.get(r.id); return ci && match(ci.camp_id, ci.employee_id); });
    return { name: format(date, "MMM yy"), Room: rows.reduce((s, r) => s + r.roomRevenue, 0), Food: rows.reduce((s, r) => s + r.foodRevenue, 0) };
  });
  const campEmpIds = new Set(residents.map(r => r.employee_id));
  const contracts = (data?.employees ?? []).filter(e => (camp === "all" || campEmpIds.has(e.id)) && (department === "all" || e.department === department)).map(e => ({ ...e, contractStatus: contractStatus(e.contract_end_date, today) }));
  const contractGroups = ["Active", "Expiring ≤ 90 days", "Expired", "No end date"].map(name => ({ name, value: contracts.filter(e => e.contractStatus === name).length })).filter(r => r.value);
  const contractRows = contracts.filter(e => (status === "all" || e.contractStatus === status) && `${e.name} ${e.supplier_name ?? ""} ${e.employee_id}`.toLowerCase().includes(search.toLowerCase()));
  const isError = query.isError || (view !== "contracts" && (revenue.isError || trendQuery.isError));
  const boardMonths = Array.from({ length: 12 }, (_, i) => new Date(`${safeTo.slice(0, 4)}-${String(i + 1).padStart(2, "0")}-01T12:00:00`));
  const boardSources = new Map((boardRevenue.data?.checkIns ?? []).map(ci => [ci.id, ci]));
  const boardMonthlyRows = view === "expertise" ? boardMonths.map(date => {
    const start = format(date, "yyyy-MM-dd");
    if (start > safeTo) return null;
    const end = format(endOfMonth(date), "yyyy-MM-dd");
    return buildRevenueRows(boardRevenue.data, start, end < safeTo ? end : safeTo).filter(row => {
      const ci = boardSources.get(row.id); return ci && match(ci.camp_id, ci.employee_id);
    });
  }) : [];

  const residentRecords = (events = residents) => events.flatMap(event => {
    const employee = empMap.get(event.employee_id);
    const room = data?.rooms.find(r => r.id === event.room_id);
    const campName = data?.camps.find(c => c.id === event.camp_id)?.name;
    const log = (data?.presence ?? []).filter(l => l.employee_id === event.employee_id && l.effective_from <= snapshotAt && (!l.effective_to || l.effective_to > snapshotAt)).sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
    return employee ? [employeeRecord(employee, { Camp: campName, Room: room?.room_number, Block: room?.buildings?.name, "Check-in": event.check_in_date, "Food required": event.food_required, Presence: log?.to_status ?? "active" })] : [];
  });
  const openRevenue = (title: string, rows = costRows, description = `${safeFrom} — ${safeTo}`) => setChartSelection({ title, description, rows: rows.map(revenueRecord) });
  const openResidents = (title: string, events = residents) => setChartSelection({ title, description: `Occupancy as of ${snapshotAt.slice(0, 10)}`, rows: residentRecords(events) });
  const openRooms = (title: string, selected = rooms) => setChartSelection({ title, description: `Occupancy as of ${snapshotAt.slice(0, 10)}`, rows: selected.map(r => roomRecord(r, data?.camps.find(c => c.id === r.camp_id)?.name ?? "—", residentRecords(residents.filter(e => e.room_id === r.id)))) });
  const openContract = (name: string) => setChartSelection({ title: `${name} contracts`, description: "Current employee contracts", rows: contracts.filter(e => e.contractStatus === name && (status === "all" || e.contractStatus === status) && `${e.name} ${e.supplier_name ?? ""} ${e.employee_id}`.toLowerCase().includes(search.toLowerCase())).map(e => employeeRecord(e, { "Contract status": e.contractStatus })) });
  const openTrend = (label: string, series: string, board = false, campName?: string) => {
    const dates = board ? boardMonths : Array.from({ length: 6 }, (_, i) => subMonths(new Date(`${safeTo}T12:00:00`), 5 - i));
    const date = dates.find(d => format(d, board ? "MMM" : "MMM yy") === label);
    if (!date) return;
    const start = format(startOfMonth(date), "yyyy-MM-dd");
    if (start > safeTo) return;
    const monthEnd = format(endOfMonth(date), "yyyy-MM-dd");
    const end = monthEnd < safeTo ? monthEnd : safeTo;
    const input = board ? boardRevenue.data : trendQuery.data;
    const sources = new Map((input?.checkIns ?? []).map(ci => [ci.id, ci]));
    const rows = buildRevenueRows(input, start, end).filter(row => { const ci = sources.get(row.id); return ci && match(ci.camp_id, ci.employee_id) && (!campName || row.camp === campName); });
    openRevenue(`${campName ? campName + " · " : ""}${label} · ${series}`, rows, `${start} — ${end}`);
  };
  const drillExpertise = (kind: string, name?: string, series?: string) => {
    if (kind === "revenue") openRevenue(`${series ?? "Total"} revenue`);
    if (kind === "occupancy") openResidents("Occupied beds");
    if (kind === "nationality") openResidents(`${name} residents`, residents.filter(r => (empMap.get(r.employee_id)?.nationality || "Not recorded") === name));
    if (kind === "trend") openTrend(name ?? "", series ?? "Revenue", true);
    if (kind === "heat") openTrend(series ?? "", "Revenue", true, name);
    if (kind === "camp") openRevenue(`${name} revenue`, costRows.filter(r => r.camp === name));
    if (kind === "roomStatus") {
      if (name === "No food") openResidents(name, residents.filter(r => r.food_required === false));
      else if (name === "On Site") openResidents(name, residents.filter(r => residentRecords([r])[0]?.fields.Presence === "on_site"));
      else openRooms(`${name} rooms`, rooms.filter(r => name === "Occupied" ? residents.some(e => e.room_id === r.id) : name === "Vacant" ? !residents.some(e => e.room_id === r.id) && !["under_maintenance", "reserved"].includes(r.status) : r.status === (name === "Maintenance" ? "under_maintenance" : "reserved")));
    }
  };

  return <div className="command-dashboard space-y-5" data-dashboard-theme={dashboardTheme}>
    <div className="flex justify-end">
      <div role="group" aria-label="Dashboard theme" className="inline-flex items-center gap-1 rounded-md border bg-card p-1">
        <Button size="sm" variant={dashboardTheme === "light" ? "default" : "ghost"} aria-pressed={dashboardTheme === "light"} onClick={() => changeDashboardTheme("light")}><Sun size={16} />Classic Light</Button>
        <Button size="sm" variant={dashboardTheme === "dark" ? "default" : "ghost"} aria-pressed={dashboardTheme === "dark"} onClick={() => changeDashboardTheme("dark")}><Moon size={16} />Soft Dark</Button>
      </div>
    </div>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-primary flex items-center gap-2 mb-2"><Building2 size={14} /> CAMP-365 COMMAND CENTER</p><h1 className="text-2xl font-bold">{titles[view]}</h1><p className="text-xs text-muted-foreground mt-2">{view === "contracts" ? "Employee contract expiry · Current records" : `${safeFrom} — ${safeTo} · Occupancy as of ${snapshotAt.slice(0, 10)}`}</p></div><Button variant="ghost" size="icon" aria-label="Refresh dashboard" onClick={() => { void query.refetch(); void revenue.refetch(); void trendQuery.refetch(); }}><RefreshCw /></Button></header>
    <div className="flex flex-wrap items-end gap-3 border-b pb-4">
      {view !== "contracts" && (view === "snapshot" ? <div className="space-y-1"><Label htmlFor="billing-month">Month</Label><Input id="billing-month" type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-44" /></div> : <><div className="space-y-1"><Label htmlFor="dashboard-from">From</Label><Input id="dashboard-from" type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div><div className="space-y-1"><Label htmlFor="dashboard-to">To</Label><Input id="dashboard-to" type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div><Button variant="outline" size="sm" onClick={() => { setFrom(format(startOfYear(new Date()), "yyyy-MM-dd")); setTo(today); }}>YTD</Button><Button variant="outline" size="sm" onClick={() => { setFrom(format(startOfMonth(new Date()), "yyyy-MM-dd")); setTo(today); }}>This month</Button></>)}
      <Select value={camp} onValueChange={setCamp}><SelectTrigger aria-label="Camp filter" className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Camps</SelectItem>{(data?.camps ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
      <Select value={department} onValueChange={setDepartment}><SelectTrigger aria-label="Department filter" className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
    </div>
    {!validDates && <p role="alert" className="text-destructive">Choose a valid date range; From must not be later than To.</p>}
    {view !== "expertise" && !isError && !query.isLoading && <div className="command-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {(view === "contracts" ? [
        { label: "Active", value: contracts.filter(e => e.contractStatus === "Active").length, icon: FileClock },
        { label: "Expiring ≤ 90 days", value: contracts.filter(e => e.contractStatus === "Expiring ≤ 90 days").length, icon: FileClock },
        { label: "Expired", value: contracts.filter(e => e.contractStatus === "Expired").length, icon: FileClock },
        { label: "No end date", value: contracts.filter(e => e.contractStatus === "No end date").length, icon: FileClock },
      ] : [
        { label: "Total Revenue", value: revenue.isLoading ? "—" : money(total), icon: DollarSign },
        { label: "Total Residents", value: residents.length, icon: Users },
        { label: "Camp Occupancy", value: percent(residents.length, capacity), icon: BedDouble },
        { label: "Vacant Rooms", value: rooms.filter(r => !residents.some(e => e.room_id === r.id) && !["under_maintenance", "reserved"].includes(r.status)).length, icon: Building2 },
      ]).map(item => <Card key={item.label} className="command-panel"><div className="flex justify-between gap-3 items-start"><div className="min-w-0"><p className="text-xs text-muted-foreground font-medium">{item.label}</p><p className="text-2xl font-bold mt-2 break-words" style={{ color: "hsl(var(--kpi-tone))" }}>{item.value}</p></div><item.icon className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--kpi-tone))" }} /></div></Card>)}
    </div>}
    {isError || (view === "expertise" && boardRevenue.isError) ? <p role="alert" className="py-12 text-destructive">Unable to load dashboard records. Please refresh.</p> : query.isLoading || (view !== "contracts" && revenue.isLoading) ? <p role="status" className="py-12 text-muted-foreground">Loading dashboard records…</p> : view === "expertise" ? <ExpertiseBoard onDrillDown={drillExpertise} camps={camps} total={total} room={rent} food={food} residents={residents.length} capacity={capacity} nationalities={nationalities} noFood={residents.filter(r => r.food_required === false).length} onSite={presence.on_site ?? 0} roomStatus={[
      { name: "Occupied", value: occupiedRooms },
      { name: "Vacant", value: rooms.filter(r => !residents.some(e => e.room_id === r.id) && !["under_maintenance", "reserved"].includes(r.status)).length },
      { name: "Maintenance", value: rooms.filter(r => r.status === "under_maintenance").length },
      { name: "Reserved", value: rooms.filter(r => r.status === "reserved").length },
    ]} months={boardMonths.map(date => format(date, "MMM"))} loadingTrend={boardRevenue.isLoading} trend={boardMonthlyRows.flatMap((rows, i) => rows === null ? [] : [{ name: format(boardMonths[i], "MMM"), Room: rows.reduce((sum, r) => sum + r.roomRevenue, 0), Food: rows.reduce((sum, r) => sum + r.foodRevenue, 0) }])} heatMap={camps.map(c => ({ name: c.name, values: boardMonthlyRows.map(rows => rows === null ? null : rows.filter(r => boardSources.get(r.id)?.camp_id === c.id).reduce((sum, r) => sum + r.total, 0)) }))} /> : view === "contracts" ? <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Contract status distribution"><Donut rows={contractGroups} onDrillDown={openContract} /></Panel>
        <Panel title="Contract Status — Employee Count"><DashboardBarChart rows={contractGroups.map(r => ({ name: r.name, Employees: r.value }))} series={["Employees"]} onDrillDown={row => openContract(String(row.name))} /></Panel>
      </div>
      <div><Panel title="Employee contract lifecycle"><div className="flex flex-wrap gap-3 mb-4"><Input aria-label="Search contracts" placeholder="Search employee or supplier" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-40" /><Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Contract status" className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["Active", "Expiring ≤ 90 days", "Expired", "No end date"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div><div className="overflow-auto max-h-[480px]"><table className="data-table"><thead><tr>{["Employee", "Supplier / Type", "Joined", "Contract End", "Status"].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{contractRows.map(e => <tr key={e.id}><td>{e.name}<p className="text-xs text-muted-foreground">{e.employee_id}</p></td><td>{e.supplier_name || e.employee_type}</td><td className="whitespace-nowrap">{e.join_date || "—"}</td><td className="whitespace-nowrap">{e.contract_end_date || "—"}</td><td className="text-xs whitespace-nowrap">{e.contractStatus}</td></tr>)}{!contractRows.length && <tr><td colSpan={5} className="text-muted-foreground">No matching contract records</td></tr>}</tbody></table></div></Panel></div>
      <Panel title="Commercial camp contracts" icon={<ShieldCheck size={16} />}><p className="text-sm text-muted-foreground">No commercial contract records are available. Vendor agreements, contract values, owners and renewal stages are not recorded.</p></Panel>
    </> : <>
      <SectionTitle>Charts & insights</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Panel title="Revenue Trend — Last 6 Months"><DashboardBarChart rows={trend} series={["Room", "Food"]} money stacked onDrillDown={(row, series) => openTrend(String(row.name), series)} /></Panel>
        <Panel title="Designed vs Occupied Beds"><DashboardBarChart rows={camps.map(c => ({ name: c.name, Designed: c.cap, Occupied: c.count }))} series={["Designed", "Occupied"]} horizontal onDrillDown={(row, series) => { const c = camps.find(c => c.name === row.name); if (!c) return; if (series === "Occupied") openResidents(`${c.name} residents`, residents.filter(r => r.camp_id === c.id)); else openRooms(`${c.name} rooms`, rooms.filter(r => r.camp_id === c.id)); }} /></Panel>
        <Panel title="Revenue Mix"><Donut rows={[{ name: "Room", value: rent }, { name: "Food", value: food }].filter(r => r.value > 0)} onDrillDown={name => openRevenue(`${name} revenue`)} /></Panel>
        <Panel title="Nationality Mix" icon={<Globe2 size={16} />}><Donut rows={nationalities} onDrillDown={name => openResidents(`${name} residents`, residents.filter(r => (empMap.get(r.employee_id)?.nationality || "Not recorded") === name))} /></Panel>
        <Panel title="Department Revenue"><DashboardBarChart rows={depts.map(d => ({ name: d.name, Revenue: d.amount }))} series={["Revenue"]} money horizontal onDrillDown={row => openRevenue(`${row.name} revenue`, selectChartRecords(costRows, r => r.department, String(row.name)))} /></Panel>
        <Panel title="Resident Status"><Donut rows={[["Active", "active"], ["Vacation", "vacation"], ["On Site", "on_site"], ["Away", "away"]].map(([name, key]) => ({ name, value: presence[key] ?? 0 })).filter(r => r.value > 0)} onDrillDown={name => { const key = ({ Active: "active", Vacation: "vacation", "On Site": "on_site", Away: "away" } as Record<string, string>)[name]; openResidents(`${name} residents`, residents.filter(r => residentRecords([r])[0]?.fields.Presence === key)); }} /></Panel>
      </div>
      <SectionTitle>Revenue & resident overview</SectionTitle>
      <div className="command-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Panel title="Total Revenue" icon={<DollarSign size={16} />}><Metric label="Selected period" value={money(total)} tone="text-primary" /><Metric label="Room / Food" value={<span className="text-sm">{money(rent)} / {money(food)}</span>} /></Panel>
        <Panel title="Camp Occupancy" icon={<BedDouble size={16} />}><Metric label="Occupied beds / Designed beds" value={percent(residents.length, capacity)} detail={`${residents.length.toLocaleString()} / ${capacity.toLocaleString()} beds`} tone="text-campgreen" /><div className="h-2 bg-muted rounded-full overflow-hidden mt-4"><div className="h-full bg-campgreen" style={{ width: `${Math.min(capacity ? residents.length / capacity * 100 : 0, 100)}%` }} /></div></Panel>
        <Panel title={view === "utilization" ? "Check-In / Check-Out" : "Revenue Contributors"} icon={<Users size={16} />}>{view === "utilization" ? <><Metric label="Check-ins in period" value={(data?.checkIns ?? []).filter(e => e.check_in_date >= `${safeFrom}T00:00:00` && e.check_in_date <= `${safeTo}T23:59:59` && match(e.camp_id, e.employee_id)).length} /><Metric label="Check-outs in period" value={(data?.checkOuts ?? []).filter(e => e.check_out_date >= `${safeFrom}T00:00:00` && e.check_out_date <= `${safeTo}T23:59:59` && match(e.camp_id, e.employee_id)).length} /></> : <><Metric label="Highest contributor" value={contributors[0]?.name ?? "—"} detail={`${money(contributors[0]?.amount ?? 0)} · ${percent(contributors[0]?.amount ?? 0, total)}`} /><Metric label="Lowest contributor" value={contributors.at(-1)?.name ?? "—"} detail={money(contributors.at(-1)?.amount ?? 0)} /></>}</Panel>
        <Panel title="People Status" icon={<Users size={16} />}><Metric label="Active" value={presence.active ?? 0} /><div className="grid grid-cols-3 gap-2 pt-3">{[["Vacation", "vacation"], ["On Site", "on_site"], ["Away", "away"]].map(([label, key]) => <div key={key}><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold mt-1">{presence[key] ?? 0}</p></div>)}</div></Panel>
      </div>
      <SectionTitle>Camp utilization — Designed vs Actual</SectionTitle>
      {view === "snapshot" ? <Panel title="Camp occupancy & revenue"><div className="overflow-auto"><table className="data-table"><thead><tr>{["Camp", "Designed Beds", "Occupied Beds", "Occupancy", "Revenue", "Share"].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{camps.map(c => <tr key={c.id}><td><Link className="text-primary" to={`/camps/${c.id}`}>{c.name}</Link></td><td>{c.cap}</td><td>{c.count}</td><td>{percent(c.count, c.cap)}</td><td className="whitespace-nowrap">{money(c.amount)}</td><td>{percent(c.amount, total)}</td></tr>)}</tbody></table></div></Panel> : <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{camps.map(c => <Panel key={c.id} title={c.name} icon={<Building2 size={14} />}><div className="grid grid-cols-2 gap-3"><Metric label="Designed beds" value={c.cap.toLocaleString()} /><Metric label="Actual residents" value={c.count.toLocaleString()} tone="text-primary" /></div><p className="text-xs text-campgreen mt-2">{percent(c.count, c.cap)} occupied</p><Metric label="Period revenue" value={money(c.amount)} detail={`${percent(c.amount, total)} of total`} /><Button asChild variant="ghost" size="sm" className="w-full justify-between mt-2"><Link to={`/camps/${c.id}`}>View camp<ArrowUpRight /></Link></Button></Panel>)}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Rooms & Food" icon={<UtensilsCrossed size={16} />}><div className="grid grid-cols-2 gap-x-4"><Metric label="Occupied rooms" value={occupiedRooms} /><Metric label="Vacant rooms" value={rooms.filter(r => !residents.some(e => e.room_id === r.id) && !["under_maintenance", "reserved"].includes(r.status)).length} /><Metric label="Under maintenance" value={rooms.filter(r => r.status === "under_maintenance").length} tone="text-amber" /><Metric label="Reserved rooms" value={rooms.filter(r => r.status === "reserved").length} /><Metric label="Food opted out" value={residents.filter(e => e.food_required === false).length} /><Metric label="Available bed capacity" value={Math.max(0, capacity - residents.length)} /></div></Panel>
        <Panel title="Demographic Coverage" icon={<ShieldCheck size={16} />}><Metric label="Nationality recorded" value={percent(residents.filter(e => empMap.get(e.employee_id)?.nationality).length, residents.length)} /><Metric label="Age / Under 50 / 50+" value="Not recorded" detail="Birth dates are not available in employee records." /><Metric label="Faith mix" value="Not recorded" detail="Faith is not captured in employee records." /></Panel>
      </div>
      <div><Panel title="Departments — Residents, Value & Share"><div className="overflow-auto max-h-80"><table className="data-table"><thead><tr>{["Department", "Residents", "Period Value", "%"].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{depts.map(d => <tr key={d.name}><td>{d.name}</td><td>{d.value}</td><td className="whitespace-nowrap">{money(d.amount)}</td><td>{percent(d.amount, total)}</td></tr>)}{!depts.length && <tr><td colSpan={4}>No resident records</td></tr>}</tbody></table></div></Panel></div>
    </>}
    <ChartDrilldown selection={chartSelection} onClose={() => setChartSelection(null)} theme={dashboardTheme} />
  </div>;
}