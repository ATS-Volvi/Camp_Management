import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, BedDouble, Users, DoorOpen, Wrench, LayoutGrid } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";

interface Props {
  camps: any[];
}

// Curated vibrant color scheme for Occupancy: Available (Emerald), Occupied (Royal Blue), Maintenance (Amber/Red)
const OCCUPANCY_COLORS = ["#10b981", "#3b82f6", "#f43f5e"];

// Contextual color mapping for amenities
const AMENITY_PALETTE: Record<string, string> = {
  housing: "#3b82f6",  // Royal Blue
  canteen: "#10b981",  // Fresh Emerald
  mess: "#10b981",
  dining: "#10b981",
  gym: "#f59e0b",      // Energetic Amber
  sports: "#f59e0b",
  fitness: "#f59e0b",
  laundry: "#8b5cf6",  // Modern Violet
  wash: "#8b5cf6",
  medical: "#ec4899",  // Rose Pink
  clinic: "#ec4899",
  health: "#ec4899",
  wifi: "#06b6d4",     // Vibrant Cyan
  internet: "#06b6d4",
  mosque: "#14b8a6",   // Teal
  prayer: "#14b8a6",
  recreation: "#f97316",// Vivid Orange
};

const FALLBACK_AMENITY_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Rose
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#6366f1", // Indigo
];

function getAmenityColor(name: string, index: number): string {
  const lower = (name || "").toLowerCase();
  for (const [key, color] of Object.entries(AMENITY_PALETTE)) {
    if (lower.includes(key)) return color;
  }
  return FALLBACK_AMENITY_COLORS[index % FALLBACK_AMENITY_COLORS.length];
}

export default function CampsOverview({ camps }: Props) {
  // Aggregate stats
  const stats = useMemo(() => {
    const totalCamps = camps.length;
    const totalBlocks = 0; // We'll fetch separately
    const totalRooms = camps.reduce((s, c) => s + (c.totalRooms || 0), 0);
    const totalOccupants = camps.reduce((s, c) => s + (c.totalOccupants || 0), 0);
    const totalCapacity = camps.reduce((s, c) => s + (c.totalCapacity || 0), 0);
    const vacantRooms = camps.reduce((s, c) => s + (c.vacantBeds || 0), 0);
    return { totalCamps, totalRooms, totalOccupants, totalCapacity, vacantRooms };
  }, [camps]);

  // Fetch blocks count & rooms by status
  const { data: blocksData } = useQuery({
    queryKey: ["camps-overview-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("buildings").select("id, status");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allRooms } = useQuery({
    queryKey: ["camps-overview-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, status, current_occupancy, max_capacity, camp_id");
      if (error) throw error;
      return data || [];
    },
  });

  // Weekly check-in/check-out data
  const { data: weeklyData } = useQuery({
    queryKey: ["camps-overview-weekly"],
    queryFn: async () => {
      const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const [ciRes, coRes] = await Promise.all([
        supabase.from("check_ins").select("check_in_date").gte("check_in_date", sevenDaysAgo),
        supabase.from("check_outs").select("check_out_date").gte("check_out_date", sevenDaysAgo),
      ]);
      return { checkIns: ciRes.data || [], checkOuts: coRes.data || [] };
    },
  });

  const totalBlocks = blocksData?.length || 0;
  const underMaintenance = (allRooms || []).filter(r => r.status === "under_maintenance").length;

  // Weekly bar chart data
  const weeklyChartData = useMemo(() => {
    if (!weeklyData) return [];
    const days: { label: string; date: string; checkIns: number; checkOuts: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, "yyyy-MM-dd");
      days.push({
        label: format(d, "EEE"),
        date: dateStr,
        checkIns: weeklyData.checkIns.filter(ci => format(new Date(ci.check_in_date), "yyyy-MM-dd") === dateStr).length,
        checkOuts: weeklyData.checkOuts.filter(co => format(new Date(co.check_out_date), "yyyy-MM-dd") === dateStr).length,
      });
    }
    return days;
  }, [weeklyData]);

  // Camp occupancy pie chart
  const occupancyPieData = useMemo(() => {
    if (!allRooms) return [];
    const vacant = allRooms.filter(r => r.status === "vacant").length;
    const occupied = allRooms.filter(r => r.status === "occupied" || r.status === "partially_occupied").length;
    const maintenance = allRooms.filter(r => r.status === "under_maintenance").length;
    return [
      { name: "Available", value: vacant },
      { name: "Occupied", value: occupied },
      { name: "Maintenance", value: maintenance },
    ].filter(d => d.value > 0);
  }, [allRooms]);

  // Amenities usage pie
  const amenitiesPieData = useMemo(() => {
    const amenityCount: Record<string, number> = {};
    camps.forEach(c => {
      (c.amenities || []).forEach((a: string) => {
        amenityCount[a] = (amenityCount[a] || 0) + 1;
      });
    });
    return Object.entries(amenityCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [camps]);

  const totalOccPie = occupancyPieData.reduce((s, d) => s + d.value, 0);
  const totalAmenities = amenitiesPieData.reduce((s, d) => s + d.value, 0);

  const kpiCards = [
    { label: "Total Camps", value: stats.totalCamps, icon: <Building2 size={20} />, color: "text-primary" },
    { label: "Blocks", value: totalBlocks, icon: <LayoutGrid size={20} />, color: "text-primary" },
    { label: "Rooms", value: stats.totalRooms, icon: <BedDouble size={20} />, color: "text-primary" },
    { label: "Total Occupants", value: stats.totalOccupants, icon: <Users size={20} />, color: "text-primary" },
    { label: "Vacant Rooms", value: stats.vacantRooms, icon: <DoorOpen size={20} />, color: "text-primary" },
    { label: "Under Maintenance", value: underMaintenance, icon: <Wrench size={20} />, accent: true },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className={kpi.accent ? "border-destructive/40" : ""}>
            <CardContent className="pt-5 pb-4 px-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                kpi.accent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              }`}>
                {kpi.icon}
              </div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold mt-0.5">{kpi.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Check-ins / Check-outs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} barGap={4}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Bar dataKey="checkIns" name="Check In" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="checkOuts" name="Check Out" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Check In
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" /> Check Out
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Camp Occupancy Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Room Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {occupancyPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={OCCUPANCY_COLORS[index % OCCUPANCY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    formatter={(val: number) => [`${val} rooms (${totalOccPie > 0 ? ((val / totalOccPie) * 100).toFixed(0) : 0}%)`, "Rooms"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold tracking-tight">{totalOccPie}</p>
                <p className="text-xs text-muted-foreground font-medium">Rooms</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              {occupancyPieData.map((d, i) => {
                const pct = totalOccPie > 0 ? ((d.value / totalOccPie) * 100).toFixed(0) : "0";
                return (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted/60 border border-border/40 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: OCCUPANCY_COLORS[i % OCCUPANCY_COLORS.length] }} />
                    <span>{d.name}</span>
                    <span className="text-muted-foreground font-semibold">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Amenities Distribution Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Amenities Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] relative">
              {amenitiesPieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No amenities data
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={amenitiesPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      >
                        {amenitiesPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getAmenityColor(entry.name, index)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                        formatter={(val: number) => [`${val} camps (${totalAmenities > 0 ? ((val / totalAmenities) * 100).toFixed(0) : 0}%)`, "Coverage"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-3xl font-bold tracking-tight">{totalAmenities}</p>
                    <p className="text-xs text-muted-foreground font-medium">Amenities</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              {amenitiesPieData.map((d, i) => {
                const pct = totalAmenities > 0 ? ((d.value / totalAmenities) * 100).toFixed(0) : "0";
                return (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted/60 border border-border/40 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: getAmenityColor(d.name, i) }} />
                    <span>{d.name}</span>
                    <span className="text-muted-foreground font-semibold">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
