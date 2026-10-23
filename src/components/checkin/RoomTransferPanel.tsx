import { useState, useMemo, useEffect } from "react";
import { ArrowRight, GripVertical, Users, AlertTriangle, History, Search, ShieldAlert, Inbox, Home, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCamps } from "@/hooks/useCheckInOut";
import { useBlocks, useRooms } from "@/hooks/useCampManagement";
import { useRoomOccupants, usePerformRoomTransfer, useRoomTransferHistory } from "@/hooks/useRoomTransfer";
import { supabase } from "@/integrations/supabase/client";
import { useMarkRequestFulfilled, type TransferRequestRow } from "@/hooks/useTransferRequests";
import { usePermissions } from "@/hooks/usePermissions";
import { getRoomCategoryLabel, getEligibleCategoriesForDesignation } from "@/constants/roomCategories";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TransferRouteGraphic from "@/components/checkin/TransferRouteGraphic";

interface RoomPickerProps {
  side: "from" | "to";
  campId: string;
  blockId: string;
  roomId: string;
  onCamp: (v: string) => void;
  onBlock: (v: string) => void;
  onRoom: (v: string) => void;
  excludeRoomId?: string;
}

function RoomPicker({ side, campId, blockId, roomId, onCamp, onBlock, onRoom, excludeRoomId }: RoomPickerProps) {
  const { data: camps = [] } = useCamps();
  const { data: blocks = [] } = useBlocks(campId);
  const { data: rooms = [] } = useRooms(campId, blockId);

  const filteredRooms = useMemo(() => {
    let list = rooms as any[];
    if (excludeRoomId) list = list.filter((r) => r.id !== excludeRoomId);
    if (side === "to") list = list.filter((r) => r.current_occupancy < r.max_capacity);
    if (side === "from") list = list.filter((r) => r.current_occupancy > 0);
    return list;
  }, [rooms, excludeRoomId, side]);

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        value={campId}
        onChange={(e) => { onCamp(e.target.value); onBlock(""); onRoom(""); }}
        className="col-span-3 sm:col-span-1 border rounded-lg px-2 py-1.5 text-xs bg-card"
      >
        <option value="">Camp...</option>
        {camps.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select
        value={blockId}
        onChange={(e) => { onBlock(e.target.value); onRoom(""); }}
        disabled={!campId}
        className="col-span-3 sm:col-span-1 border rounded-lg px-2 py-1.5 text-xs bg-card disabled:opacity-50"
      >
        <option value="">Block...</option>
        {blocks.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <select
        value={roomId}
        onChange={(e) => onRoom(e.target.value)}
        disabled={!blockId}
        className="col-span-3 sm:col-span-1 border rounded-lg px-2 py-1.5 text-xs bg-card disabled:opacity-50"
      >
        <option value="">Room...</option>
        {filteredRooms.map((r: any) => (
          <option key={r.id} value={r.id}>
            {r.room_number} ({r.current_occupancy}/{r.max_capacity})
          </option>
        ))}
      </select>
    </div>
  );
}

interface DropPayload {
  employee_id: string;
  from_room_id: string;
  from_camp_id: string;
}

interface PanelProps {
  request?: TransferRequestRow | null;
  onBack?: () => void;
}

export default function RoomTransferPanel({ request, onBack }: PanelProps = {}) {
  const { isSuperAdmin, userRoles } = usePermissions();
  const isHrAdmin = userRoles.includes("hr_admin");
  const canTransfer = isSuperAdmin || isHrAdmin;

  const [fromCamp, setFromCamp] = useState("");
  const [fromBlock, setFromBlock] = useState("");
  const [fromRoom, setFromRoom] = useState("");
  const [toCamp, setToCamp] = useState("");
  const [toBlock, setToBlock] = useState("");
  const [toRoom, setToRoom] = useState("");

  const [globalSearch, setGlobalSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingDrop, setPendingDrop] = useState<DropPayload | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const markFulfilled = useMarkRequestFulfilled();

  // Prefill from approved request — also derive block_id from room records
  useEffect(() => {
    if (!request) return;
    (async () => {
      const roomIds = [request.current_room_id, request.requested_room_id].filter(Boolean) as string[];
      let blockMap = new Map<string, string>();
      if (roomIds.length) {
        const { data } = await supabase.from("rooms").select("id, building_id").in("id", roomIds);
        blockMap = new Map((data || []).map((r: any) => [r.id, r.building_id]));
      }
      if (request.current_camp_id) setFromCamp(request.current_camp_id);
      if (request.current_room_id) {
        setFromBlock(blockMap.get(request.current_room_id) || "");
        setFromRoom(request.current_room_id);
      }
      if (request.requested_camp_id) setToCamp(request.requested_camp_id);
      if (request.requested_room_id) {
        setToBlock(blockMap.get(request.requested_room_id) || "");
        setToRoom(request.requested_room_id);
      }
      setReason(request.reason || "");
      setNotes(request.notes || "");
      // Clear any prior search so the pinned requested employee + full room roster are visible
      setGlobalSearch("");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  const { data: fromOccupants = [] } = useRoomOccupants(fromRoom || null);
  const { data: toOccupants = [] } = useRoomOccupants(toRoom || null);
  const { data: history = [] } = useRoomTransferHistory(20);
  const { data: allRooms = [] } = useRooms(fromCamp || undefined, fromBlock || undefined);

  const transferMutation = usePerformRoomTransfer();

  const fromRoomData = (allRooms as any[]).find((r) => r.id === fromRoom);
  const { data: toRoomsList = [] } = useRooms(toCamp || undefined, toBlock || undefined);
  const toRoomData = (toRoomsList as any[]).find((r) => r.id === toRoom);

  const isInterCamp = fromCamp && toCamp && fromCamp !== toCamp;
  const categoryMismatch = fromRoomData && toRoomData && fromRoomData.category !== toRoomData.category;

  // ====== Eligible available rooms for the requested employee (approver workflow) ======
  const employeeDesignation = request?.employee?.designation || null;
  const eligibleCategories = useMemo(
    () => (request ? getEligibleCategoriesForDesignation(employeeDesignation) : []),
    [request, employeeDesignation],
  );

  const { data: eligibleRooms = [] } = useQuery({
    queryKey: ["eligible-rooms-for-request", request?.id, eligibleCategories.join(","), request?.requested_camp_id, request?.current_camp_id],
    enabled: !!request,
    queryFn: async () => {
      let q = supabase
        .from("rooms")
        .select("id, room_number, category, current_occupancy, max_capacity, status, building_id, camp_id")
        .neq("status", "under_maintenance");
      if (request?.requested_camp_id) q = q.eq("camp_id", request.requested_camp_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data || [])
        .filter((r: any) => r.current_occupancy < r.max_capacity)
        .filter((r: any) => eligibleCategories.length === 0 || eligibleCategories.includes(r.category))
        .filter((r: any) => r.id !== request?.current_room_id);
    },
  });

  // Hydrate camp + building names for eligibleRooms display
  const { data: roomMeta = { camps: new Map<string, string>(), blocks: new Map<string, string>() } } = useQuery({
    queryKey: ["eligible-rooms-meta", (eligibleRooms as any[]).map((r: any) => r.id).join(",")],
    enabled: (eligibleRooms as any[]).length > 0,
    queryFn: async () => {
      const campIds = [...new Set((eligibleRooms as any[]).map((r: any) => r.camp_id).filter(Boolean))] as string[];
      const blockIds = [...new Set((eligibleRooms as any[]).map((r: any) => r.building_id).filter(Boolean))] as string[];
      const [cpsRes, bksRes] = await Promise.all([
        campIds.length ? supabase.from("camps").select("id, name").in("id", campIds) : Promise.resolve({ data: [] as any[] }),
        blockIds.length ? supabase.from("buildings").select("id, name").in("id", blockIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      return {
        camps: new Map((((cpsRes as any).data) || []).map((c: any) => [c.id, c.name])) as Map<string, string>,
        blocks: new Map((((bksRes as any).data) || []).map((b: any) => [b.id, b.name])) as Map<string, string>,
      };
    },
  });

  // Approver picks a room from the suggested list
  const pickEligibleRoom = (room: any) => {
    setToCamp(room.camp_id);
    setToBlock(room.building_id);
    setToRoom(room.id);
  };

  // Direct transfer (button) — uses same confirm flow, bypasses drag
  const handleApproverTransfer = () => {
    if (!request) return;
    if (!toRoom) {
      toast({ title: "Select a destination room first", variant: "destructive" });
      return;
    }
    if (!request.current_room_id || !request.current_camp_id) {
      toast({ title: "Source room/camp is missing on the request", variant: "destructive" });
      return;
    }
    if (toRoomData && toRoomData.current_occupancy >= toRoomData.max_capacity) {
      toast({ title: "Destination room is full", variant: "destructive" });
      return;
    }
    const interCamp = request.current_camp_id !== toCamp;
    if (interCamp && !isSuperAdmin) {
      toast({
        title: "Permission denied",
        description: "Only Super Admins can perform inter-camp transfers.",
        variant: "destructive",
      });
      return;
    }
    setPendingDrop({
      employee_id: request.employee_id,
      from_room_id: request.current_room_id,
      from_camp_id: request.current_camp_id,
    });
    setConfirmOpen(true);
  };

  // Search-based occupants (independent of from-picker)
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const q = globalSearch.toLowerCase();
    return (fromOccupants as any[]).filter(
      (e) => e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q),
    );
  }, [fromOccupants, globalSearch]);

  const onDragStart = (e: React.DragEvent, emp: any) => {
    if (!canTransfer) {
      e.preventDefault();
      return;
    }
    const payload: DropPayload = {
      employee_id: emp.id,
      from_room_id: fromRoom,
      from_camp_id: fromCamp,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData("application/json")) as DropPayload;
      if (!toRoom) {
        toast({ title: "Select destination room first", variant: "destructive" });
        return;
      }
      if (payload.from_room_id === toRoom) {
        toast({ title: "Source and destination are the same", variant: "destructive" });
        return;
      }
      if (toRoomData && toRoomData.current_occupancy >= toRoomData.max_capacity) {
        toast({ title: "Destination room is full", variant: "destructive" });
        return;
      }
      const interCamp = payload.from_camp_id !== toCamp;
      if (interCamp && !isSuperAdmin) {
        toast({
          title: "Permission denied",
          description: "Only Super Admins can perform inter-camp transfers.",
          variant: "destructive",
        });
        return;
      }
      setPendingDrop(payload);
      setReason("");
      setNotes("");
      setConfirmOpen(true);
    } catch {
      // ignore
    }
  };

  const handleConfirm = async () => {
    if (!pendingDrop || !reason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    const transferId = await transferMutation.mutateAsync({
      employee_id: pendingDrop.employee_id,
      from_room_id: pendingDrop.from_room_id,
      from_camp_id: pendingDrop.from_camp_id,
      to_room_id: toRoom,
      to_camp_id: toCamp,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    });
    setConfirmOpen(false);
    setPendingDrop(null);
    if (request?.id && transferId) {
      await markFulfilled.mutateAsync({ id: request.id, transfer_id: transferId });
      onBack?.();
    }
  };

  const draggedEmp = pendingDrop ? (fromOccupants as any[]).find((e) => e.id === pendingDrop.employee_id) : null;
  const requestedEmpId = request?.employee_id;
  const baseList = globalSearch.trim() ? searchResults : (fromOccupants as any[]);
  // Pin the requested employee to the top of the list
  const displayList = useMemo(() => {
    if (!requestedEmpId) return baseList;
    const pinned = (baseList as any[]).filter((e) => e.id === requestedEmpId);
    const rest = (baseList as any[]).filter((e) => e.id !== requestedEmpId);
    return [...pinned, ...rest];
  }, [baseList, requestedEmpId]);

  return (
    <div className="space-y-3">
      {request && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-2 text-sm">
            <Inbox size={16} className="text-primary mt-0.5" />
            <div>
              <div className="font-medium">
                Executing approved request for {request.employee?.name}{" "}
                <span className="text-muted-foreground text-xs">({request.employee?.employee_id})</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {request.current_camp?.name || "—"} · Room {request.current_room?.room_number || "—"}{" "}
                <ArrowRight size={11} className="inline mx-1" />
                {request.requested_camp?.name || "Any camp"} · {request.requested_room?.room_number ? `Room ${request.requested_room.room_number}` : "Any room"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 italic">Reason: {request.reason}</div>
            </div>
          </div>
          {onBack && (
            <button onClick={onBack} className="text-xs text-primary hover:underline shrink-0">
              ← Back to requests
            </button>
          )}
        </div>
      )}

      {request && (
        <TransferRouteGraphic
          from={{
            campName: request.current_camp?.name,
            roomNumber: fromRoomData?.room_number || request.current_room?.room_number,
            category: fromRoomData?.category || request.current_room?.category,
          }}
          to={{
            campName: (toRoomData ? request.requested_camp?.name : request.requested_camp?.name) || "Any camp",
            roomNumber: toRoomData?.room_number || request.requested_room?.room_number,
            category: toRoomData?.category || request.requested_room?.category,
          }}
          employeeName={request.employee?.name}
          employeeId={request.employee?.employee_id}
          isInterCamp={request.request_type === "inter_camp"}
        />
      )}

      {/* APPROVER WORKFLOW: Available Rooms matching employee category */}
      {request && (
        <div className="stat-card !py-3 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Home size={16} className="text-primary" />
                Available Rooms for {request.employee?.name}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Filtered to rooms matching the employee's designation category
                {employeeDesignation && <> · <span className="font-medium text-foreground">{employeeDesignation}</span></>}
                {request.requested_camp_id && <> · in <span className="font-medium text-foreground">{request.requested_camp?.name}</span></>}
              </p>
              {eligibleCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {eligibleCategories.map((c) => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {getRoomCategoryLabel(c)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleApproverTransfer}
              disabled={!toRoom || !canTransfer || transferMutation.isPending}
              className="gap-1.5 shrink-0"
            >
              <ArrowRight size={14} />
              Transfer to Selected Room
            </Button>
          </div>

          <div className="border rounded-lg max-h-[280px] overflow-y-auto divide-y">
            {(eligibleRooms as any[]).length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No matching available rooms found
                {request.requested_camp_id && <> in {request.requested_camp?.name}</>}.
                Try the manual picker below.
              </div>
            ) : (
              (eligibleRooms as any[]).map((r: any) => {
                const selected = r.id === toRoom;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => pickEligibleRoom(r)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition ${
                      selected ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/40 border-l-4 border-l-transparent"
                    }`}
                  >
                    {selected ? (
                      <CheckCircle2 size={16} className="text-primary shrink-0" />
                    ) : (
                      <Home size={14} className="text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold flex items-center gap-2">
                        Room {r.room_number}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {getRoomCategoryLabel(r.category)}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {roomMeta.camps.get(r.camp_id) || "—"}
                        {roomMeta.blocks.get(r.building_id) && <> · Block {roomMeta.blocks.get(r.building_id)}</>}
                      </div>
                    </div>
                    <div className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
                      {r.current_occupancy}/{r.max_capacity} · {r.max_capacity - r.current_occupancy} free
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {!canTransfer && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <ShieldAlert size={16} />
          You need HR Admin or Super Admin role to perform room transfers. View-only mode.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* SOURCE PANEL */}
        <div className="stat-card !py-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users size={16} className="text-primary" /> Source Room
            </h3>
            <span className="text-xs text-muted-foreground">{(fromOccupants as any[]).length} occupants</span>
          </div>

          <RoomPicker
            side="from"
            campId={fromCamp}
            blockId={fromBlock}
            roomId={fromRoom}
            onCamp={setFromCamp}
            onBlock={setFromBlock}
            onRoom={setFromRoom}
            excludeRoomId={toRoom}
          />

          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search occupant by name or ID..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>

          <div className="border rounded-lg divide-y max-h-[420px] overflow-y-auto">
            {!fromRoom ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Select a source room to view occupants
              </div>
            ) : displayList.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {globalSearch ? "No matching occupants" : "Room is empty"}
              </div>
            ) : (
              displayList.map((emp: any) => {
                const isRequested = emp.id === requestedEmpId;
                return (
                  <div
                    key={emp.id}
                    draggable={canTransfer}
                    onDragStart={(e) => onDragStart(e, emp)}
                    className={`flex items-center gap-2 p-2.5 transition ${
                      isRequested
                        ? "bg-primary/10 border-l-4 border-l-primary hover:bg-primary/15"
                        : "hover:bg-muted/50"
                    } ${
                      canTransfer ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-70"
                    }`}
                  >
                    <GripVertical size={14} className={`shrink-0 ${isRequested ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="text-xs font-medium truncate">{emp.name}</div>
                        {isRequested && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground shrink-0">
                            REQUESTED
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {emp.employee_id} · {emp.designation || emp.employee_type}
                        {emp.supplier_name && ` · ${emp.supplier_name}`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DESTINATION PANEL */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`stat-card !py-3 space-y-3 transition ${
            dragOver ? "ring-2 ring-primary bg-primary/5" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ArrowRight size={16} className="text-primary" /> Destination Room
            </h3>
            {toRoomData && (
              <span className="text-xs text-muted-foreground">
                {toRoomData.current_occupancy}/{toRoomData.max_capacity} beds
              </span>
            )}
          </div>

          <RoomPicker
            side="to"
            campId={toCamp}
            blockId={toBlock}
            roomId={toRoom}
            onCamp={setToCamp}
            onBlock={setToBlock}
            onRoom={setToRoom}
            excludeRoomId={fromRoom}
          />

          {isInterCamp && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle size={14} />
              Inter-camp transfer · {isSuperAdmin ? "Allowed" : "Super Admin only"}
            </div>
          )}
          {categoryMismatch && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle size={14} />
              Category mismatch: {getRoomCategoryLabel(fromRoomData!.category)} →{" "}
              {getRoomCategoryLabel(toRoomData!.category)}
            </div>
          )}

          <div
            className={`border-2 border-dashed rounded-lg min-h-[180px] p-3 ${
              dragOver ? "border-primary" : "border-muted"
            }`}
          >
            {!toRoom ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground py-12">
                Select a destination room, then drop occupants here
              </div>
            ) : (toOccupants as any[]).length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8">
                Room is empty · Drop occupants here to transfer
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase text-muted-foreground tracking-wide mb-1">
                  Current occupants
                </div>
                {(toOccupants as any[]).map((emp: any) => (
                  <div key={emp.id} className="flex items-center gap-2 p-2 rounded-md bg-card border text-xs">
                    <Users size={12} className="text-muted-foreground" />
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-muted-foreground">· {emp.employee_id}</span>
                  </div>
                ))}
                <div className="text-center text-[11px] text-muted-foreground pt-2">
                  Drop more occupants here to transfer
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HISTORY */}
      <div className="stat-card !py-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <History size={16} className="text-primary" /> Recent Transfers
        </h3>
        {history.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-4">No transfers yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-1.5 pr-3">Date</th>
                  <th className="pr-3">Employee</th>
                  <th className="pr-3">From</th>
                  <th className="pr-3">To</th>
                  <th className="pr-3">Type</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.map((t: any) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      {format(new Date(t.transfer_date), "dd MMM, HH:mm")}
                    </td>
                    <td className="pr-3 font-medium">
                      {t.employee?.name || "—"}
                      <span className="text-muted-foreground ml-1">({t.employee?.employee_id || "—"})</span>
                    </td>
                    <td className="pr-3 text-muted-foreground">
                      {t.from_camp?.name || "—"} · {t.from_room?.room_number || "—"}
                    </td>
                    <td className="pr-3 text-muted-foreground">
                      {t.to_camp?.name || "—"} · {t.to_room?.room_number || "—"}
                    </td>
                    <td className="pr-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          t.transfer_type === "inter_camp"
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {t.transfer_type === "inter_camp" ? "Inter-camp" : "Intra-camp"}
                      </span>
                    </td>
                    <td className="text-muted-foreground truncate max-w-[200px]">{t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRM DIALOG */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Room Transfer</DialogTitle>
          </DialogHeader>
          {draggedEmp && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{draggedEmp.name}</span>
                  <span className="text-xs text-muted-foreground">({draggedEmp.employee_id})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{fromRoomData?.room_number}</span>
                  <ArrowRight size={12} />
                  <span className="font-medium text-primary">{toRoomData?.room_number}</span>
                </div>
                {isInterCamp && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={11} /> Inter-camp transfer
                  </div>
                )}
                {categoryMismatch && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={11} /> Category mismatch
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">
                  Reason <span className="text-destructive">*</span>
                </label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Maintenance, team consolidation, request..."
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={!reason.trim() || transferMutation.isPending}
            >
              {transferMutation.isPending ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
