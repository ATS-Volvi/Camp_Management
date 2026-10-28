import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, FileText, Receipt, BedDouble, UtensilsCrossed, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import { billableStayWindow, stayDeparture } from "@/lib/stayBilling";
import { approvedFoodCancellations } from "@/lib/approvedFoodCancellations";

const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
type MealType = (typeof MEAL_TYPES)[number];

interface InvoiceRow {
  employee_id: string;
  emp_code: string;
  name: string;
  department: string;
  project: string;
  camp_name: string;
  room_number: string;
  room_category: string;
  check_in: string;
  check_out: string | null;
  stay_days: number;
  daily_room_rate: number;
  daily_food_rate: number;
  meal_unit_rate: number;
  total_meals_eligible: number; // stay_days * 3
  meals_cancelled: number;
  meals_consumed: number;
  cancellation_breakdown: { date: string; meal: MealType; reason: string; remarks: string | null }[];
  room_cost: number;
  food_cost_full: number;
  food_credit: number;
  food_cost_net: number;
  total_cost: number;
}

function useInvoiceData(fromDate: string, toDate: string, campId: string) {
  return useQuery({
    queryKey: ["invoice-data", fromDate, toDate, campId],
    queryFn: async () => {
      // Fetch active check-ins overlapping window
      let q = supabase
        .from("check_ins")
        .select("id, employee_id, room_id, camp_id, check_in_date, food_required, employees(id, employee_id, name, department, project, employee_type), rooms(id, room_number, category, daily_food_rate), camps(id, name)")
        .lte("check_in_date", toDate + "T23:59:59")
        .order("check_in_date", { ascending: false });
      if (campId !== "all") q = q.eq("camp_id", campId);
      const { data: checkIns, error } = await q;
      if (error) throw error;

      // Fetch related check-outs
      const empIds = Array.from(new Set((checkIns || []).map((c: any) => c.employee_id)));
      const { data: checkOuts } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date, room_id")
        .in("employee_id", empIds.length ? empIds : ["00000000-0000-0000-0000-000000000000"]);

      // Camp room rates
      const { data: rates } = await supabase.from("camp_room_rates").select("*");

      // Camp Food Rates master (per-meal prices per camp)
      const { data: campMealRates } = await supabase.from("camp_meal_rates").select("camp_id, breakfast_rate, lunch_rate, dinner_rate");

      // Approved cancellations in range
      const { data: cancellations } = await supabase
        .from("food_cancellation_requests")
        .select("id, employee_id, from_date, to_date, reason, remarks, status, source, food_cancellation_request_meals(meal_type)")
        .eq("status", "approved")
        .lte("from_date", toDate)
        .gte("to_date", fromDate);

      return { checkIns: checkIns || [], checkOuts: checkOuts || [], rates: rates || [], cancellations: cancellations || [], campMealRates: campMealRates || [] };
    },
  });
}

export default function CostInvoicingTab() {
  const today = new Date();
  const [fromDate, setFromDate] = useState(format(new Date(today.getFullYear(), today.getMonth() - 1, 1), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd"));
  const [campId, setCampId] = useState("all");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const { data: camps = [] } = useQuery({
    queryKey: ["invoice-camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data, isLoading } = useInvoiceData(fromDate, toDate, campId);

  const rows: InvoiceRow[] = useMemo(() => {
    if (!data) return [];
    const { checkIns, checkOuts, rates, cancellations } = data;
    // Camp Food Rates master overrides the room's daily food rate when configured for the camp.
    const campFoodByCamp = new Map<string, number>();
    (data.campMealRates || []).forEach((r: any) => {
      campFoodByCamp.set(r.camp_id, (Number(r.breakfast_rate) || 0) + (Number(r.lunch_rate) || 0) + (Number(r.dinner_rate) || 0));
    });
    // Group cancellations by employee
    const cancByEmp = new Map<string, any[]>();
    approvedFoodCancellations(cancellations).forEach((c: any) => {
      const arr = cancByEmp.get(c.employee_id) || [];
      arr.push(c);
      cancByEmp.set(c.employee_id, arr);
    });

    return checkIns.map((ci: any) => {
      const coDate = stayDeparture(ci, checkOuts, checkIns);
      const { start: stayStart, end: stayEnd, days: stayDays } = billableStayWindow(ci.check_in_date, coDate, fromDate, toDate);
      if (stayDays === 0) return null;

      const rate = rates.find((r: any) => r.camp_id === ci.camp_id && r.room_category === ci.rooms?.category);
      const dailyRoomRate = Number(rate?.daily_rate || 0);
      const dailyFoodRate = campFoodByCamp.get(ci.camp_id) ?? Number(ci.rooms?.daily_food_rate || 0);
      const mealUnitRate = dailyFoodRate / 3;

      // Build set of cancelled (date, meal)
      const cancelledMeals: { date: string; meal: MealType; reason: string; remarks: string | null }[] = [];
      const cancSet = new Set<string>();
      const empCanc = cancByEmp.get(ci.employee_id) || [];
      empCanc.forEach((c: any) => {
        const cFrom = parseISO(c.from_date);
        const cTo = parseISO(c.to_date);
        const overlapStart = cFrom > stayStart ? cFrom : stayStart;
        const overlapEnd = cTo < stayEnd ? cTo : stayEnd;
        if (overlapStart > overlapEnd) return;
        const mealsInReq: MealType[] = (c.food_cancellation_request_meals || [])
          .map((m: any) => m.meal_type)
          .filter((m: string) => MEAL_TYPES.includes(m as MealType)) as MealType[];
        eachDayOfInterval({ start: overlapStart, end: overlapEnd }).forEach((d) => {
          mealsInReq.forEach((mt) => {
            const key = `${format(d, "yyyy-MM-dd")}|${mt}`;
            if (!cancSet.has(key)) {
              cancSet.add(key);
              cancelledMeals.push({ date: format(d, "yyyy-MM-dd"), meal: mt, reason: c.reason, remarks: c.remarks });
            }
          });
        });
      });

      const totalMealsEligible = stayDays * 3;
      const mealsCancelled = ci.food_required ? cancSet.size : totalMealsEligible;
      const mealsConsumed = totalMealsEligible - mealsCancelled;

      const roomCost = stayDays * dailyRoomRate;
      const foodCostFull = totalMealsEligible * mealUnitRate;
      const foodCredit = mealsCancelled * mealUnitRate;
      const foodCostNet = foodCostFull - foodCredit;

      return {
        employee_id: ci.employee_id,
        emp_code: ci.employees?.employee_id || "—",
        name: ci.employees?.name || "—",
        department: ci.employees?.department || "—",
        project: ci.employees?.project || "—",
        camp_name: ci.camps?.name || "—",
        room_number: ci.rooms?.room_number || "—",
        room_category: ci.rooms?.category || "—",
        check_in: ci.check_in_date,
        check_out: coDate || null,
        stay_days: stayDays,
        daily_room_rate: dailyRoomRate,
        daily_food_rate: dailyFoodRate,
        meal_unit_rate: mealUnitRate,
        total_meals_eligible: totalMealsEligible,
        meals_cancelled: mealsCancelled,
        meals_consumed: mealsConsumed,
        cancellation_breakdown: cancelledMeals.sort((a, b) => a.date.localeCompare(b.date)),
        room_cost: roomCost,
        food_cost_full: foodCostFull,
        food_credit: foodCredit,
        food_cost_net: foodCostNet,
        total_cost: roomCost + foodCostNet,
      } as InvoiceRow;
    }).filter(Boolean) as InvoiceRow[];
  }, [data, fromDate, toDate]);

  const departments = useMemo(() => Array.from(new Set(rows.map((r) => r.department).filter((d) => d && d !== "—"))).sort(), [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (departmentFilter !== "all" && r.department !== departmentFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return r.name.toLowerCase().includes(s) || r.emp_code.toLowerCase().includes(s) || r.project.toLowerCase().includes(s);
      }
      return true;
    });
  }, [rows, search, departmentFilter]);

  const totals = useMemo(() => ({
    employees: filteredRows.length,
    stayDays: filteredRows.reduce((s, r) => s + r.stay_days, 0),
    roomCost: filteredRows.reduce((s, r) => s + r.room_cost, 0),
    foodCredit: filteredRows.reduce((s, r) => s + r.food_credit, 0),
    foodNet: filteredRows.reduce((s, r) => s + r.food_cost_net, 0),
    total: filteredRows.reduce((s, r) => s + r.total_cost, 0),
  }), [filteredRows]);

  const fmt = (n: number) => `SAR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportCsv = () => {
    const headers = [
      "Employee ID", "Name", "Department", "Project", "Camp", "Room", "Category",
      "Period From", "Period To", "Stay Days",
      "Daily Room Rate (SAR)", "Daily Food Rate (SAR)", "Meal Unit (SAR)",
      "Total Meals Eligible", "Meals Cancelled", "Meals Consumed",
      "Room Cost", "Food Cost (Full)", "Food Credit", "Food Cost (Net)", "Total (SAR)",
    ];
    const csv = [headers.join(",")].concat(filteredRows.map((r) => [
      r.emp_code, r.name, r.department, r.project, r.camp_name, r.room_number, getRoomCategoryLabel(r.room_category),
      fromDate, toDate, r.stay_days,
      r.daily_room_rate, r.daily_food_rate, r.meal_unit_rate.toFixed(2),
      r.total_meals_eligible, r.meals_cancelled, r.meals_consumed,
      r.room_cost.toFixed(2), r.food_cost_full.toFixed(2), r.food_credit.toFixed(2), r.food_cost_net.toFixed(2), r.total_cost.toFixed(2),
    ].map((c) => `"${c}"`).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cost-invoice-${fromDate}_to_${toDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const printInvoice = (row: InvoiceRow) => {
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${row.emp_code}</title>
<style>
  body{font-family:Arial,sans-serif;padding:32px;color:#222;font-size:13px}
  h1{margin:0 0 4px;color:#1e3a8a}
  .meta{color:#555;font-size:12px;margin-bottom:18px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
  th{background:#f1f5f9}
  .right{text-align:right}
  .totals td{font-weight:bold;background:#fef3c7}
  .grand td{font-weight:bold;background:#1e3a8a;color:white;font-size:14px}
  .section{margin-top:22px}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;background:#fee2e2;color:#991b1b;font-size:11px;margin-right:4px}
</style></head><body>
  <h1>Camp Accommodation & Catering Invoice</h1>
  <div class="meta">Invoice generated: ${format(new Date(), "dd MMM yyyy, HH:mm")} | Billing period: ${fromDate} to ${toDate}</div>

  <table>
    <tr><th>Employee</th><td>${row.name} (${row.emp_code})</td><th>Department</th><td>${row.department}</td></tr>
    <tr><th>Project</th><td>${row.project}</td><th>Camp</th><td>${row.camp_name}</td></tr>
    <tr><th>Room</th><td>${row.room_number} (${getRoomCategoryLabel(row.room_category)})</td><th>Stay days</th><td>${row.stay_days}</td></tr>
    <tr><th>Check-in</th><td>${format(parseISO(row.check_in), "dd MMM yyyy")}</td><th>Check-out</th><td>${row.check_out ? format(parseISO(row.check_out), "dd MMM yyyy") : "Active"}</td></tr>
  </table>

  <div class="section"><strong>Cost Breakdown</strong></div>
  <table>
    <thead><tr><th>Description</th><th>Rate (SAR)</th><th>Qty</th><th class="right">Amount (SAR)</th></tr></thead>
    <tbody>
      <tr><td>Accommodation (full charge)</td><td>${row.daily_room_rate.toFixed(2)} / day</td><td>${row.stay_days} days</td><td class="right">${row.room_cost.toFixed(2)}</td></tr>
      <tr><td>Food — eligible meals</td><td>${row.meal_unit_rate.toFixed(2)} / meal</td><td>${row.total_meals_eligible} meals</td><td class="right">${row.food_cost_full.toFixed(2)}</td></tr>
      <tr><td>Less: Meals cancelled (vacation / on-site / shift)</td><td>${row.meal_unit_rate.toFixed(2)} / meal</td><td>${row.meals_cancelled} meals</td><td class="right" style="color:#b91c1c">- ${row.food_credit.toFixed(2)}</td></tr>
      <tr class="totals"><td colspan="3">Net Food Cost (${row.meals_consumed} meals consumed)</td><td class="right">${row.food_cost_net.toFixed(2)}</td></tr>
      <tr class="grand"><td colspan="3">TOTAL PAYABLE</td><td class="right">${row.total_cost.toFixed(2)}</td></tr>
    </tbody>
  </table>

  ${row.cancellation_breakdown.length ? `
  <div class="section"><strong>Meal cancellation log (${row.cancellation_breakdown.length} meals)</strong></div>
  <table>
    <thead><tr><th>Date</th><th>Meal</th><th>Reason</th><th>Remarks</th></tr></thead>
    <tbody>
      ${row.cancellation_breakdown.map((c) => `<tr><td>${c.date}</td><td>${c.meal}</td><td><span class="badge">${c.reason}</span></td><td>${c.remarks || "—"}</td></tr>`).join("")}
    </tbody>
  </table>` : ""}

  <div class="section" style="margin-top:30px;font-size:11px;color:#666">
    This invoice is auto-generated based on attendance, room allocation and approved food cancellations recorded in Camp-365.
  </div>
  <script>window.onload=()=>window.print();</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Employees" value={String(totals.employees)} icon={<FileText size={16} />} />
        <KpiCard label="Stay Days" value={String(totals.stayDays)} icon={<Calendar size={16} />} />
        <KpiCard label="Room Cost" value={fmt(totals.roomCost)} icon={<BedDouble size={16} />} color="text-blue-600" />
        <KpiCard label="Food Credit" value={`- ${fmt(totals.foodCredit)}`} icon={<UtensilsCrossed size={16} />} color="text-green-600" />
        <KpiCard label="Total Invoice" value={fmt(totals.total)} icon={<Receipt size={16} />} color="text-primary" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search employee / project..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">From</span>
          <Input type="date" className="w-[150px]" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <span className="text-xs text-muted-foreground">To</span>
          <Input type="date" className="w-[150px]" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <Select value={campId} onValueChange={setCampId}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Camp" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Camps</SelectItem>
            {camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {departments.length > 0 && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" onClick={exportCsv}><Download size={16} className="mr-1" /> Export CSV</Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Calculating invoice...</div>
      ) : filteredRows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No billable stays in this period.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Department-wise Cost Invoice</CardTitle></CardHeader>
          <CardContent className="px-0">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department / Project</TableHead>
                    <TableHead>Camp / Room</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead className="text-right">Room Cost</TableHead>
                    <TableHead className="text-center">Meals (Eligible / Cancelled / Net)</TableHead>
                    <TableHead className="text-right">Food (Net)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <TableRow key={r.employee_id + r.check_in}>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.emp_code}</div>
                      </TableCell>
                      <TableCell>
                        <div>{r.department}</div>
                        <div className="text-xs text-muted-foreground">{r.project}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">{r.camp_name}</div>
                        <div className="text-xs text-muted-foreground">{r.room_number} · {getRoomCategoryLabel(r.room_category)}</div>
                      </TableCell>
                      <TableCell className="text-center">{r.stay_days}</TableCell>
                      <TableCell className="text-right">{fmt(r.room_cost)}</TableCell>
                      <TableCell className="text-center text-xs">
                        <Badge variant="outline">{r.total_meals_eligible}</Badge>{" / "}
                        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{r.meals_cancelled}</Badge>{" / "}
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{r.meals_consumed}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{fmt(r.food_cost_net)}</div>
                        <div className="text-[10px] text-green-600">- {fmt(r.food_credit)} credit</div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">{fmt(r.total_cost)}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" onClick={() => printInvoice(r)}>
                          <Receipt size={14} className="mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Room is billed full per stay day. Food is reduced per cancelled meal at <strong>1/3 of daily food rate</strong>. Invoice can be exported per department for cross-charging.
      </p>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">{icon} {label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-lg font-bold ${color || ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
