import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TransferPayload {
  employee_id: string;
  from_room_id: string;
  to_room_id: string;
  from_camp_id: string;
  to_camp_id: string;
  reason: string;
  notes?: string;
}

export function usePerformRoomTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TransferPayload) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("perform_room_transfer", {
        p_employee_id: payload.employee_id,
        p_from_room_id: payload.from_room_id,
        p_to_room_id: payload.to_room_id,
        p_from_camp_id: payload.from_camp_id,
        p_to_camp_id: payload.to_camp_id,
        p_reason: payload.reason,
        p_notes: payload.notes ?? null,
        p_performed_by: authUser.id,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rooms-by-camp"] });
      qc.invalidateQueries({ queryKey: ["checked-in-employees"] });
      qc.invalidateQueries({ queryKey: ["camps-list"] });
      qc.invalidateQueries({ queryKey: ["room-transfers"] });
      toast({ title: "Transfer complete", description: "Employee moved successfully." });
    },
    onError: (e: any) =>
      toast({ title: "Transfer failed", description: e.message, variant: "destructive" }),
  });
}

export function useRoomTransferHistory(limit = 25) {
  return useQuery({
    queryKey: ["room-transfers", limit],
    queryFn: async () => {
      const { data: transfers, error } = await supabase
        .from("room_transfers")
        .select("*")
        .order("transfer_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      if (!transfers || transfers.length === 0) return [];

      const empIds = [...new Set(transfers.map((t: any) => t.employee_id))];
      const roomIds = [...new Set(transfers.flatMap((t: any) => [t.from_room_id, t.to_room_id]))];
      const campIds = [...new Set(transfers.flatMap((t: any) => [t.from_camp_id, t.to_camp_id]))];

      const [{ data: emps }, { data: rms }, { data: cps }] = await Promise.all([
        supabase.from("employees").select("id, name, employee_id").in("id", empIds),
        supabase.from("rooms").select("id, room_number").in("id", roomIds),
        supabase.from("camps").select("id, name").in("id", campIds),
      ]);

      const empMap = new Map((emps || []).map((e: any) => [e.id, e]));
      const roomMap = new Map((rms || []).map((r: any) => [r.id, r]));
      const campMap = new Map((cps || []).map((c: any) => [c.id, c]));

      return transfers.map((t: any) => ({
        ...t,
        employee: empMap.get(t.employee_id),
        from_room: roomMap.get(t.from_room_id),
        to_room: roomMap.get(t.to_room_id),
        from_camp: campMap.get(t.from_camp_id),
        to_camp: campMap.get(t.to_camp_id),
      }));
    },
  });
}

export function useRoomOccupants(roomId: string | null) {
  return useQuery({
    queryKey: ["room-occupants", roomId],
    queryFn: async () => {
      if (!roomId) return [];
      // Active occupants: latest check-in not followed by check-out
      const { data: checkIns } = await supabase
        .from("check_ins")
        .select("employee_id, check_in_date")
        .eq("room_id", roomId)
        .order("check_in_date", { ascending: false });

      const empIds = [...new Set((checkIns || []).map((c: any) => c.employee_id))];
      if (empIds.length === 0) return [];

      const { data: checkOuts } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .eq("room_id", roomId)
        .in("employee_id", empIds)
        .order("check_out_date", { ascending: false });

      const latestIn = new Map<string, string>();
      (checkIns || []).forEach((c: any) => {
        if (!latestIn.has(c.employee_id)) latestIn.set(c.employee_id, c.check_in_date);
      });
      const latestOut = new Map<string, string>();
      (checkOuts || []).forEach((c: any) => {
        if (!latestOut.has(c.employee_id)) latestOut.set(c.employee_id, c.check_out_date);
      });

      const activeIds = empIds.filter((id) => {
        const ci = latestIn.get(id);
        const co = latestOut.get(id);
        return ci && (!co || new Date(ci) > new Date(co));
      });

      if (activeIds.length === 0) return [];

      const { data: emps } = await supabase
        .from("employees")
        .select("id, name, employee_id, designation, employee_type, supplier_name, project")
        .in("id", activeIds);

      return (emps || []) as any[];
    },
    enabled: !!roomId,
  });
}
