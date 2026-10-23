import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCamps } from "@/hooks/useCampManagement";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { CalendarIcon, ClipboardList, Users, UserCheck, UserMinus, Building2, Search, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type ViewMode = "daily" | "weekly" | "monthly";

export default function Attendance() {
  const [date, setDate] = useState<Date>(new Date());
  const [campId, setCampId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");

  const { data: camps = [] } = useCamps();

  const activeCampIds = useMemo(() => {
    if (campId === "all") return camps.map((c: any) => c.id);
    return [campId];
  }, [campId, camps]);

  // Compute date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === "daily") return { start: startOfDay(date), end: endOfDay(date) };
    if (viewMode === "weekly") return { start: startOfWeek(date, { weekStartsOn: 0 }), end: endOfWeek(date, { weekStartsOn: 0 }) };
    return { start: startOfMonth(date), end: endOfMonth(date) };
  }, [date, viewMode]);

  const days = useMemo(() => {
    if (viewMode === "daily") return [date];
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [date, viewMode, dateRange]);

  // Fetch all currently checked-in employees
  const { data: currentOccupants = [], isLoading: loadingOccupants } = useQuery({
    queryKey: ["attendance-occupants", activeCampIds.join(",")],
    queryFn: async () => {
      if (activeCampIds.length === 0) return [];

      const { data: checkIns, error: ciErr } = await supabase
        .from("check_ins")
        .select("employee_id, room_id, check_in_date, camp_id")
        .in("camp_id", activeCampIds)
        .order("check_in_date", { ascending: false });
      if (ciErr) throw ciErr;

      const { data: checkOuts, error: coErr } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .in("camp_id", activeCampIds)
        .order("check_out_date", { ascending: false });
      if (coErr) throw coErr;

      const latestCheckOut = new Map<string, string>();
      (checkOuts || []).forEach((co: any) => {
        if (!latestCheckOut.has(co.employee_id)) {
          latestCheckOut.set(co.employee_id, co.check_out_date);
        }
      });

      const empMap = new Map<string, { room_id: string; check_in_date: string; camp_id: string }>();
      (checkIns || []).forEach((ci: any) => {
        if (empMap.has(ci.employee_id)) return;
        const lastOut = latestCheckOut.get(ci.employee_id);
        if (!lastOut || new Date(ci.check_in_date) > new Date(lastOut)) {
          empMap.set(ci.employee_id, { room_id: ci.room_id, check_in_date: ci.check_in_date, camp_id: ci.camp_id });
        }
      });

      if (empMap.size === 0) return [];

      const empIds = [...empMap.keys()];
      const { data: empData, error: empErr } = await supabase
        .from("employees")
        .select("id, name, employee_id, designation, company, employee_type, supplier_name, department")
        .in("id", empIds);
      if (empErr) throw empErr;

      return (empData || []).map((emp: any) => ({
        ...emp,
        room_id: empMap.get(emp.id)?.room_id,
        check_in_date: empMap.get(emp.id)?.check_in_date,
        camp_id: empMap.get(emp.id)?.camp_id,
      }));
    },
    enabled: activeCampIds.length > 0,
  });

  // Fetch check-ins within range
  const { data: rangeCheckIns = [] } = useQuery({
    queryKey: ["attendance-range-checkins", activeCampIds.join(","), dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (activeCampIds.length === 0) return [];
      const { data } = await supabase
        .from("check_ins")
        .select("employee_id, check_in_date")
        .in("camp_id", activeCampIds)
        .gte("check_in_date", dateRange.start.toISOString())
        .lte("check_in_date", dateRange.end.toISOString());
      return data || [];
    },
    enabled: activeCampIds.length > 0,
  });

  // Fetch check-outs within range
  const { data: rangeCheckOuts = [] } = useQuery({
    queryKey: ["attendance-range-checkouts", activeCampIds.join(","), dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (activeCampIds.length === 0) return [];
      const { data } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .in("camp_id", activeCampIds)
        .gte("check_out_date", dateRange.start.toISOString())
        .lte("check_out_date", dateRange.end.toISOString());
      return data || [];
    },
    enabled: activeCampIds.length > 0,
  });

  // Unique supplier names for filter
  const supplierNames = useMemo(() => {
    const names = new Set<string>();
    currentOccupants.forEach((e: any) => {
      if (e.employee_type === "supplier" && e.supplier_name) names.add(e.supplier_name);
    });
    return [...names].sort();
  }, [currentOccupants]);

  // Build per-day check-in/out sets
  const checkInsByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    rangeCheckIns.forEach((ci: any) => {
      const dayKey = format(new Date(ci.check_in_date), "yyyy-MM-dd");
      if (!map.has(dayKey)) map.set(dayKey, new Set());
      map.get(dayKey)!.add(ci.employee_id);
    });
    return map;
  }, [rangeCheckIns]);

  const checkOutsByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    rangeCheckOuts.forEach((co: any) => {
      const dayKey = format(new Date(co.check_out_date), "yyyy-MM-dd");
      if (!map.has(dayKey)) map.set(dayKey, new Set());
      map.get(dayKey)!.add(co.employee_id);
    });
    return map;
  }, [rangeCheckOuts]);

  // Filter by search + supplier
  const filteredOccupants = useMemo(() => {
    let list = currentOccupants;
    if (supplierFilter === "own") {
      list = list.filter((e: any) => e.employee_type === "own");
    } else if (supplierFilter !== "all") {
      list = list.filter((e: any) => e.employee_type === "supplier" && e.supplier_name === supplierFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e: any) =>
        e.name?.toLowerCase().includes(q) || e.employee_id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [currentOccupants, searchQuery, supplierFilter]);

  // Stats
  const totalPresent = currentOccupants.length;
  const todayCheckIns = checkInsByDay.get(format(date, "yyyy-MM-dd"))?.size || 0;
  const todayCheckOuts = checkOutsByDay.get(format(date, "yyyy-MM-dd"))?.size || 0;

  const getStatusForDay = (empId: string, day: Date) => {
    const dayKey = format(day, "yyyy-MM-dd");
    if (checkOutsByDay.get(dayKey)?.has(empId)) return "out";
    if (checkInsByDay.get(dayKey)?.has(empId)) return "in";
    const emp = currentOccupants.find((e: any) => e.id === empId);
    if (emp && new Date(emp.check_in_date) <= endOfDay(day)) return "present";
    return "absent";
  };

  const statusCell = (status: string) => {
    switch (status) {
      case "in":
        return <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold mx-auto">IN</div>;
      case "out":
        return <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px] font-bold mx-auto">OUT</div>;
      case "present":
        return <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold mx-auto">P</div>;
      default:
        return <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-bold mx-auto">—</div>;
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case "in": return "Checked In";
      case "out": return "Checked Out";
      case "present": return "Present";
      default: return "Absent";
    }
  };

  // Export to CSV
  const handleExport = useCallback(() => {
    if (filteredOccupants.length === 0) {
      toast({ title: "Nothing to export", description: "No attendance data to export.", variant: "destructive" });
      return;
    }
    const campName = campId === "all" ? "All Camps" : camps.find((c: any) => c.id === campId)?.name || "Camp";
    const headers = ["#", "Employee Name", "Employee ID", "Designation", "Type", "Supplier",
      ...days.map(d => format(d, viewMode === "daily" ? "dd MMM yyyy" : viewMode === "weekly" ? "EEE dd MMM" : "dd MMM"))
    ];
    const rows = filteredOccupants.map((emp: any, idx: number) => [
      idx + 1,
      emp.name,
      emp.employee_id,
      emp.designation || "",
      emp.employee_type === "supplier" ? "Supplier" : "Own",
      emp.supplier_name || "",
      ...days.map(d => statusText(getStatusForDay(emp.id, d)))
    ]);

    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${campName}_${format(date, "yyyy-MM-dd")}_${viewMode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported", description: "Attendance CSV downloaded successfully." });
  }, [filteredOccupants, days, campId, camps, date, viewMode, currentOccupants, checkInsByDay, checkOutsByDay]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList size={24} className="text-primary" /> Daily Attendance
          </h1>
          <p className="text-sm text-muted-foreground">Track employee presence across camps.</p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">View</label>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="h-9">
                  <TabsTrigger value="daily" className="text-xs px-3">Daily</TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs px-3">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs px-3">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[170px] justify-start text-left font-normal h-9")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Camp</label>
              <Select value={campId} onValueChange={setCampId}>
                <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Select camp" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Camps</SelectItem>
                  {camps.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Employee Type</label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="own">Own Employees</SelectItem>
                  {supplierNames.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border shadow-sm bg-gradient-to-br from-blue-500/15 to-blue-500/5">
          <CardContent className="pt-3 pb-2 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{totalPresent}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Total Present</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm bg-gradient-to-br from-emerald-500/15 to-emerald-500/5">
          <CardContent className="pt-3 pb-2 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <UserCheck size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{todayCheckIns}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Check-Ins ({format(date, "dd MMM")})</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm bg-gradient-to-br from-amber-500/15 to-amber-500/5">
          <CardContent className="pt-3 pb-2 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <UserMinus size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{todayCheckOuts}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Check-Outs ({format(date, "dd MMM")})</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm bg-gradient-to-br from-violet-500/15 to-violet-500/5">
          <CardContent className="pt-3 pb-2 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Building2 size={18} className="text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">
                {totalPresent > 0 ? Math.round(((totalPresent - todayCheckOuts) / totalPresent) * 100) : 0}%
              </p>
              <p className="text-[11px] text-muted-foreground font-medium">Attendance Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs items-center">
        <span className="font-medium text-muted-foreground">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-emerald-500 inline-block" /> Checked In</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-blue-500 inline-block" /> Present</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-rose-500 inline-block" /> Checked Out</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-muted inline-block" /> Absent</span>
      </div>

      {/* Attendance Grid */}
      {loadingOccupants ? (
        <Card className="border shadow-sm"><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : filteredOccupants.length === 0 ? (
        <Card className="border shadow-sm"><CardContent className="py-8 text-center text-muted-foreground">No occupants found. Try adjusting filters.</CardContent></Card>
      ) : (
        <Card className="border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold sticky left-0 bg-muted/50 z-10 min-w-[50px]">#</TableHead>
                  <TableHead className="text-xs font-semibold sticky left-[50px] bg-muted/50 z-10 min-w-[180px]">Employee Name</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[100px]">ID</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[120px]">Designation</TableHead>
                  <TableHead className="text-xs font-semibold min-w-[80px]">Type</TableHead>
                  {days.map((day) => (
                    <TableHead key={day.toISOString()} className={cn(
                      "text-xs font-semibold text-center min-w-[50px]",
                      isSameDay(day, new Date()) && "bg-primary/10"
                    )}>
                      {viewMode === "daily"
                        ? format(day, "dd MMM")
                        : viewMode === "weekly"
                          ? format(day, "EEE dd")
                          : format(day, "dd")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOccupants.map((emp: any, idx: number) => (
                  <TableRow key={emp.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                    <TableCell className="text-xs font-medium sticky left-0 z-10 bg-inherit py-2">{idx + 1}</TableCell>
                    <TableCell className="text-sm font-semibold sticky left-[50px] z-10 bg-inherit py-2">
                      {emp.name}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-muted-foreground">{emp.employee_id}</TableCell>
                    <TableCell className="text-xs py-2 text-muted-foreground">{emp.designation || "—"}</TableCell>
                    <TableCell className="text-xs py-2">
                      <Badge variant={emp.employee_type === "supplier" ? "secondary" : "outline"} className="text-[10px]">
                        {emp.employee_type === "supplier" ? emp.supplier_name || "Supplier" : "Own"}
                      </Badge>
                    </TableCell>
                    {days.map((day) => {
                      const status = getStatusForDay(emp.id, day);
                      return (
                        <TableCell key={day.toISOString()} className={cn(
                          "py-2 text-center",
                          isSameDay(day, new Date()) && "bg-primary/5"
                        )}>
                          {statusCell(status)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Date Range Info */}
      <div className="text-xs text-muted-foreground text-center">
        Showing attendance from <strong>{format(dateRange.start, "dd MMM yyyy")}</strong> to <strong>{format(dateRange.end, "dd MMM yyyy")}</strong>
        {" · "}{filteredOccupants.length} employee(s)
      </div>
    </div>
  );
}
