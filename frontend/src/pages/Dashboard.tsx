import { ChartDrilldown, type ChartSelection } from "@/components/dashboard/ChartDrilldown";
import { employeeRecord, roomRecord } from "@/lib/dashboardDrilldown";
import { useCommandDashboard } from "@/hooks/useCommandDashboard";
import { residentsAt } from "@/lib/commandDashboard";
import { useState, useMemo } from "react";
import {
  Building2, DoorOpen, Users, Clock, BedDouble, Wrench, ArrowRight,
  Plus, LogIn, LogOut, Package, BarChart3, UserCheck, Settings,
  ChevronRight, DollarSign, Utensils,
} from "lucide-react";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import KpiDrilldown, { type DrilldownType } from "@/components/dashboard/KpiDrilldown";
import { PastelKpiCard } from "@/components/ui/pastel-kpi";
import { useCamps } from "@/hooks/useCampManagement";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Dashboard() {
  const [chartSelection, setChartSelection] = useState<ChartSelection | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: camps = [], isLoading } = useCamps();
  const [selectedCamp, setSelectedCamp] = useState<string>("all");
  const [drilldown, setDrilldown] = useState<DrilldownType>(null);

  const details = useCommandDashboard();
  const residents = residentsAt(details.data?.checkIns ?? [], details.data?.checkOuts ?? [], new Date().toISOString());
  const openRoomChart = (label: string, predicate: (room: any) => boolean, campOnly = false) => {
    const selected = (details.data?.rooms ?? []).filter(r => predicate(r) && (!campOnly || selectedCamp === "all" || r.camp_id === selectedCamp));
    setChartSelection({ title: label, rows: selected.map(r => roomRecord(r, camps.find(c => c.id === r.camp_id)?.name ?? "—", residents.filter(e => e.room_id === r.id).flatMap(e => { const employee = details.data?.employees.find(emp => emp.id === e.employee_id); return employee ? [employeeRecord(employee, { "Check-in": e.check_in_date, Room: r.room_number })] : []; }))) });
  };
  const openSupplierChart = (name: string) => setChartSelection({ title: `${name} employees`, rows: allEmployees.filter(e => (e.employee_type === "supplier" ? e.supplier_name || "Unknown Supplier" : "Own") === name).map(e => employeeRecord(e)) });

  // Fetch all rooms for room availability
  const { data: allRooms = [] } = useQuery({
    queryKey: ["all-rooms-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, status, current_occupancy, max_capacity, camp_id, daily_rate, daily_food_rate");
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent maintenance tickets
  const { data: recentTickets = [] } = useQuery({
    queryKey: ["recent-tickets-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("id, description, category, status, created_at, camps(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent employees (new joiners)
  const { data: recentEmployees = [] } = useQuery({
    queryKey: ["recent-employees-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, employee_id, status, camp_id, room_id, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all active employees for distribution charts
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["all-employees-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, employee_id, department, nationality, employee_type, supplier_name, designation, project, status, camp_id, room_id")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all rooms for category distribution
  const { data: allRoomsForCategories = [] } = useQuery({
    queryKey: ["all-rooms-categories-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, category, current_occupancy, max_capacity, camp_id");
      if (error) throw error;
      return data;
    },
  });

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user!.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  // Aggregated stats
  const totalCamps = camps.length;
  const totalRooms = camps.reduce((s: number, c: any) => s + c.totalRooms, 0);
  const totalOccupants = camps.reduce((s: number, c: any) => s + c.totalOccupants, 0);
  const totalCapacity = camps.reduce((s: number, c: any) => s + c.totalCapacity, 0);
  const totalAvailable = totalCapacity - totalOccupants;

  // Room status counts (filtered by camp)
  const filteredRooms = selectedCamp === "all"
    ? allRooms
    : allRooms.filter((r) => r.camp_id === selectedCamp);

  const vacantRooms = filteredRooms.filter((r) => r.status === "vacant").length;
  const maintenanceRooms = filteredRooms.filter((r) => r.status === "under_maintenance").length;
  const assignedBeds = filteredRooms.reduce((s, r) => s + r.current_occupancy, 0);
  const availableBeds = filteredRooms.reduce((s, r) => s + (r.max_capacity - r.current_occupancy), 0);
  const reservedRooms = filteredRooms.filter((r) => r.status === "reserved").length;

  const roomBarTotal = assignedBeds + availableBeds + reservedRooms + maintenanceRooms || 1;

  // Occupancy by camp for bar chart
  const campOccupancyData = camps.map((c: any) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    occupied: c.totalOccupants,
    available: c.vacantBeds,
  }));

  // Pie chart
  const pieData = [
    { name: "Occupied", value: totalOccupants, color: "hsl(var(--primary))" },
    { name: "Available", value: totalAvailable, color: "hsl(var(--campman-green))" },
  ].filter((d) => d.value > 0);

  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupants / totalCapacity) * 100) : 0;

  // Supplier-wise distribution
  const supplierDistribution = useMemo(() => {
    const map = new Map<string, number>();
    allEmployees.forEach((e: any) => {
      const key = e.employee_type === "supplier" ? (e.supplier_name || "Unknown Supplier") : "Own";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allEmployees]);

  const DIST_COLORS = [
    "hsl(var(--primary))", "hsl(var(--campman-green))", "hsl(var(--campman-yellow))",
    "hsl(221 83% 53%)", "hsl(262 83% 58%)", "hsl(340 75% 55%)", "hsl(25 95% 53%)", "hsl(175 80% 40%)",
  ];

  // Category-wise room distribution
  const categoryDistribution = useMemo(() => {
    const map = new Map<string, { rooms: number; occupied: number; capacity: number }>();
    allRoomsForCategories.forEach((r: any) => {
      const cat = r.category;
      if (!map.has(cat)) map.set(cat, { rooms: 0, occupied: 0, capacity: 0 });
      const v = map.get(cat)!;
      v.rooms++;
      v.occupied += r.current_occupancy;
      v.capacity += r.max_capacity;
    });
    return Array.from(map.entries())
      .map(([cat, v]) => ({ category: cat, label: getRoomCategoryLabel(cat), ...v }))
      .sort((a, b) => b.rooms - a.rooms);
  }, [allRoomsForCategories]);

  // Running cost summary per camp
  const campCostSummary = useMemo(() => {
    const campMap = new Map<string, { name: string; occupants: number; dailyRoomCost: number; dailyFoodCost: number }>();
    camps.forEach((c: any) => campMap.set(c.id, { name: c.name, occupants: 0, dailyRoomCost: 0, dailyFoodCost: 0 }));
    
    allRooms.forEach((r: any) => {
      const entry = campMap.get(r.camp_id);
      if (!entry) return;
      entry.occupants += r.current_occupancy;
      entry.dailyRoomCost += r.current_occupancy * (Number(r.daily_rate) || 0);
      entry.dailyFoodCost += r.current_occupancy * (Number(r.daily_food_rate) || 0);
    });
    
    return Array.from(campMap.values())
      .filter(c => c.occupants > 0)
      .sort((a, b) => (b.dailyRoomCost + b.dailyFoodCost) - (a.dailyRoomCost + a.dailyFoodCost));
  }, [camps, allRooms]);

  const totalDailyCost = campCostSummary.reduce((s, c) => s + c.dailyRoomCost + c.dailyFoodCost, 0);
  const totalMonthlyEstimate = totalDailyCost * 30;

  const now = new Date();
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground text-sm">Camp management overview and activity.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/camps")} className="gap-1.5">
            <Plus size={16} /> Add Camps
          </Button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <PastelKpiCard label="Total Camps" value={isLoading ? "—" : totalCamps.toLocaleString()} icon={Building2} tone="blue" onClick={() => setDrilldown("camps")} />
        <PastelKpiCard label="Rooms" value={isLoading ? "—" : totalRooms.toLocaleString()} icon={DoorOpen} tone="pink" onClick={() => setDrilldown("rooms")} />
        <PastelKpiCard label="Total Occupants" value={isLoading ? "—" : totalOccupants.toLocaleString()} icon={Users} tone="mint" onClick={() => setDrilldown("occupants")} />
        <PastelKpiCard label="Vacant Rooms" value={isLoading ? "—" : vacantRooms.toLocaleString()} icon={BedDouble} tone="amber" onClick={() => setDrilldown("vacant")} />
        <PastelKpiCard label="Under Maintenance" value={isLoading ? "—" : maintenanceRooms} icon={Wrench} tone="rose" onClick={() => setDrilldown("maintenance")} />
      </div>

      {/* KPI Drilldown Dialog */}
      <KpiDrilldown type={drilldown} onClose={() => setDrilldown(null)} />

      {/* Room Availability + Clock Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Room Availability Bar */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Room Availability</h3>
              <Select value={selectedCamp} onValueChange={setSelectedCamp}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Camps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Camps</SelectItem>
                  {camps.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stacked Bar */}
            <div className="w-full h-8 rounded-full overflow-hidden flex bg-muted">
              {assignedBeds > 0 && (
                <div
                  role="button" tabIndex={0} onClick={() => openRoomChart("Assigned beds", r => residents.some(e => e.room_id === r.id), true)} onKeyDown={e => { if (e.key === "Enter") openRoomChart("Assigned beds", r => residents.some(e => e.room_id === r.id), true); }} className="h-full bg-primary transition-all cursor-pointer"
                  style={{ width: `${(assignedBeds / roomBarTotal) * 100}%` }}
                />
              )}
              {availableBeds > 0 && (
                <div
                  role="button" tabIndex={0} onClick={() => openRoomChart("Available beds", r => r.max_capacity > residents.filter(e => e.room_id === r.id).length, true)} onKeyDown={e => { if (e.key === "Enter") openRoomChart("Available beds", r => r.max_capacity > residents.filter(e => e.room_id === r.id).length, true); }} className="h-full transition-all cursor-pointer"
                  style={{
                    width: `${(availableBeds / roomBarTotal) * 100}%`,
                    backgroundColor: "hsl(var(--campman-green))",
                  }}
                />
              )}
              {reservedRooms > 0 && (
                <div
                  role="button" tabIndex={0} onClick={() => openRoomChart("Reserved rooms", r => r.status === "reserved", true)} onKeyDown={e => { if (e.key === "Enter") openRoomChart("Reserved rooms", r => r.status === "reserved", true); }} className="h-full transition-all cursor-pointer"
                  style={{
                    width: `${(reservedRooms / roomBarTotal) * 100}%`,
                    backgroundColor: "hsl(var(--campman-yellow))",
                  }}
                />
              )}
              {maintenanceRooms > 0 && (
                <div
                  role="button" tabIndex={0} onClick={() => openRoomChart("Maintenance rooms", r => r.status === "under_maintenance", true)} onKeyDown={e => { if (e.key === "Enter") openRoomChart("Maintenance rooms", r => r.status === "under_maintenance", true); }} className="h-full bg-destructive transition-all cursor-pointer"
                  style={{ width: `${(maintenanceRooms / roomBarTotal) * 100}%` }}
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 flex-wrap">
              <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded-md transition-colors" onClick={() => setDrilldown("assigned")}>
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-sm text-muted-foreground">Assigned</span>
                <span className="text-sm font-bold">{assignedBeds}</span>
              </button>
              <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded-md transition-colors" onClick={() => setDrilldown("available")}>
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--campman-green))" }} />
                <span className="text-sm text-muted-foreground">Available</span>
                <span className="text-sm font-bold">{availableBeds}</span>
              </button>
              <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded-md transition-colors" onClick={() => setDrilldown("reserved")}>
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--campman-yellow))" }} />
                <span className="text-sm text-muted-foreground">Reserved</span>
                <span className="text-sm font-bold">{reservedRooms}</span>
              </button>
              <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded-md transition-colors" onClick={() => setDrilldown("maintenance")}>
                <div className="w-3 h-3 rounded-sm bg-destructive" />
                <span className="text-sm text-muted-foreground">Under Maintenance</span>
                <span className="text-sm font-bold">{maintenanceRooms}</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Clock + Check In/Out Widget */}
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-5 flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Clock size={24} className="text-primary" />
            </div>
            <div className="flex items-center gap-6 text-center mb-1">
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-2xl font-bold">
                  {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{now.getFullYear()}</p>
                <p className="text-2xl font-bold">
                  {now.toLocaleDateString([], { day: "numeric", month: "short" }).toUpperCase()}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Check In / Check Out</p>
            <div className="flex gap-3 w-full">
              <Button
                className="flex-1 gap-1.5"
                variant="outline"
                onClick={() => navigate("/check-in-out")}
              >
                <LogIn size={16} /> Check In
              </Button>
              <Button
                className="flex-1 gap-1.5"
                onClick={() => navigate("/check-in-out")}
              >
                <LogOut size={16} /> Check Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Recent Camps Table + Recent Activities + New Joiners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Allocated Camps */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Allocated Camps</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {camps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No camps yet</p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium py-2 border-b">
                  <span>Camp Name</span>
                  <span>Location</span>
                  <span>Rooms</span>
                  <span>Status</span>
                </div>
                {camps.slice(0, 6).map((camp: any) => (
                  <div
                    key={camp.id}
                    className="grid grid-cols-4 gap-2 py-2.5 border-b last:border-0 text-sm items-center cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded"
                    onClick={() => navigate(`/camps/${camp.id}`)}
                  >
                    <span className="font-medium truncate">{camp.name}</span>
                    <span className="text-muted-foreground truncate">{camp.location}</span>
                    <span className="text-muted-foreground">{camp.totalRooms}</span>
                    <Badge
                      variant={camp.status === "active" ? "default" : "secondary"}
                      className="w-fit text-xs capitalize"
                    >
                      {camp.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activities</CardTitle>
              <Button variant="link" size="sm" className="gap-1 text-xs" onClick={() => navigate("/maintenance")}>
                View all <ChevronRight size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activities</p>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((ticket: any) => (
                  <div key={ticket.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Wrench size={14} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ticket.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.camps?.name} • {ticket.category} •{" "}
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 mt-2 ${
                        ticket.status === "completed"
                          ? "bg-green-500"
                          : ticket.status === "in_progress"
                          ? "bg-primary"
                          : "bg-amber-500"
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Joiners */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">New Joiners</CardTitle>
              <Button variant="link" size="sm" className="gap-1 text-xs" onClick={() => navigate("/check-in-out")}>
                Allocate Room <ChevronRight size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent joiners</p>
            ) : (
              <div className="space-y-0">
                {recentEmployees.map((emp: any) => (
                  <div key={emp.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <UserCheck size={14} className="text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">{emp.name}</span>
                    </div>
                    <Badge
                      variant={emp.room_id ? "default" : "outline"}
                      className={`text-xs ${
                        emp.room_id
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0"
                          : "text-destructive border-destructive/30"
                      }`}
                    >
                      {emp.room_id ? "Assigned" : "Not Assigned"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Occupancy Overview + Quick Actions + Camp Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Occupancy Overview */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Occupancy Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cursor="pointer" onClick={row => openRoomChart(`${row.name} beds`, r => row.name === "Occupied" ? residents.some(e => e.room_id === r.id) : r.max_capacity > residents.filter(e => e.room_id === r.id).length)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-6 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span>Occupied: <strong>{totalOccupants}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--campman-green))" }} />
                    <span>Available: <strong>{totalAvailable}</strong></span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 font-medium">{occupancyPct}% occupancy rate</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20 hover:from-blue-500/20" onClick={() => navigate("/camps")}>
                <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs">Manage Camps</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 hover:from-emerald-500/20" onClick={() => navigate("/check-in-out")}>
                <LogIn size={20} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs">Check In/Out</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/20 hover:from-violet-500/20" onClick={() => navigate("/employees")}>
                <Users size={20} className="text-violet-600 dark:text-violet-400" />
                <span className="text-xs">Employees</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 hover:from-amber-500/20" onClick={() => navigate("/maintenance")}>
                <Wrench size={20} className="text-amber-600 dark:text-amber-400" />
                <span className="text-xs">Maintenance</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-teal-500/10 to-transparent border-teal-500/20 hover:from-teal-500/20" onClick={() => navigate("/inventory")}>
                <Package size={20} className="text-teal-600 dark:text-teal-400" />
                <span className="text-xs">Inventory</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20 hover:from-rose-500/20" onClick={() => navigate("/reports")}>
                <BarChart3 size={20} className="text-rose-600 dark:text-rose-400" />
                <span className="text-xs">Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Camp Summary */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Camp Summary</CardTitle>
              <Button variant="link" size="sm" className="gap-1 text-xs" onClick={() => navigate("/camps")}>
                View all <ChevronRight size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {camps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No camps yet</p>
            ) : (
              <div className="space-y-3">
                {camps.slice(0, 5).map((camp: any) => {
                  const pct = camp.totalCapacity > 0 ? Math.round((camp.totalOccupants / camp.totalCapacity) * 100) : 0;
                  return (
                    <div
                      key={camp.id}
                      className="cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded"
                      onClick={() => navigate(`/camps/${camp.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{camp.name}</span>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                        <span>{camp.totalOccupants} occupied</span>
                        <span>{camp.vacantBeds} available</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribution Row: Supplier-wise + Category-wise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Supplier-wise Employee Distribution */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Supplier-wise Employee Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {supplierDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No employee data</p>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={supplierDistribution}
                      cursor="pointer" onClick={row => openSupplierChart(row.name)}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="name"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {supplierDistribution.map((_, i) => (
                        <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, "Employees"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  {supplierDistribution.map((s, i) => {
                    const pct = allEmployees.length > 0 ? Math.round((s.count / allEmployees.length) * 100) : 0;
                    return (
                      <div key={s.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DIST_COLORS[i % DIST_COLORS.length] }} />
                          <span className="truncate max-w-[160px]">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{s.count}</span>
                          <span className="text-muted-foreground text-xs w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category-wise Room Distribution */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Room Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No room data</p>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryDistribution} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={130}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        name === "occupied" ? "Occupied" : "Capacity",
                      ]}
                    />
                    <Bar cursor="pointer" onClick={row => openRoomChart(`${row.payload.label} · occupied`, r => r.category === row.payload.category && residents.some(e => e.room_id === r.id))} dataKey="occupied" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="occupied" />
                    <Bar cursor="pointer" onClick={row => openRoomChart(`${row.payload.label} · capacity`, r => r.category === row.payload.category)} dataKey="capacity" fill="hsl(var(--muted-foreground) / 0.2)" radius={[0, 4, 4, 0]} name="capacity" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  {categoryDistribution.map((c, i) => {
                    const occPct = c.capacity > 0 ? Math.round((c.occupied / c.capacity) * 100) : 0;
                    return (
                      <div key={c.category} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[180px]">{c.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-xs">{c.rooms} rooms</span>
                          <span className="font-semibold">{c.occupied}/{c.capacity}</span>
                          <Badge variant={occPct > 80 ? "destructive" : "secondary"} className="text-xs w-12 justify-center">{occPct}%</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Running Cost Summary */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign size={18} className="text-primary" />
              Running Cost Summary
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Daily Total</p>
                <p className="text-lg font-bold text-primary">SAR {totalDailyCost.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Monthly Est.</p>
                <p className="text-lg font-bold">SAR {totalMonthlyEstimate.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {campCostSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No occupied rooms to calculate costs</p>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium py-2 border-b">
                <span className="col-span-2">Camp</span>
                <span className="text-right">Occupants</span>
                <span className="text-right">Room Cost/Day</span>
                <span className="text-right">Food Cost/Day</span>
                <span className="text-right">Total/Day</span>
              </div>
              {campCostSummary.map((camp) => {
                const total = camp.dailyRoomCost + camp.dailyFoodCost;
                const pct = totalDailyCost > 0 ? Math.round((total / totalDailyCost) * 100) : 0;
                return (
                  <div key={camp.name} className="grid grid-cols-6 gap-2 py-2.5 border-b last:border-0 text-sm items-center">
                    <div className="col-span-2">
                      <span className="font-medium">{camp.name}</span>
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-right">
                      <Badge variant="secondary" className="text-xs">{camp.occupants}</Badge>
                    </span>
                    <span className="text-right font-mono text-muted-foreground">
                      SAR {camp.dailyRoomCost.toLocaleString()}
                    </span>
                    <span className="text-right font-mono text-muted-foreground flex items-center justify-end gap-1">
                      <Utensils size={10} /> SAR {camp.dailyFoodCost.toLocaleString()}
                    </span>
                    <span className="text-right font-bold text-primary">
                      SAR {total.toLocaleString()}
                    </span>
                  </div>
                );
              })}
              <div className="grid grid-cols-6 gap-2 py-3 text-sm font-semibold bg-muted/30 -mx-6 px-6 mt-2 rounded-lg">
                <span className="col-span-2">Grand Total</span>
                <span className="text-right">{campCostSummary.reduce((s, c) => s + c.occupants, 0)}</span>
                <span className="text-right font-mono">SAR {campCostSummary.reduce((s, c) => s + c.dailyRoomCost, 0).toLocaleString()}</span>
                <span className="text-right font-mono">SAR {campCostSummary.reduce((s, c) => s + c.dailyFoodCost, 0).toLocaleString()}</span>
                <span className="text-right text-primary">SAR {totalDailyCost.toLocaleString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    <ChartDrilldown selection={chartSelection} onClose={() => setChartSelection(null)} />
    </div>
  );
}
