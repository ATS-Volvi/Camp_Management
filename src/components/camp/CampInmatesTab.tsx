import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, LogOut, MessageCircle, Phone, Upload } from "lucide-react";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import CampBulkUploadDialog from "@/components/camp/CampBulkUploadDialog";
import InmateCheckoutDialog from "@/components/camp/InmateCheckoutDialog";
import PresenceStatusCell from "@/components/employees/PresenceStatusCell";

interface Props {
  campId: string;
  campName?: string;
}

export default function CampInmatesTab({ campId, campName }: Props) {
  const [search, setSearch] = useState("");
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedInmate, setSelectedInmate] = useState<any>(null);

  // Fetch all checked-in employees for this camp
  const { data: inmates = [], isLoading } = useQuery({
    queryKey: ["camp-inmates", campId],
    queryFn: async () => {
      // Get all check-ins for this camp
      const { data: checkIns, error: ciErr } = await supabase
        .from("check_ins")
        .select("employee_id, room_id, check_in_date")
        .eq("camp_id", campId)
        .order("check_in_date", { ascending: false });
      if (ciErr) throw ciErr;

      // Get all check-outs for this camp
      const { data: checkOuts, error: coErr } = await supabase
        .from("check_outs")
        .select("employee_id, room_id, check_out_date")
        .eq("camp_id", campId);
      if (coErr) throw coErr;

      // Build a per-(employee, room) latest check-out lookup so a check-out from
      // one room never accidentally cancels an active check-in in a different room.
      const latestCheckOutByPair = new Map<string, string>();
      (checkOuts || []).forEach(co => {
        const key = `${co.employee_id}|${co.room_id}`;
        const existing = latestCheckOutByPair.get(key);
        if (!existing || new Date(co.check_out_date) > new Date(existing)) {
          latestCheckOutByPair.set(key, co.check_out_date);
        }
      });

      // Active = latest check-in for an (employee, room) pair has no later check-out
      // for the same pair. Then dedupe to keep the most recent active stay per employee.
      const empMap = new Map<string, { room_id: string; check_in_date: string }>();
      (checkIns || []).forEach(ci => {
        const key = `${ci.employee_id}|${ci.room_id}`;
        const lastOut = latestCheckOutByPair.get(key);
        const isActive = !lastOut || new Date(ci.check_in_date) > new Date(lastOut);
        if (!isActive) return;
        if (empMap.has(ci.employee_id)) return;
        empMap.set(ci.employee_id, { room_id: ci.room_id, check_in_date: ci.check_in_date });
      });

      if (empMap.size === 0) return [];

      const empIds = [...empMap.keys()];
      const roomIds = [...new Set([...empMap.values()].map(v => v.room_id))];

      const [empRes, roomRes] = await Promise.all([
        supabase.from("employees").select("*").in("id", empIds),
        supabase.from("rooms").select("id, room_number, category, daily_rate, daily_food_rate").in("id", roomIds),
      ]);

      if (empRes.error) throw empRes.error;
      if (roomRes.error) throw roomRes.error;

      const roomMap = new Map((roomRes.data || []).map(r => [r.id, r]));

      return (empRes.data || []).map(emp => {
        const ciData = empMap.get(emp.id)!;
        const room = roomMap.get(ciData.room_id);
        return {
          ...emp,
          check_in_date: ciData.check_in_date,
          room_id: ciData.room_id,
          room_number: room?.room_number || "—",
          room_category: room?.category || "—",
          daily_rate: room?.daily_rate || 0,
          daily_food_rate: room?.daily_food_rate || 0,
        };
      });
    },
    enabled: !!campId,
  });

  const handleCheckoutClick = (inmate: any) => {
    setSelectedInmate(inmate);
    setCheckoutDialogOpen(true);
  };

  const filtered = inmates.filter((i: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      i.name?.toLowerCase().includes(s) ||
      i.employee_id?.toLowerCase().includes(s) ||
      i.passport_number?.toLowerCase().includes(s) ||
      i.supplier_name?.toLowerCase().includes(s) ||
      i.project?.toLowerCase().includes(s) ||
      i.room_number?.toLowerCase().includes(s)
    );
  });

  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    return phone.replace(/[^0-9+]/g, "");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Inmates ({inmates.length})
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkUploadOpen(true)} className="gap-1.5">
            <Upload size={14} /> Bulk Upload
          </Button>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search name, ID, passport, supplier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm text-center py-8">Loading inmates...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No inmates found.</p>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Passport / Iqama</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Check-In Date</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Food</TableHead>
                <TableHead>Presence</TableHead>
                <TableHead className="text-right">Tariff/Day</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inmate: any, idx: number) => {
                const phone = formatPhone(inmate.phone);
                const waLink = phone
                  ? `https://wa.me/${phone.startsWith("+") ? phone.slice(1) : phone}`
                  : null;

                return (
                  <TableRow key={inmate.id}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {inmate.name}
                      <div className="text-xs text-muted-foreground">{inmate.employee_id}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {inmate.passport_number || inmate.iqama_number || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{inmate.project || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={inmate.employee_type === "own" ? "default" : "secondary"} className="text-xs">
                        {inmate.employee_type === "own" ? "Own" : inmate.supplier_name || "Supplier"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(inmate.check_in_date).toLocaleDateString("en-US", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{inmate.room_number}</TableCell>
                    <TableCell className="text-xs">
                      {getRoomCategoryLabel(inmate.room_category)}
                    </TableCell>
                    <TableCell>
                      {inmate.daily_food_rate > 0 ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                          Included
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Not Included
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <PresenceStatusCell employeeId={inmate.id} status={inmate.presence_status} />
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {(inmate.daily_rate + inmate.daily_food_rate).toFixed(0)} SAR
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {phone && (
                          <>
                            <a href={`tel:${phone}`} title="Call">
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Phone size={14} />
                              </Button>
                            </a>
                            {waLink && (
                              <a href={waLink} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600">
                                  <MessageCircle size={14} />
                                </Button>
                              </a>
                            )}
                          </>
                        )}
                        {!phone && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleCheckoutClick(inmate)}
                      >
                        <LogOut size={12} />
                        Check Out
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CampBulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        campId={campId}
        campName={campName || "Camp"}
      />

      <InmateCheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        inmate={selectedInmate}
        campId={campId}
        campName={campName || "Camp"}
      />
    </div>
  );
}
