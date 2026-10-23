import { prepareCheckInReceipt } from "@/lib/checkInReport";
import { useState } from "react";
import { X, History, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";

interface Props {
  roomId: string;
  campId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RoomAllocationPanel({ roomId, campId, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: room } = useQuery({
    queryKey: ["room-detail", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*, buildings:building_id(name)")
        .eq("id", roomId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-allocation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, employee_id, company")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: currentOccupants = [], refetch: refetchOccupants } = useQuery({
    queryKey: ["room-occupants", roomId],
    queryFn: async () => {
      const { data: checkIns, error: ciError } = await supabase
        .from("check_ins")
        .select("employee_id, check_in_date")
        .eq("room_id", roomId)
        .order("check_in_date", { ascending: false });
      if (ciError) throw ciError;

      const { data: checkOuts, error: coError } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .eq("room_id", roomId)
        .order("check_out_date", { ascending: false });
      if (coError) throw coError;

      const latestCheckOut = new Map<string, string>();
      (checkOuts || []).forEach(co => {
        if (!latestCheckOut.has(co.employee_id)) {
          latestCheckOut.set(co.employee_id, co.check_out_date);
        }
      });

      const activeMap = new Map<string, string>();
      (checkIns || []).forEach(ci => {
        if (activeMap.has(ci.employee_id)) return;
        const lastOut = latestCheckOut.get(ci.employee_id);
        if (!lastOut || new Date(ci.check_in_date) > new Date(lastOut)) {
          activeMap.set(ci.employee_id, ci.check_in_date);
        }
      });

      if (activeMap.size === 0) return [];

      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, name, employee_id, company, supplier_name, designation, project")
        .in("id", [...activeMap.keys()]);
      if (empError) throw empError;
      return (empData || []).map((e: any) => ({ ...e, check_in_date: activeMap.get(e.id) }));
    },
  });

  // Room history: past occupants
  const { data: historyData = [], isLoading: historyLoading } = useQuery({
    queryKey: ["room-history-panel", roomId, campId],
    enabled: showHistory,
    queryFn: async () => {
      const { data: checkOuts, error: coErr } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .eq("room_id", roomId)
        .eq("camp_id", campId)
        .order("check_out_date", { ascending: false });
      if (coErr) throw coErr;
      if (!checkOuts || checkOuts.length === 0) return [];

      const { data: checkIns, error: ciErr } = await supabase
        .from("check_ins")
        .select("employee_id, check_in_date")
        .eq("room_id", roomId)
        .eq("camp_id", campId)
        .order("check_in_date", { ascending: false });
      if (ciErr) throw ciErr;

      const checkInsByEmp = new Map<string, string[]>();
      (checkIns || []).forEach(ci => {
        if (!checkInsByEmp.has(ci.employee_id)) checkInsByEmp.set(ci.employee_id, []);
        checkInsByEmp.get(ci.employee_id)!.push(ci.check_in_date);
      });

      const empIds = new Set<string>();
      const entries: Array<{ employee_id: string; check_in_date: string; check_out_date: string; days: number }> = [];

      checkOuts.forEach(co => {
        empIds.add(co.employee_id);
        const empCIs = checkInsByEmp.get(co.employee_id) || [];
        const matched = empCIs.find(d => new Date(d) <= new Date(co.check_out_date));
        const ciDate = matched || co.check_out_date;
        entries.push({
          employee_id: co.employee_id,
          check_in_date: ciDate,
          check_out_date: co.check_out_date,
          days: Math.max(differenceInDays(new Date(co.check_out_date), new Date(ciDate)), 1),
        });
      });

      if (empIds.size === 0) return [];

      const { data: emps, error: empErr } = await supabase
        .from("employees")
        .select("id, name, employee_id, designation, supplier_name, company, project")
        .in("id", [...empIds]);
      if (empErr) throw empErr;

      const empMap = new Map((emps || []).map((e: any) => [e.id, e]));
      return entries.map(e => ({ ...e, ...(empMap.get(e.employee_id) || { name: "Unknown", employee_id: "" }) }));
    },
  });

  const handleCheckIn = async () => {
    if (!selectedEmployee || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("perform_check_in", {
        p_employee_id: selectedEmployee,
        p_room_id: roomId,
        p_camp_id: campId,
        p_performed_by: user.id,
      });
      if (error) throw error;
      toast({ title: "Check-in successful" });
      await prepareCheckInReceipt([selectedEmployee], campId);
      setSelectedEmployee("");
      refetchOccupants();
      onSuccess();
    } catch (e: any) {
      toast({ title: "Check-in failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleCheckOut = async (employeeId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("perform_check_out", {
        p_employee_id: employeeId,
        p_room_id: roomId,
        p_camp_id: campId,
        p_performed_by: user.id,
      });
      if (error) throw error;
      toast({ title: "Check-out successful" });
      refetchOccupants();
      onSuccess();
    } catch (e: any) {
      toast({ title: "Check-out failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const buildingName = (room as any)?.buildings?.name || "";
  const roomLabel = `${buildingName} / ${room?.room_number || ""}`;
  const occupancy = room ? `${room.current_occupancy} / ${room.max_capacity}` : "—";

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-card border-l shadow-xl z-50 overflow-y-auto">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Room – {room?.room_number}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Room Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Building</span>
            <span className="font-medium">{buildingName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Floor</span>
            <span className="font-medium">{room?.floor}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span className="font-medium">{room?.category?.replace("_", " ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={`font-medium capitalize ${
              room?.status === "vacant" ? "text-green-600 dark:text-green-400" :
              room?.status === "occupied" ? "text-primary" :
              "text-destructive"
            }`}>{room?.status?.replace("_", " ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Occupancy</span>
            <span className="font-medium">{occupancy}</span>
          </div>
        </div>

        {/* Current Occupants */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Current Occupants</h3>
          {currentOccupants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No occupants</p>
          ) : (
            <div className="space-y-2">
              {currentOccupants.map((emp: any) => (
                <div key={emp.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.employee_id}
                      {emp.company && <> · {emp.company}</>}
                      {emp.supplier_name && <> · {emp.supplier_name}</>}
                    </p>
                    {emp.check_in_date && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Since {format(new Date(emp.check_in_date), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCheckOut(emp.id)}
                    disabled={loading}
                    className="ml-2 shrink-0"
                  >
                    Check Out
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Room History */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-sm font-semibold hover:text-primary transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <History size={14} className="text-muted-foreground" />
              Room History
              {historyData.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{historyData.length}</Badge>
              )}
            </span>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-0 border rounded-lg divide-y max-h-64 overflow-y-auto">
              {historyLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading history...</p>
              ) : historyData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No previous occupants</p>
              ) : (
                historyData.map((entry: any, idx: number) => (
                  <div key={`${entry.employee_id}-${entry.check_out_date}-${idx}`} className="px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{entry.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.employee_id}
                          {entry.designation && <> · {entry.designation}</>}
                          {entry.supplier_name && <> · {entry.supplier_name}</>}
                          {entry.project && <> · {entry.project}</>}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                        <Clock size={10} />
                        {entry.days}d
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar size={10} className="text-green-500" />
                        {format(new Date(entry.check_in_date), "dd MMM yy")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar size={10} className="text-destructive" />
                        {format(new Date(entry.check_out_date), "dd MMM yy")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Allocate / Check In */}
        {room?.status !== "under_maintenance" && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold">Allocate Room</h3>
            <div className="space-y-1.5">
              <Label>Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Room Number</Label>
              <input
                value={`${buildingName ? buildingName + ' / ' : ''}${room?.room_number || ''}`}
                readOnly
                className="w-full border rounded-lg px-3 py-2 text-sm bg-muted/30 cursor-default outline-none"
              />
              <p className="text-[10px] text-muted-foreground">
                {room?.category?.replace("_", " ")} · {room?.current_occupancy}/{room?.max_capacity} occupied
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleCheckIn}
              disabled={!selectedEmployee || loading}
            >
              {loading ? "Processing..." : "Check In Employee"}
            </Button>
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">Room Selected</p>
              <p className="font-bold text-foreground">{roomLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
