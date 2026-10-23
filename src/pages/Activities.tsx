import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Activity, LogIn, LogOut, Wrench, Search, LayoutGrid, Film, FileText } from "lucide-react";
import ActivityReelFeed from "@/components/activities/ActivityReelFeed";
import type { ActivityItem } from "@/components/activities/ActivityReelCard";
import CheckoutReportDialog from "@/components/activities/CheckoutReportDialog";

export default function Activities() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "reels">("table");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const { data: checkIns = [], isLoading: loadingCI } = useQuery({
    queryKey: ["activities-checkins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("check_ins")
        .select("*, employees(name, employee_id), rooms(room_number), camps(name)")
        .order("check_in_date", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: checkOuts = [], isLoading: loadingCO } = useQuery({
    queryKey: ["activities-checkouts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("check_outs")
        .select("*, employees(name, employee_id), rooms(room_number), camps(name)")
        .order("check_out_date", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: tickets = [], isLoading: loadingT } = useQuery({
    queryKey: ["activities-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("maintenance_tickets")
        .select("*, rooms(room_number), camps(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: checkoutReports = [] } = useQuery({
    queryKey: ["checkout-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("checkout_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const reportByCheckoutId = new Map(
    checkoutReports.map((r: any) => [r.check_out_id, r])
  );

  const openReport = (checkOutId: string) => {
    const report = reportByCheckoutId.get(checkOutId);
    if (report) {
      setSelectedReport(report);
      setReportDialogOpen(true);
    }
  };

  const isLoading = loadingCI || loadingCO || loadingT;

  const allActivities: ActivityItem[] = [
    ...checkIns.map((ci: any) => ({
      id: ci.id,
      type: "check_in" as const,
      date: ci.check_in_date,
      description: `${ci.employees?.name || "Employee"} checked in`,
      camp: ci.camps?.name || "—",
      detail: `Room ${ci.rooms?.room_number || "—"} • ID: ${ci.employees?.employee_id || "—"}`,
      badge: "Check In",
      employeeName: ci.employees?.name,
      roomNumber: ci.rooms?.room_number,
    })),
    ...checkOuts.map((co: any) => ({
      id: co.id,
      type: "check_out" as const,
      date: co.check_out_date,
      description: `${co.employees?.name || "Employee"} checked out`,
      camp: co.camps?.name || "—",
      detail: `Room ${co.rooms?.room_number || "—"}${co.damage_remarks ? " • Damage noted" : ""}`,
      badge: "Check Out",
      employeeName: co.employees?.name,
      roomNumber: co.rooms?.room_number,
    })),
    ...tickets.map((t: any) => ({
      id: t.id,
      type: "maintenance" as const,
      date: t.created_at,
      description: `${t.category}: ${t.description.slice(0, 60)}`,
      camp: t.camps?.name || "—",
      detail: `Room ${t.rooms?.room_number || "—"} • ${t.priority} priority`,
      badge: t.status === "completed" ? "Resolved" : t.status === "in_progress" ? "In Progress" : "Open",
      roomNumber: t.rooms?.room_number,
    })),
  ];

  allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = allActivities.filter((a) => {
    if (tab === "check_in" && a.type !== "check_in") return false;
    if (tab === "check_out" && a.type !== "check_out") return false;
    if (tab === "maintenance" && a.type !== "maintenance") return false;
    if (search && !a.description.toLowerCase().includes(search.toLowerCase()) && !a.camp.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const badgeVariant = (type: string) => {
    if (type === "check_in") return "default";
    if (type === "check_out") return "secondary";
    return "outline";
  };

  const typeIcon = (type: string) => {
    if (type === "check_in") return <LogIn size={14} className="text-green-600" />;
    if (type === "check_out") return <LogOut size={14} className="text-orange-600" />;
    return <Wrench size={14} className="text-blue-600" />;
  };

  // Reels view
  if (viewMode === "reels") {
    return (
      <div className="space-y-3 h-[calc(100vh-6rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Activity size={24} /> Activity Feed
            </h1>
            <p className="text-sm text-muted-foreground">Swipe through activities like reels</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
                <TabsTrigger value="check_in" className="text-xs px-2">In</TabsTrigger>
                <TabsTrigger value="check_out" className="text-xs px-2">Out</TabsTrigger>
                <TabsTrigger value="maintenance" className="text-xs px-2">Fix</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewMode("table")}>
              <LayoutGrid size={16} />
            </Button>
          </div>
        </div>

        {/* Reels feed */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ActivityReelFeed activities={filtered.slice(0, 50)} />
          )}
        </div>
      </div>
    );
  }

  // Table view (original)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity size={24} /> Activities
          </h1>
          <p className="text-sm text-muted-foreground">Track all check-ins, check-outs, and maintenance activities across camps.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setViewMode("reels")}>
          <Film size={16} />
          Reels View
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <LogIn size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{checkIns.length}</p>
              <p className="text-xs text-muted-foreground">Recent Check-Ins</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <LogOut size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{checkOuts.length}</p>
              <p className="text-xs text-muted-foreground">Recent Check-Outs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Wrench size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tickets.length}</p>
              <p className="text-xs text-muted-foreground">Maintenance Tickets</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">All ({allActivities.length})</TabsTrigger>
                <TabsTrigger value="check_in">Check-Ins</TabsTrigger>
                <TabsTrigger value="check_out">Check-Outs</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search activities..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4 px-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading activities...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activities found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Camp</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead className="text-right">Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((a) => (
                  <TableRow key={a.id} className={a.type === "check_out" && reportByCheckoutId.has(a.id) ? "cursor-pointer hover:bg-muted/50" : ""}>
                    <TableCell>{typeIcon(a.type)}</TableCell>
                    <TableCell className="font-medium text-sm">{a.description}</TableCell>
                    <TableCell className="text-sm">{a.camp}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.detail}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(a.type)} className="text-xs">{a.badge}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.type === "check_out" && reportByCheckoutId.has(a.id) && (
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openReport(a.id)}>
                          <FileText size={12} />
                          View
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(a.date), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CheckoutReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        report={selectedReport}
      />
    </div>
  );
}
