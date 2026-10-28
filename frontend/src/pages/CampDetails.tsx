import { ChartDrilldown, type ChartSelection } from "@/components/dashboard/ChartDrilldown";
import { employeeRecord, roomRecord } from "@/lib/dashboardDrilldown";
import { useCheckedInEmployees } from "@/hooks/useCheckInOut";
import { useState } from "react";
import CampRoomRatesDialog from "@/components/camps/CampRoomRatesDialog";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2, BedDouble, Users, DoorOpen, Plus, ArrowLeft, Edit,
  ChevronRight, Search, Filter, MapPin, Phone, Mail, Calendar,
  Thermometer, Bath, MoreHorizontal, LogIn, LogOut, Upload,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import RoomAllocationPanel from "@/components/camp/RoomAllocationPanel";
import CampStaffTab from "@/components/camp/CampStaffTab";
import CampInmatesTab from "@/components/camp/CampInmatesTab";
import CheckInOutSheet from "@/components/camp/CheckInOutSheet";
import AddCampDialog from "@/components/camps/AddCampDialog";
import AddBlockDialog from "@/components/camps/AddBlockDialog";
import AddRoomDialog from "@/components/camps/AddRoomDialog";
import BulkRoomUploadDialog from "@/components/camps/BulkRoomUploadDialog";
import { useBlocks, useRooms } from "@/hooks/useCampManagement";
import { getRoomCategoryLabel, NEW_ROOM_CATEGORIES } from "@/constants/roomCategories";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const CATEGORY_STYLES: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  executive_single: { bg: "bg-violet-500/15", border: "border-violet-400", badge: "bg-violet-500 text-white", label: "EXEC-S" },
  executive_twin:   { bg: "bg-violet-500/10", border: "border-violet-300", badge: "bg-violet-400 text-white", label: "EXEC-T" },
  supervisor_twin:  { bg: "bg-blue-500/15",   border: "border-blue-400",   badge: "bg-blue-500 text-white",   label: "SUPV" },
  staff_4bed:       { bg: "bg-teal-500/15",    border: "border-teal-400",   badge: "bg-teal-500 text-white",   label: "STAFF" },
  skilled_6bed:     { bg: "bg-amber-500/15",   border: "border-amber-400",  badge: "bg-amber-600 text-white",  label: "SKILL" },
  general_8bed:     { bg: "bg-orange-500/15",  border: "border-orange-400", badge: "bg-orange-500 text-white", label: "GEN" },
  guest_single:     { bg: "bg-pink-500/15",    border: "border-pink-400",   badge: "bg-pink-500 text-white",   label: "GUEST" },
  transit_4bed:     { bg: "bg-cyan-500/15",    border: "border-cyan-400",   badge: "bg-cyan-500 text-white",   label: "TRNST" },
};
const DEFAULT_CAT_STYLE = { bg: "bg-muted/50", border: "border-border", badge: "bg-muted-foreground text-background", label: "OTHER" };

function getRoomBoxClasses(room: any, isSelected: boolean) {
  const catStyle = CATEGORY_STYLES[room.category] || DEFAULT_CAT_STYLE;
  if (isSelected) return "ring-2 ring-primary bg-primary/10 border-primary";
  if (room.status === "under_maintenance") return "bg-destructive/10 border-destructive/50";
  if (room.status === "reserved") return "bg-amber-500/10 border-amber-400";
  return `${catStyle.bg} ${catStyle.border} border-2`;
}

const roomStatusBadge: Record<string, string> = {
  vacant: "bg-green-500 text-white",
  occupied: "bg-red-500 text-white",
  partially_occupied: "bg-amber-500 text-white",
  reserved: "bg-blue-500 text-white",
  under_maintenance: "bg-muted-foreground text-white",
};

const roomStatusLabel: Record<string, string> = {
  vacant: "Available",
  occupied: "Full",
  partially_occupied: "Partial",
  reserved: "Reserved",
  under_maintenance: "Maintenance",
};

const campTypeLabel: Record<string, string> = {
  executive: "Executive Camp",
  staff: "Staff Camp",
  worker: "Worker / Labor Camp",
  mixed: "Mixed Camp",
};

const amenityIcons: Record<string, string> = {
  "Dining Hall": "🍽️",
  "Laundry": "🧺",
  "Recreation Room": "🎮",
  "Gym": "🏋️",
  "Prayer Room": "🕌",
  "Medical Clinic": "🏥",
  "Parking": "🅿️",
  "Security": "🔒",
  "WiFi": "📶",
  "CCTV": "📹",
};

export default function CampDetails() {
  const [chartSelection, setChartSelection] = useState<ChartSelection | null>(null);
  const { campId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showAllocation, setShowAllocation] = useState(false);
  const [editCampOpen, setEditCampOpen] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [roomFilter, setRoomFilter] = useState("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [ratesDialogOpen, setRatesDialogOpen] = useState(false);
  const [bulkRoomOpen, setBulkRoomOpen] = useState(false);

  // Check if user is admin
  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isAdmin = userRoles.some(r => r.role === "super_admin" || r.role === "camp_manager");

  const { data: camp, isLoading: campLoading } = useQuery({
    queryKey: ["camp", campId],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("*").eq("id", campId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!campId,
  });

  const { data: blocks = [] } = useBlocks(campId);
  const { data: rooms = [], refetch: refetchRooms } = useRooms(campId);

  const { data: residents = [] } = useCheckedInEmployees(campId);
  const openOccupancy = (name: string) => setChartSelection({ title: `${name} beds`, rows: rooms.filter(r => name === "Occupied" ? r.current_occupancy > 0 : r.current_occupancy < r.max_capacity).map(r => roomRecord(r, camp?.name ?? "—", residents.filter(e => e.checked_in_room_id === r.id).map(e => employeeRecord(e)))) });

  const totalCapacity = rooms.reduce((s, r: any) => s + r.max_capacity, 0);
  const totalOccupied = rooms.reduce((s, r: any) => s + r.current_occupancy, 0);
  const totalAvailable = totalCapacity - totalOccupied;
  const bathroomCount = rooms.filter((r: any) => r.attached_bathroom).length;
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  const pieData = [
    { name: "Occupied", value: totalOccupied, color: "hsl(var(--campman-red))" },
    { name: "Available", value: totalAvailable, color: "hsl(var(--campman-green))" },
  ].filter((d) => d.value > 0);

  const blockRooms = selectedBlock
    ? rooms.filter((r: any) => r.building_id === selectedBlock)
    : rooms;

  const filteredRooms = blockRooms
    .filter((r: any) => roomFilter === "all" || r.status === roomFilter)
    .filter((r: any) => !roomSearch || r.room_number.toLowerCase().includes(roomSearch.toLowerCase()));

  const selectedBlockData = blocks.find((b: any) => b.id === selectedBlock);

  const handleRoomClick = (roomId: string) => {
    setSelectedRoom(roomId);
    setShowAllocation(true);
  };

  if (campLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!camp) return <div className="p-8 text-center text-muted-foreground">Camp not found.</div>;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate("/camps")} className="hover:text-primary transition-colors">Camps</button>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">Details</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/camps")} className="shrink-0">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{camp.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {camp.camp_code && (
                <Badge variant="outline" className="font-mono text-xs">{camp.camp_code}</Badge>
              )}
              <Badge variant={camp.status === "active" ? "default" : "secondary"} className="capitalize">
                {camp.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCheckInOpen(true)} className="gap-1.5">
            <LogIn size={16} /> Check In
          </Button>
          <Button variant="destructive" onClick={() => setCheckOutOpen(true)} className="gap-1.5">
            <LogOut size={16} /> Check Out
          </Button>
          <Button variant="outline" onClick={() => setEditCampOpen(true)}>
            <Edit size={16} className="mr-1.5" /> Edit
          </Button>
          <Button variant="outline" onClick={() => setRatesDialogOpen(true)}>
            Room Rates
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal size={18} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-0 p-0 h-auto">
          {["overview", "details", "rooms", "inmates", ...(isAdmin ? ["staff"] : [])].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 text-sm font-medium"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══════ OVERVIEW TAB ═══════ */}
        <TabsContent value="overview" className="mt-6 space-y-8">
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-none shadow-sm">
              <CardContent className="pt-4 pb-4 flex flex-col items-center">
                <Building2 size={20} className="text-primary mb-1" />
                <p className="text-2xl font-bold">{blocks.length}</p>
                <p className="text-xs text-muted-foreground">Blocks</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-4 pb-4 flex flex-col items-center">
                <DoorOpen size={20} className="text-primary mb-1" />
                <p className="text-2xl font-bold">{rooms.length}</p>
                <p className="text-xs text-muted-foreground">Rooms</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-4 pb-4 flex flex-col items-center">
                <BedDouble size={20} className="text-primary mb-1" />
                <p className="text-2xl font-bold">{totalCapacity}</p>
                <p className="text-xs text-muted-foreground">Total Beds</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-4 pb-4 flex flex-col items-center">
                <Users size={20} className="text-primary mb-1" />
                <p className="text-2xl font-bold text-primary">{totalOccupied}</p>
                <p className="text-xs text-muted-foreground">Occupied</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="pt-4 pb-4 flex flex-col items-center">
                <BedDouble size={20} className="text-green-600 mb-1" />
                <p className="text-2xl font-bold text-green-600">{totalAvailable}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </CardContent>
            </Card>
          </div>

          {/* Main content + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left - Camp Overview */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hero Stats */}
              <div className="flex items-center gap-8 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <DoorOpen size={22} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{rooms.length} Rooms</p>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-10 hidden md:block" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <Bath size={22} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{bathroomCount}+ Bathrooms</p>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-10 hidden md:block" />
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <BedDouble size={22} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{totalCapacity} Beds</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {camp.notes && (
                <div>
                  <p className="text-muted-foreground leading-relaxed">{camp.notes}</p>
                </div>
              )}

              <Separator />

              {/* Property Details */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Property Details</h2>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Camp Type</p>
                      <p className="text-sm font-medium">{campTypeLabel[camp.camp_type] || camp.camp_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BedDouble size={16} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Capacity</p>
                      <p className="text-sm font-medium">{totalCapacity} beds</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Bath size={16} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Attached Bathrooms</p>
                      <p className="text-sm font-medium">{bathroomCount}+</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Opening Date</p>
                      <p className="text-sm font-medium">
                        {camp.opening_date ? new Date(camp.opening_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Thermometer size={16} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">AC Rooms</p>
                      <p className="text-sm font-medium">{rooms.filter((r: any) => r.ac).length} of {rooms.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Occupancy Rate</p>
                      <p className="text-sm font-medium">{occupancyPct}%</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Amenities */}
              {camp.amenities && camp.amenities.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {camp.amenities.map((a: string) => (
                      <div key={a} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50">
                        <span className="text-lg">{amenityIcons[a] || "✅"}</span>
                        <span className="text-sm font-medium">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Occupancy Chart */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Occupancy Overview</h2>
                {pieData.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie cursor="pointer" onClick={row => openOccupancy(row.name)} data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={0}>
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Occupied: <strong>{totalOccupied}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Available: <strong>{totalAvailable}</strong></span>
                      </div>
                      <div className="mt-2 text-muted-foreground font-medium">
                        {occupancyPct}% occupancy
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No rooms added yet.</p>
                )}
              </div>
            </div>

            {/* Right - Camp Info Card */}
            <div className="space-y-4">
              <Card className="sticky top-6 shadow-md border-0">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h3 className="text-xl font-bold">{camp.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin size={14} className="text-primary" />
                      <span className="text-sm text-primary">{camp.location}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    {camp.project_name && (
                      <div>
                        <p className="text-xs text-muted-foreground">Project</p>
                        <p className="text-sm font-medium">{camp.project_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{camp.location}</p>
                    </div>
                    {camp.managed_by && (
                      <div>
                        <p className="text-xs text-muted-foreground">Camp Manager</p>
                        <p className="text-sm font-medium">{camp.managed_by}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    {camp.contact_number && (
                      <Button className="flex-1" size="sm">
                        <Phone size={14} className="mr-1.5" /> Call
                      </Button>
                    )}
                    <Button variant="outline" className="flex-1" size="sm">
                      <Mail size={14} className="mr-1.5" /> Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ DETAILS TAB ═══════ */}
        <TabsContent value="details" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Camp Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Camp Name</span><span className="font-medium">{camp.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Camp Code</span><span className="font-mono">{camp.camp_code || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{camp.location}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Project</span><span className="font-medium">{camp.project_name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Camp Type</span><span className="capitalize font-medium">{camp.camp_type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Manager</span><span className="font-medium">{camp.managed_by || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span className="font-medium">{camp.contact_number || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Opening Date</span><span className="font-medium">{camp.opening_date ? new Date(camp.opening_date).toLocaleDateString() : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={camp.status === "active" ? "default" : "secondary"}>{camp.status}</Badge></div>
                {camp.notes && (
                  <div>
                    <span className="text-muted-foreground">Notes</span>
                    <p className="mt-1 text-foreground">{camp.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Blocks Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Blocks Summary</CardTitle>
                <Button size="sm" onClick={() => setAddBlockOpen(true)}>
                  <Plus size={14} className="mr-1" /> Add Block
                </Button>
              </CardHeader>
              <CardContent>
                {blocks.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">No blocks added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {blocks.map((block: any) => (
                      <div key={block.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div>
                          <p className="font-medium text-sm">{block.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{block.block_type} • {block.floors} floors • {block.totalRooms} rooms • {block.totalCapacity} beds</p>
                          {block.supervisor_name && <p className="text-xs text-muted-foreground">Supervisor: {block.supervisor_name}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {block.totalOccupancy}/{block.totalCapacity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Room Types Breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Room Types Breakdown</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setBulkRoomOpen(true)}>
                <Upload size={14} className="mr-1" /> Bulk Upload Rooms
              </Button>
            </CardHeader>
            <CardContent>
              {rooms.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No rooms added yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Type</TableHead>
                      <TableHead className="text-center">Rooms</TableHead>
                      <TableHead className="text-center">Beds/Room</TableHead>
                      <TableHead className="text-center">Total Beds</TableHead>
                      <TableHead className="text-center">Occupied</TableHead>
                      <TableHead className="text-center">Available</TableHead>
                      <TableHead className="text-center">AC Rooms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const typeMap = new Map<string, { count: number; beds: number; occupied: number; acCount: number; capacity: number }>();
                      rooms.forEach((r: any) => {
                        const existing = typeMap.get(r.category) || { count: 0, beds: 0, occupied: 0, acCount: 0, capacity: 0 };
                        existing.count++;
                        existing.beds += r.max_capacity;
                        existing.occupied += r.current_occupancy;
                        existing.acCount += r.ac ? 1 : 0;
                        existing.capacity = r.max_capacity;
                        typeMap.set(r.category, existing);
                      });
                      return Array.from(typeMap.entries()).map(([cat, data]) => (
                        <TableRow key={cat}>
                          <TableCell className="font-medium">{getRoomCategoryLabel(cat)}</TableCell>
                          <TableCell className="text-center">{data.count}</TableCell>
                          <TableCell className="text-center">{data.capacity}</TableCell>
                          <TableCell className="text-center">{data.beds}</TableCell>
                          <TableCell className="text-center">{data.occupied}</TableCell>
                          <TableCell className="text-center font-medium text-green-700 dark:text-green-400">{data.beds - data.occupied}</TableCell>
                          <TableCell className="text-center">{data.acCount}/{data.count}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Block-wise Room Details */}
          {blocks.length > 0 && rooms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Block-wise Room Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Block</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Floors</TableHead>
                      <TableHead className="text-center">Rooms</TableHead>
                      <TableHead className="text-center">Total Beds</TableHead>
                      <TableHead className="text-center">Occupied</TableHead>
                      <TableHead className="text-center">Vacancy</TableHead>
                      <TableHead className="text-center">Occupancy %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocks.map((block: any) => {
                      const pct = block.totalCapacity > 0 ? Math.round((block.totalOccupancy / block.totalCapacity) * 100) : 0;
                      return (
                        <TableRow key={block.id}>
                          <TableCell className="font-medium">{block.name}</TableCell>
                          <TableCell className="capitalize text-muted-foreground">{block.block_type}</TableCell>
                          <TableCell className="text-center">{block.floors}</TableCell>
                          <TableCell className="text-center">{block.totalRooms}</TableCell>
                          <TableCell className="text-center">{block.totalCapacity}</TableCell>
                          <TableCell className="text-center">{block.totalOccupancy}</TableCell>
                          <TableCell className="text-center font-medium text-green-700 dark:text-green-400">{block.totalCapacity - block.totalOccupancy}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={pct > 80 ? "destructive" : pct > 50 ? "default" : "secondary"}>{pct}%</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════ ROOMS TAB ═══════ */}
        <TabsContent value="rooms" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {selectedBlock ? (
                <span className="flex items-center gap-2">
                  <button onClick={() => setSelectedBlock(null)} className="text-primary hover:underline">
                    Blocks
                  </button>
                  <ChevronRight size={16} className="text-muted-foreground" />
                  {selectedBlockData?.name}
                </span>
              ) : (
                "Blocks"
              )}
            </h2>
            {!selectedBlock ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setBulkRoomOpen(true)}>
                  <Upload size={16} className="mr-1" /> Bulk Upload
                </Button>
                <Button onClick={() => setAddBlockOpen(true)}>
                  <Plus size={16} className="mr-1" /> Add Block
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setBulkRoomOpen(true)}>
                  <Upload size={16} className="mr-1" /> Bulk Upload
                </Button>
                <Button onClick={() => setAddRoomOpen(true)}>
                  <Plus size={16} className="mr-1" /> Add Rooms
                </Button>
              </div>
            )}
          </div>

          {!selectedBlock ? (
            blocks.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No blocks yet. Add your first block to start organizing rooms.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-10 pt-6 px-2">
                {blocks.map((block: any) => {
                  const pct = block.totalCapacity > 0 ? Math.round((block.totalOccupancy / block.totalCapacity) * 100) : 0;
                  const floors = Math.max(1, Math.min(4, block.floors || 1));
                  const roomsPerFloor = Math.max(4, Math.min(7, Math.ceil((block.totalRooms || floors * 5) / floors)));
                  const totalWindows = floors * (roomsPerFloor - 1);
                  const litWindows = Math.round((pct / 100) * totalWindows);
                  let lit = 0;
                  return (
                    <button
                      key={block.id}
                      onClick={() => setSelectedBlock(block.id)}
                      className="group relative flex flex-col items-center focus:outline-none"
                    >
                      {/* Building wrapper */}
                      <div className="relative w-full aspect-[5/4] transition-transform duration-300 group-hover:-translate-y-1">
                        {/* Pitched overhanging roof */}
                        <div className="absolute -top-2 -left-3 -right-3 h-7 z-20">
                          <div
                            className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] shadow-md"
                            style={{ clipPath: "polygon(3% 100%, 50% 0%, 97% 100%)" }}
                          />
                          <div className="absolute inset-x-2 top-[18px] h-1.5 bg-[#0f0f0f] rounded-sm shadow-sm" />
                        </div>

                        {/* Building body */}
                        <div className="absolute inset-x-0 top-4 bottom-3 rounded-[2px] border-[3px] border-[#1f1f1f] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.35)] overflow-hidden bg-[#e8e1c4] group-hover:border-primary transition-colors">
                          {/* Corrugated vertical siding texture */}
                          <div
                            className="absolute inset-0 opacity-70 pointer-events-none"
                            style={{
                              backgroundImage:
                                "repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 5px, rgba(255,255,255,0.45) 5px, rgba(255,255,255,0.45) 6px, transparent 6px, transparent 10px)",
                            }}
                          />
                          {/* Inter-floor dark band */}
                          {floors > 1 && Array.from({ length: floors - 1 }).map((_, i) => (
                            <div
                              key={i}
                              className="absolute left-0 right-0 h-[3px] bg-[#1f1f1f] z-10"
                              style={{ top: `${((i + 1) / floors) * 100}%` }}
                            />
                          ))}
                          {/* Bottom plinth */}
                          <div className="absolute left-0 right-0 bottom-0 h-1.5 bg-[#1f1f1f]" />

                          {/* Windows + door slot */}
                          <div className="absolute inset-0 flex flex-col">
                            {Array.from({ length: floors }).map((_, fIdx) => (
                              <div key={fIdx} className="flex-1 flex items-center px-3 gap-1.5 relative">
                                {Array.from({ length: roomsPerFloor }).map((__, wIdx) => {
                                  const isDoor = wIdx === roomsPerFloor - 1;
                                  if (isDoor) {
                                    return (
                                      <span
                                        key={wIdx}
                                        className="ml-auto h-[60%] w-[9%] bg-[#0f0f0f] rounded-[1px] border border-[#0a0a0a] shadow-inner"
                                      />
                                    );
                                  }
                                  const isLit = lit++ < litWindows;
                                  return (
                                    <span
                                      key={wIdx}
                                      className={`h-[55%] w-[7%] rounded-[1px] border border-[#1f1f1f] ${
                                        isLit
                                          ? "bg-amber-300 shadow-[inset_0_0_2px_rgba(0,0,0,0.4),0_0_5px_rgba(251,191,36,0.7)]"
                                          : "bg-[#1a1a1a]"
                                      }`}
                                    />
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* External staircase (right side, diagonal) */}
                        <div className="absolute right-0 bottom-3 h-full w-[28%] z-10 pointer-events-none">
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
                            {/* upper landing platform */}
                            {floors > 1 && (
                              <rect x="35" y={(1 / floors) * 100 - 1} width="55" height="2" fill="#1f1f1f" />
                            )}
                            {/* stair stringer */}
                            <polygon
                              points={`90,${(1 / floors) * 100} 30,98 90,98`}
                              fill="none"
                              stroke="#1f1f1f"
                              strokeWidth="1.5"
                            />
                            {/* steps */}
                            {Array.from({ length: 8 }).map((_, i) => {
                              const startY = (1 / floors) * 100;
                              const t = i / 8;
                              const x1 = 90 - (90 - 30) * t;
                              const y1 = startY + (98 - startY) * t;
                              return (
                                <line
                                  key={i}
                                  x1={x1 - 3}
                                  y1={y1}
                                  x2={x1 + 3}
                                  y2={y1}
                                  stroke="#1f1f1f"
                                  strokeWidth="1.2"
                                />
                              );
                            })}
                            {/* handrail */}
                            <line x1="30" y1={(1 / floors) * 100 - 8} x2="88" y2="88" stroke="#1f1f1f" strokeWidth="1" strokeDasharray="2,2" />
                            {/* handrail posts */}
                            <line x1="35" y1={(1 / floors) * 100 - 8} x2="35" y2={(1 / floors) * 100} stroke="#1f1f1f" strokeWidth="1" />
                            <line x1="88" y1="88" x2="88" y2="98" stroke="#1f1f1f" strokeWidth="1" />
                          </svg>
                        </div>

                        {/* Concrete pads under building */}
                        <div className="absolute -bottom-1 left-3 w-3 h-2 bg-[#c9c4b8] border border-[#1f1f1f] rounded-[1px]" />
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-[#c9c4b8] border border-[#1f1f1f] rounded-[1px]" />
                        <div className="absolute -bottom-1 right-[30%] w-3 h-2 bg-[#c9c4b8] border border-[#1f1f1f] rounded-[1px]" />
                        {/* Ground shadow */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[95%] h-3 bg-foreground/20 blur-md rounded-full" />
                      </div>

                      {/* Block label & meta */}
                      <div className="mt-5 w-full flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{block.name}</span>
                          <Badge variant="outline" className="capitalize text-[9px] px-1.5 py-0">{block.block_type}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{block.totalRooms} rooms</span>
                          <span className="text-border">•</span>
                          <span>{floors}F</span>
                          <span className="text-border">•</span>
                          <span><span className="font-bold text-primary">{block.totalOccupancy}</span>/{block.totalCapacity}</span>
                          <span className="text-border">•</span>
                          <span className="font-semibold text-foreground">{pct}%</span>
                        </div>
                        {block.supervisor_name && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">👤 {block.supervisor_name}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search rooms..." value={roomSearch} onChange={(e) => setRoomSearch(e.target.value)} />
                </div>
                <Select value={roomFilter} onValueChange={setRoomFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter size={14} className="mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="vacant">Available</SelectItem>
                    <SelectItem value="occupied">Full</SelectItem>
                    <SelectItem value="partially_occupied">Partial</SelectItem>
                    <SelectItem value="under_maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Legend: Room Types */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                  <span className="text-xs font-semibold text-foreground mr-1">Types:</span>
                  {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
                    <span key={key} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${style.badge}`}>{style.label}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-xs font-semibold text-foreground mr-1">Status:</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-foreground/20 border-2 border-foreground/40 inline-block" /> Occupied</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-muted border border-border inline-block" /> Available</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive/80 inline-block" /> Maintenance</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500/80 inline-block" /> Reserved</span>
                </div>
              </div>

              {filteredRooms.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No rooms found.</div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3">
                  {filteredRooms.map((room: any) => {
                    const catStyle = CATEGORY_STYLES[room.category] || DEFAULT_CAT_STYLE;
                    return (
                      <div
                        key={room.id}
                        onClick={() => handleRoomClick(room.id)}
                        className={`relative rounded-xl p-3 pt-8 pb-2 flex flex-col items-center cursor-pointer transition-all hover:shadow-md hover:scale-105 ${getRoomBoxClasses(room, selectedRoom === room.id)}`}
                      >
                        <span className={`absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${catStyle.badge}`}>
                          {catStyle.label}
                        </span>
                        <span className="text-sm font-bold text-foreground">{room.room_number}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 text-center leading-tight">
                          {getRoomCategoryLabel(room.category)}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5">
                          {room.current_occupancy}/{room.max_capacity} beds
                        </span>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded mt-1 ${roomStatusBadge[room.status] || ""}`}>
                          {roomStatusLabel[room.status] || room.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>
        {/* ═══════ INMATES TAB ═══════ */}
        <TabsContent value="inmates" className="mt-6">
          <CampInmatesTab campId={campId!} campName={camp?.name} />
        </TabsContent>

        {/* ═══════ STAFF TAB (Admin Only) ═══════ */}
        {isAdmin && (
          <TabsContent value="staff" className="mt-6">
            <CampStaffTab campId={campId!} />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      {editCampOpen && (
        <AddCampDialog open={editCampOpen} onOpenChange={setEditCampOpen} editCamp={camp as any} />
      )}
      {addBlockOpen && campId && (
        <AddBlockDialog open={addBlockOpen} onOpenChange={setAddBlockOpen} campId={campId} />
      )}
      {addRoomOpen && campId && selectedBlock && selectedBlockData && (
        <AddRoomDialog
          open={addRoomOpen}
          onOpenChange={setAddRoomOpen}
          campId={campId}
          blockId={selectedBlock}
          blockName={selectedBlockData.name}
        />
      )}

      {/* Room Allocation Panel */}
      {showAllocation && selectedRoom && campId && (
        <RoomAllocationPanel
          roomId={selectedRoom}
          campId={campId}
          onClose={() => { setShowAllocation(false); setSelectedRoom(null); }}
          onSuccess={() => refetchRooms()}
        />
      )}
      {/* Check In / Check Out Sheets */}
      {campId && (
        <>
          <CheckInOutSheet
            campId={campId}
            mode="checkin"
            open={checkInOpen}
            onOpenChange={setCheckInOpen}
            onSuccess={() => refetchRooms()}
          />
          <CheckInOutSheet
            campId={campId}
            mode="checkout"
            open={checkOutOpen}
            onOpenChange={setCheckOutOpen}
            onSuccess={() => refetchRooms()}
          />
        </>
      )}

      {/* Room Rates Dialog */}
      {campId && camp && (
        <CampRoomRatesDialog
          open={ratesDialogOpen}
          onOpenChange={setRatesDialogOpen}
          campId={campId}
          campName={camp.name}
        />
      )}

      {/* Bulk Room Upload Dialog */}
      {campId && camp && (
        <BulkRoomUploadDialog
          open={bulkRoomOpen}
          onOpenChange={setBulkRoomOpen}
          campId={campId}
          campName={camp.name}
          blocks={blocks.map((b: any) => ({ id: b.id, name: b.name, block_code: b.block_code }))}
        />
      )}
      <ChartDrilldown selection={chartSelection} onClose={() => setChartSelection(null)} />
    </div>
  );
}
