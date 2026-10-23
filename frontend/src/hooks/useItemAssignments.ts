import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ItemAssignment {
  id: string;
  employee_id: string;
  camp_id: string;
  item_name: string;
  category: string;
  quantity: number;
  assigned_date: string;
  returned_date: string | null;
  condition: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employees?: { name: string; employee_id: string };
  camps?: { name: string };
}

export function useItemAssignments(campId?: string) {
  return useQuery({
    queryKey: ["item-assignments", campId],
    queryFn: async () => {
      let query = supabase
        .from("item_assignments")
        .select("*, employees(name, employee_id), camps(name)")
        .order("assigned_date", { ascending: false });
      if (campId) query = query.eq("camp_id", campId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ItemAssignment[];
    },
  });
}

export function useCreateItemAssignment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (item: {
      employee_id: string;
      camp_id: string;
      item_name: string;
      category: string;
      quantity: number;
      condition?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("item_assignments")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item-assignments"] });
      toast({ title: "Item assigned successfully" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateItemAssignment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      returned_date?: string | null;
      condition?: string;
      notes?: string;
      quantity?: number;
    }) => {
      const { data, error } = await supabase
        .from("item_assignments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item-assignments"] });
      toast({ title: "Assignment updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteItemAssignment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("item_assignments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item-assignments"] });
      toast({ title: "Assignment removed" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
