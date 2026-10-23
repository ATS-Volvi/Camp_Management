import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, User, MapPin, FileText, MessageSquare, Calendar, Home, CheckCircle2, ShieldAlert, AlertTriangle, X, Check } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import TransferRouteGraphic from "@/components/checkin/TransferRouteGraphic";
import { useReviewTransferRequest, useMarkRequestFulfilled, type TransferRequestRow } from "@/hooks/useTransferRequests";
import { usePerformRoomTransfer } from "@/hooks/useRoomTransfer";
import { usePermissions } from "@/hooks/usePermissions";
import { getRoomCategoryLabel, getEligibleCategoriesForDesignation } from "@/constants/roomCategories";
import { toast } from "@/hooks/use-toast";

interface Props {
  request: TransferRequestRow | null;
  onClose: () => void;
}

export default function TransferApprovalDialog({ request, onClose }: Props) {
  const { isSuperAdmin, userRoles } = usePermissions();
  const isHrAdmin = userRoles.includes("hr_admin");
  const canApprove = isSuperAdmin || userRoles.includes("camp_manager") || isHrAdmin;
  const canTransfer = isSuperAdmin || isHrAdmin;

  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState("");

  const reviewMutation = useReviewTransferRequest();
  const transferMutation = usePerformRoomTransfer();
  const markFulfilled = useMarkRequestFulfilled();

  // Reset on open
  useEffect(() => {
    if (request) {
      setSelectedRoomId(request.requested_room_id || "");
      setReviewNotes("");
    }
  }, [request?.id]);

  const employeeDesignation = request?.employee?.designation || null;
  const eligibleCategories = useMemo(
    () => (request ? getEligibleCategoriesForDesignation(employeeDesignation) : []),
    [request, employeeDesignation],
  );

  const { data: eligibleRooms = [] } = useQuery({
    queryKey: ["approval-eligible-rooms", request?.id, eligibleCategories.join(","), request?.requested_camp_id, request?.current_camp_id],
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

  const { data: roomMeta = { camps: new Map<string, string>(), blocks: new Map<string, string>() } } = useQuery({
    queryKey: ["approval-rooms-meta", (eligibleRooms as any[]).map((r: any) => r.id).join(",")],
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

  const selectedRoom = (eligibleRooms as any[]).find((r: any) => r.id === selectedRoomId);
  const isPending = request?.status === "pending";
  const isApproved = request?.status === "approved";
  const isActionable = isPending || isApproved;

  const handleReject = async () => {
    if (!request) return;
    if (!reviewNotes.trim()) {
      toast({ title: "Reason required for rejection", variant: "destructive" });
      return;
    }
    await reviewMutation.mutateAsync({ id: request.id, status: "rejected", review_notes: reviewNotes.trim() });
    onClose();
  };

  const handleApproveAndTransfer = async () => {
    if (!request) return;
    if (!selectedRoomId || !selectedRoom) {
      toast({ title: "Select a destination room first", variant: "destructive" });
      return;
    }
    if (!request.current_room_id || !request.current_camp_id) {
      toast({ title: "Source room/camp is missing on the request", variant: "destructive" });
      return;
    }
    if (selectedRoom.current_occupancy >= selectedRoom.max_capacity) {
      toast({ title: "Selected room is full", variant: "destructive" });
      return;
    }
    const interCamp = request.current_camp_id !== selectedRoom.camp_id;
    if (interCamp && !isSuperAdmin) {
      toast({
        title: "Permission denied",
        description: "Only Super Admins can perform inter-camp transfers.",
        variant: "destructive",
      });
      return;
    }

    // 1) approve (only if still pending)
    if (isPending) {
      await reviewMutation.mutateAsync({
        id: request.id,
        status: "approved",
        review_notes: reviewNotes.trim() || undefined,
      });
    }

    // 2) execute transfer
    const transferId = await transferMutation.mutateAsync({
      employee_id: request.employee_id,
      from_room_id: request.current_room_id,
      from_camp_id: request.current_camp_id,
      to_room_id: selectedRoom.id,
      to_camp_id: selectedRoom.camp_id,
      reason: request.reason,
      notes: reviewNotes.trim() || request.notes || undefined,
    });

    // 3) mark fulfilled
    if (transferId) {
      await markFulfilled.mutateAsync({ id: request.id, transfer_id: transferId });
    }
    onClose();
  };

  if (!request) return null;

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            Transfer Request — Approval
            <Badge variant="secondary" className="ml-2 capitalize">{request.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Employee */}
          <section className="border rounded-lg p-3 bg-muted/20">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-2">
              <User size={12} /> Employee
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground text-xs">Name:</span> <span className="font-medium">{request.employee?.name || "—"}</span></div>
              <div><span className="text-muted-foreground text-xs">Employee ID:</span> <span className="font-medium">{request.employee?.employee_id || "—"}</span></div>
              <div><span className="text-muted-foreground text-xs">Designation:</span> {request.employee?.designation || "—"}</div>
              <div><span className="text-muted-foreground text-xs">Type:</span> {request.employee?.employee_type || "—"}{request.employee?.supplier_name ? ` (${request.employee.supplier_name})` : ""}</div>
            </div>
          </section>

          {/* From / To summary */}
          <section className="grid grid-cols-2 gap-3">
            <div className="border rounded-lg p-3">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-2">
                <MapPin size={12} /> From
              </div>
              <div className="font-medium">{request.current_camp?.name || "—"}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Room <span className="font-medium text-foreground">{request.current_room?.room_number || "—"}</span>
                {request.current_room?.category && <span className="ml-1">· {getRoomCategoryLabel(request.current_room.category)}</span>}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-primary/5">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-2">
                <ArrowRight size={12} /> Requested To
              </div>
              <div className="font-medium">{request.requested_camp?.name || "Any camp"}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Room <span className="font-medium text-foreground">{request.requested_room?.room_number || "Any"}</span>
                {request.requested_room?.category && <span className="ml-1">· {getRoomCategoryLabel(request.requested_room.category)}</span>}
              </div>
              <Badge variant={request.request_type === "inter_camp" ? "default" : "secondary"} className="text-[9px] mt-2">
                {request.request_type === "inter_camp" ? "Inter-camp" : "Intra-camp"}
              </Badge>
            </div>
          </section>

          {/* Visual route */}
          <TransferRouteGraphic
            from={{
              campName: request.current_camp?.name,
              roomNumber: request.current_room?.room_number,
              category: request.current_room?.category,
            }}
            to={{
              campName: (selectedRoom && roomMeta.camps.get(selectedRoom.camp_id)) || request.requested_camp?.name || "Any camp",
              roomNumber: selectedRoom?.room_number || request.requested_room?.room_number,
              category: selectedRoom?.category || request.requested_room?.category,
            }}
            employeeName={request.employee?.name}
            employeeId={request.employee?.employee_id}
            isInterCamp={request.request_type === "inter_camp"}
          />

          {/* Reason */}
          <section className="space-y-2">
            <div className="border rounded-lg p-3">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                <MessageSquare size={12} /> Reason
              </div>
              <div className="whitespace-pre-wrap">{request.reason || "—"}</div>
            </div>
            {request.notes && (
              <div className="border rounded-lg p-3">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Additional Notes</div>
                <div className="whitespace-pre-wrap text-muted-foreground">{request.notes}</div>
              </div>
            )}
          </section>

          {/* Available rooms picker */}
          {isActionable && (
            <section className="stat-card !py-3 space-y-3">
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

              <div className="border rounded-lg max-h-[260px] overflow-y-auto divide-y">
                {(eligibleRooms as any[]).length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No matching available rooms found
                    {request.requested_camp_id && <> in {request.requested_camp?.name}</>}.
                  </div>
                ) : (
                  (eligibleRooms as any[]).map((r: any) => {
                    const selected = r.id === selectedRoomId;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRoomId(r.id)}
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

              {selectedRoom && request.current_camp_id && selectedRoom.camp_id !== request.current_camp_id && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                  <AlertTriangle size={14} />
                  Inter-camp transfer · {isSuperAdmin ? "Allowed" : "Super Admin only"}
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1 block">
                  Approver / Reviewer Notes <span className="text-muted-foreground font-normal">(required for rejection)</span>
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional comment for the team, or reason if rejecting…"
                />
              </div>

              {!canApprove && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
                  <ShieldAlert size={14} /> You don't have approver permissions. View-only.
                </div>
              )}
            </section>
          )}

          {/* Timeline */}
          <section className="border rounded-lg p-3">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-2">
              <Calendar size={12} /> Timeline
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Requested at:</span><span>{format(new Date(request.requested_at), "dd MMM yyyy, HH:mm")}</span></div>
              {request.reviewed_at && (
                <div className="flex justify-between"><span className="text-muted-foreground">Reviewed at:</span><span>{format(new Date(request.reviewed_at), "dd MMM yyyy, HH:mm")}</span></div>
              )}
              {request.fulfilled_at && (
                <div className="flex justify-between"><span className="text-muted-foreground">Fulfilled at:</span><span className="text-emerald-700 dark:text-emerald-400 font-medium">{format(new Date(request.fulfilled_at), "dd MMM yyyy, HH:mm")}</span></div>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {isActionable && canApprove && (
            <>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={reviewMutation.isPending}
                className="text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
              >
                <X size={14} /> Reject
              </Button>
              <Button
                onClick={handleApproveAndTransfer}
                disabled={!selectedRoomId || !canTransfer || reviewMutation.isPending || transferMutation.isPending}
                className="gap-1.5"
              >
                <Check size={14} />
                {transferMutation.isPending || reviewMutation.isPending
                  ? "Processing…"
                  : isApproved ? "Transfer to Selected Room" : "Approve & Transfer"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
