import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PastelKpiCard } from "@/components/ui/pastel-kpi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DollarSign, CalendarRange, Home, Crown, UsersRound, PieChart as PieIcon,
  ArrowLeftRight, BedDouble, Briefcase, Globe2, Activity, Flame, CalendarIcon,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { startOfMonth, startOfYear, differenceInDays, format } from "date-fns";

type CostType = "all" | "rent" | "food";

const PIE_COLORS = [
  "hsl(221 83% 53%)", "hsl(142 71% 45%)", "hsl(35 92% 55%)",
  "hsl(340 75% 55%)", "hsl(262 83% 58%)", "hsl(175 80% 40%)",
  "hsl(0 0% 60%)",
];

export default function HomeDashboard() {
  const [campFilter, setCampFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [costType, setCostType] = useState<CostType>("all");
  const [fromDate, setFromDate] = useState<Date>(startOfYear(new Date()));
  const [toDate, setToDate] = useState<Date>(new Date());

  const { data: camps = [] } = useQuery({
    queryKey: ["home-camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id,name,is_rented,monthly_rent,status");
      if (error) throw error;
      return data;
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["home-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id,camp_id,max_capacity,current_occupancy,status,daily_rate,daily_food_rate");
      if (error) throw error;
      return data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["home-employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id,name,department,nationality,camp_id,status,employee_type,join_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ["home-checkins"],
    queryFn: async () => {
      const { data, error } = await supabase.from("check_ins").select("id,employee_id,camp_id,room_id,check_in_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: checkOuts = [] } = useQuery({
    queryKey: ["home-checkouts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("check_outs").select("id,employee_id,camp_id,check_out_date");
      if (error) throw error;
      return data;
    },
  });

  // Departments list from data
  const departments = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e: any) => e.department && s.add(e.department));
    return Array.from(s).sort();
  }, [employees]);

  const empById = useMemo(() => {
    const m = new Map<string, any>();
    employees.forEach((e: any) => m.set(e.id, e));
    return m;
  }, [employees]);

  const roomById = useMemo(() => {
    const m = new Map<string, any>();
    rooms.forEach((r: any) => m.set(r.id, r));
    return m;
  }, [rooms]);

  const campById = useMemo(() => {
    const m = new Map<string, any>();
    camps.forEach((c: any) => m.set(c.id, c));
    return m;
  }, [camps]);

  // Active occupants — those with check_in but no later check_out
  const activeOccupants = useMemo(() => {
    const lastOutDate = new Map<string, Date>();
    checkOuts.forEach((co: any) => {
      const d = new Date(co.check_out_date);
      const prev = lastOutDate.get(co.employee_id);
      if (!prev || d > prev) lastOutDate.set(co.employee_id, d);
    });
    const latestIn = new Map<string, any>();
    checkIns.forEach((ci: any) => {
      const d = new Date(ci.check_in_date);
      const prev = latestIn.get(ci.employee_id);
      if (!prev || d > new Date(prev.check_in_date)) latestIn.set(ci.employee_id, ci);
    });
    const out: any[] = [];
    latestIn.forEach((ci, empId) => {
      const lastOut = lastOutDate.get(empId);
      if (!lastOut || lastOut < new Date(ci.check_in_date)) out.push(ci);
    });
    return out;
  }, [checkIns, checkOuts]);

  // Filter helper for occupants
  const matchesFilters = (campId: string | null, empId: string) => {
    if (campFilter !== "all" && campId !== campFilter) return false;
    if (deptFilter !== "all") {
      const e = empById.get(empId);
      if (!e || e.department !== deptFilter) return false;
    }
    return true;
  };

  // Revenue calculation per check-in record
  const computeRevenue = (ci: any, fromDate: Date, toDate: Date) => {
    const room = roomById.get(ci.room_id);
    if (!room) return 0;
    const ciDate = new Date(ci.check_in_date);
    const startDate = ciDate > fromDate ? ciDate : fromDate;
    if (startDate > toDate) return 0;
    const days = Math.max(0, differenceInDays(toDate, startDate) + 1);
    const rent = costType === "food" ? 0 : Number(room.daily_rate || 0);
    const food = costType === "rent" ? 0 : Number(room.daily_food_rate || 0);
    return days * (rent + food);
  };

  // KPI calcs
  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const filteredOccupants = useMemo(
    () => activeOccupants.filter((ci) => matchesFilters(ci.camp_id, ci.employee_id)),
    [activeOccupants, campFilter, deptFilter, empById]
  );

  const periodRevenue = useMemo(
    () => filteredOccupants.reduce((s, ci) => s + computeRevenue(ci, fromDate, toDate), 0),
    [filteredOccupants, costType, fromDate, toDate]
  );
  const monthRevenue = useMemo(
    () => filteredOccupants.reduce((s, ci) => s + computeRevenue(ci, monthStart, now), 0),
    [filteredOccupants, costType]
  );
  const prevMonthRevenue = useMemo(
    () => filteredOccupants.reduce((s, ci) => s + computeRevenue(ci, prevMonthStart, prevMonthEnd), 0),
    [filteredOccupants, costType]
  );

  const externalRevenue = useMemo(() => {
    if (costType === "food") return 0;
    return camps
      .filter((c: any) => c.is_rented && (campFilter === "all" || c.id === campFilter))
      .reduce((s: number, c: any) => s + Number(c.monthly_rent || 0), 0);
  }, [camps, campFilter, costType]);

  // Revenue by camp (selected period)
  const revenueByCamp = useMemo(() => {
    const map = new Map<string, number>();
    filteredOccupants.forEach((ci) => {
      const rev = computeRevenue(ci, fromDate, toDate);
      if (!ci.camp_id) return;
      map.set(ci.camp_id, (map.get(ci.camp_id) || 0) + rev);
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ name: campById.get(id)?.name?.slice(0, 14) || "—", value: v }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOccupants, costType, fromDate, toDate]);

  const topCampRevenue = revenueByCamp[0]?.value || 0;
  const topCampName = revenueByCamp[0]?.name || "—";

  // Occupancy KPIs
  const filteredRooms = useMemo(
    () => rooms.filter((r: any) => campFilter === "all" || r.camp_id === campFilter),
    [rooms, campFilter]
  );
  const totalCapacity = filteredRooms.reduce((s: number, r: any) => s + (r.max_capacity || 0), 0);
  const totalOccupied = filteredOccupants.length; // dept-aware
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  const checkInsThisMonth = checkIns.filter(
    (ci: any) => new Date(ci.check_in_date) >= fromDate && new Date(ci.check_in_date) <= toDate &&
      (campFilter === "all" || ci.camp_id === campFilter) &&
      (deptFilter === "all" || empById.get(ci.employee_id)?.department === deptFilter)
  ).length;
  const checkOutsThisMonth = checkOuts.filter(
    (co: any) => new Date(co.check_out_date) >= fromDate && new Date(co.check_out_date) <= toDate &&
      (campFilter === "all" || co.camp_id === campFilter) &&
      (deptFilter === "all" || empById.get(co.employee_id)?.department === deptFilter)
  ).length;

  const isolationCount = filteredRooms.filter((r: any) => r.status === "under_maintenance" || r.status === "reserved").length;

  // Camp occupancy breakdown
  const campBreakdown = useMemo(() => {
    return camps
      .filter((c: any) => campFilter === "all" || c.id === campFilter)
      .map((c: any) => {
        const cRooms = rooms.filter((r: any) => r.camp_id === c.id);
        const cap = cRooms.reduce((s: number, r: any) => s + r.max_capacity, 0);
        const occ = filteredOccupants.filter((ci) => ci.camp_id === c.id).length;
        return {
          id: c.id, name: c.name,
          occ, cap,
          pct: cap > 0 ? Math.round((occ / cap) * 100) : 0,
        };
      });
  }, [camps, rooms, filteredOccupants, campFilter]);

  // Nationality mix
  const nationalityMix = useMemo(() => {
    const map = new Map<string, number>();
    filteredOccupants.forEach((ci) => {
      const e = empById.get(ci.employee_id);
      const nat = e?.nationality || "Other";
      map.set(nat, (map.get(nat) || 0) + 1);
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (arr.length > 6) {
      const others = arr.slice(6).reduce((s, x) => s + x.value, 0);
      return [...arr.slice(0, 6), { name: "Others", value: others }];
    }
    return arr;
  }, [filteredOccupants, empById]);

  const totalNationalityCount = nationalityMix.reduce((s, x) => s + x.value, 0) || 1;

  // Workforce stats
  const filteredEmployees = useMemo(
    () => employees.filter((e: any) =>
      e.status === "active" &&
      (campFilter === "all" || e.camp_id === campFilter) &&
      (deptFilter === "all" || e.department === deptFilter)
    ),
    [employees, campFilter, deptFilter]
  );

  const largestDept = useMemo(() => {
    const map = new Map<string, number>();
    filteredEmployees.forEach((e: any) => {
      const d = e.department || "—";
      map.set(d, (map.get(d) || 0) + 1);
    });
    const top = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], count: top[1] } : { name: "—", count: 0 };
  }, [filteredEmployees]);

  const totalWorkforce = filteredEmployees.length;

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Home Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time KPIs across revenue, occupancy and workforce.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(fromDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={fromDate} onSelect={(d) => d && setFromDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(toDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={(d) => d && setToDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Select value={campFilter} onValueChange={setCampFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Camp" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Camps</SelectItem>
              {camps.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={costType} onValueChange={(v) => setCostType(v as CostType)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cost Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Food + Rent</SelectItem>
              <SelectItem value="rent">Rent Only</SelectItem>
              <SelectItem value="food">Food Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* REVENUE KPIs */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Revenue KPIs</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PastelKpiCard
            label="Period Revenue"
            value={`SR ${(periodRevenue / 1_000_000).toFixed(2)}M`}
            icon={DollarSign}
            tone="blue"
            hint={`${format(fromDate, "MMM d, yy")} – ${format(toDate, "MMM d, yy")}`}
          />
          <PastelKpiCard
            label="Current Month"
            value={`SR ${(monthRevenue / 1_000).toFixed(1)}K`}
            icon={CalendarRange}
            tone="mint"
            hint={`Prev month SR ${(prevMonthRevenue / 1_000).toFixed(1)}K`}
          />
          <PastelKpiCard
            label="External Revenue"
            value={`SR ${(externalRevenue / 1_000).toFixed(0)}K`}
            icon={Home}
            tone="amber"
            hint="Camp rentals (monthly)"
          />
          <PastelKpiCard
            label="Top Camp Revenue"
            value={`SR ${(topCampRevenue / 1_000_000).toFixed(2)}M`}
            icon={Crown}
            tone="pink"
            hint={topCampName}
          />
        </div>
      </div>

      {/* OCCUPANCY KPIs */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Occupancy KPIs</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PastelKpiCard
            label="Total Workforce"
            value={totalWorkforce.toLocaleString()}
            icon={UsersRound}
            tone="indigo"
            hint={`Design cap. ${totalCapacity.toLocaleString()}`}
          />
          <PastelKpiCard
            label="Overall Occupancy"
            value={`${occupancyPct}%`}
            icon={PieIcon}
            tone="green"
            hint="Occupied beds"
          />
          <PastelKpiCard
            label="Check-ins / Check-outs"
            value={`${checkInsThisMonth} / ${checkOutsThisMonth}`}
            icon={ArrowLeftRight}
            tone="sky"
            hint="This month"
          />
          <PastelKpiCard
            label="Isolation / Reserved"
            value={isolationCount}
            icon={BedDouble}
            tone="rose"
            hint={`${totalCapacity > 0 ? ((isolationCount / Math.max(filteredRooms.length, 1)) * 100).toFixed(2) : 0}% of rooms`}
          />
        </div>
      </div>

      {/* CAMP OCCUPANCY BREAKDOWN */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Camp Occupancy Breakdown</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {campBreakdown.map((c, i) => {
            const tones: any[] = ["teal", "indigo", "amber", "violet", "rose", "mint"];
            const tone = tones[i % tones.length];
            return (
              <div key={c.id} className="rounded-2xl bg-muted/40 ring-1 ring-border p-4">
                <p className="font-semibold text-sm truncate">{c.name}</p>
                <div className="mt-2">
                  <Progress value={c.pct} className="h-2" />
                </div>
                <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
                  <span>Occ: <span className="font-bold text-foreground">{c.pct}%</span></span>
                  <span>{c.occ.toLocaleString()} / {c.cap.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
          {campBreakdown.length === 0 && (
            <p className="text-sm text-muted-foreground">No camp data.</p>
          )}
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Nationality Mix — Top 6</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {nationalityMix.map((n, i) => (
                <div key={n.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{n.name}</span>
                  <span className="font-semibold">{Math.round((n.value / totalNationalityCount) * 100)}%</span>
                </div>
              ))}
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={nationalityMix} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={2} stroke="none">
                    {nationalityMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Revenue by Camp — YTD (SR M)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByCamp.map((r) => ({ name: r.name, value: +(r.value / 1_000_000).toFixed(2) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `SR ${v}M`} />
                  <Tooltip
                    formatter={(v: any) => [`SR ${v}M`, "Revenue"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {revenueByCamp.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WORKFORCE & UTILITIES */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Workforce & Utilities</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PastelKpiCard
            label={`Largest Dept (${largestDept.name})`}
            value={largestDept.count.toLocaleString()}
            icon={Briefcase}
            tone="violet"
            hint={totalWorkforce > 0 ? `${Math.round((largestDept.count / totalWorkforce) * 100)}% of workforce` : "—"}
          />
          <PastelKpiCard
            label="Nationalities"
            value={nationalityMix.length}
            icon={Globe2}
            tone="teal"
            hint={nationalityMix[0] ? `Top: ${nationalityMix[0].name}` : "—"}
          />
          <PastelKpiCard
            label="Avg Daily Cost / Bed"
            value={`SR ${
              totalOccupied > 0
                ? Math.round(
                    filteredOccupants.reduce((s, ci) => {
                      const room = roomById.get(ci.room_id);
                      if (!room) return s;
                      const rent = costType === "food" ? 0 : Number(room.daily_rate || 0);
                      const food = costType === "rent" ? 0 : Number(room.daily_food_rate || 0);
                      return s + rent + food;
                    }, 0) / totalOccupied
                  )
                : 0
            }`}
            icon={Activity}
            tone="amber"
            hint="Room + Food blended"
          />
          <PastelKpiCard
            label="Active Occupants"
            value={totalOccupied.toLocaleString()}
            icon={Flame}
            tone="rose"
            hint={`${checkInsThisMonth} in / ${checkOutsThisMonth} out this month`}
          />
        </div>
      </div>
    </div>
  );
}
