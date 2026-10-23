import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TransferRequestRow {
  id: string;
  employee_id: string;
  current_room_id: string | null;
  current_camp_id: string | null;
  requested_camp_id: string | null;
  requested_room_id: string | null;
  request_type: "intra_camp" | "inter_camp";
  reason: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "fulfilled" | "cancelled";
  requested_by: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  fulfilled_transfer_id: string | null;
  fulfilled_at: string | null;
  // hydrated:
  employee?: any;
  current_room?: any;
  current_camp?: any;
  requested_camp?: any;
  requested_room?: any;
  actual_to_room?: any;
  actual_to_camp?: any;
}

export function useTransferRequests(statusFilter?: string) {
  return useQuery({
    queryKey: ["transfer-requests", statusFilter || "all"],
    queryFn: async () => {
      let q = supabase.from("transfer_requests").select("*").order("requested_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []) as TransferRequestRow[];
      if (rows.length === 0) return rows;

      const empIds = [...new Set(rows.map((r) => r.employee_id))];
      const transferIds = [...new Set(rows.map((r) => r.fulfilled_transfer_id).filter(Boolean) as string[])];

      // Fetch fulfilled transfers to know the ACTUAL destination room (may differ from requested)
      const { data: transfers } = transferIds.length
        ? await supabase.from("room_transfers").select("id, to_room_id, to_camp_id").in("id", transferIds)
        : { data: [] as any[] };
      const transferMap = new Map((transfers || []).map((t: any) => [t.id, t]));

      const roomIds = [...new Set(rows.flatMap((r) => {
        const actual = r.fulfilled_transfer_id ? transferMap.get(r.fulfilled_transfer_id) : null;
        return [r.current_room_id, r.requested_room_id, actual?.to_room_id];
      }).filter(Boolean) as string[])];
      const campIds = [...new Set(rows.flatMap((r) => {
        const actual = r.fulfilled_transfer_id ? transferMap.get(r.fulfilled_transfer_id) : null;
        return [r.current_camp_id, r.requested_camp_id, actual?.to_camp_id];
      }).filter(Boolean) as string[])];

      const [{ data: emps }, { data: rms }, { data: cps }] = await Promise.all([
        empIds.length ? supabase.from("employees").select("id, name, employee_id, designation, employee_type, supplier_name").in("id", empIds) : Promise.resolve({ data: [] }) as any,
        roomIds.length ? supabase.from("rooms").select("id, room_number, category").in("id", roomIds) : Promise.resolve({ data: [] }) as any,
        campIds.length ? supabase.from("camps").select("id, name").in("id", campIds) : Promise.resolve({ data: [] }) as any,
      ]);

      const empMap = new Map((emps || []).map((e: any) => [e.id, e]));
      const roomMap = new Map((rms || []).map((r: any) => [r.id, r]));
      const campMap = new Map((cps || []).map((c: any) => [c.id, c]));

      return rows.map((r) => {
        const actual = r.fulfilled_transfer_id ? transferMap.get(r.fulfilled_transfer_id) : null;
        return {
          ...r,
          employee: empMap.get(r.employee_id),
          current_room: r.current_room_id ? roomMap.get(r.current_room_id) : null,
          requested_room: r.requested_room_id ? roomMap.get(r.requested_room_id) : null,
          current_camp: r.current_camp_id ? campMap.get(r.current_camp_id) : null,
          requested_camp: r.requested_camp_id ? campMap.get(r.requested_camp_id) : null,
          actual_to_room: actual?.to_room_id ? roomMap.get(actual.to_room_id) : null,
          actual_to_camp: actual?.to_camp_id ? campMap.get(actual.to_camp_id) : null,
        };
      });
    },
  });
}

export function useCreateTransferRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employee_id: string;
      current_room_id?: string | null;
      current_camp_id?: string | null;
      requested_camp_id?: string | null;
      requested_room_id?: string | null;
      reason: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const request_type =
        payload.current_camp_id && payload.requested_camp_id && payload.current_camp_id !== payload.requested_camp_id
          ? "inter_camp"
          : "intra_camp";
      const { data, error } = await supabase.from("transfer_requests").insert({
        employee_id: payload.employee_id,
        current_room_id: payload.current_room_id ?? null,
        current_camp_id: payload.current_camp_id ?? null,
        requested_camp_id: payload.requested_camp_id ?? null,
        requested_room_id: payload.requested_room_id ?? null,
        request_type,
        reason: payload.reason,
        notes: payload.notes ?? null,
        requested_by: user?.id ?? null,
        status: "pending",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfer-requests"] });
      toast({ title: "Transfer request submitted", description: "Awaiting Camp Manager approval." });
    },
    onError: (e: any) => toast({ title: "Could not submit request", description: e.message, variant: "destructive" }),
  });
}

export function useReviewTransferRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; status: "approved" | "rejected"; review_notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("transfer_requests")
        .update({
          status: payload.status,
          review_notes: payload.review_notes ?? null,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["transfer-requests"] });
      toast({
        title: vars.status === "approved" ? "Request approved" : "Request rejected",
        description: vars.status === "approved" ? "Transfer can now be executed." : undefined,
      });
    },
    onError: (e: any) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });
}

export function useMarkRequestFulfilled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; transfer_id: string }) => {
      const { error } = await supabase
        .from("transfer_requests")
        .update({
          status: "fulfilled",
          fulfilled_transfer_id: payload.transfer_id,
          fulfilled_at: new Date().toISOString(),
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transfer-requests"] }),
  });
}
