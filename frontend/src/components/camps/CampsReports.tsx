import { ChartDrilldown, type ChartSelection } from "@/components/dashboard/ChartDrilldown";
import { employeeRecord, roomRecord } from "@/lib/dashboardDrilldown";
import { useCommandDashboard } from "@/hooks/useCommandDashboard";
import { residentsAt } from "@/lib/commandDashboard";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Building2, Users, LogIn, LogOut, Calendar, BedDouble } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  camps: any[];
}

export default function CampsReports({ camps }: Props) {
  const [chartSelection, setChartSelection] = useState<ChartSelection | null>(null);
  const details = useCommandDashboard();
  const [selectedCamp, setSelectedCamp] = useState("all");
  const [dateRange, setDateRange] = useState("7");
  const [search, setSearch] = useState("");

  const fromDate = useMemo(() => {
    const days = parseInt(dateRange);
    return format(subDays(new Date(), days - 1), "yyyy-MM-dd");
  }, [dateRange]);

  // Fetch check-ins and check-outs for date range
  const { data: checkIns = [] } = useQuery({
    queryKey: ["camp-report-checkins", fromDate, selectedCamp],
    queryFn: async () => {
      let q = supabase
        .from("check_ins")
        .select("id, camp_id, employee_id, check_in_date, employees(name, employee_id, employee_type, supplier_name), rooms(room_number), camps(name)")
        .gte("check_in_date", fromDate)
        .order("check_in_date", { ascending: false });
      if (selectedCamp !== "all") q = q.eq("camp_id", selectedCamp);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: checkOuts = [] } = useQuery({
    queryKey: ["camp-report-checkouts", fromDate, selectedCamp],
    queryFn: async () => {
      let q = supabase
        .from("check_outs")
        .select("id, camp_id, employee_id, check_out_date, assets_returned, damage_remarks, feedback_rating, is_blacklisted, employees(name, employee_id, employee_type, supplier_name), rooms(room_number), camps(name)")
        .gte("check_out_date", fromDate)
        .order("check_out_date", { ascending: false });
      if (selectedCamp !== "all") q = q.eq("camp_id", selectedCamp);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Per-camp summary
  const campSummary = useMemo(() => {
    const map = new Map<string, { name: string; checkIns: number; checkOuts: number; totalRooms: number; occupants: number; capacity: number }>();
    camps.forEach(c => {
      map.set(c.id, {
        name: c.name,
        checkIns: 0,
        checkOuts: 0,
        totalRooms: c.totalRooms || 0,
        occupants: c.totalOccupants || 0,
        capacity: c.totalCapacity || 0,
      });
    });
    checkIns.forEach((ci: any) => {
      const entry = map.get(ci.camp_id);
      if (entry) entry.checkIns++;
    });
    checkOuts.forEach((co: any) => {
      const entry = map.get(co.camp_id);
      if (entry) entry.checkOuts++;
    });
    let result = Array.from(map.values());
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(s));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [camps, checkIns, checkOuts, search]);

  // Bar chart: top 10 camps by occupancy
  const occupancyChartData = useMemo(() => {
    return campSummary
      .filter(c => selectedCamp === "all" || camps.find(camp => camp.name === c.name)?.id === selectedCamp)
      .filter(c => c.capacity > 0)
      .sort((a, b) => (b.occupants / b.capacity) - (a.occupants / a.capacity))
      .slice(0, 10)
      .map(c => ({
        id: camps.find(camp => camp.name === c.name)?.id,
        name: c.name.length > 15 ? c.name.slice(0, 14) + "…" : c.name,
        occupancy: c.capacity > 0 ? Math.round((c.occupants / c.capacity) * 100) : 0,
      }));
  }, [campSummary, selectedCamp, camps]);

  const openCamp = (id: string) => {
    const residents = residentsAt(details.data?.checkIns ?? [], details.data?.checkOuts ?? [], new Date().toISOString());
    setChartSelection({ title: `${camps.find(c => c.id === id)?.name} occupancy`, rows: (details.data?.rooms ?? []).filter(r => r.camp_id === id).map(r => roomRecord(r, camps.find(c => c.id === id)?.name ?? "—", residents.filter(e => e.room_id === r.id).flatMap(e => { const emp = details.data?.employees.find(emp => emp.id === e.employee_id); return emp ? [employeeRecord(emp, { "Check-in": e.check_in_date })] : []; }))) });
  };
  // Aggregate stats
  const totalCheckIns = checkIns.length;
  const totalCheckOuts = checkOuts.length;
  const assetsNotReturned = checkOuts.filter((co: any) => co.assets_returned === false).length;
  const blacklisted = checkOuts.filter((co: any) => co.is_blacklisted === true).length;

  const exportCampSummary = () => {
    const headers = ["Camp Name", "Rooms", "Capacity", "Occupants", "Occupancy %", `Check-Ins (${dateRange}d)`, `Check-Outs (${dateRange}d)`];
    const rows = campSummary.map(c => [
      c.name, c.totalRooms, c.capacity, c.occupants,
      c.capacity > 0 ? Math.round((c.occupants / c.capacity) * 100) + "%" : "0%",
      c.checkIns, c.checkOuts,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `camp-summary-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportActivityLog = () => {
    const ciRows = checkIns.map((ci: any) => [
      "Check-In",
      format(new Date(ci.check_in_date), "yyyy-MM-dd HH:mm"),
      ci.employees?.employee_id || "",
      ci.employees?.name || "",
      ci.employees?.employee_type || "",
      ci.employees?.supplier_name || "",
      ci.rooms?.room_number || "",
      ci.camps?.name || "",
      "", "", "",
    ]);
    const coRows = checkOuts.map((co: any) => [
      "Check-Out",
      format(new Date(co.check_out_date), "yyyy-MM-dd HH:mm"),
      co.employees?.employee_id || "",
      co.employees?.name || "",
      co.employees?.employee_type || "",
      co.employees?.supplier_name || "",
      co.rooms?.room_number || "",
      co.camps?.name || "",
      co.assets_returned ? "Yes" : "No",
      co.damage_remarks || "",
      co.feedback_rating || "",
    ]);
    const headers = ["Type", "Date", "Employee ID", "Name", "Emp Type", "Supplier", "Room", "Camp", "Assets Returned", "Damage Remarks", "Rating"];
    const csv = [headers.join(","), ...[...ciRows, ...coRows].map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `camp-activity-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search camps..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={selectedCamp} onValueChange={setSelectedCamp}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Camp" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Camps</SelectItem>
            {camps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCampSummary}>
          <Download size={16} className="mr-1" /> Summary CSV
        </Button>
        <Button variant="outline" onClick={exportActivityLog}>
          <Download size={16} className="mr-1" /> Activity Log
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <LogIn size={18} />
            </div>
            <p className="text-xs text-muted-foreground">Check-Ins ({dateRange}d)</p>
            <p className="text-2xl font-bold">{totalCheckIns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <LogOut size={18} />
            </div>
            <p className="text-xs text-muted-foreground">Check-Outs ({dateRange}d)</p>
            <p className="text-2xl font-bold">{totalCheckOuts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center mb-2">
              <BedDouble size={18} />
            </div>
            <p className="text-xs text-muted-foreground">Assets Not Returned</p>
            <p className="text-2xl font-bold">{assetsNotReturned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <Users size={18} />
            </div>
            <p className="text-xs text-muted-foreground">Blacklisted</p>
            <p className="text-2xl font-bold">{blacklisted}</p>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Chart */}
      {occupancyChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Camp Occupancy Rate (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyChartData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Occupancy"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Bar cursor="pointer" onClick={row => openCamp(row.payload.id)} dataKey="occupancy" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {occupancyChartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.occupancy >= 90 ? "hsl(var(--destructive))" : entry.occupancy >= 70 ? "hsl(var(--chart-2))" : "hsl(var(--primary))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camp Summary Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Camp Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="max-h-[50vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camp Name</TableHead>
                  <TableHead className="text-center">Rooms</TableHead>
                  <TableHead className="text-center">Capacity</TableHead>
                  <TableHead className="text-center">Occupants</TableHead>
                  <TableHead className="text-center">Occupancy %</TableHead>
                  <TableHead className="text-center">Check-Ins</TableHead>
                  <TableHead className="text-center">Check-Outs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No camps found</TableCell>
                  </TableRow>
                ) : (
                  campSummary.map((c) => {
                    const pct = c.capacity > 0 ? Math.round((c.occupants / c.capacity) * 100) : 0;
                    return (
                      <TableRow key={c.name}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-center">{c.totalRooms}</TableCell>
                        <TableCell className="text-center">{c.capacity}</TableCell>
                        <TableCell className="text-center font-medium text-primary">{c.occupants}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={
                            pct >= 90 ? "bg-destructive/10 text-destructive" :
                            pct >= 70 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          }>{pct}%</Badge>
                        </TableCell>
                        <TableCell className="text-center">{c.checkIns}</TableCell>
                        <TableCell className="text-center">{c.checkOuts}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ChartDrilldown selection={chartSelection} onClose={() => setChartSelection(null)} />
    </div>
  );
}
