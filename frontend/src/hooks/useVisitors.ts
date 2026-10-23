import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useVisitors(campId: string | null, status: string | null) {
  return useQuery({
    queryKey: ["visitors", campId, status],
    queryFn: async () => {
      let query = supabase
        .from("visitors")
        .select("*, camps(name), employees(name, employee_id)")
        .order("check_in_time", { ascending: false })
        .limit(500);
      if (campId && campId !== "all") query = query.eq("camp_id", campId);
      if (status && status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useVisitorStats(campId: string | null) {
  return useQuery({
    queryKey: ["visitor-stats", campId],
    queryFn: async () => {
      let query = supabase.from("visitors").select("status, camp_id");
      if (campId && campId !== "all") query = query.eq("camp_id", campId);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data || [];
      return {
        total: rows.length,
        checkedIn: rows.filter(r => r.status === "checked_in").length,
        checkedOut: rows.filter(r => r.status === "checked_out").length,
        todayCheckIns: rows.filter(r => {
          const today = new Date().toISOString().slice(0, 10);
          return r.status === "checked_in" || today === today; // all from query
        }).length,
      };
    },
  });
}

export function useCheckInVisitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      visitor_name: string;
      company?: string;
      phone?: string;
      id_number?: string;
      id_type?: string;
      purpose: string;
      host_employee_id?: string | null;
      camp_id: string;
      badge_number?: string;
      vehicle_number?: string;
      expected_check_out?: string | null;
      remarks?: string;
      items_carried?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("visitors").insert({
        ...params,
        host_employee_id: params.host_employee_id || null,
        checked_in_by: user.id,
        status: "checked_in",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitors"] });
      qc.invalidateQueries({ queryKey: ["visitor-stats"] });
      toast({ title: "Visitor checked in", description: "Visitor has been registered successfully." });
    },
    onError: (e: Error) => {
      toast({ title: "Check-in failed", description: e.message, variant: "destructive" });
    },
  });
}

export function useCheckOutVisitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; remarks?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("visitors")
        .update({
          status: "checked_out",
          check_out_time: new Date().toISOString(),
          checked_out_by: user.id,
          remarks: params.remarks || null,
        })
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitors"] });
      qc.invalidateQueries({ queryKey: ["visitor-stats"] });
      toast({ title: "Visitor checked out", description: "Visitor has been checked out successfully." });
    },
    onError: (e: Error) => {
      toast({ title: "Check-out failed", description: e.message, variant: "destructive" });
    },
  });
}
