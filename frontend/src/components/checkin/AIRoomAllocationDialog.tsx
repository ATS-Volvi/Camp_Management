import { prepareCheckInReceipt } from "@/lib/checkInReport";
import { useState, useMemo } from "react";
import { Sparkles, AlertTriangle, CheckCircle2, Edit3, X, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import CheckInConfirmDialog from "@/components/checkin/CheckInConfirmDialog";
import { useRoomCategoryMaster, useDesignationMapping, getAllowedCategoryKeys } from "@/hooks/useRoomCategoryMaster";

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  designation: string | null;
  is_blacklisted?: boolean;
}

interface Room {
  id: string;
  room_number: string;
  category: string;
  current_occupancy: number;
  max_capacity: number;
  status: string;
  buildings?: { name: string } | null;
}

interface Allocation {
  employee: Employee;
  roomId: string | null;
  status: "auto" | "manual" | "unallocated";
  reason?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  rooms: Room[];
  campId: string;
  onSuccess: () => void;
}

function computeAllocations(
  employees: Employee[],
  rooms: Room[],
  mappings: { designation: string; room_category_code: string }[],
  categories: { code: string; category_key: string | null }[]
): Allocation[] {
  // Build a mutable capacity tracker
  const capacityMap = new Map<string, { remaining: number }>();
  rooms.forEach(r => {
    if (r.status !== "under_maintenance") {
      capacityMap.set(r.id, { remaining: r.max_capacity - r.current_occupancy });
    }
  });

  const allocations: Allocation[] = [];

  for (const emp of employees) {
    if (emp.is_blacklisted) {
      allocations.push({ employee: emp, roomId: null, status: "unallocated", reason: "Employee is blacklisted" });
      continue;
    }

    const allowedKeys = getAllowedCategoryKeys(emp.designation, mappings as any, categories as any);
    const hasMapping = !!emp.designation && mappings.some(m => m.designation.toLowerCase() === emp.designation!.toLowerCase());

    const available = rooms.filter(r => {
      const cap = capacityMap.get(r.id);
      return cap && cap.remaining > 0 && r.status !== "under_maintenance";
    });

    // Priority 1: vacant rooms within mapped categories (only if mapping exists)
    const eligibleVacant = hasMapping
      ? available.filter(r => allowedKeys.has(r.category) && (capacityMap.get(r.id)!.remaining === r.max_capacity))
      : [];
    // Priority 2: any room within mapped categories with capacity
    const eligibleAny = hasMapping
      ? available.filter(r => allowedKeys.has(r.category))
      : [];

    const pools = hasMapping ? [eligibleVacant, eligibleAny] : [available];

    let assigned = false;
    for (const pool of pools) {
      const sorted = [...pool].sort((a, b) => {
        // Prefer fewest remaining beds first to fill rooms; vacant pool already filtered
        const ra = capacityMap.get(a.id)!.remaining;
        const rb = capacityMap.get(b.id)!.remaining;
        return ra - rb;
      });
      for (const room of sorted) {
        const cap = capacityMap.get(room.id);
        if (cap && cap.remaining > 0) {
          cap.remaining -= 1;
          allocations.push({ employee: emp, roomId: room.id, status: "auto" });
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }

    if (!assigned) {
      const reason = hasMapping
        ? "No room available in mapped categories — please assign manually"
        : "No suitable rooms available";
      allocations.push({ employee: emp, roomId: null, status: "unallocated", reason });
    }
  }

  return allocations;
}

export default function AIRoomAllocationDialog({ open, onOpenChange, employees, rooms, campId, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [computed, setComputed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data: catMaster = [] } = useRoomCategoryMaster();
  const { data: desigMappings = [] } = useDesignationMapping();


  // Fetch camp info for the confirm dialog
  const { data: campData } = useQuery({
    queryKey: ["camp-for-confirm", campId],
    queryFn: async () => {
      const { data } = await supabase.from("camps").select("id, name, location").eq("id", campId).maybeSingle();
      return data;
    },
    enabled: !!campId,
  });

  const availableRooms = useMemo(() => 
    rooms.filter(r => r.current_occupancy < r.max_capacity && r.status !== "under_maintenance"),
    [rooms]
  );

  const roomMap = useMemo(() => {
    const m = new Map<string, Room>();
    rooms.forEach(r => m.set(r.id, r));
    return m;
  }, [rooms]);

  const handleCompute = () => {
    const result = computeAllocations(employees, rooms, desigMappings, catMaster);
    setAllocations(result);
    setComputed(true);
  };

  const handleRoomChange = (empId: string, roomId: string) => {
    setAllocations(prev => prev.map(a =>
      a.employee.id === empId
        ? { ...a, roomId: roomId || null, status: roomId ? "manual" : "unallocated", reason: roomId ? undefined : "No room selected" }
        : a
    ));
  };

  const allocatedCount = allocations.filter(a => a.roomId).length;
  const unallocatedCount = allocations.filter(a => !a.roomId).length;

  // Group allocations by room for the confirm dialog
  const confirmRoomId = useMemo(() => {
    const allocated = allocations.filter(a => a.roomId);
    if (allocated.length === 0) return null;
    // Use the first room as representative (multi-room allocations show in bulk list)
    const roomIds = new Set(allocated.map(a => a.roomId!));
    return roomIds.size === 1 ? allocated[0].roomId : allocated[0].roomId;
  }, [allocations]);

  const confirmRoom = confirmRoomId ? roomMap.get(confirmRoomId) : null;

  const handleShowConfirm = () => {
    const toProcess = allocations.filter(a => a.roomId);
    if (toProcess.length === 0) {
      toast({ title: "No allocations to process", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    const toProcess = allocations.filter(a => a.roomId);
    if (toProcess.length === 0) return;

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const successfulIds: string[] = [];
    let success = 0, failed = 0;
    for (const alloc of toProcess) {
      try {
        const { error } = await supabase.rpc("perform_check_in", {
          p_employee_id: alloc.employee.id,
          p_room_id: alloc.roomId || "",
          p_camp_id: campId,
          p_performed_by: user.id,
        });
        if (error) { failed++; } else { success++; successfulIds.push(alloc.employee.id); }
      } catch { failed++; }
    }

    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["recent-check-ins"] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["checked-in-employees"] });

    toast({
      title: "Bulk AI check-in complete",
      description: `${success} succeeded, ${failed} failed${unallocatedCount > 0 ? `, ${unallocatedCount} skipped (no room)` : ""}`,
      variant: failed > 0 ? "destructive" : "default",
    });

    await prepareCheckInReceipt(successfulIds, campId);
    queryClient.invalidateQueries({ queryKey: ["report-check-ins"] });
    setSubmitting(false);
    setConfirmOpen(false);
    setComputed(false);
    setAllocations([]);
    onOpenChange(false);
    onSuccess();
  };

  const handleClose = () => {
    setComputed(false);
    setAllocations([]);
    setConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" size={20} />
            AI Smart Room Allocation
          </DialogTitle>
          <DialogDescription>
            Automatically assigns the best available room per employee based on their designation. Override manually where needed.
          </DialogDescription>
        </DialogHeader>

        {!computed ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Zap size={32} className="text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">{employees.length} employees selected</p>
              <p className="text-sm text-muted-foreground">{availableRooms.length} rooms available across {new Set(availableRooms.map(r => r.category)).size} categories</p>
            </div>
            <Button onClick={handleCompute} size="lg" className="gap-2">
              <Sparkles size={16} /> Run AI Allocation
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Summary */}
            <div className="flex gap-3">
              <div className="flex-1 bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">{allocatedCount}</p>
                <p className="text-xs text-muted-foreground">Allocated</p>
              </div>
              <div className={`flex-1 rounded-lg p-3 text-center border ${unallocatedCount > 0 ? "bg-destructive/5 border-destructive/20" : "bg-muted border-border"}`}>
                <p className={`text-2xl font-bold ${unallocatedCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>{unallocatedCount}</p>
                <p className="text-xs text-muted-foreground">Need Manual Assignment</p>
              </div>
            </div>

            {/* Allocation List */}
            <div className="flex-1 overflow-y-auto border rounded-lg divide-y">
              {allocations.map((alloc) => {
                const room = alloc.roomId ? roomMap.get(alloc.roomId) : null;
                return (
                  <div key={alloc.employee.id} className={`flex items-center gap-3 px-4 py-3 ${!alloc.roomId ? "bg-destructive/5" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alloc.employee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {alloc.employee.employee_id} · {alloc.employee.designation || "No designation"}
                      </p>
                    </div>

                    <div className="shrink-0 w-[260px]">
                      {alloc.roomId && alloc.status === "auto" ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
                            <CheckCircle2 size={12} /> {room?.room_number} · {getRoomCategoryLabel(room?.category || "")}
                          </Badge>
                          <button
                            onClick={() => handleRoomChange(alloc.employee.id, "")}
                            className="p-1 hover:bg-muted rounded"
                            title="Change room"
                          >
                            <Edit3 size={12} className="text-muted-foreground" />
                          </button>
                        </div>
                      ) : (
                        <Select
                          value={alloc.roomId || ""}
                          onValueChange={(v) => handleRoomChange(alloc.employee.id, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select room manually..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRooms.map(r => (
                              <SelectItem key={r.id} value={r.id} className="text-xs">
                                {r.room_number} · {getRoomCategoryLabel(r.category)} ({r.current_occupancy}/{r.max_capacity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {!alloc.roomId && (
                      <AlertTriangle size={16} className="text-destructive shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
              <Button onClick={handleShowConfirm} disabled={submitting || allocatedCount === 0} className="gap-2">
                {submitting ? "Processing..." : `Check In ${allocatedCount} Employees`}
              </Button>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        <CheckInConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={handleConfirmedSubmit}
          isSubmitting={submitting}
          employee={null}
          room={confirmRoom ? { ...confirmRoom, ac: true, attached_bathroom: false, floor: 1 } as any : null}
          camp={campData as any}
          bulkEmployees={allocations.filter(a => a.roomId).map(a => ({
            id: a.employee.id,
            name: a.employee.name,
            employee_id: a.employee.employee_id,
            designation: a.employee.designation,
            roomAssigned: roomMap.get(a.roomId!)?.room_number,
          }))}
        />
      </DialogContent>
    </Dialog>
  );
}
