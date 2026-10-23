import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, endOfMonth, parse, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import { Download, Printer, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildDepartmentStatementPdf, downloadStatementBlob, groupDepartmentStatements, statementAmount as fmt, type DepartmentStatement, type StatementLabels } from "./departmentStatement";
import { useRevenueData, buildRevenueRows, LeaveNotes } from "./RevenueReportTab";

const LABELS: StatementLabels = { title: "Supplier Monthly Costing Statement", chargeTo: "Charge to supplier", codeLabel: "Supplier Code", footer: "Supplier" };
const fileName = (s: string, m: string) => `supplier-costing-${s.replace(/[^a-z0-9_-]/gi, "-")}-${m}`;

export default function SupplierCostingReportTab() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [supplier, setSupplier] = useState("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const monthDate = parse(month + "-01", "yyyy-MM-dd", new Date());
  const fromDate = format(monthDate, "yyyy-MM-dd");
  const toDate = format(endOfMonth(monthDate), "yyyy-MM-dd");
  const { data, isLoading, isError, refetch } = useRevenueData(fromDate, toDate);
  const trendStart = format(subMonths(monthDate, 5), "yyyy-MM-dd");
  const { data: trendData, isLoading: trendLoading } = useRevenueData(trendStart, toDate);
  const trend = useMemo(() => {
    if (!trendData) return [];
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(monthDate, 5 - i);
      const rowsM = buildRevenueRows(trendData, format(m, "yyyy-MM-dd"), format(endOfMonth(m), "yyyy-MM-dd"))
        .filter((r: any) => r.supplier && r.supplier !== "Own" && r.supplier !== "—" && (supplier === "all" || r.supplier === supplier));
      const sum = (k: string) => Math.round(rowsM.reduce((s: number, r: any) => s + (Number(r[k]) || 0), 0) * 100) / 100;
      return { month: format(m, "MMM yy"), Room: sum("roomRevenue"), Breakfast: sum("breakfastCost"), Lunch: sum("lunchCost"), Dinner: sum("dinnerCost"), Ramadan: sum("ramadanCost") };
    });
  }, [trendData, month, supplier]);
  const { data: master = [] } = useQuery({
    queryKey: ["supplier-master-codes"],
    queryFn: async () => { const { data, error } = await supabase.from("clients").select("code, name"); if (error) throw error; return data; },
  });

  const rows = useMemo(() => buildRevenueRows(data, fromDate, toDate)
    .filter((r: any) => r.supplier && r.supplier !== "Own" && r.supplier !== "—")
    .map((r: any) => ({ ...r, homeDept: r.department, department: r.supplier })), [data, fromDate, toDate]);
  const codeMap = useMemo(() => Object.fromEntries(master.map(m => [m.name, m.code])), [master]);
  const groups = useMemo(() => groupDepartmentStatements(rows, codeMap), [rows, codeMap]);
  const shown = groups.filter(g => supplier === "all" || g.dept === supplier);
  const grand = shown.reduce((s, g) => ({ n: s.n + g.residents, room: s.room + g.room, food: s.food + g.food, total: s.total + g.total }), { n: 0, room: 0, food: 0, total: 0 });

  const pdf = (g: DepartmentStatement) => buildDepartmentStatementPdf(g, month, LABELS);
  const exportPdf = (g: DepartmentStatement) => downloadStatementBlob(pdf(g).output("blob"), `${fileName(g.dept, month)}.pdf`);
  const printStatement = (g: DepartmentStatement) => {
    const w = window.open("", "_blank"); if (!w) return;
    const doc = pdf(g); doc.autoPrint();
    const url = URL.createObjectURL(doc.output("blob")); w.location.href = url; setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const exportCsv = () => {
    const h = ["Month", "Supplier Code", "Supplier", "Employee ID", "Name", "Department", "Project", "Camp", "Room", "Days", "Rates", "Room Cost (SAR)", "Breakfast (SAR)", "Lunch (SAR)", "Dinner (SAR)", "Ramadan (SAR)", "Net Food (SAR)", "Total (SAR)"];
    const lines = shown.flatMap(g => g.list.map((r: any) => [month, g.costCenter, g.dept, r.emp_code, r.name, r.homeDept, r.project, r.camp, r.room, r.stayDays, r.supplierRates ? "Supplier" : "Standard", r.roomRevenue.toFixed(2), ...[r.breakfastCost, r.lunchCost, r.dinnerCost, r.ramadanCost].map((v: number) => (v ?? 0).toFixed(2)), r.foodRevenue.toFixed(2), r.total.toFixed(2)]));
    const csv = [h, ...lines].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    downloadStatementBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), `${fileName(supplier, month)}.csv`);
  };
  const selected = supplier !== "all" ? shown[0] : undefined;
  const unavailable = isLoading || isError || shown.length === 0;

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="flex flex-wrap gap-4 items-end pt-6">
          <div className="space-y-1"><Label className="text-xs">Month</Label>
            <Input type="month" value={month} aria-label="Billing month" onChange={e => e.target.value && setMonth(e.target.value)} className="w-[170px]" /></div>
          <div className="space-y-1"><Label className="text-xs">Supplier</Label>
            <Select value={supplier} onValueChange={setSupplier}>
              <SelectTrigger aria-label="Supplier" className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Suppliers</SelectItem>{groups.map(g => <SelectItem key={g.dept} value={g.dept}>{g.dept}</SelectItem>)}</SelectContent>
            </Select></div>
          <Button variant="outline" disabled={unavailable} onClick={exportCsv}><Download size={16} className="mr-1" /> Export CSV</Button>
          <Button disabled={unavailable || !selected} onClick={() => selected && exportPdf(selected)}><Download size={16} className="mr-1" /> Download Supplier PDF</Button>
          <Button variant="outline" disabled={unavailable || !selected} onClick={() => selected && printStatement(selected)}><Printer size={16} className="mr-1" /> Print Supplier</Button>
        </CardContent>
      </Card>

      <h3 className="font-semibold">Supplier Monthly Costing — {format(monthDate, "MMMM yyyy")}</h3>
      {isError ? <div role="alert" className="py-8 text-center">Unable to load supplier costs. <Button variant="outline" onClick={() => refetch()}>Retry</Button></div>
        : isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (<>
        {shown.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {shown.map(g => (
              <Card key={g.dept} aria-label={`${g.dept} costing summary`}><CardContent className="pt-4 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-semibold">{g.dept}</div>
                  <div className="text-xs text-muted-foreground">Supplier Code <span className="font-mono">{g.costCenter}</span> · {format(monthDate, "MMMM yyyy")}</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[["Total Candidates", String(g.residents)], ["Total Food Value", `SAR ${fmt(g.food)}`], ["Total Room Cost", `SAR ${fmt(g.room)}`], ["Grand Total", `SAR ${fmt(g.total)}`]].map(([l, v], i) => (
                    <div key={l} className={`rounded-md border p-2 ${i === 3 ? "bg-primary/10 border-primary/30" : "bg-muted/40"}`}><div className="text-[11px] text-muted-foreground">{l}</div><div className="text-sm font-semibold">{v}</div></div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                  <span>Breakfast: SAR {fmt(g.breakfast)}</span><span>Lunch: SAR {fmt(g.lunch)}</span><span>Dinner: SAR {fmt(g.dinner)}</span><span>Ramadan: SAR {fmt(g.ramadan)}</span>
                </div>
                {g.costCenter === "—" && <p className="text-xs text-destructive">Not in Supplier Master — standard rates applied. Add this supplier to charge its own rates.</p>}
              </CardContent></Card>
            ))}
          </div>
        )}
        <Card aria-label="Six month supplier cost trend">
          <CardContent className="pt-4">
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-semibold text-sm">Monthly Cost — Last 6 Months · {supplier === "all" ? "All Suppliers" : supplier}</div>
              <div className="text-xs text-muted-foreground">SAR, at Supplier Master rates</div>
            </div>
            <div className="h-[260px]">
              {trendLoading ? <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading trend…</div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => Number(v).toLocaleString()} />
                    <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Room" stackId="c" fill="hsl(var(--primary))" />
                    <Bar dataKey="Breakfast" stackId="c" fill="hsl(var(--campman-amber))" />
                    <Bar dataKey="Lunch" stackId="c" fill="hsl(var(--campman-green))" />
                    <Bar dataKey="Dinner" stackId="c" fill="hsl(var(--accent-foreground))" />
                    <Bar dataKey="Ramadan" stackId="c" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier / Employee</TableHead><TableHead>Code / Dept</TableHead><TableHead>Camp / Room</TableHead>
              <TableHead className="text-right">Residents / Days</TableHead><TableHead className="text-right">Room Cost (SAR)</TableHead>
              <TableHead className="text-right">Food Cost (SAR)</TableHead><TableHead className="text-right">Total (SAR)</TableHead><TableHead>Statement</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {shown.map(g => (
                <Fragment key={g.dept}>
                  <TableRow className="bg-muted/40 cursor-pointer font-semibold" onClick={() => setOpen(o => ({ ...o, [g.dept]: !o[g.dept] }))}>
                    <TableCell><span className="inline-flex items-center gap-1">{open[g.dept] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{g.dept}</span></TableCell>
                    <TableCell className="font-mono text-xs">{g.costCenter}</TableCell><TableCell />
                    <TableCell className="text-right">{g.residents}</TableCell><TableCell className="text-right">{fmt(g.room)}</TableCell>
                    <TableCell className="text-right">{fmt(g.food)}</TableCell><TableCell className="text-right">{fmt(g.total)}</TableCell>
                    <TableCell><div className="flex gap-1">
                      <Button size="sm" variant="outline" aria-label={`Download ${g.dept} costing PDF`} onClick={e => { e.stopPropagation(); exportPdf(g); }}><Download size={14} className="mr-1" /> PDF</Button>
                      <Button size="icon" variant="ghost" aria-label={`Print ${g.dept} costing statement`} onClick={e => { e.stopPropagation(); printStatement(g); }}><Printer size={14} /></Button>
                    </div></TableCell>
                  </TableRow>
                  {(open[g.dept] || supplier !== "all") && g.list.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="pl-8"><div>{r.name}</div><div className="text-xs text-muted-foreground font-mono">{r.emp_code} · {r.project}</div><div className="text-xs text-muted-foreground">From: {r.stayFrom} To: {r.stayTo}</div></TableCell>
                      <TableCell className="text-xs">{r.homeDept} {r.supplierRates ? <Badge variant="outline" className="ml-1 text-[10px]">Supplier rates</Badge> : null}</TableCell>
                      <TableCell className="text-xs">{r.camp} / {r.room}</TableCell>
                      <TableCell className="text-right">{r.stayDays}</TableCell>
                      <TableCell className="text-right">{fmt(r.roomRevenue)}</TableCell>
                      <TableCell className="text-right"><div>{fmt(r.foodRevenue)}</div><div className="text-[10px] text-muted-foreground whitespace-nowrap">B {fmt(r.breakfastCost ?? 0)} · L {fmt(r.lunchCost ?? 0)} · D {fmt(r.dinnerCost ?? 0)}{r.ramadanCost ? ` · R ${fmt(r.ramadanCost)}` : ""}</div></TableCell>
                      <TableCell className="text-right">{fmt(r.total)}</TableCell><TableCell />
                    </TableRow>
                  ))}
                </Fragment>
              ))}
              {shown.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No supplier residents for this month</TableCell></TableRow> : (
                <TableRow className="font-bold border-t-2"><TableCell>Grand Total</TableCell><TableCell /><TableCell />
                  <TableCell className="text-right">{grand.n}</TableCell><TableCell className="text-right">{fmt(grand.room)}</TableCell>
                  <TableCell className="text-right">{fmt(grand.food)}</TableCell><TableCell className="text-right">{fmt(grand.total)}</TableCell><TableCell /></TableRow>
              )}
            </TableBody>
          </Table>
          <LeaveNotes rows={shown.flatMap((g: any) => g.list)} />
        </div>
      </>)}
    </div>
  );
}
