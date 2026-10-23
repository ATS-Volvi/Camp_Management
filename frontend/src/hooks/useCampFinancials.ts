import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useCampUtilities(campId?: string, month?: string) {
  return useQuery({
    queryKey: ["camp-utilities", campId, month],
    queryFn: async () => {
      let q = supabase.from("camp_utilities").select("*").order("month", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      if (month) q = q.eq("month", month);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useAddUtility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await supabase.from("camp_utilities").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-utilities"] });
      toast({ title: "Utility cost added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteUtility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("camp_utilities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-utilities"] });
      toast({ title: "Utility cost deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useCampSupplierCosts(campId?: string, month?: string) {
  return useQuery({
    queryKey: ["camp-supplier-costs", campId, month],
    queryFn: async () => {
      let q = supabase.from("camp_supplier_costs").select("*").order("month", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      if (month) q = q.eq("month", month);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useAddSupplierCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const { data, error } = await supabase.from("camp_supplier_costs").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-supplier-costs"] });
      toast({ title: "Supplier cost added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteSupplierCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("camp_supplier_costs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-supplier-costs"] });
      toast({ title: "Supplier cost deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useCampRoomIncome(campId?: string) {
  return useQuery({
    queryKey: ["camp-room-income", campId],
    queryFn: async () => {
      let q = supabase.from("rooms").select("id, room_number, category, max_capacity, current_occupancy, camp_id, camps(name)");
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCampRoomRates() {
  return useQuery({
    queryKey: ["all-camp-room-rates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camp_room_rates").select("*");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCampsWithRent() {
  return useQuery({
    queryKey: ["camps-with-rent"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name, is_rented, monthly_rent, status").order("name");
      if (error) throw error;
      return data as any[];
    },
  });
}
