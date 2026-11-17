import { Fragment, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, ChevronDown, ChevronRight } from "lucide-react";
import { format, endOfMonth, startOfMonth, parseISO } from "date-fns";
import {
  addDepartmentLunchStatements,
  buildDepartmentStatementPdf,
  departmentCategoryStatusMatrix,
  downloadStatementBlob,
  filterDepartmentCostRows,
  groupDepartmentStatements,
  statementAmount,
  statementFilename,
  type DepartmentCostRow,
  type DepartmentStatement,
  type StatementCancellation,
} from "./departmentStatement";
import { useRevenueData, buildRevenueRows } from "./RevenueReportTab";
import { FoodDeductionSummary, LeaveFoodDeductionTable } from "./FoodDeductionTable";
import { useDepartments } from "@/hooks/useDepartments";
import { approvedFoodCancellations } from "@/lib/approvedFoodCancellations";
import { dmy } from "@/lib/roomHolding";
import { useDepartmentLunch } from "@/hooks/useDepartmentLunch";
import DepartmentLunchTable from "./DepartmentLunchTable";
import { reportPeriodEnd } from "@/lib/stayBilling";
import { EXPERTISE_LOGO_DATA_URL } from "./expertiseLogoData";
import { TablePager, usePaged } from "@/components/TablePager";

const fmt = statementAmount;

export default function DepartmentMonthlyReportTab() {
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const logoDataUrl = EXPERTISE_LOGO_DATA_URL;
  const [campFilter, setCampFilter] = useState("all");
  const [blockFilter, setBlockFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const validPeriod = Boolean(fromDate && toDate && fromDate <= toDate);
  const periodEnd = reportPeriodEnd(toDate);
  const periodLabel = validPeriod
    ? `${format(parseISO(fromDate), "dd MMM yyyy")} – ${format(parseISO(periodEnd), "dd MMM yyyy")}`
    : "Invalid date range";
  const { data, isLoading, isError, refetch } = useRevenueData(fromDate, toDate);
  const { data: departments } = useDepartments();
  const rows = useMemo(() => buildRevenueRows(data, fromDate, toDate) as DepartmentCostRow[], [data, fromDate, toDate]);

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

  const lunchQuery = useDepartmentLunch(fromDate, toDate);
  const camps = useMemo(() => [...new Map([
    ...rows.map(row => [row.campId || row.camp, row.camp] as [string,string]),
    ...(lunchQuery.data || []).flatMap(r => r.camps ? [[r.camp_id,r.camps.name] as [string,string]] : []),
  ]).entries()].sort((a, b) => a[1].localeCompare(b[1])), [rows,lunchQuery.data]);
  const blocks = useMemo(() => [...new Map(rows
    .filter(row => campFilter === "all" || (row.campId || row.camp) === campFilter)
    .map(row => [row.blockId || row.block || "—", campFilter === "all" ? `${row.camp} / ${row.block || "—"}` : row.block || "—"])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1])), [rows, campFilter]);
  const locationRows = useMemo(() => filterDepartmentCostRows(rows, { camp: campFilter, block: blockFilter }), [rows, campFilter, blockFilter]);

  const groups = useMemo(() => {
    const lunchRequests = (lunchQuery.data || []).filter(request => (campFilter === "all" || request.camp_id === campFilter) && blockFilter === "all");
    return addDepartmentLunchStatements(groupDepartmentStatements(locationRows, costCenterMap), departments || [], lunchRequests, fromDate, periodEnd);
  }, [locationRows, costCenterMap, departments, lunchQuery.data, campFilter, blockFilter, fromDate, periodEnd]);
  const shown = groups.filter(g => deptFilter === "all" || g.dept === deptFilter);
  const pagedShown = usePaged(shown, 15);

  // Approved food cancellations for the selected period, resolved to employee name/code.
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
  const filePeriod = `${fromDate}_to_${toDate}`;

  const exportCsv = () => {
    const h = ["Period", "Cost Center", "Department", "Employee ID", "Name", "Supplier", "Project", "Camp", "Block", "Room", "Room Category", "Days", "Room Cost (SAR)", "Breakfast (SAR)", "Lunch (SAR)", "Dinner (SAR)", "Ramadan (SAR)", "Net Food Cost (SAR)", "Locker Charges (SAR)", "Total to Charge (SAR)"];
    const lines = shown.flatMap(g => g.list.map(r => [periodLabel, g.costCenter, g.dept, r.emp_code, r.name, r.supplier, r.project, r.camp, r.block || "—", r.room, r.category || "", r.stayDays, r.roomRevenue.toFixed(2), ...[r.breakfastCost, r.lunchCost, r.dinnerCost, r.ramadanCost].map((v: number | undefined) => (v ?? 0).toFixed(2)), r.foodRevenue.toFixed(2), (r.lockerCost || 0).toFixed(2), r.total.toFixed(2)]));
    const lunchLines = shown.flatMap(g => (g.departmentLunch?.daily || []).map(d => [periodLabel, g.costCenter, g.dept, "", "Department Lunch", "", "", "", "", "", d.date, "", "", d.quantity, "", "", "", "", d.cost.toFixed(2)]));
    const totalLines = shown.map(g => [periodLabel, g.costCenter, g.dept, "", "GRAND TOTAL", "", "", "", "", "", "", "", "", "", "", "", "", "", "", g.total.toFixed(2)]);
    const csv = [h, ...lines, [], ["Approved department lunch", "Cost center", "Department", "", "Line item", "", "", "", "", "", "Date", "", "", "Lunch count", "", "", "", "", "Cost (SAR)"], ...lunchLines, ...totalLines]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    downloadStatementBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), `${statementFilename(deptFilter, filePeriod)}.csv`);
  };

  const exportPdf = (group: DepartmentStatement) => {
    const doc = buildDepartmentStatementPdf(group, fromDate.slice(0, 7), undefined, cancellationsFor(group), { fromDate, toDate, logoDataUrl });
    downloadStatementBlob(doc.output("blob"), `${statementFilename(group.dept, filePeriod)}.pdf`);
  };

  const printStatement = (group: DepartmentStatement) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const doc = buildDepartmentStatementPdf(group, fromDate.slice(0, 7), undefined, cancellationsFor(group), { fromDate, toDate, logoDataUrl });
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output("blob"));
    w.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const selected = deptFilter !== "all" ? shown[0] : undefined;
  const unavailable = !validPeriod || isLoading || isError || lunchQuery.isLoading || lunchQuery.isError || shown.length === 0;
  const changeCamp = (value: string) => { setCampFilter(value); setBlockFilter("all"); setDeptFilter("all"); };
  const changeBlock = (value: string) => { setBlockFilter(value); setDeptFilter("all"); };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="flex flex-wrap gap-3 items-end pt-6 print:hidden">
          <div className="space-y-1">
            <Label className="text-xs">From Date</Label>
            <Input type="date" aria-label="From date" value={fromDate} max={toDate} onChange={e => { if (e.target.value) setFromDate(e.target.value); }} className="w-[150px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To Date</Label>
            <Input type="date" aria-label="To date" value={toDate} min={fromDate} onChange={e => { if (e.target.value) setToDate(e.target.value); }} className="w-[150px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Camp</Label>
            <Select value={campFilter} onValueChange={changeCamp}>
              <SelectTrigger aria-label="Camp" className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Camps</SelectItem>{camps.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Block</Label>
            <Select value={blockFilter} onValueChange={changeBlock}>
              <SelectTrigger aria-label="Block" className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Blocks</SelectItem>{blocks.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
            </Select>
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

      <div>
        <h3 className="font-semibold">Department Monthly Costing — {periodLabel}</h3>
        {!validPeriod && <p role="alert" className="text-sm text-destructive mt-1">From Date must be on or before To Date.</p>}
      </div>
      {!isLoading && !isError && !lunchQuery.isLoading && !lunchQuery.isError && shown.length > 0 && (
        <div className="space-y-3">
          {shown.map(g => (
            <div key={g.dept} className="grid gap-3 xl:grid-cols-2 items-start">
              <Card aria-label={`${g.dept} costing summary`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-semibold">{g.dept}</div>
                    <div className="text-xs text-muted-foreground">Cost Center <span className="font-mono">{g.costCenter}</span> · {periodLabel}</div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[["Total Candidates", String(g.residents)], ["Total Food Value", `SAR ${fmt(g.food)}`], ["Total Room Cost", `SAR ${fmt(g.room)}`], ["Monthly Department Lunch", `SAR ${fmt(g.departmentLunch?.cost || 0)}`], ["Grand Total", `SAR ${fmt(g.total)}`]].map(([label, value], i) => (
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
                  <FoodTotalsTable groups={[g]} />
                  <FoodDeductionSummary value={g.deductions} />
                  <DepartmentLunchTable summary={g.departmentLunch || { quantity: 0, cost: 0, daily: [] }} />
                </CardContent>
              </Card>
              <CategoryStatusMatrix rows={g.list} asOfDate={periodEnd} department={g.dept} />
            </div>
          ))}
        </div>
      )}
      {(isError || lunchQuery.isError) ? <div role="alert" className="py-8 text-center">Unable to load department costs. <Button variant="outline" onClick={() => { refetch(); lunchQuery.refetch(); }}>Retry</Button></div> : (isLoading || lunchQuery.isLoading) ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department / Employee</TableHead>
                <TableHead>Cost Center</TableHead>
                <TableHead>Camp / Block / Room / Category</TableHead>
                <TableHead className="text-right">Residents / Days</TableHead>
                <TableHead className="text-right">Room Cost (SAR)</TableHead>
                <TableHead className="text-right">Food Cost (SAR)</TableHead>
                <TableHead className="text-right">Total to Charge (SAR)</TableHead>
                <TableHead>Statement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedShown.rows.map(g => (
                <Fragment key={g.dept}>
                  <TableRow className="bg-muted/40 cursor-pointer font-semibold" onClick={() => setOpen(o => ({ ...o, [g.dept]: !o[g.dept] }))}>
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
                  {(open[g.dept] || deptFilter !== "all") && (
                    <DepartmentResidentRows list={g.list} />
                  )}
                  {(g.departmentLunch?.cost || 0) > 0 && <TableRow><TableCell>Monthly Department Lunch</TableCell><TableCell>{g.costCenter}</TableCell><TableCell /><TableCell className="text-right">{g.departmentLunch?.quantity}</TableCell><TableCell /><TableCell /><TableCell className="text-right">{fmt(g.departmentLunch?.cost || 0)}</TableCell><TableCell /></TableRow>}
                </Fragment>
              ))}
              {shown.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No residents for the selected filters</TableCell></TableRow>
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
          <TablePager {...pagedShown} />
          <FoodTotalsTable groups={shown} />
          <LeaveFoodDeductionTable rows={shown.flatMap(g => g.list)} />
        </div>
      )}
      {!isLoading && !isError && shown.map(g => {
        const cancels = cancellationsFor(g);
        if (!cancels.length) return null;
        return (
          <Card key={`cancels-${g.dept}`} aria-label={`${g.dept} food cancellation details`}>
            <CardContent className="pt-4">
              <h4 className="font-semibold text-sm mb-2">Food Cancellation Details — {g.dept} <span className="font-normal text-muted-foreground">(approved requests credited in the selected period)</span></h4>
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Meals</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
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

function CategoryStatusMatrix({ rows, asOfDate, department }: { rows: DepartmentCostRow[]; asOfDate: string; department: string }) {
  const matrix = departmentCategoryStatusMatrix(rows, asOfDate);
  return (
    <Card aria-label={`${department} room category status counts`}>
      <CardContent className="pt-4">
        <h4 className="font-semibold text-sm mb-3">Room Category / Status — Inmate Counts</h4>
        <div className="overflow-auto">
          <Table className="w-auto min-w-full tabular-nums [&_th]:px-3 [&_th]:h-9 [&_th]:text-xs [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs">
            <TableHeader><TableRow><TableHead>Room Category</TableHead>{matrix.statuses.map(status => <TableHead key={status} className="text-right whitespace-nowrap">{status}</TableHead>)}<TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {matrix.table.map(row => <TableRow key={row.category}><TableCell className="font-medium">{row.category === "guest" ? "Guest" : row.category}</TableCell>{matrix.statuses.map(status => <TableCell key={status} className="text-right">{row.counts[status]}</TableCell>)}<TableCell className="text-right font-semibold">{row.total}</TableCell></TableRow>)}
              <TableRow className="font-bold border-t-2 bg-primary/10"><TableCell>Grand Total</TableCell>{matrix.statuses.map(status => <TableCell key={status} className="text-right">{matrix.grand.counts[status]}</TableCell>)}<TableCell className="text-right">{matrix.grand.total}</TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function FoodTotalsTable({ groups }: { groups: any[] }) {
  const rows = groups.flatMap(g => g.list);
  const sum = (k: string) => rows.reduce((s: number, r: any) => s + (Number(r[k]) || 0), 0);
  const officeQty = groups.reduce((s, g) => s + (g.departmentLunch?.quantity || 0), 0);
  const officeCost = groups.reduce((s, g) => s + (g.departmentLunch?.cost || 0), 0);
  const items: [string, number, number][] = [
    ["Breakfast", sum("breakfastCount"), sum("breakfastCost")],
    ["Lunch", sum("lunchCount"), sum("lunchCost")],
    ["Dinner", sum("dinnerCount"), sum("dinnerCost")],
  ];
  const ram = sum("ramadanCost");
  if (ram) items.push(["Ramadan (days)", sum("ramadanCount"), ram]);
  items.push(["Office Lunch (department)", officeQty, officeCost]);
  const total = items.reduce((s, i) => s + i[2], 0);
  const f = (n: any) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="w-full overflow-auto" aria-label="Food totals">
      <Table className="min-w-[400px] table-fixed tabular-nums border [&_th]:border [&_th]:h-auto [&_th]:px-1 [&_th]:py-1 [&_th]:text-xs [&_td]:border [&_td]:px-1 [&_td]:py-1 [&_td]:text-xs">
        <TableHeader>
          <TableRow className="bg-primary/10"><TableHead className="font-semibold text-foreground">Food Charges</TableHead>{items.map(([label]) => <TableHead key={label} className="text-right">{label === "Office Lunch (department)" ? "Office Lunch" : label}</TableHead>)}<TableHead className="text-right font-semibold">Total</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          <TableRow><TableCell className="font-medium">Count</TableCell>{items.map(([label, count]) => <TableCell key={label} className="text-right">{Math.round(count * 10) / 10}</TableCell>)}<TableCell /></TableRow>
          <TableRow><TableCell className="font-medium">Amount (SAR)</TableCell>{items.map(([label, , amount]) => <TableCell key={label} className="text-right">{f(amount)}</TableCell>)}<TableCell className="text-right font-bold bg-primary/10">{f(total)}</TableCell></TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function DepartmentResidentRows({ list }: { list: DepartmentCostRow[] }) {
  const paged = usePaged(list, 50);
  return (
    <>
      {paged.rows.map(r => (
        <TableRow key={r.id}>
          <TableCell className="pl-8">
            <div className="font-medium">{r.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{r.emp_code} · {r.supplier}</div>
            <div className="text-xs text-muted-foreground">From: {r.stayFrom} To: {r.stayTo}</div>
          </TableCell>
          <TableCell />
          <TableCell className="text-xs">
            <div>{r.camp} / {r.block || "—"} / {r.room}</div>
            <div className="font-medium">{r.category || "—"}</div>
          </TableCell>
          <TableCell className="text-right">{r.stayDays}</TableCell>
          <TableCell className="text-right">
            {fmt(r.roomRevenue)}
            {r.holdingCost ? <div className="text-xs text-muted-foreground">Normal {fmt(r.normalRoomCost || 0)} · Holding {fmt(r.holdingCost)}</div> : null}
          </TableCell>
          <TableCell className="text-right">
            <div>{fmt(r.foodRevenue)}</div>
            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
              B {fmt(r.breakfastCost ?? 0)} · L {fmt(r.lunchCost ?? 0)} · D {fmt(r.dinnerCost ?? 0)}{r.ramadanCost ? ` · R ${fmt(r.ramadanCost)}` : ""}
            </div>
          </TableCell>
          <TableCell className="text-right">
            {fmt(r.total)}
            {r.lockerCost ? <div className="text-xs text-muted-foreground">Locker Charges {fmt(r.lockerCost)}</div> : null}
          </TableCell>
          <TableCell />
        </TableRow>
      ))}
      {list.length > 50 && (
        <TableRow>
          <TableCell colSpan={8} className="p-0 bg-muted/10">
            <TablePager {...paged} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
