import { computeMealCost, defaultMealRates, type MealRates } from "@/lib/mealCosting";
import { loadAccommodationAbsences } from "@/hooks/useAccommodationAbsences";
import { absencePeriods } from "@/lib/accommodationAbsence";
import { loadLockerBilling } from "@/hooks/useLockers";
import { lockerCharge } from "@/lib/lockers";
import { getExcelTierRates, getExcelMealRates } from "@/lib/excelRates";
import { approvedFoodCancellations } from "@/lib/approvedFoodCancellations";
import { billableStayWindow, stayDeparture } from "@/lib/stayBilling";
import { LEAVE_STATUSES, leaveDaysWithin, leaveRangesWithin, dmy, roomCostWithHolding, type LeavePeriod } from "@/lib/roomHolding";
import { resolveRoomStayCost, type RoomRateSchedule } from "@/lib/roomRateSchedule";
import { matchesDepartment } from "@/lib/departmentLabels";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, DollarSign, Users, BedDouble, UtensilsCrossed } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { TablePager, usePaged } from "@/components/TablePager";

// Throw on any failed query: silently missing check-outs or leaves would mis-bill every stay.
export function rowsOf<T>({ data, error }: { data: T[] | null; error: unknown }): T[] {
  if (error) throw error;
  return data ?? [];
}

/** Everything revenue needs except cancellations. Not date-bound: stays outside a window bill 0 days. */
async function fetchRevenueBase() {
  const [checkIns, checkOuts, rates, categories, suppliers, ramadan, campMealRates, leaves, rateSchedules] = await Promise.all([
    supabase.from("check_ins").select("id, employee_id, room_id, camp_id, check_in_date, food_required, employees(id, employee_id, name, department, sub_department, supplier_name, employee_type, project, presence_status), rooms(id, room_number, category, daily_food_rate, building_id, buildings(name)), camps(id, name)").then(rowsOf),
    supabase.from("check_outs").select("employee_id, check_out_date").then(rowsOf),
    supabase.from("camp_room_rates").select("*").then(rowsOf),
    supabase.from("room_categories").select("code, category_key, holding_charge").then(rowsOf),
    supabase.from("clients").select("id, code, name, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate, is_active, client_room_rates(room_category_code, daily_rate)").then(rowsOf),
    supabase.from("camp_food_cancellation_settings").select("camp_id, ramadan_mode, ramadan_start, ramadan_end").then(rowsOf),
    supabase.from("camp_meal_rates").select("camp_id, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate").then(rowsOf),
    supabase.from("employee_status_log").select("employee_id, to_status, effective_from, effective_to").in("to_status", LEAVE_STATUSES as any).then(rowsOf),
    (supabase as any).from("camp_room_rate_schedules").select("*").then((res: any) => res.data ?? []).catch(() => []),
  ]);
  return { checkIns, checkOuts, rates, categories, suppliers, ramadan, campMealRates, leaves, rateSchedules };
}

export function useRevenueData(fromDate: string, toDate: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["revenue-data", fromDate, toDate],
    staleTime: 120_000,
    gcTime: 600_000,
    queryFn: async () => {
      // Parallelize all base and child datasets with query client caching
      const [base, cancellations, absences, lockerBilling] = await Promise.all([
        qc.fetchQuery({ queryKey: ["revenue-data", "base"], queryFn: fetchRevenueBase, staleTime: 120_000 }),
        supabase
          .from("food_cancellation_requests")
          .select("id, employee_id, from_date, to_date, status, source, reason, food_cancellation_request_meals(meal_type)")
          .eq("status", "approved")
          .lte("from_date", toDate)
          .gte("to_date", fromDate)
          .then(rowsOf),
        qc.fetchQuery({ queryKey: ["accommodation-absences"], queryFn: loadAccommodationAbsences, staleTime: 120_000 }),
        qc.fetchQuery({ queryKey: ["locker-billing"], queryFn: loadLockerBilling, staleTime: 120_000 }),
      ]);
      return { lockerBilling, absences, ...base, cancellations };
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
    // Camp Food Rates master: standard per-meal prices per camp for non-supplier staff.
    const campMealByCamp: Record<string, MealRates> = {};
    (data.campMealRates || []).forEach((r: any) => {
      const breakfast = Number(r.breakfast_rate) || 0, lunch = Number(r.lunch_rate) || 0, dinner = Number(r.dinner_rate) || 0;
      campMealByCamp[r.camp_id] = { breakfast, lunch, dinner, ramadan: Number(r.ramadan_rate) || breakfast + lunch + dinner };
    });
    const leaveByEmp: Record<string, LeavePeriod[]> = {};
    const statusPeriodsByEmp: Record<string, any[]> = {};
    (data.leaves || []).forEach((l: any) => {
      (leaveByEmp[l.employee_id] = leaveByEmp[l.employee_id] || []).push({ from: l.effective_from, to: l.effective_to });
      (statusPeriodsByEmp[l.employee_id] = statusPeriodsByEmp[l.employee_id] || []).push({ status: l.to_status, from: l.effective_from, to: l.effective_to || null });
    });
    const rateMap: Record<string, number> = {};
    rates.forEach((r: any) => { rateMap[`${r.camp_id}-${r.room_category}`] = Number(r.daily_rate) || 0; });

    const cancelByEmp: Record<string, any[]> = {};
    approvedFoodCancellations(cancellations).forEach((c: any) => {
      (cancelByEmp[c.employee_id] = cancelByEmp[c.employee_id] || []).push(c);
    });

    // Fast indexed lookup for absences by check_in_id (O(1) instead of repeated O(N) filters)
    const absencesByCiId: Record<string, any[]> = {};
    (data.absences || []).forEach((a: any) => {
      (absencesByCiId[a.check_in_id] = absencesByCiId[a.check_in_id] || []).push(a);
    });

    // Fast indexed lookup for lockers by employee and camp
    const lockerByEmpAndCamp: Record<string, any[]> = {};
    if (data.lockerBilling?.allocations && data.lockerBilling?.lockers) {
      const lockerCampMap = new Map(data.lockerBilling.lockers.map((l: any) => [l.id, l.camp_id]));
      data.lockerBilling.allocations.forEach((a: any) => {
        const cId = lockerCampMap.get(a.locker_id);
        if (cId) {
          const k = `${a.employee_id}-${cId}`;
          (lockerByEmpAndCamp[k] = lockerByEmpAndCamp[k] || []).push(a);
        }
      });
    }

    return checkIns.map((ci: any) => {
      const emp = ci.employees;
      const room = ci.rooms;
      const camp = ci.camps;
      if (!emp || !room) return null;

      const departure = stayDeparture(ci, checkOuts, checkIns);
      const { start: stayStart, end: stayEnd, days: stayDays } = billableStayWindow(ci.check_in_date, departure, fromDate, toDate);
      if (stayDays === 0) return null;
      // Supplier employees are charged at their supplier's rates from the Supplier Master; own staff use standard rates.
      const client = emp.employee_type === "supplier" && emp.supplier_name ? supplierByName[String(emp.supplier_name).trim().toLowerCase()] ?? null : null;
      const clientRoom = client?.client_room_rates?.find((r: any) => r.room_category_code === codeByKey[room.category]);
      const standardRates = getExcelTierRates(room.category, room.max_capacity);
      const configuredDailyRoom = rateMap[`${ci.camp_id}-${room.category}`];
      const fallbackDailyRoom = clientRoom ? Number(clientRoom.daily_rate) || 0 : (configuredDailyRoom && configuredDailyRoom > 0 ? configuredDailyRoom : standardRates.accommodationRate);
      const fallbackHoldingCharge = (holdingMap[room.category] && holdingMap[room.category] > 0) ? holdingMap[room.category] : standardRates.holdingRate;
      const baseFood = ci.food_required ? Number(room.daily_food_rate) || 0 : 0;
      const mealRates: MealRates = !ci.food_required ? { breakfast: 0, lunch: 0, dinner: 0, ramadan: 0 }
        : client ? { breakfast: Number(client.breakfast_rate) || 0, lunch: Number(client.lunch_rate) || 0, dinner: Number(client.dinner_rate) || 0, ramadan: Number(client.ramadan_rate) || 0 }
        : campMealByCamp[ci.camp_id] ?? (baseFood > 0 ? defaultMealRates(baseFood) : getExcelMealRates(room.category, room.max_capacity));
      const dailyFood = mealRates.breakfast + mealRates.lunch + mealRates.dinner;
      const ciAbsences = absencesByCiId[ci.id] || [];
      const periods = [...(leaveByEmp[ci.employee_id] || []), ...absencePeriods(ciAbsences, ci.id)];
      const leaves = leaveRangesWithin(periods, stayStart, stayEnd);
      // Leave days automatically remove every meal for those days; the room is charged at the holding rate.
      const meal = computeMealCost(stayStart, stayEnd, mealRates,
        [...(cancelByEmp[ci.employee_id] || []).map((c: any) => ({ from: c.from_date, to: c.to_date, meals: (c.food_cancellation_request_meals || []).map((m: any) => m.meal_type) })),
         ...leaves.map(l => ({ from: l.from, to: l.to, meals: [] as string[] }))],
        ramadanByCamp[ci.camp_id]);
      const mealsCancelled = meal.mealsCancelled;
      const leaveFoodDeductions = computeMealCost(stayStart, stayEnd, mealRates,
        leaves.map(l => ({ from: l.from, to: l.to, meals: [] })), ramadanByCamp[ci.camp_id]).deductions;

      // Rate schedule resolution (date-effective room rate changes)
      const rateSchedules: RoomRateSchedule[] = data.rateSchedules || [];
      const roomStay = resolveRoomStayCost(
        stayStart,
        stayEnd,
        ci.camp_id,
        room.category,
        rateSchedules,
        fallbackDailyRoom,
        fallbackHoldingCharge,
        leaves
      );

      const leaveDays = roomStay.leaveDays;
      const roomRevenue = roomStay.totalRoomRevenue;
      const normalRoomCost = roomStay.normalRoomCost;
      const holdingCost = roomStay.holdingCost;
      const dailyRoom = roomStay.effectiveDailyRate;
      const holdingCharge = fallbackHoldingCharge;
      const foodRevenue = meal.net;
      const empLockers = lockerByEmpAndCamp[`${ci.employee_id}-${ci.camp_id}`] || [];
      const lockerCost = empLockers.reduce((sum: number, a: any) => sum + lockerCharge(a, format(stayStart, "yyyy-MM-dd"), format(stayEnd, "yyyy-MM-dd")), 0);
      const total = roomRevenue + foodRevenue + lockerCost;

      return {
        id: ci.id,
        employeeId: emp.id,
        emp_code: emp.employee_id,
        name: emp.name,
        department: emp.department || "—",
        subDepartment: (emp as any).sub_department || emp.department || "—",
        supplier: emp.supplier_name || (emp.employee_type === "own" ? "Own" : "—"),
        project: emp.project || "—",
        camp: camp?.name || "—",
        campId: ci.camp_id,
        block: room.buildings?.name || "—",
        blockId: room.building_id || "—",
        room: room.room_number,
        category: room.category,
        presenceStatus: emp.presence_status,
        statusPeriods: statusPeriodsByEmp[ci.employee_id] || [],
        stayDays,
        dailyRoom,
        leaveDays,
        stayFrom: dmy(stayStart), stayTo: dmy(stayEnd),
        leaves: leaves.map(l => ({ from: dmy(l.from), to: dmy(l.to) })),
        holdingCharge,
        normalRoomCost,
        holdingCost,
        hasRateChange: roomStay.hasRateChange,
        rateBreakdownLabel: roomStay.rateBreakdownLabel,
        rateSegments: roomStay.segments,
        absences: ciAbsences,
        dailyFood,
        foodFull: meal.full,
        foodDeductions: meal.deductions,
        leaveFoodDeductions,
        breakfastCount: meal.breakfastDays, lunchCount: meal.lunchDays, dinnerCount: meal.dinnerDays, ramadanCount: meal.ramadanDays,
        breakfastCost: meal.breakfast, lunchCost: meal.lunch, dinnerCost: meal.dinner, ramadanCost: meal.ramadan,
        supplierRates: !!client,
        roomRevenue,
        lockerCost,
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

  const departments = useMemo(() => {
    const set = new Set(rows.map(r => r.department).filter(d => d !== "—"));
    if (rows.some(r => matchesDepartment({ department: r.department, project: r.project }, "HERD"))) {
      set.add("HERD");
    }
    return Array.from(set).sort();
  }, [rows]);
  const suppliers = useMemo(() => Array.from(new Set(rows.map(r => r.supplier).filter(d => d !== "—"))).sort(), [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (deptFilter !== "all" && !matchesDepartment({ department: r.department, project: r.project }, deptFilter)) return false;
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

  const paged = usePaged(filtered, 50);

  const handleExport = () => {
    const headers = ["Employee ID", "Name", "Department", "Supplier", "Project", "Camp", "Room", "Stay Days", "Daily Room (SAR)", "Rate Split", "Room Revenue", "Meals Cancelled", "Food Revenue", "Total Revenue"];
    const csvRows = filtered.map(r => [
      r.emp_code,
      r.name,
      r.department,
      r.supplier,
      r.project,
      r.camp,
      r.room,
      r.stayDays,
      (Number(r.dailyRoom) || 0).toFixed(2),
      r.hasRateChange ? r.rateBreakdownLabel : "Standard",
      (Number(r.roomRevenue) || 0).toFixed(2),
      r.mealsCancelled,
      (Number(r.foodRevenue) || 0).toFixed(2),
      (Number(r.total) || 0).toFixed(2),
    ]);
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
        <StatCard label="Inmates" value={(Number(totals?.inmates) || 0).toString()} icon={<Users size={16} />} />
        <StatCard label="Stay Days" value={(Number(totals?.stayDays) || 0).toString()} icon={<BedDouble size={16} />} />
        <StatCard label="Room Revenue" value={`SAR ${(Number(totals?.room) || 0).toLocaleString()}`} icon={<BedDouble size={16} />} color="text-blue-600" />
        <StatCard label="Food Revenue" value={`SAR ${(Number(totals?.food) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<UtensilsCrossed size={16} />} color="text-orange-600" />
        <StatCard label="Total Revenue" value={`SAR ${(Number(totals?.total) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<DollarSign size={16} />} color="text-green-600" />
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
              {paged.rows.map(r => (
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
                  <TableCell className="text-right">
                    {(Number(r.roomRevenue) || 0).toLocaleString()}
                    {r.hasRateChange && (
                      <div className="text-[11px] text-blue-600 font-medium" title={r.rateBreakdownLabel}>
                        ⚡ Split: {r.rateBreakdownLabel}
                      </div>
                    )}
                    {Number(r.holdingCost) > 0 && <div className="text-xs text-muted-foreground">Normal {r.normalRoomCost} · Holding {r.holdingCost}</div>}
                  </TableCell>
                  <TableCell className="text-right">{Number(r.mealsCancelled) || 0}</TableCell>
                  <TableCell className="text-right">{(Number(r.foodRevenue) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="text-right font-semibold">{(Number(r.total) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}{Number(r.lockerCost) > 0 && <div className="text-xs text-muted-foreground">Locker Charges {(Number(r.lockerCost) || 0).toFixed(2)}</div>}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No revenue data for selected filters</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <TablePager {...paged} />
          <LeaveNotes rows={paged.rows} />
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
  const absences = rows.flatMap(r => (r.absences || []).map((a: any) => ({ r, a })));
  if (!items.length && !absences.length) return null;
  return (
    <div className="border-t p-3 text-xs space-y-1 bg-muted/30">
      <div className="font-semibold">Leave days (food auto-deducted, room at holding charge)</div>
      {items.map(r => r.leaves.map((l: any, i: number) => (
        <div key={r.id + i}>{r.name} ({r.emp_code}) from: {l.from} to: {l.to}</div>
      )))}
      {absences.length > 0 && <Table><TableHeader><TableRow>{["Employee ID / Name", "Camp / Room", "Temporary Out", "Expected Return", "Actual Return / Status", "Reason", "Normal Room", "Holding"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{absences.map(({ r, a }: any) => <TableRow key={`${r.id}-${a.id}`}><TableCell>{r.emp_code} / {r.name}</TableCell><TableCell>{r.camp} / {r.room}</TableCell><TableCell>{a.temporary_out_date}</TableCell><TableCell>{a.expected_return_date || "—"}</TableCell><TableCell>{a.ended_by_checkout ? "Permanent checkout" : a.actual_return_date || "Room retained"}</TableCell><TableCell>{a.reason}</TableCell><TableCell>{r.normalRoomCost}</TableCell><TableCell>{r.holdingCost}</TableCell></TableRow>)}</TableBody></Table>}
    </div>
  );
}
