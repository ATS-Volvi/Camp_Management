import { Fragment, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, ChevronDown, ChevronRight } from "lucide-react";
import { format, endOfMonth, parse } from "date-fns";
import { buildDepartmentStatementPdf, downloadStatementBlob, groupDepartmentStatements, statementAmount, statementFilename, type DepartmentStatement, type StatementCancellation } from "./departmentStatement";
import { useRevenueData, buildRevenueRows, LeaveNotes } from "./RevenueReportTab";
import { useDepartments } from "@/hooks/useDepartments";
import { approvedFoodCancellations } from "@/lib/approvedFoodCancellations";
import { dmy } from "@/lib/roomHolding";

const fmt = statementAmount;

export default function DepartmentMonthlyReportTab() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [deptFilter, setDeptFilter] = useState("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const monthDate = parse(month + "-01", "yyyy-MM-dd", new Date());
  const fromDate = format(monthDate, "yyyy-MM-dd");
  const toDate = format(endOfMonth(monthDate), "yyyy-MM-dd");
  const { data, isLoading, isError, refetch } = useRevenueData(fromDate, toDate);
  const { data: departments } = useDepartments();
  const rows = useMemo(() => buildRevenueRows(data, fromDate, toDate), [data, fromDate, toDate]);

  const costCenterMap = useMemo(() => {
    const map: Record<string, string> = {};
    (departments || []).forEach(d => {
      if (d.cost_center) {
        map[d.code.toUpperCase()] = d.cost_center;
        map[d.name.toUpperCase()] = d.cost_center;
      }
    });
    return map;
  }, [departments]);

  const groups = useMemo(() => groupDepartmentStatements(rows, costCenterMap), [rows, costCenterMap]);
  const shown = groups.filter(g => deptFilter === "all" || g.dept === deptFilter);

  // Approved food cancellations for the month, resolved to employee name/code, shown at the bottom of each department statement.
  const empMeta = useMemo(() => {
    const map: Record<string, { name: string; emp_code: string }> = {};
    (data?.checkIns || []).forEach((ci: any) => {
      if (ci.employees?.id) map[ci.employees.id] = { name: ci.employees.name, emp_code: ci.employees.employee_id };
    });
    return map;
  }, [data]);

  const cancellationsFor = (g: DepartmentStatement): StatementCancellation[] => {
    const codes = new Set(g.list.map(r => r.emp_code));
    return approvedFoodCancellations(data?.cancellations || [])
      .filter((c: any) => codes.has(empMeta[c.employee_id]?.emp_code))
      .map((c: any) => ({
        name: empMeta[c.employee_id]?.name || "—",
        emp_code: empMeta[c.employee_id]?.emp_code || "—",
        from: dmy(c.from_date),
        to: dmy(c.to_date),
        meals: (c.food_cancellation_request_meals || []).map((m: any) => m.meal_type).join(", ") || "All meals",
        reason: c.reason ? String(c.reason).replace(/_/g, " ") : "—",
      }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.from.localeCompare(b.from));
  };
  const grand = shown.reduce((s, g) => ({ n: s.n + g.residents, room: s.room + g.room, food: s.food + g.food, total: s.total + g.total }), { n: 0, room: 0, food: 0, total: 0 });

  const exportCsv = () => {
    const h = ["Month", "Cost Center", "Department", "Employee ID", "Name", "Supplier", "Project", "Camp", "Room", "Days", "Room Cost (SAR)", "Breakfast (SAR)", "Lunch (SAR)", "Dinner (SAR)", "Ramadan (SAR)", "Net Food Cost (SAR)", "Total to Charge (SAR)"];
    const lines = shown.flatMap(g => g.list.map(r => [month, g.costCenter, g.dept, r.emp_code, r.name, r.supplier, r.project, r.camp, r.room, r.stayDays, r.roomRevenue.toFixed(2), ...[r.breakfastCost, r.lunchCost, r.dinnerCost, r.ramadanCost].map((v: number | undefined) => (v ?? 0).toFixed(2)), r.foodRevenue.toFixed(2), r.total.toFixed(2)]));
    const csv = [h, ...lines].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    downloadStatementBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), `${statementFilename(deptFilter, month)}.csv`);
  };

  const exportPdf = (group: DepartmentStatement) => {
    const doc = buildDepartmentStatementPdf(group, month, undefined, cancellationsFor(group));
    downloadStatementBlob(doc.output("blob"), `${statementFilename(group.dept, month)}.pdf`);
  };

  const printStatement = (group: DepartmentStatement) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const doc = buildDepartmentStatementPdf(group, month, undefined, cancellationsFor(group));
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output("blob"));
    w.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const selected = deptFilter !== "all" ? shown[0] : undefined;
  const unavailable = isLoading || isError || shown.length === 0;

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="flex flex-wrap gap-4 items-end pt-6 print:hidden">
          <div className="space-y-1">
            <Label className="text-xs">Month</Label>
            <Input type="month" value={month} aria-label="Billing month" onChange={e => { if (e.target.value) setMonth(e.target.value); }} className="w-[170px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Department</Label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger aria-label="Department" className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {groups.map(g => <SelectItem key={g.dept} value={g.dept}>{g.dept}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" disabled={unavailable} onClick={exportCsv}><Download size={16} className="mr-1" /> Export CSV</Button>
          <Button disabled={unavailable || !selected} onClick={() => { if (selected) exportPdf(selected); }}><Download size={16} className="mr-1" /> Download Department PDF</Button>
          <Button variant="outline" disabled={unavailable || !selected} onClick={() => { if (selected) printStatement(selected); }}><Printer size={16} className="mr-1" /> Print Department</Button>
        </CardContent>
      </Card>

      <h3 className="font-semibold">Department Monthly Costing — {format(monthDate, "MMMM yyyy")}</h3>
      {!isLoading && !isError && shown.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map(g => (
            <Card key={g.dept} aria-label={`${g.dept} costing summary`}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-semibold">{g.dept}</div>
                  <div className="text-xs text-muted-foreground">Cost Center <span className="font-mono">{g.costCenter}</span> · {format(monthDate, "MMMM yyyy")}</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[["Total Candidates", String(g.residents)], ["Total Food Value", `SAR ${fmt(g.food)}`], ["Total Room Cost", `SAR ${fmt(g.room)}`], ["Grand Total", `SAR ${fmt(g.total)}`]].map(([label, value], i) => (
                    <div key={label} className={`rounded-md border p-2 ${i === 3 ? "bg-primary/10 border-primary/30" : "bg-muted/40"}`}>
                      <div className="text-[11px] text-muted-foreground">{label}</div>
                      <div className="text-sm font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Breakfast: SAR {fmt(g.breakfast)}</span><span>Lunch: SAR {fmt(g.lunch)}</span>
                  <span>Dinner: SAR {fmt(g.dinner)}</span><span>Ramadan: SAR {fmt(g.ramadan)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {isError ? <div role="alert" className="py-8 text-center">Unable to load department costs. <Button variant="outline" onClick={() => refetch()}>Retry</Button></div> : isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department / Employee</TableHead>
                <TableHead>Cost Center</TableHead>
                <TableHead>Camp / Room</TableHead>
                <TableHead className="text-right">Residents / Days</TableHead>
                <TableHead className="text-right">Room Cost (SAR)</TableHead>
                <TableHead className="text-right">Food Cost (SAR)</TableHead>
                <TableHead className="text-right">Total to Charge (SAR)</TableHead>
                <TableHead>Statement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map(g => (
                <Fragment key={g.dept}>
                  <TableRow key={g.dept} className="bg-muted/40 cursor-pointer font-semibold" onClick={() => setOpen(o => ({ ...o, [g.dept]: !o[g.dept] }))}>
                    <TableCell><span className="inline-flex items-center gap-1">{open[g.dept] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{g.dept}</span></TableCell>
                    <TableCell className="font-mono text-xs">{g.costCenter}</TableCell>
                    <TableCell />
                    <TableCell className="text-right">{g.residents}</TableCell>
                    <TableCell className="text-right">{fmt(g.room)}</TableCell>
                    <TableCell className="text-right">{fmt(g.food)}</TableCell>
                    <TableCell className="text-right">{fmt(g.total)}</TableCell>
                    <TableCell><div className="flex gap-1">
                      <Button size="sm" variant="outline" aria-label={`Download ${g.dept} costing PDF`} onClick={e => { e.stopPropagation(); exportPdf(g); }}><Download size={14} className="mr-1" /> PDF</Button>
                      <Button size="icon" variant="ghost" aria-label={`Print ${g.dept} costing statement`} onClick={e => { e.stopPropagation(); printStatement(g); }}><Printer size={14} /></Button>
                    </div></TableCell>
                  </TableRow>
                  {(open[g.dept] || deptFilter !== "all") && g.list.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="pl-8"><div>{r.name}</div><div className="text-xs text-muted-foreground font-mono">{r.emp_code} · {r.supplier}</div><div className="text-xs text-muted-foreground">From: {r.stayFrom} To: {r.stayTo}</div></TableCell>
                      <TableCell />
                      <TableCell className="text-xs">{r.camp} / {r.room}</TableCell>
                      <TableCell className="text-right">{r.stayDays}</TableCell>
                      <TableCell className="text-right">{fmt(r.roomRevenue)}</TableCell>
                      <TableCell className="text-right"><div>{fmt(r.foodRevenue)}</div><div className="text-[10px] text-muted-foreground whitespace-nowrap">B {fmt(r.breakfastCost ?? 0)} · L {fmt(r.lunchCost ?? 0)} · D {fmt(r.dinnerCost ?? 0)}{r.ramadanCost ? ` · R ${fmt(r.ramadanCost)}` : ""}</div></TableCell>
                      <TableCell className="text-right">{fmt(r.total)}</TableCell><TableCell />
                    </TableRow>
                  ))}
                </Fragment>
              ))}
              {shown.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No residents for this month</TableCell></TableRow>
              ) : (
                <TableRow className="font-bold border-t-2">
                  <TableCell>Grand Total</TableCell><TableCell /><TableCell />
                  <TableCell className="text-right">{grand.n}</TableCell>
                  <TableCell className="text-right">{fmt(grand.room)}</TableCell>
                  <TableCell className="text-right">{fmt(grand.food)}</TableCell>
                  <TableCell className="text-right">{fmt(grand.total)}</TableCell><TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
          <LeaveNotes rows={shown.flatMap((g: any) => g.list)} />
        </div>
      )}
      {!isLoading && !isError && shown.map(g => {
        const cancels = cancellationsFor(g);
        if (!cancels.length) return null;
        return (
          <Card key={`cancels-${g.dept}`} aria-label={`${g.dept} food cancellation details`}>
            <CardContent className="pt-4">
              <h4 className="font-semibold text-sm mb-2">Food Cancellation Details — {g.dept} <span className="font-normal text-muted-foreground">(approved requests credited in {format(monthDate, "MMMM yyyy")})</span></h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead><TableHead>From</TableHead><TableHead>To</TableHead>
                    <TableHead>Meals</TableHead><TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancels.map((c, i) => (
                    <TableRow key={`${c.emp_code}-${c.from}-${i}`}>
                      <TableCell><div>{c.name}</div><div className="text-xs text-muted-foreground font-mono">{c.emp_code}</div></TableCell>
                      <TableCell>{c.from}</TableCell><TableCell>{c.to}</TableCell>
                      <TableCell className="capitalize">{c.meals}</TableCell><TableCell className="capitalize">{c.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
