import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type InventoryItem = Tables<"inventory">;

export function useInventory(campId?: string) {
  return useQuery({
    queryKey: ["inventory", campId],
    queryFn: async () => {
      let query = supabase.from("inventory").select("*").order("item_name");
      if (campId) query = query.eq("camp_id", campId);
      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryItem[];
    },
  });
}

export function useCamps() {
  return useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useAddInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: TablesInsert<"inventory">) => {
      const { balance, ...insertData } = item as any;
      const { data, error } = await supabase
        .from("inventory")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Item added", description: "Inventory item created successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"inventory"> & { id: string }) => {
      const { balance, ...updateData } = updates as any;
      const { data, error } = await supabase
        .from("inventory")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Updated", description: "Inventory item updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useLowStockItems(campId?: string) {
  return useQuery({
    queryKey: ["inventory-low-stock", campId],
    queryFn: async () => {
      let query = supabase
        .from("inventory")
        .select("*")
        .order("item_name");
      if (campId) query = query.eq("camp_id", campId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as InventoryItem[]).filter(
        (item) => (item.balance ?? 0) <= item.min_alert_level
      );
    },
  });
}
