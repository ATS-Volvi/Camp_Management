import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Wrench, Plus, Calendar as CalendarIcon, FileText, AlertTriangle,
  CheckCircle2, Clock, Activity, Pencil, Trash2, Download, Printer,
  Search, RotateCcw, Eye, Check, ChevronLeft, ChevronRight, XCircle, PauseCircle, ArrowRight,
  TrendingUp, SlidersHorizontal, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, parseISO, isWithinInterval, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  useEquipment, useTasks, useLogs, useDeleteEquipment, useUpdateTask, PMTask, PMTaskStatus,
} from "@/hooks/usePreventiveMaintenance";
import EquipmentDialog from "@/components/preventive-maintenance/EquipmentDialog";
import CompleteTaskDialog from "@/components/preventive-maintenance/CompleteTaskDialog";
import MaintenanceCalendar from "@/components/preventive-maintenance/MaintenanceCalendar";
import {
  exportReportPDF, exportReportExcel, ReportRow,
} from "@/components/preventive-maintenance/exportUtils";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<PMTaskStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  skipped: "bg-muted text-muted-foreground border-border",
};

export default function PreventiveMaintenance() {
  const [campId, setCampId] = useState<string>("all");
  const filterCamp = campId === "all" ? undefined : campId;

  const { data: camps = [] } = useQuery({
    queryKey: ["camps-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: equipment = [] } = useEquipment(filterCamp);
  const { data: tasks = [] } = useTasks(filterCamp);
  const { data: logs = [] } = useLogs(filterCamp);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Preventive Maintenance
          </h1>
          <p className="text-muted-foreground text-sm">
            Schedule, track, and report on equipment maintenance across all camps
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab
            tasks={tasks}
            equipment={equipment}
            logs={logs}
            camps={camps as any}
            campId={campId}
            setCampId={setCampId}
          />
        </TabsContent>

        <TabsContent value="equipment">
          <EquipmentTab equipment={equipment} camps={camps as any} defaultCampId={filterCamp} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab tasks={tasks} />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarTab tasks={tasks} />
        </TabsContent>

        <TabsContent value="logs">
          <LogsTab logs={logs} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab tasks={tasks} logs={logs} equipment={equipment} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


interface DashboardTabProps {
  tasks: PMTask[];
  equipment: any[];
  logs: any[];
  camps: { id: string; name: string }[];
  campId: string;
  setCampId: (v: string) => void;
}

function DashboardTab({ tasks, equipment, logs, camps, campId, setCampId }: DashboardTabProps) {
  const [freqFilter, setFreqFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [completing, setCompleting] = useState<PMTask | null>(null);
  const [historyEquipment, setHistoryEquipment] = useState<any | null>(null);
  const [calendarSelected, setCalendarSelected] = useState<{ date: Date; tasks: PMTask[] } | null>(null);
  const [drilldown, setDrilldown] = useState<"totalMachines" | "completed" | "pending" | "overdue" | "compliance" | null>(null);

  const technicians = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => t.assigned_to_name && set.add(t.assigned_to_name));
    return Array.from(set);
  }, [tasks]);

  // Apply date range filter to tasks
  const tasksInRange = useMemo(() => {
    if (!dateRange?.from) return tasks;
    const from = startOfDay(dateRange.from);
    const to = startOfDay(dateRange.to ?? dateRange.from);
    return tasks.filter(t => {
      if (!t.due_date) return false;
      const d = startOfDay(parseISO(t.due_date));
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [tasks, dateRange]);

  // KPIs based on date-filtered tasks
  const kpis = useMemo(() => {
    const totalMachines = equipment.length;
    const completed = tasksInRange.filter(t => t.status === "completed").length;
    const pending = tasksInRange.filter(t => t.status === "pending" || t.status === "in_progress").length;
    const overdue = tasksInRange.filter(t => t.status === "overdue").length;
    const totalScheduled = completed + pending + overdue;
    const compliance = totalScheduled ? Math.round((completed / totalScheduled) * 100) : 100;
    return { totalMachines, completed, pending, overdue, compliance };
  }, [equipment, tasksInRange]);

  // Build schedule rows
  const today = startOfDay(new Date());
  const scheduleRows = useMemo(() => {
    return equipment.map((e: any, idx: number) => {
      const upcomingTask = tasksInRange
        .filter(t => t.equipment_id === e.id)
        .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
      const status: PMTaskStatus = upcomingTask?.status ?? "pending";
      const nextDue = e.next_due_date ?? upcomingTask?.due_date ?? null;
      const isOverdue = status === "overdue";
      const isDueToday = nextDue && isSameDay(parseISO(nextDue), today) && status !== "completed";
      return {
        sl: idx + 1,
        id: e.id,
        equipment: e,
        machine_code: e.machine_code,
        machine_name: e.name,
        assigned_to: upcomingTask?.assigned_to_name ?? "—",
        frequency: e.frequency,
        days: e.frequency_days,
        next_due: nextDue ?? "—",
        last_done: e.last_maintenance_date ?? "—",
        status,
        task: upcomingTask ?? null,
        isOverdue,
        isDueToday,
      };
    });
  }, [equipment, tasksInRange, today]);

  const filteredRows = scheduleRows.filter(r => {
    if (freqFilter !== "all" && r.frequency !== freqFilter) return false;
    if (techFilter !== "all" && r.assigned_to !== techFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search && !(`${r.machine_code} ${r.machine_name}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const resetFilters = () => {
    setFreqFilter("all"); setTechFilter("all"); setStatusFilter("all"); setSearch("");
    setDateRange(undefined);
  };

  const handleExport = () => {
    if (!filteredRows.length) { toast.error("No data to export"); return; }
    const headers = ["Sl.No", "Machine ID", "Machine Name", "Assigned To", "Frequency", "Days", "Next Due Date", "Status", "Last Done Date"];
    const csv = [headers.join(",")].concat(
      filteredRows.map(r => [r.sl, r.machine_code, r.machine_name, r.assigned_to, r.frequency, r.days, r.next_due, r.status, r.last_done].join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "preventive-maintenance-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const dateRangeLabel = dateRange?.from
    ? `${format(dateRange.from, "dd MMM yy")}${dateRange.to ? ` – ${format(dateRange.to, "dd MMM yy")}` : ""}`
    : "All dates";

  // Equipment-specific history (for the Eye action)
  const historyForEquipment = useMemo(() => {
    if (!historyEquipment) return { tasks: [] as PMTask[], logs: [] as any[] };
    return {
      tasks: tasks.filter(t => t.equipment_id === historyEquipment.id)
        .sort((a, b) => b.due_date.localeCompare(a.due_date)),
      logs: (logs || []).filter((l: any) => l.equipment_id === historyEquipment.id),
    };
  }, [historyEquipment, tasks, logs]);

  const updateTask = useUpdateTask();
  const { data: sheetCampStaff = [] } = useQuery({
    queryKey: ["pm-sheet-camp-staff", historyEquipment?.camp_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, staff_role")
        .eq("employee_type", "camp_staff")
        .eq("camp_id", historyEquipment!.camp_id)
        .eq("status", "active")
        .order("staff_role");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!historyEquipment?.camp_id,
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5 mt-4">
        {/* Header strip with date range + camp + export */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">Preventive Maintenance Tracker</h2>
            <p className="text-sm text-muted-foreground">Track and manage all preventive maintenance activities</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{dateRangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
                <div className="flex justify-end gap-2 p-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>Clear</Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleExport} className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700">
              Export Report <Download className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Live Stats strip */}
        <Card className="rounded-2xl border border-border/50 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/40 dark:to-background px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">Live Stats</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Active Machines:</span>
              <span className="font-bold">{kpis.totalMachines}</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-medium">
                <TrendingUp className="h-3 w-3" /> +{Math.max(0, kpis.completed)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Open Tasks:</span>
              <span className="font-bold">{kpis.pending + kpis.overdue}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Compliance:</span>
              <span className="font-bold">{kpis.compliance}%</span>
            </div>
            <div className="ml-auto inline-flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <Zap className="h-3.5 w-3.5" /> Updated now
            </div>
          </div>
        </Card>

        {/* New KPI cards: Total Machines, Completed, Pending, Overdue, Compliance % — clickable for drilldown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <PastelStatCard
            title="Total Machines" value={kpis.totalMachines} subtitle="Tracked equipment"
            icon={Wrench} bg="from-sky-50 to-white dark:from-sky-950/30 dark:to-background" iconBg="bg-sky-100 dark:bg-sky-900/40" iconColor="text-sky-600"
            onClick={() => setDrilldown("totalMachines")}
          />
          <PastelStatCard
            title="Completed" value={kpis.completed} subtitle="Tasks done"
            icon={CheckCircle2} bg="from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background" iconBg="bg-emerald-100 dark:bg-emerald-900/40" iconColor="text-emerald-600"
            onClick={() => setDrilldown("completed")}
          />
          <PastelStatCard
            title="Pending" value={kpis.pending} subtitle="Awaiting action"
            icon={Clock} bg="from-amber-50 to-white dark:from-amber-950/30 dark:to-background" iconBg="bg-amber-100 dark:bg-amber-900/40" iconColor="text-amber-600"
            onClick={() => setDrilldown("pending")}
          />
          <PastelStatCard
            title="Overdue" value={kpis.overdue} subtitle="Past due date"
            icon={AlertTriangle} bg="from-rose-50 to-white dark:from-rose-950/30 dark:to-background" iconBg="bg-rose-100 dark:bg-rose-900/40" iconColor="text-rose-600"
            onClick={() => setDrilldown("overdue")}
          />
          <PastelStatCard
            title="Compliance" value={`${kpis.compliance}%`} subtitle="Completed / scheduled"
            icon={Activity} bg="from-violet-50 to-white dark:from-violet-950/30 dark:to-background" iconBg="bg-violet-100 dark:bg-violet-900/40" iconColor="text-violet-600"
            onClick={() => setDrilldown("compliance")}
          />
        </div>


        {/* Main content grid: schedule + calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          <div className="space-y-4">
            {/* Filter bar */}
            <Card className="p-4 rounded-2xl border border-border/50">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2 pr-3 border-r border-border/60 mr-1">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <SlidersHorizontal className="h-4 w-4 text-foreground/70" />
                  </div>
                  <span className="font-semibold text-sm">Filters</span>
                </div>
                <div className="min-w-[150px]">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Frequency</label>
                  <Select value={freqFilter} onValueChange={setFreqFilter}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="fortnightly">Fortnightly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bi_monthly">Bi-Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="four_monthly">Four-Monthly</SelectItem>
                      <SelectItem value="half_yearly">Half-Yearly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Technician</label>
                  <Select value={techFilter} onValueChange={setTechFilter}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[140px]">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="completed">Done</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="skipped">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[160px]">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Camp</label>
                  <Select value={campId} onValueChange={setCampId}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="All Camps" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Camps</SelectItem>
                      {camps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Search</label>
                  <Search className="h-4 w-4 absolute left-3 top-[33px] text-muted-foreground" />
                  <Input
                    placeholder="Machine name / ID..."
                    className="pl-9 rounded-xl"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Button onClick={resetFilters} variant="outline" className="rounded-xl">
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
              </div>
            </Card>

            {/* Maintenance schedule table */}
            <Card>
              <div className="p-4 border-b">
                <h3 className="font-semibold">Maintenance Schedule</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sl. No.</TableHead>
                      <TableHead>Machine ID</TableHead>
                      <TableHead>Machine Name</TableHead>
                      <TableHead>Assigned To<br /><span className="text-[10px] text-muted-foreground font-normal">(Technician)</span></TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Next Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Done Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map(r => (
                      <TableRow
                        key={r.id}
                        className={cn(
                          r.isOverdue && "bg-rose-50/70 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30",
                          !r.isOverdue && r.isDueToday && "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
                        )}
                      >
                        <TableCell>{r.sl}</TableCell>
                        <TableCell className="font-mono text-xs">{r.machine_code}</TableCell>
                        <TableCell className="font-medium">{r.machine_name}</TableCell>
                        <TableCell>{r.assigned_to}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize border-0", FREQ_BADGE[r.frequency] ?? "bg-muted text-foreground")}>
                            {r.frequency.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.days}</TableCell>
                        <TableCell>{r.next_due}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize border-0", STATUS_PILL[r.status])}>
                            {STATUS_LABEL[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.last_done}</TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => setHistoryEquipment(r.equipment)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View details &amp; complete task</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          No machines found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Calendar side panel */}
          <Card className="p-4 h-fit lg:sticky lg:top-4">
            <h3 className="font-semibold mb-3">Calendar View</h3>
            <MiniCalendar
              tasks={tasksInRange}
              equipment={equipment}
              onSelectDate={(date, dayTasks) => setCalendarSelected({ date, tasks: dayTasks })}
            />
            <div className="flex flex-wrap gap-3 mt-4 text-xs">
              <LegendDot color="bg-emerald-500" label="Completed" />
              <LegendDot color="bg-amber-500" label="Due Today" />
              <LegendDot color="bg-rose-500" label="Overdue" />
              <LegendDot color="bg-sky-500" label="Scheduled" />
            </div>
          </Card>
        </div>

        <CompleteTaskDialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)} task={completing} />

        {/* Maintenance history side panel (Eye action) */}
        <Sheet open={!!historyEquipment} onOpenChange={(o) => !o && setHistoryEquipment(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{historyEquipment?.name}</SheetTitle>
              <SheetDescription>
                <span className="font-mono">{historyEquipment?.machine_code}</span> · Maintenance history
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-md border bg-muted/30">
                  <div className="text-xs text-muted-foreground">Frequency</div>
                  <div className="font-medium capitalize">{historyEquipment?.frequency?.replace("_", " ")}</div>
                </div>
                <div className="p-3 rounded-md border bg-muted/30">
                  <div className="text-xs text-muted-foreground">Last Done</div>
                  <div className="font-medium">{historyEquipment?.last_maintenance_date ?? "—"}</div>
                </div>
                <div className="p-3 rounded-md border bg-muted/30">
                  <div className="text-xs text-muted-foreground">Next Due</div>
                  <div className="font-medium">{historyEquipment?.next_due_date ?? "—"}</div>
                </div>
                <div className="p-3 rounded-md border bg-muted/30">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-medium capitalize">{historyEquipment?.status}</div>
                </div>
              </div>

              {(() => {
                const activeTask = historyForEquipment.tasks.find(
                  t => t.status === "pending" || t.status === "in_progress" || t.status === "overdue"
                );
                if (!activeTask) return null;
                return (
                  <div className="p-3 rounded-md border border-primary/30 bg-primary/5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <div className="font-semibold">Active Task — Due {activeTask.due_date}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          Status: {STATUS_LABEL[activeTask.status]}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setCompleting(activeTask)}>
                        <Check className="h-4 w-4 mr-1" /> Complete &amp; Submit
                      </Button>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Assigned Technician</label>
                      <Select
                        value={activeTask.assigned_to_name || "__unassigned__"}
                        onValueChange={(v) =>
                          updateTask.mutate({
                            id: activeTask.id,
                            assigned_to_name: v === "__unassigned__" ? null : v,
                          } as any)
                        }
                      >
                        <SelectTrigger className="h-9 mt-1">
                          <SelectValue placeholder="Assign staff" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unassigned__">— Unassigned —</SelectItem>
                          {sheetCampStaff.map((s: any) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}{s.staff_role ? ` — ${s.staff_role}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })()}

              <div>
                <h4 className="font-semibold text-sm mb-2">Task Timeline</h4>
                <div className="space-y-2">
                  {historyForEquipment.tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tasks yet.</p>
                  )}
                  {historyForEquipment.tasks.map(t => (
                    <div key={t.id} className="p-3 border rounded-md text-sm flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{t.due_date}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.assigned_to_name ? `Assigned: ${t.assigned_to_name}` : "Unassigned"}
                          {t.completed_at && ` · Completed: ${format(parseISO(t.completed_at), "dd MMM yy")}`}
                        </div>
                        {t.remarks && <div className="text-xs mt-1 text-muted-foreground italic">"{t.remarks}"</div>}
                      </div>
                      <Badge variant="outline" className={cn("capitalize border-0", STATUS_PILL[t.status])}>
                        {STATUS_LABEL[t.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Calendar day detail panel */}
        <Sheet open={!!calendarSelected} onOpenChange={(o) => !o && setCalendarSelected(null)}>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {calendarSelected && format(calendarSelected.date, "EEEE, dd MMM yyyy")}
              </SheetTitle>
              <SheetDescription>
                {calendarSelected?.tasks.length ?? 0} task(s) on this date
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {calendarSelected?.tasks.map(t => (
                <div key={t.id} className="p-3 border rounded-md text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{t.pm_equipment?.name ?? "Equipment"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{t.pm_equipment?.machine_code}</div>
                    </div>
                    <Badge variant="outline" className={cn("capitalize border-0", STATUS_PILL[t.status])}>
                      {STATUS_LABEL[t.status]}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                    <div>Technician: <span className="text-foreground">{t.assigned_to_name ?? "—"}</span></div>
                    <div>Due: <span className="text-foreground">{t.due_date}</span></div>
                    {t.completed_at && (
                      <div>Completed: <span className="text-foreground">{format(parseISO(t.completed_at), "dd MMM yy HH:mm")}</span></div>
                    )}
                  </div>
                </div>
              ))}
              {calendarSelected?.tasks.length === 0 && (
                <p className="text-sm text-muted-foreground">No tasks scheduled for this date.</p>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* KPI drilldown side panel */}
        <KpiDrilldownSheet
          open={!!drilldown}
          metric={drilldown}
          onClose={() => setDrilldown(null)}
          tasksInRange={tasksInRange}
          equipment={equipment}
          dateRangeLabel={dateRangeLabel}
        />
      </div>
    </TooltipProvider>
  );
}

const FREQ_BADGE: Record<string, string> = {
  daily: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  weekly: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  fortnightly: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  monthly: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  bi_monthly: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  quarterly: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  four_monthly: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  half_yearly: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  yearly: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  custom: "bg-muted text-foreground",
};

const STATUS_PILL: Record<PMTaskStatus, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  pending: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  in_progress: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  overdue: "bg-destructive/15 text-destructive",
  skipped: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const STATUS_LABEL: Record<PMTaskStatus, string> = {
  completed: "Done",
  pending: "Pending",
  in_progress: "In Progress",
  overdue: "Overdue",
  skipped: "On Hold",
};

function PastelStatCard({ title, value, subtitle, icon: Icon, bg, iconBg, iconColor, onClick }: any) {
  const clickable = typeof onClick === "function";
  return (
    <Card
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        "p-5 border border-border/40 rounded-2xl shadow-sm transition-all bg-gradient-to-br",
        bg,
        clickable && "cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground/70">{title}</div>
          <div className="text-4xl font-bold mt-3 leading-none tracking-tight text-foreground">{value}</div>
        </div>
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      {(subtitle || clickable) && (
        <div className="mt-4 flex items-center justify-between text-xs text-foreground/55">
          <span>{subtitle}</span>
          {clickable && <ArrowRight className="h-3.5 w-3.5 opacity-50" />}
        </div>
      )}
    </Card>
  );
}

type DrilldownMetric = "totalMachines" | "completed" | "pending" | "overdue" | "compliance" | null;

function KpiDrilldownSheet({
  open, metric, onClose, tasksInRange, equipment, dateRangeLabel,
}: {
  open: boolean;
  metric: DrilldownMetric;
  onClose: () => void;
  tasksInRange: PMTask[];
  equipment: any[];
  dateRangeLabel: string;
}) {
  const config = useMemo(() => {
    if (!metric) return null;
    if (metric === "totalMachines") {
      return {
        title: "All Tracked Machines",
        description: `${equipment.length} equipment item(s) under preventive maintenance`,
        kind: "equipment" as const,
        rows: equipment as any[],
      };
    }
    if (metric === "compliance") {
      const completed = tasksInRange.filter(t => t.status === "completed");
      const totalScheduled = tasksInRange.filter(t =>
        t.status === "completed" || t.status === "pending" || t.status === "in_progress" || t.status === "overdue"
      );
      return {
        title: "Compliance Breakdown",
        description: `${completed.length} of ${totalScheduled.length} scheduled tasks completed (${dateRangeLabel})`,
        kind: "compliance" as const,
        rows: totalScheduled,
        completedCount: completed.length,
        totalCount: totalScheduled.length,
      };
    }
    const filterMap = {
      completed: (t: PMTask) => t.status === "completed",
      pending: (t: PMTask) => t.status === "pending" || t.status === "in_progress",
      overdue: (t: PMTask) => t.status === "overdue",
    } as const;
    const titles = { completed: "Completed Tasks", pending: "Pending Tasks", overdue: "Overdue Tasks" } as const;
    const rows = tasksInRange.filter(filterMap[metric]);
    return {
      title: titles[metric],
      description: `${rows.length} task(s) in ${dateRangeLabel}`,
      kind: "tasks" as const,
      rows,
    };
  }, [metric, tasksInRange, equipment, dateRangeLabel]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{config?.title}</SheetTitle>
          <SheetDescription>{config?.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {config?.kind === "equipment" && (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(config.rows as any[]).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.machine_code}</TableCell>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="capitalize text-xs">{e.frequency?.replace("_", " ")}</TableCell>
                      <TableCell className="text-xs">{e.next_due_date ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{e.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {config.rows.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No machines.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {(config?.kind === "tasks" || config?.kind === "compliance") && (
            <>
              {config.kind === "compliance" && (
                <div className="mb-4 p-4 rounded-md border bg-muted/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completion rate</span>
                    <span className="font-bold">
                      {config.totalCount ? Math.round((config.completedCount / config.totalCount) * 100) : 100}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${config.totalCount ? (config.completedCount / config.totalCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(config.rows as PMTask[]).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{t.pm_equipment?.name ?? "—"}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{t.pm_equipment?.machine_code}</div>
                        </TableCell>
                        <TableCell className="text-xs">{t.assigned_to_name ?? "—"}</TableCell>
                        <TableCell className="text-xs">{t.due_date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize border-0 text-xs", STATUS_PILL[t.status])}>
                            {STATUS_LABEL[t.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {config.rows.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No tasks.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function MiniCalendar({
  tasks,
  equipment = [],
  onSelectDate,
}: {
  tasks: PMTask[];
  equipment?: any[];
  onSelectDate: (date: Date, tasks: PMTask[]) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const today = startOfDay(new Date());

  // Group tasks by date and compute marker priority: overdue > today > pending(future) > completed
  const dayInfo = useMemo(() => {
    const map: Record<string, { marker: "completed" | "today" | "overdue" | "pending"; tasks: PMTask[] }> = {};
    const rank = { overdue: 4, today: 3, pending: 2, completed: 1 } as const;

    const addMarker = (key: string, candidate: "completed" | "today" | "overdue" | "pending", t?: PMTask) => {
      const entry = map[key] ?? { marker: "completed" as const, tasks: [] as PMTask[] };
      if (t) entry.tasks.push(t);
      if (rank[candidate] >= rank[entry.marker]) entry.marker = candidate;
      map[key] = entry;
    };

    // 1) Real tasks from DB
    tasks.forEach(t => {
      if (!t.due_date) return;
      const d = parseISO(t.due_date);
      if (d.getFullYear() !== year || d.getMonth() !== m) return;
      const key = String(d.getDate());
      let candidate: "completed" | "today" | "overdue" | "pending";
      if (t.status === "overdue") candidate = "overdue";
      else if (isSameDay(d, today) && t.status !== "completed") candidate = "today";
      else if (t.status === "completed") candidate = "completed";
      else candidate = "pending";
      addMarker(key, candidate, t);
    });

    // 2) Synthesize recurring occurrences from equipment frequency (so daily/weekly machines
    //    show a dot every scheduled day, not only on the single next_due row)
    equipment.forEach((e: any) => {
      const freqDays = Number(e.frequency_days) || 0;
      if (freqDays <= 0) return;
      // Anchor to last_maintenance_date or next_due_date (whichever known)
      const anchorStr = e.last_maintenance_date ?? e.next_due_date;
      if (!anchorStr) return;
      const anchor = startOfDay(parseISO(anchorStr));
      const monthStart = new Date(year, m, 1);
      const monthEnd = new Date(year, m, daysInMonth);

      // Find first occurrence >= monthStart
      const msPerDay = 86400000;
      const diffDays = Math.ceil((monthStart.getTime() - anchor.getTime()) / msPerDay);
      let k = Math.max(0, Math.ceil(diffDays / freqDays));
      // If anchor is the last_maintenance_date, occurrences are anchor + k*freqDays for k>=1
      // If anchor is next_due_date, occurrences include k=0. Use k>=1 when anchored on last_maintenance_date.
      const startK = e.last_maintenance_date ? Math.max(1, k) : k;

      for (let i = startK; ; i++) {
        const occ = new Date(anchor.getTime() + i * freqDays * msPerDay);
        if (occ > monthEnd) break;
        if (occ < monthStart) continue;
        const key = String(occ.getDate());
        // Skip if a real task already exists for this day for this equipment
        const hasReal = (map[key]?.tasks ?? []).some(t => t.equipment_id === e.id);
        if (hasReal) continue;

        let candidate: "completed" | "today" | "overdue" | "pending";
        if (occ.getTime() < today.getTime()) candidate = "overdue";
        else if (isSameDay(occ, today)) candidate = "today";
        else candidate = "pending";

        // Add a synthetic task entry for tooltip / drilldown
        const synthetic: PMTask = {
          id: `synthetic-${e.id}-${key}`,
          equipment_id: e.id,
          camp_id: e.camp_id,
          scheduled_date: occ.toISOString().slice(0, 10),
          due_date: occ.toISOString().slice(0, 10),
          status: candidate === "overdue" ? "overdue" : "pending",
          assigned_to: null,
          assigned_to_name: null,
          started_at: null,
          completed_at: null,
          completed_by_name: null,
          issues_identified: null,
          action_taken: null,
          remarks: null,
          pm_equipment: { name: e.name, machine_code: e.machine_code, frequency_days: e.frequency_days, camp_id: e.camp_id },
        };
        addMarker(key, candidate, synthetic);
      }
    });

    return map;
  }, [tasks, equipment, year, m, today, daysInMonth]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === m && today.getDate() === d;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMonth(new Date(year, m - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-primary">{monthLabel}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMonth(new Date(year, m + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="h-9" />;
          const info = dayInfo[String(d)];
          const dotColor =
            info?.marker === "overdue" ? "bg-rose-500" :
            info?.marker === "today" ? "bg-amber-500" :
            info?.marker === "completed" ? "bg-emerald-500" :
            info?.marker === "pending" ? "bg-sky-500" : "";
          const date = new Date(year, m, d);
          const cell = (
            <button
              type="button"
              disabled={!info}
              onClick={() => info && onSelectDate(date, info.tasks)}
              className={cn(
                "h-9 w-full flex flex-col items-center justify-center rounded relative transition-colors",
                info && "hover:bg-muted cursor-pointer",
                isToday(d) && "bg-primary/10 text-primary font-semibold",
                !info && "cursor-default"
              )}
            >
              <span>{d}</span>
              {dotColor && <span className={cn("h-1.5 w-1.5 rounded-full mt-0.5", dotColor)} />}
            </button>
          );
          if (!info) return <div key={i}>{cell}</div>;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>{cell}</TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="font-semibold mb-1">{format(date, "dd MMM yyyy")}</div>
                {info.tasks.slice(0, 3).map(t => (
                  <div key={t.id}>• {t.pm_equipment?.name ?? "Task"} — {STATUS_LABEL[t.status]}</div>
                ))}
                {info.tasks.length > 3 && <div className="text-muted-foreground">+{info.tasks.length - 3} more</div>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}


function EquipmentTab({ equipment, camps, defaultCampId }: any) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const del = useDeleteEquipment();

  const filtered = equipment.filter((e: any) =>
    !search ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.machine_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search equipment..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Equipment
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Last Maintenance</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.machine_code}</TableCell>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell className="capitalize">{e.frequency.replace("_", " ")} ({e.frequency_days}d)</TableCell>
                <TableCell>{e.last_maintenance_date ?? "—"}</TableCell>
                <TableCell>{e.next_due_date ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{e.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (confirm(`Remove ${e.name}? Tasks will be deleted.`)) del.mutate(e.id);
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No equipment found.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <EquipmentDialog
        open={open}
        onOpenChange={setOpen}
        camps={camps}
        equipment={editing}
        defaultCampId={defaultCampId}
      />
    </div>
  );
}

function TasksTab({ tasks }: { tasks: PMTask[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [completing, setCompleting] = useState<PMTask | null>(null);

  const filtered = tasks.filter(t => statusFilter === "all" || t.status === statusFilter);

  return (
    <div className="space-y-3 mt-4">
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(t => (
              <TableRow key={t.id} className={t.status === "overdue" ? "bg-destructive/5" : ""}>
                <TableCell className="font-medium">{t.pm_equipment?.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{t.pm_equipment?.machine_code}</TableCell>
                <TableCell>{t.due_date}</TableCell>
                <TableCell>{t.assigned_to_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("capitalize", STATUS_BADGE[t.status])}>{t.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {(t.status === "pending" || t.status === "in_progress" || t.status === "overdue") && (
                    <Button size="sm" onClick={() => setCompleting(t)}>Complete</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No tasks.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <CompleteTaskDialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)} task={completing} />
    </div>
  );
}

function CalendarTab({ tasks }: { tasks: PMTask[] }) {
  const [completing, setCompleting] = useState<PMTask | null>(null);
  return (
    <div className="mt-4">
      <MaintenanceCalendar tasks={tasks} onSelectTask={(t) => {
        if (t.status !== "completed" && t.status !== "skipped") setCompleting(t);
      }} />
      <CompleteTaskDialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)} task={completing} />
    </div>
  );
}

function LogsTab({ logs }: any) {
  return (
    <div className="mt-4">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Action Taken</TableHead>
              <TableHead>Next Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell>{l.performed_on}</TableCell>
                <TableCell className="font-medium">
                  {l.pm_equipment?.name} <span className="text-xs text-muted-foreground font-mono">({l.pm_equipment?.machine_code})</span>
                </TableCell>
                <TableCell>{l.performed_by_name ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate" title={l.issues_identified}>{l.issues_identified ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate" title={l.action_taken}>{l.action_taken ?? "—"}</TableCell>
                <TableCell>{l.next_due_date ?? "—"}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No maintenance logs yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ReportsTab({ tasks, logs, equipment }: any) {
  const [reportType, setReportType] = useState("status");
  const [machineId, setMachineId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tech, setTech] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const technicians = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l: any) => l.performed_by_name && set.add(l.performed_by_name));
    tasks.forEach((t: any) => t.assigned_to_name && set.add(t.assigned_to_name));
    return Array.from(set);
  }, [logs, tasks]);

  // Build a unified row set: tasks (open/overdue) + logs (completed history)
  const rows: ReportRow[] = useMemo(() => {
    const equipMap = new Map(equipment.map((e: any) => [e.id, e]));

    let combined: ReportRow[] = [];

    // From logs (history)
    logs.forEach((l: any) => {
      const eq: any = equipMap.get(l.equipment_id) ?? l.pm_equipment ?? {};
      combined.push({
        machine_code: eq.machine_code ?? "—",
        machine_name: eq.name ?? "—",
        maintenance_date: l.performed_on,
        scheduled_due_date: l.scheduled_due_date ?? "—",
        status: l.status,
        performed_by: l.performed_by_name ?? "—",
        issues: l.issues_identified ?? "",
        action_taken: l.action_taken ?? "",
        remarks: l.remarks ?? "",
        next_due_date: l.next_due_date ?? "—",
      });
    });

    // From open tasks
    tasks.forEach((t: any) => {
      if (t.status === "completed") return; // already in logs
      combined.push({
        machine_code: t.pm_equipment?.machine_code ?? "—",
        machine_name: t.pm_equipment?.name ?? "—",
        maintenance_date: "—",
        scheduled_due_date: t.due_date,
        status: t.status,
        performed_by: t.assigned_to_name ?? "—",
        issues: "",
        action_taken: "",
        remarks: t.remarks ?? "",
        next_due_date: "—",
      });
    });

    // Apply report-type focus
    if (reportType === "missed") combined = combined.filter(r => r.status === "overdue");
    if (reportType === "status" && statusFilter !== "all") combined = combined.filter(r => r.status === statusFilter);

    // Filters
    if (machineId !== "all") {
      const eq: any = equipMap.get(machineId);
      if (eq) combined = combined.filter(r => r.machine_code === eq.machine_code);
    }
    if (tech !== "all") combined = combined.filter(r => r.performed_by === tech);
    if (from) combined = combined.filter(r => (r.maintenance_date >= from) || (r.scheduled_due_date >= from));
    if (to) combined = combined.filter(r => (r.maintenance_date <= to) || (r.scheduled_due_date <= to));

    return combined;
  }, [tasks, logs, equipment, reportType, machineId, statusFilter, tech, from, to]);

  const title = `Preventive Maintenance — ${reportType.replace(/^./, c => c.toUpperCase())} Report`;

  const handlePrint = () => {
    if (rows.length === 0) { toast.error("No data to print"); return; }
    window.print();
  };

  return (
    <div className="space-y-4 mt-4">
      <Card className="p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="machine">Machine-wise</SelectItem>
                <SelectItem value="date">Date-wise</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="missed">Missed Maintenance</SelectItem>
                <SelectItem value="technician">Technician-wise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Machine</label>
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Machines</SelectItem>
                {equipment.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.machine_code} — {e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Technician</label>
            <Select value={tech} onValueChange={setTech}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { rows.length ? exportReportPDF(rows, title) : toast.error("No data to export"); }}>
            <FileText className="h-4 w-4 mr-1" /> Export PDF
          </Button>
          <Button variant="outline" onClick={() => { rows.length ? exportReportExcel(rows, title) : toast.error("No data to export"); }}>
            <Download className="h-4 w-4 mr-1" /> Export Excel
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <div className="ml-auto text-sm text-muted-foreground self-center">
            {rows.length} record{rows.length === 1 ? "" : "s"}
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto print:shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine ID</TableHead>
              <TableHead>Machine Name</TableHead>
              <TableHead>Maint. Date</TableHead>
              <TableHead>Scheduled Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Action Taken</TableHead>
              <TableHead>Next Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i} className={cn(
                r.status === "overdue" && "bg-destructive/5",
                r.issues && "border-l-2 border-warning"
              )}>
                <TableCell className="font-mono text-xs">{r.machine_code}</TableCell>
                <TableCell className="font-medium">{r.machine_name}</TableCell>
                <TableCell>{r.maintenance_date}</TableCell>
                <TableCell>{r.scheduled_due_date}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("capitalize", STATUS_BADGE[r.status as PMTaskStatus] ?? "")}>{r.status}</Badge>
                </TableCell>
                <TableCell>{r.performed_by}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={r.issues}>{r.issues}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={r.action_taken}>{r.action_taken}</TableCell>
                <TableCell>{r.next_due_date}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No records match these filters.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
