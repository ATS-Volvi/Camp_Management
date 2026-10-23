import { useState, useMemo } from "react";
import { Plus, X, Search, Inbox, Clock, ShieldCheck, Ban, CheckCircle2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTransferRequests, useCreateTransferRequest, type TransferRequestRow } from "@/hooks/useTransferRequests";
import TransferApprovalDialog from "@/components/checkin/TransferApprovalDialog";
import { useCamps } from "@/hooks/useCheckInOut";
import { useRooms, useBlocks } from "@/hooks/useCampManagement";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  onExecute?: (request: TransferRequestRow) => void;
}

const statusBadge = (s: TransferRequestRow["status"]) => {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    pending: { label: "Pending Approval", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Clock },
    approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: ShieldCheck },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive", icon: Ban },
    fulfilled: { label: "Fulfilled", cls: "bg-primary/15 text-primary", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground", icon: X },
  };
  const c = map[s] || map.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.cls}`}>
      <Icon size={10} /> {c.label}
    </span>
  );
};

export default function TransferRequestsList(_props: Props = {}) {
  const { userRoles, isSuperAdmin } = usePermissions();
  const canApprove = isSuperAdmin || userRoles.includes("camp_manager") || userRoles.includes("hr_admin");

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [approving, setApproving] = useState<TransferRequestRow | null>(null);

  const { data: requests = [], isLoading } = useTransferRequests();

  const filtered = useMemo(() => {
    let list = requests as TransferRequestRow[];
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.employee?.name?.toLowerCase().includes(q) ||
          r.employee?.employee_id?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [requests, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length, pending: 0, approved: 0, rejected: 0, fulfilled: 0 };
    (requests as TransferRequestRow[]).forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [requests]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Inbox size={16} className="text-primary" /> Transfer Requests
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Employees request room/camp changes here. Camp Manager approves before execution.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus size={14} /> New Request
        </Button>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "pending", "approved", "rejected", "fulfilled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
              statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70 text-foreground"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s] || 0})
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employee or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="stat-card !py-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="py-2 px-3">Requested</th>
                <th className="px-3">Employee</th>
                <th className="px-3">From</th>
                <th className="px-3">Requested To</th>
                <th className="px-3">Type</th>
                <th className="px-3">Reason</th>
                <th className="px-3">Status</th>
                <th className="px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center text-muted-foreground py-6">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted-foreground py-8">No requests found</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">
                    {format(new Date(r.requested_at), "dd MMM, HH:mm")}
                  </td>
                  <td className="px-3">
                    <div className="font-medium">{r.employee?.name || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{r.employee?.employee_id || "—"}</div>
                  </td>
                  <td className="px-3 text-muted-foreground">
                    {r.current_camp?.name || "—"}<br />
                    <span className="text-[10px]">Room {r.current_room?.room_number || "—"}</span>
                  </td>
                  <td className="px-3 text-muted-foreground">
                    {r.requested_camp?.name || "Any"}<br />
                    <span className="text-[10px]">{r.requested_room?.room_number ? `Room ${r.requested_room.room_number}` : "Any room"}</span>
                  </td>
                  <td className="px-3">
                    <Badge variant={r.request_type === "inter_camp" ? "default" : "secondary"} className="text-[9px] px-1.5 py-0">
                      {r.request_type === "inter_camp" ? "Inter-camp" : "Intra-camp"}
                    </Badge>
                  </td>
                  <td className="px-3 max-w-[200px]">
                    <div className="truncate" title={r.reason}>{r.reason}</div>
                    {r.review_notes && <div className="text-[10px] text-muted-foreground italic truncate" title={r.review_notes}>↳ {r.review_notes}</div>}
                  </td>
                  <td className="px-3">{statusBadge(r.status)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="flex justify-end items-center gap-1">
                      {(r.status === "pending" || r.status === "approved") && canApprove ? (
                        <Button
                          size="sm"
                          variant={r.status === "pending" ? "default" : "outline"}
                          className="h-7 gap-1"
                          onClick={() => setApproving(r)}
                        >
                          <Eye size={12} /> {r.status === "pending" ? "Review & Approve" : "Transfer"}
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 px-2" title="View details" onClick={() => setApproving(r)}>
                          <Eye size={12} />
                        </Button>
                      )}
                      {r.status === "fulfilled" && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {r.fulfilled_at ? format(new Date(r.fulfilled_at), "dd MMM") : ""}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Combined Approval dialog (replaces View + Approve + Transfer stages) */}
      <TransferApprovalDialog request={approving} onClose={() => setApproving(null)} />

      {/* Create dialog */}
      <CreateRequestDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: camps = [] } = useCamps();
  const [campFilter, setCampFilter] = useState("");

  // Fetch ONLY currently checked-in employees in the selected camp
  // (latest check_in must be after latest check_out for that employee)
  const { data: occupants = [] } = useQuery({
    queryKey: ["camp-active-inmates-for-transfer", campFilter],
    enabled: !!campFilter,
    queryFn: async () => {
      const { data: checkIns, error: ciErr } = await supabase
        .from("check_ins")
        .select("employee_id, room_id, check_in_date")
        .eq("camp_id", campFilter)
        .order("check_in_date", { ascending: false });
      if (ciErr) throw ciErr;

      const { data: checkOuts, error: coErr } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .eq("camp_id", campFilter)
        .order("check_out_date", { ascending: false });
      if (coErr) throw coErr;

      const latestCheckOut = new Map<string, string>();
      (checkOuts || []).forEach((co: any) => {
        if (!latestCheckOut.has(co.employee_id)) latestCheckOut.set(co.employee_id, co.check_out_date);
      });

      const empRoomMap = new Map<string, string>();
      (checkIns || []).forEach((ci: any) => {
        if (empRoomMap.has(ci.employee_id)) return;
        const lastOut = latestCheckOut.get(ci.employee_id);
        if (!lastOut || new Date(ci.check_in_date) > new Date(lastOut)) {
          empRoomMap.set(ci.employee_id, ci.room_id);
        }
      });

      if (empRoomMap.size === 0) return [];

      const empIds = [...empRoomMap.keys()];
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name, employee_id, designation, employee_type, supplier_name, camp_id, room_id")
        .in("id", empIds)
        .order("name");

      const roomIds = [...new Set([...empRoomMap.values()].filter(Boolean) as string[])];
      let roomMap = new Map<string, any>();
      if (roomIds.length) {
        const { data: rms } = await supabase.from("rooms").select("id, room_number").in("id", roomIds);
        roomMap = new Map((rms || []).map((r: any) => [r.id, r]));
      }

      return (emps || []).map((e: any) => {
        const activeRoomId = empRoomMap.get(e.id) || null;
        return {
          ...e,
          camp_id: campFilter,
          checked_in_room_id: activeRoomId,
          room: activeRoomId ? roomMap.get(activeRoomId) : null,
        };
      });
    },
  });

  const [employeeId, setEmployeeId] = useState("");
  const [reqCamp, setReqCamp] = useState("");
  const [reqBlock, setReqBlock] = useState("");
  const [reqRoom, setReqRoom] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [empSearch, setEmpSearch] = useState("");

  const { data: blocks = [] } = useBlocks(reqCamp);
  const { data: rooms = [] } = useRooms(reqCamp || undefined, reqBlock || undefined);

  const createMutation = useCreateTransferRequest();

  const filteredOccupants = useMemo(() => {
    if (!empSearch.trim()) return occupants as any[];
    const q = empSearch.toLowerCase();
    return (occupants as any[]).filter((e) => e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q));
  }, [occupants, empSearch]);

  const selectedEmp = (occupants as any[]).find((e) => e.id === employeeId);

  const reset = () => {
    setEmployeeId(""); setReqCamp(""); setReqBlock(""); setReqRoom("");
    setReason(""); setNotes(""); setEmpSearch(""); setCampFilter("");
  };

  const submit = async () => {
    if (!employeeId || !reason.trim()) {
      toast({ title: "Employee and reason are required", variant: "destructive" });
      return;
    }
    await createMutation.mutateAsync({
      employee_id: employeeId,
      current_camp_id: selectedEmp?.camp_id || campFilter || null,
      current_room_id: selectedEmp?.checked_in_room_id || null,
      requested_camp_id: reqCamp || null,
      requested_room_id: reqRoom || null,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Transfer Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Filter by current camp</label>
            <select value={campFilter} onChange={(e) => { setCampFilter(e.target.value); setEmployeeId(""); }}
              className="w-full mt-1 border rounded-lg px-2 py-1.5 text-sm bg-card">
              <option value="">Select camp…</option>
              {(camps as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium">Employee</label>
            <Input
              placeholder="Search by name or ID…"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="mt-1 h-8 text-xs"
              disabled={!campFilter}
            />
            {selectedEmp && (
              <div className="mt-1 flex items-center gap-2 text-[11px] bg-primary/10 border border-primary/30 rounded-lg px-2 py-1.5">
                <CheckCircle2 size={12} className="text-primary shrink-0" />
                <span className="font-medium text-primary truncate">{selectedEmp.name}</span>
                <span className="text-muted-foreground">· {selectedEmp.employee_id}</span>
                {selectedEmp.room?.room_number && <span className="text-muted-foreground">· Room {selectedEmp.room.room_number}</span>}
                <button onClick={() => setEmployeeId("")} className="ml-auto text-muted-foreground hover:text-destructive">
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
              {!campFilter ? (
                <div className="p-3 text-center text-xs text-muted-foreground">Select a camp first</div>
              ) : filteredOccupants.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">No employees in this camp</div>
              ) : filteredOccupants.map((e) => {
                const isSelected = employeeId === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => setEmployeeId(e.id)}
                    className={`w-full text-left px-2.5 py-2 text-xs flex items-center gap-2 border-l-2 transition ${
                      isSelected
                        ? "bg-primary/15 border-l-primary font-semibold"
                        : "border-l-transparent hover:bg-muted/50"
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 size={14} className="text-primary shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                    )}
                    <span className={`${isSelected ? "text-primary" : ""}`}>{e.name}</span>
                    <span className="text-muted-foreground">{e.employee_id}</span>
                    {e.room?.room_number && <span className="text-[10px] text-primary">· Room {e.room.room_number}</span>}
                    {e.designation && <span className="text-[10px] text-muted-foreground">· {e.designation}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Requested destination (optional)</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <select value={reqCamp} onChange={(e) => { setReqCamp(e.target.value); setReqBlock(""); setReqRoom(""); }}
                className="border rounded-lg px-2 py-1.5 text-xs bg-card">
                <option value="">Camp…</option>
                {(camps as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={reqBlock} onChange={(e) => { setReqBlock(e.target.value); setReqRoom(""); }} disabled={!reqCamp}
                className="border rounded-lg px-2 py-1.5 text-xs bg-card disabled:opacity-50">
                <option value="">Block…</option>
                {(blocks as any[]).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={reqRoom} onChange={(e) => setReqRoom(e.target.value)} disabled={!reqBlock}
                className="border rounded-lg px-2 py-1.5 text-xs bg-card disabled:opacity-50">
                <option value="">Room…</option>
                {(rooms as any[]).filter((r) => r.current_occupancy < r.max_capacity).map((r) => (
                  <option key={r.id} value={r.id}>{r.room_number} ({r.current_occupancy}/{r.max_capacity})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Reason <span className="text-destructive">*</span></label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
              placeholder="e.g. Roommate conflict, medical reason, project relocation…" className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-medium">Additional notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={submit} disabled={createMutation.isPending}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
