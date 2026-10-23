import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, formatDistanceToNow } from "date-fns";
import { CalendarIcon, Wrench, CheckCircle2, Clock, AlertTriangle, TrendingUp, Users, Filter, Eye, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PastelKpiCard } from "@/components/ui/pastel-kpi";

const CATEGORIES = ["Electrical", "Plumbing", "HVAC", "Furniture", "Cleaning", "Security", "Other"];
const STATUSES = ["open", "in_progress", "completed", "cancelled"];

interface StaffRow {
  name: string;
  staff_role: string;
  camp_name: string;
  total: number;
  open: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  avg_resolution_hrs: number | null;
  completion_rate: number;
}

export default function StaffKPI() {
  const [from, setFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [to, setTo] = useState<Date | undefined>(new Date());
  const [category, setCategory] = useState<string>("all");
  const [campId, setCampId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);

  const { data: camps = [] } = useQuery({
    queryKey: ["camps-kpi"],
    queryFn: async () => {
      const { data } = await supabase.from("camps").select("id, name").order("name");
      return data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["staff-kpi", from?.toISOString(), to?.toISOString(), category, campId],
    queryFn: async () => {
      // 1. Fetch maintenance staff
      let staffQ = supabase
        .from("employees")
        .select("id, name, staff_role, camp_id")
        .eq("employee_type", "camp_staff")
        .eq("status", "active");
      if (campId !== "all") staffQ = staffQ.eq("camp_id", campId);
      const { data: staff, error: sErr } = await staffQ;
      if (sErr) throw sErr;

      // 2. Fetch tickets in date range / category / camp
      let tQ = supabase
        .from("maintenance_tickets")
        .select("id, assigned_to, status, category, camp_id, created_at, updated_at, priority");
      if (from) tQ = tQ.gte("created_at", from.toISOString());
      if (to) tQ = tQ.lte("created_at", new Date(to.getTime() + 86400000).toISOString());
      if (category !== "all") tQ = tQ.eq("category", category);
      if (campId !== "all") tQ = tQ.eq("camp_id", campId);
      const { data: tickets, error: tErr } = await tQ;
      if (tErr) throw tErr;

      const campMap = new Map((camps as any[]).map((c) => [c.id, c.name]));

      const map = new Map<string, StaffRow & { _times: number[] }>();
      for (const s of staff || []) {
        map.set(s.name, {
          name: s.name,
          staff_role: s.staff_role || "Staff",
          camp_name: campMap.get(s.camp_id) || "—",
          total: 0,
          open: 0,
          in_progress: 0,
          completed: 0,
          cancelled: 0,
          avg_resolution_hrs: null,
          completion_rate: 0,
          _times: [],
        });
      }

      for (const t of tickets || []) {
        if (!t.assigned_to || !map.has(t.assigned_to)) continue;
        const row = map.get(t.assigned_to)!;
        row.total++;
        if (t.status === "open") row.open++;
        else if (t.status === "in_progress") row.in_progress++;
        else if (t.status === "completed") {
          row.completed++;
          const hrs = (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
          if (hrs >= 0) row._times.push(hrs);
        } else if (t.status === "cancelled") row.cancelled++;
      }

      const rows: StaffRow[] = Array.from(map.values()).map((r) => ({
        ...r,
        avg_resolution_hrs: r._times.length ? r._times.reduce((a, b) => a + b, 0) / r._times.length : null,
        completion_rate: r.total ? (r.completed / r.total) * 100 : 0,
      }));

      // Aggregate KPIs
      const totals = (tickets || []).reduce(
        (acc, t) => {
          acc.total++;
          acc[t.status as keyof typeof acc] = ((acc as any)[t.status] || 0) + 1;
          return acc;
        },
        { total: 0, open: 0, in_progress: 0, completed: 0, cancelled: 0 } as any,
      );

      return { rows, totals };
    },
    enabled: camps.length > 0 || campId === "all",
  });

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    const q = search.trim().toLowerCase();
    let list = data.rows;
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q) || r.staff_role.toLowerCase().includes(q));
    return list.sort((a, b) => b.total - a.total);
  }, [data, search]);

  const totals = data?.totals || { total: 0, open: 0, in_progress: 0, completed: 0, cancelled: 0 };
  const completionRate = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="text-primary" size={26} /> Staff KPI Monitoring
          </h1>
          <p className="text-sm text-muted-foreground">Maintenance task performance for camp staff</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <DatePick label="From" date={from} onChange={setFrom} />
          <DatePick label="To" date={to} onChange={setTo} />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Camp</label>
            <Select value={campId} onValueChange={setCampId}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Camps</SelectItem>
                {(camps as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Search staff</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or role…" className="mt-1" />
          </div>
        </div>
      </Card>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <PastelKpiCard icon={Wrench} label="Total Tasks" value={totals.total} tone="blue" />
        <PastelKpiCard icon={AlertTriangle} label="Open" value={totals.open} tone="amber" />
        <PastelKpiCard icon={Clock} label="In Progress" value={totals.in_progress} tone="indigo" />
        <PastelKpiCard icon={CheckCircle2} label="Completed" value={totals.completed} tone="mint" />
        <PastelKpiCard icon={TrendingUp} label="Completion %" value={`${completionRate}%`} tone="pink" />
      </div>

      {/* Staff table */}
      <Card>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Users size={16} className="text-primary" /> Staff Performance ({filteredRows.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Staff</th>
                <th className="p-3">Role</th>
                <th className="p-3">Camp</th>
                <th className="p-3 text-center">Total</th>
                <th className="p-3 text-center">Open</th>
                <th className="p-3 text-center">In Progress</th>
                <th className="p-3 text-center">Completed</th>
                <th className="p-3 text-center">Avg Resolution</th>
                <th className="p-3 w-44">Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No staff match the current filters.</td></tr>
              ) : filteredRows.map((r) => (
                <tr
                  key={r.name}
                  onClick={() => setSelectedStaff(r)}
                  className="border-t hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3"><Badge variant="outline">{r.staff_role}</Badge></td>
                  <td className="p-3 text-muted-foreground">{r.camp_name}</td>
                  <td className="p-3 text-center font-semibold">{r.total}</td>
                  <td className="p-3 text-center"><span className="text-orange-600 dark:text-orange-400 font-medium">{r.open}</span></td>
                  <td className="p-3 text-center"><span className="text-blue-600 dark:text-blue-400 font-medium">{r.in_progress}</span></td>
                  <td className="p-3 text-center"><span className="text-emerald-600 dark:text-emerald-400 font-medium">{r.completed}</span></td>
                  <td className="p-3 text-center text-xs text-muted-foreground">
                    {r.avg_resolution_hrs == null ? "—" : r.avg_resolution_hrs < 24
                      ? `${r.avg_resolution_hrs.toFixed(1)} hrs`
                      : `${(r.avg_resolution_hrs / 24).toFixed(1)} d`}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Progress value={r.completion_rate} className="h-2 flex-1" />
                      <span className="text-xs font-semibold w-10 text-right">{Math.round(r.completion_rate)}%</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); setSelectedStaff(r); }}
                        title="View details"
                      >
                        <Eye size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <StaffDetailSheet
        staff={selectedStaff}
        from={from}
        to={to}
        category={category}
        onClose={() => setSelectedStaff(null)}
      />
    </div>
  );
}

function StaffDetailSheet({
  staff,
  from,
  to,
  category,
  onClose,
}: {
  staff: StaffRow | null;
  from?: Date;
  to?: Date;
  category: string;
  onClose: () => void;
}) {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["staff-detail-tickets", staff?.name, from?.toISOString(), to?.toISOString(), category],
    enabled: !!staff,
    queryFn: async () => {
      let q = supabase
        .from("maintenance_tickets")
        .select("id, title, status, category, priority, created_at, updated_at, location, description")
        .eq("assigned_to", staff!.name)
        .order("created_at", { ascending: false });
      if (from) q = q.gte("created_at", from.toISOString());
      if (to) q = q.lte("created_at", new Date(to.getTime() + 86400000).toISOString());
      if (category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const statusColor = (s: string) => {
    if (s === "completed") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
    if (s === "in_progress") return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
    if (s === "open") return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300";
    if (s === "cancelled") return "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300";
    return "bg-muted text-foreground";
  };

  const priorityColor = (p: string) => {
    if (p === "emergency" || p === "high") return "border-red-300 text-red-700 dark:text-red-300";
    if (p === "medium") return "border-amber-300 text-amber-700 dark:text-amber-300";
    return "border-blue-300 text-blue-700 dark:text-blue-300";
  };

  return (
    <Sheet open={!!staff} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {staff && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Users size={18} className="text-primary" /> {staff.name}
              </SheetTitle>
              <SheetDescription>
                {staff.staff_role} · {staff.camp_name}
              </SheetDescription>
            </SheetHeader>

            {/* Stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              <MiniStat label="Total" value={staff.total} tone="text-foreground" />
              <MiniStat label="Open" value={staff.open} tone="text-orange-600 dark:text-orange-400" />
              <MiniStat label="In Progress" value={staff.in_progress} tone="text-blue-600 dark:text-blue-400" />
              <MiniStat label="Completed" value={staff.completed} tone="text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Completion Rate</div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={staff.completion_rate} className="h-2 flex-1" />
                  <span className="text-sm font-semibold">{Math.round(staff.completion_rate)}%</span>
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Avg Resolution</div>
                <div className="text-sm font-semibold mt-1">
                  {staff.avg_resolution_hrs == null
                    ? "—"
                    : staff.avg_resolution_hrs < 24
                    ? `${staff.avg_resolution_hrs.toFixed(1)} hrs`
                    : `${(staff.avg_resolution_hrs / 24).toFixed(1)} days`}
                </div>
              </Card>
            </div>

            {/* Tickets list */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Wrench size={14} className="text-primary" /> Assigned Tickets ({tickets.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No tickets in this period.</div>
                ) : (
                  tickets.map((t: any) => (
                    <Card key={t.id} className="p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{t.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                            <span>{t.category}</span>
                            {t.location && <><span>·</span><span>{t.location}</span></>}
                            <span>·</span>
                            <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", statusColor(t.status))}>
                            {t.status.replace("_", " ")}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px]", priorityColor(t.priority))}>
                            {t.priority}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: any; tone: string }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-bold mt-0.5", tone)}>{value}</div>
    </Card>
  );
}

function DatePick({ label, date, onChange }: { label: string; date?: Date; onChange: (d?: Date) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start mt-1 font-normal", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PP") : "Pick date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone: "primary" | "success" | "warning" | "info" }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary border-primary/30",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    warning: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  };
  return (
    <Card className={cn("p-4 border", tones[tone])}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <Icon size={26} className="opacity-70" />
      </div>
    </Card>
  );
}
