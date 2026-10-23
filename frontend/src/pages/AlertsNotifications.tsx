import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { Bell, AlertTriangle, Package, Users, Wrench, BedDouble } from "lucide-react";

export default function AlertsNotifications() {
  // Low inventory alerts
  const { data: lowInventory = [] } = useQuery({
    queryKey: ["alerts-inventory"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory")
        .select("*, camps(name)")
        .order("balance", { ascending: true })
        .limit(200);
      return (data || []).filter((i: any) => (i.balance ?? 0) <= i.min_alert_level);
    },
  });

  // Open / high-priority maintenance tickets
  const { data: urgentTickets = [] } = useQuery({
    queryKey: ["alerts-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("maintenance_tickets")
        .select("*, rooms(room_number), camps(name)")
        .in("status", ["open", "in_progress"])
        .in("priority", ["high", "emergency"])
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Rooms at or near full capacity
  const { data: fullRooms = [] } = useQuery({
    queryKey: ["alerts-full-rooms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*, buildings(name), camps(name)")
        .in("status", ["occupied"])
        .order("current_occupancy", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Expiring contracts (within 30 days)
  const { data: expiringContracts = [] } = useQuery({
    queryKey: ["alerts-contracts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .not("contract_end_date", "is", null)
        .eq("status", "active")
        .order("contract_end_date", { ascending: true })
        .limit(200);
      return (data || []).filter((e: any) => {
        const days = differenceInDays(new Date(e.contract_end_date), new Date());
        return days >= 0 && days <= 30;
      });
    },
  });

  // Blacklisted employees still active
  const { data: blacklisted = [] } = useQuery({
    queryKey: ["alerts-blacklisted"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .eq("is_blacklisted", true)
        .eq("status", "active")
        .limit(50);
      return data || [];
    },
  });

  const totalAlerts = lowInventory.length + urgentTickets.length + fullRooms.length + expiringContracts.length + blacklisted.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell size={24} /> Alerts & Notifications
        </h1>
        <p className="text-sm text-muted-foreground">System-wide alerts for inventory, maintenance, capacity, and workforce issues.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="pt-3 pb-2 text-center">
            <Package size={18} className="mx-auto text-red-500 mb-1" />
            <p className="text-xl font-bold">{lowInventory.length}</p>
            <p className="text-[11px] text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-3 pb-2 text-center">
            <Wrench size={18} className="mx-auto text-orange-500 mb-1" />
            <p className="text-xl font-bold">{urgentTickets.length}</p>
            <p className="text-[11px] text-muted-foreground">Urgent Tickets</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-3 pb-2 text-center">
            <BedDouble size={18} className="mx-auto text-yellow-600 mb-1" />
            <p className="text-xl font-bold">{fullRooms.length}</p>
            <p className="text-[11px] text-muted-foreground">Full Rooms</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-3 pb-2 text-center">
            <Users size={18} className="mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-bold">{expiringContracts.length}</p>
            <p className="text-[11px] text-muted-foreground">Expiring Contracts</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-3 pb-2 text-center">
            <AlertTriangle size={18} className="mx-auto text-destructive mb-1" />
            <p className="text-xl font-bold">{blacklisted.length}</p>
            <p className="text-[11px] text-muted-foreground">Blacklisted Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Inventory */}
      {lowInventory.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package size={16} className="text-red-500" /> Low Inventory Items
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Camp</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Min Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowInventory.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                    <TableCell className="text-sm">{item.category}</TableCell>
                    <TableCell className="text-sm">{item.camps?.name || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="text-xs">{item.balance ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{item.min_alert_level}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Urgent Maintenance */}
      {urgentTickets.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench size={16} className="text-orange-500" /> Urgent Maintenance Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Camp</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Reported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urgentTickets.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">{t.description}</TableCell>
                    <TableCell className="text-sm">{t.camps?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{t.rooms?.room_number || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.priority === "emergency" ? "destructive" : "outline"} className="text-xs capitalize">{t.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(t.created_at), "dd MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Expiring Contracts */}
      {expiringContracts.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={16} className="text-blue-500" /> Contracts Expiring Within 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Expires</TableHead>
                  <TableHead className="text-right">Days Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringContracts.map((e: any) => {
                  const daysLeft = differenceInDays(new Date(e.contract_end_date), new Date());
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-sm">{e.name}</TableCell>
                      <TableCell className="text-sm">{e.employee_id}</TableCell>
                      <TableCell className="text-sm">{e.designation || "—"}</TableCell>
                      <TableCell className="text-sm">{e.company || "—"}</TableCell>
                      <TableCell className="text-right text-sm">{format(new Date(e.contract_end_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"} className="text-xs">{daysLeft}d</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Full Rooms */}
      {fullRooms.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BedDouble size={16} className="text-yellow-600" /> Rooms at Full Capacity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Camp</TableHead>
                  <TableHead className="text-right">Occupancy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fullRooms.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.room_number}</TableCell>
                    <TableCell className="text-sm">{r.buildings?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{r.camps?.name || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{r.current_occupancy}/{r.max_capacity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Blacklisted */}
      {blacklisted.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" /> Blacklisted Employees (Still Active)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklisted.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.name}</TableCell>
                    <TableCell className="text-sm">{e.employee_id}</TableCell>
                    <TableCell className="text-sm">{e.company || "—"}</TableCell>
                    <TableCell><Badge variant="destructive" className="text-xs">Blacklisted</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalAlerts === 0 && (
        <Card className="border shadow-sm">
          <CardContent className="py-12 text-center">
            <Bell size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No active alerts. Everything looks good!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
