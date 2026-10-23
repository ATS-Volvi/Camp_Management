import { computeMealCost, defaultMealRates, type MealRates } from "@/lib/mealCosting";
import { LEAVE_STATUSES, leaveDaysWithin, leaveRangesWithin, dmy, roomCostWithHolding, type LeavePeriod } from "@/lib/roomHolding";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, DollarSign, Users, BedDouble, UtensilsCrossed } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000) + 1);
}

export function useRevenueData(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["revenue-data", fromDate, toDate],
    queryFn: async () => {
      const { data: checkIns, error } = await supabase
        .from("check_ins")
        .select("id, employee_id, room_id, camp_id, check_in_date, food_required, employees(id, employee_id, name, department, supplier_name, employee_type, project), rooms(id, room_number, category, daily_food_rate), camps(id, name)")
        .lte("check_in_date", toDate + "T23:59:59");
      if (error) throw error;

      const empIds = Array.from(new Set((checkIns || []).map((c: any) => c.employee_id)));
      const { data: checkOuts } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .in("employee_id", empIds.length ? empIds : ["00000000-0000-0000-0000-000000000000"]);

      const { data: rates } = await supabase.from("camp_room_rates").select("*");
      const { data: categories } = await supabase.from("room_categories").select("code, category_key, holding_charge");
      const { data: clients } = await supabase.from("clients").select("id, code, name, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate, is_active, client_room_rates(room_category_code, daily_rate)");
      const { data: ramadan } = await supabase.from("camp_food_cancellation_settings").select("camp_id, ramadan_mode, ramadan_start, ramadan_end");
      const { data: leaves } = await supabase
        .from("employee_status_log")
        .select("employee_id, to_status, effective_from, effective_to")
        .in("to_status", LEAVE_STATUSES as any)
        .in("employee_id", empIds.length ? empIds : ["00000000-0000-0000-0000-000000000000"]);

      const { data: cancellations } = await supabase
        .from("food_cancellation_requests")
        .select("id, employee_id, from_date, to_date, status, food_cancellation_request_meals(meal_type)")
        .eq("status", "approved")
        .lte("from_date", toDate)
        .gte("to_date", fromDate);

      return { checkIns: checkIns || [], checkOuts: checkOuts || [], rates: rates || [], cancellations: cancellations || [], categories: categories || [], leaves: leaves || [], suppliers: clients || [], ramadan: ramadan || [] };
    },
  });
}

export function buildRevenueRows(data: any, fromDate: string, toDate: string): any[] {
    if (!data) return [];
    const { checkIns, checkOuts, rates, cancellations } = data;
    const holdingMap: Record<string, number> = {};
    (data.categories || []).forEach((c: any) => { if (c.category_key) holdingMap[c.category_key] = Number(c.holding_charge) || 0; });
    const codeByKey: Record<string, string> = {};
    (data.categories || []).forEach((c: any) => { if (c.category_key) codeByKey[c.category_key] = c.code; });
    const supplierByName: Record<string, any> = {};
    (data.suppliers || []).forEach((c: any) => { if (c.is_active !== false) supplierByName[String(c.name).trim().toLowerCase()] = c; });
    const ramadanByCamp: Record<string, { start: string; end: string }> = {};
    (data.ramadan || []).forEach((r: any) => { if (r.ramadan_mode && r.ramadan_start && r.ramadan_end) ramadanByCamp[r.camp_id] = { start: r.ramadan_start, end: r.ramadan_end }; });
    const leaveByEmp: Record<string, LeavePeriod[]> = {};
    (data.leaves || []).forEach((l: any) => { (leaveByEmp[l.employee_id] = leaveByEmp[l.employee_id] || []).push({ from: l.effective_from, to: l.effective_to }); });
    const rangeStart = new Date(fromDate);
    const rangeEnd = new Date(toDate);

    const checkOutMap: Record<string, Date> = {};
    checkOuts.forEach((co: any) => {
      const d = new Date(co.check_out_date);
      if (!checkOutMap[co.employee_id] || d > checkOutMap[co.employee_id]) checkOutMap[co.employee_id] = d;
    });

    const rateMap: Record<string, number> = {};
    rates.forEach((r: any) => { rateMap[`${r.camp_id}-${r.room_category}`] = Number(r.daily_rate) || 0; });

    const cancelByEmp: Record<string, any[]> = {};
    cancellations.forEach((c: any) => {
      (cancelByEmp[c.employee_id] = cancelByEmp[c.employee_id] || []).push(c);
    });

    return checkIns.map((ci: any) => {
      const emp = ci.employees;
      const room = ci.rooms;
      const camp = ci.camps;
      if (!emp || !room) return null;

      const ciDate = new Date(ci.check_in_date);
      const coDate = checkOutMap[ci.employee_id];
      const stayStart = ciDate > rangeStart ? ciDate : rangeStart;
      const stayEnd = coDate && coDate < rangeEnd ? coDate : rangeEnd;
      if (stayEnd < stayStart) return null;

      const stayDays = daysBetween(stayStart, stayEnd);
      // Supplier employees are charged at their supplier's rates from the Supplier Master; own staff use standard rates.
      const client = emp.employee_type === "supplier" && emp.supplier_name ? supplierByName[String(emp.supplier_name).trim().toLowerCase()] ?? null : null;
      const clientRoom = client?.client_room_rates?.find((r: any) => r.room_category_code === codeByKey[room.category]);
      const dailyRoom = clientRoom ? Number(clientRoom.daily_rate) || 0 : rateMap[`${ci.camp_id}-${room.category}`] || 0;
      const baseFood = ci.food_required ? Number(room.daily_food_rate) || 0 : 0;
      const mealRates: MealRates = !ci.food_required ? { breakfast: 0, lunch: 0, dinner: 0, ramadan: 0 }
        : client ? { breakfast: Number(client.breakfast_rate) || 0, lunch: Number(client.lunch_rate) || 0, dinner: Number(client.dinner_rate) || 0, ramadan: Number(client.ramadan_rate) || 0 }
        : defaultMealRates(baseFood);
      const dailyFood = mealRates.breakfast + mealRates.lunch + mealRates.dinner;
      const leaves = leaveRangesWithin(leaveByEmp[ci.employee_id] || [], stayStart, stayEnd);
      // Leave days automatically remove every meal for those days; the room is charged at the holding rate.
      const meal = computeMealCost(stayStart, stayEnd, mealRates,
        [...(cancelByEmp[ci.employee_id] || []).map((c: any) => ({ from: c.from_date, to: c.to_date, meals: (c.food_cancellation_request_meals || []).map((m: any) => m.meal_type) })),
         ...leaves.map(l => ({ from: l.from, to: l.to, meals: [] as string[] }))],
        ramadanByCamp[ci.camp_id]);
      const mealsCancelled = meal.mealsCancelled;
      const holdingCharge = holdingMap[room.category] || 0;
      const leaveDays = Math.min(stayDays, leaveDaysWithin(leaveByEmp[ci.employee_id] || [], stayStart, stayEnd));
      const roomRevenue = roomCostWithHolding(stayDays, leaveDays, dailyRoom, holdingCharge);
      const foodRevenue = meal.net;
      const total = roomRevenue + foodRevenue;

      return {
        id: ci.id,
        emp_code: emp.employee_id,
        name: emp.name,
        department: emp.department || "—",
        supplier: emp.supplier_name || (emp.employee_type === "own" ? "Own" : "—"),
        project: emp.project || "—",
        camp: camp?.name || "—",
        room: room.room_number,
        category: room.category,
        stayDays,
        dailyRoom,
        leaveDays,
        stayFrom: dmy(stayStart), stayTo: dmy(stayEnd),
        leaves: leaves.map(l => ({ from: dmy(l.from), to: dmy(l.to) })),
        holdingCharge,
        dailyFood,
        foodFull: meal.full,
        breakfastCost: meal.breakfast, lunchCost: meal.lunch, dinnerCost: meal.dinner, ramadanCost: meal.ramadan,
        supplierRates: !!client,
        roomRevenue,
        mealsCancelled,
        foodRevenue,
        total,
      };
    }).filter(Boolean) as any[];
}

export default function RevenueReportTab() {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [deptFilter, setDeptFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  const { data, isLoading } = useRevenueData(fromDate, toDate);

  const rows = useMemo(() => buildRevenueRows(data, fromDate, toDate), [data, fromDate, toDate]);

  const departments = useMemo(() => Array.from(new Set(rows.map(r => r.department).filter(d => d !== "—"))).sort(), [rows]);
  const suppliers = useMemo(() => Array.from(new Set(rows.map(r => r.supplier).filter(d => d !== "—"))).sort(), [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (deptFilter !== "all" && r.department !== deptFilter) return false;
    if (supplierFilter !== "all" && r.supplier !== supplierFilter) return false;
    return true;
  }), [rows, deptFilter, supplierFilter]);

  const totals = useMemo(() => ({
    inmates: filtered.length,
    stayDays: filtered.reduce((s, r) => s + r.stayDays, 0),
    room: filtered.reduce((s, r) => s + r.roomRevenue, 0),
    food: filtered.reduce((s, r) => s + r.foodRevenue, 0),
    total: filtered.reduce((s, r) => s + r.total, 0),
  }), [filtered]);

  const handleExport = () => {
    const headers = ["Employee ID", "Name", "Department", "Supplier", "Project", "Camp", "Room", "Stay Days", "Daily Room (SAR)", "Room Revenue", "Meals Cancelled", "Food Revenue", "Total Revenue"];
    const csvRows = filtered.map(r => [r.emp_code, r.name, r.department, r.supplier, r.project, r.camp, r.room, r.stayDays, r.dailyRoom, r.roomRevenue.toFixed(2), r.mealsCancelled, r.foodRevenue.toFixed(2), r.total.toFixed(2)]);
    const csv = [headers.join(","), ...csvRows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `revenue-report-${fromDate}-to-${toDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Department</Label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Supplier</Label>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleExport}><Download size={16} className="mr-1" /> Export CSV</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Inmates" value={totals.inmates.toString()} icon={<Users size={16} />} />
        <StatCard label="Stay Days" value={totals.stayDays.toString()} icon={<BedDouble size={16} />} />
        <StatCard label="Room Revenue" value={`SAR ${totals.room.toLocaleString()}`} icon={<BedDouble size={16} />} color="text-blue-600" />
        <StatCard label="Food Revenue" value={`SAR ${totals.food.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<UtensilsCrossed size={16} />} color="text-orange-600" />
        <StatCard label="Total Revenue" value={`SAR ${totals.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<DollarSign size={16} />} color="text-green-600" />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="border rounded-lg max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Camp / Room</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead className="text-right">Room Rev (SAR)</TableHead>
                <TableHead className="text-right">Meals Cxl</TableHead>
                <TableHead className="text-right">Food Rev (SAR)</TableHead>
                <TableHead className="text-right">Total (SAR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.emp_code}</div>
                    <div className="text-xs text-muted-foreground">From: {r.stayFrom} To: {r.stayTo}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="font-mono text-xs">{r.department}</Badge></TableCell>
                  <TableCell>{r.supplier}</TableCell>
                  <TableCell><div className="text-xs">{r.camp}</div><div className="font-medium">{r.room}</div></TableCell>
                  <TableCell className="text-right">{r.stayDays}</TableCell>
                  <TableCell className="text-right">{r.roomRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{r.mealsCancelled}</TableCell>
                  <TableCell className="text-right">{r.foodRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="text-right font-semibold">{r.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No revenue data for selected filters</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <LeaveNotes rows={filtered} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className={`text-xl font-bold ${color || ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function LeaveNotes({ rows }: { rows: any[] }) {
  const items = rows.filter(r => r.leaves?.length);
  if (!items.length) return null;
  return (
    <div className="border-t p-3 text-xs space-y-1 bg-muted/30">
      <div className="font-semibold">Leave days (food auto-deducted, room at holding charge)</div>
      {items.map(r => r.leaves.map((l: any, i: number) => (
        <div key={r.id + i}>{r.name} ({r.emp_code}) from: {l.from} to: {l.to}</div>
      )))}
    </div>
  );
}
