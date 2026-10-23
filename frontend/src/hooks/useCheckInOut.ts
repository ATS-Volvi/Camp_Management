import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useCamps() {
  return useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useRoomsByCamp(campId: string | null) {
  return useQuery({
    queryKey: ["rooms", campId],
    enabled: !!campId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*, buildings(name)")
        .eq("camp_id", campId!)
        .order("room_number");
      if (error) throw error;
      return data;
    },
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useEmployeesByType(type: "own" | "supplier" | null) {
  return useQuery({
    queryKey: ["employees-by-type", type],
    enabled: !!type,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("employee_type", type!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useSupplierNames() {
  return useQuery({
    queryKey: ["supplier-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("supplier_name")
        .eq("employee_type", "supplier")
        .not("supplier_name", "is", null);
      if (error) throw error;
      const names = [...new Set((data || []).map(d => d.supplier_name).filter(Boolean))].sort();
      return names as string[];
    },
  });
}

export function useCheckedInEmployees(campId: string | null) {
  return useQuery({
    queryKey: ["checked-in-employees", campId],
    enabled: !!campId,
    queryFn: async () => {
      const { data: checkIns, error: ciErr } = await supabase
        .from("check_ins")
        .select("employee_id, room_id, check_in_date")
        .eq("camp_id", campId!)
        .order("check_in_date", { ascending: false });
      if (ciErr) throw ciErr;

      const { data: checkOuts, error: coErr } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .eq("camp_id", campId!)
        .order("check_out_date", { ascending: false });
      if (coErr) throw coErr;

      // Build latest check-out date per employee
      const latestCheckOut = new Map<string, string>();
      (checkOuts || []).forEach(co => {
        if (!latestCheckOut.has(co.employee_id)) {
          latestCheckOut.set(co.employee_id, co.check_out_date);
        }
      });

      // Deduplicate by employee_id, keep latest check-in only if after latest check-out
      const empRoomMap = new Map<string, string>();
      (checkIns || []).forEach(ci => {
        if (empRoomMap.has(ci.employee_id)) return;
        const lastOut = latestCheckOut.get(ci.employee_id);
        if (!lastOut || new Date(ci.check_in_date) > new Date(lastOut)) {
          empRoomMap.set(ci.employee_id, ci.room_id);
        }
      });

      if (empRoomMap.size === 0) return [];

      const empIds = [...empRoomMap.keys()];
      const { data: empData, error: empErr } = await supabase
        .from("employees")
        .select("*")
        .in("id", empIds);
      if (empErr) throw empErr;

      return (empData || []).map(emp => ({
        ...emp,
        checked_in_room_id: empRoomMap.get(emp.id) || null,
      }));
    },
  });
}

export function useRecentCheckIns() {
  return useQuery({
    queryKey: ["recent-check-ins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*, employees(name, employee_id), rooms(room_number), camps(name)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useRecentCheckOuts() {
  return useQuery({
    queryKey: ["recent-check-outs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_outs")
        .select("*, employees(name, employee_id), rooms(room_number), camps(name)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      roomId: string;
      campId: string;
      iqamaNumber?: string | null;
      passportNumber?: string | null;
      foodRequired?: boolean;
      checkInDate?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("perform_check_in", {
        p_employee_id: params.employeeId,
        p_room_id: params.roomId,
        p_camp_id: params.campId,
        p_performed_by: user.id,
        p_iqama_number: params.iqamaNumber || null,
        p_passport_number: params.passportNumber || null,
        p_food_required: params.foodRequired ?? true,
        p_check_in_date: params.checkInDate || null,
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["recent-check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["checked-in-employees"] });
      toast({ title: "Check-in successful", description: "Employee has been checked in and room updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Check-in failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      employeeId: string;
      roomId: string;
      campId: string;
      assetsReturned: boolean;
      damageRemarks: string | null;
      clearanceNotes: string | null;
      isBlacklisted?: boolean;
      blacklistReason?: string | null;
      feedback?: string | null;
      feedbackRating?: number | null;
      checkOutDate?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("perform_check_out", {
        p_employee_id: params.employeeId,
        p_room_id: params.roomId,
        p_camp_id: params.campId,
        p_performed_by: user.id,
        p_assets_returned: params.assetsReturned,
        p_damage_remarks: params.damageRemarks,
        p_clearance_notes: params.clearanceNotes,
        p_is_blacklisted: params.isBlacklisted || false,
        p_blacklist_reason: params.blacklistReason || null,
        p_feedback: params.feedback || null,
        p_feedback_rating: params.feedbackRating || null,
        p_check_out_date: params.checkOutDate || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["recent-check-outs"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["checked-in-employees"] });
      toast({ title: "Check-out successful", description: "Employee has been checked out and room updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Check-out failed", description: error.message, variant: "destructive" });
    },
  });
}
