import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RoomCategoryMaster {
  id: string;
  code: string;
  name: string;
  beds: number;
  daily_rate: number;
  holding_charge: number;
  category_key: string | null;
  is_active: boolean;
}

export interface DesignationMapping {
  id: string;
  designation: string;
  room_category_code: string;
}

export function useRoomCategoryMaster() {
  return useQuery({
    queryKey: ["room_categories_master"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_categories")
        .select("*")
        .order("code");
      if (error) throw error;
      return data as RoomCategoryMaster[];
    },
  });
}

export function useDesignationMapping() {
  return useQuery({
    queryKey: ["designation_room_mapping"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("designation_room_mapping")
        .select("*")
        .order("designation");
      if (error) throw error;
      return data as DesignationMapping[];
    },
  });
}

export function useUpsertRoomCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<RoomCategoryMaster> & { code: string; name: string; beds: number; daily_rate: number }) => {
      const { error } = await supabase.from("room_categories").upsert(row, { onConflict: "code" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room_categories_master"] }),
  });
}

export function useDeleteRoomCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("room_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room_categories_master"] }),
  });
}

export function useAddMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { designation: string; room_category_code: string }) => {
      const { error } = await supabase.from("designation_room_mapping").insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designation_room_mapping"] }),
  });
}

export function useDeleteMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("designation_room_mapping").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designation_room_mapping"] }),
  });
}

/** Returns set of allowed category_keys (matching rooms.category) for a given designation */
export function getAllowedCategoryKeys(
  designation: string | null,
  mappings: DesignationMapping[],
  categories: RoomCategoryMaster[]
): Set<string> {
  if (!designation) return new Set(categories.map(c => c.category_key || "").filter(Boolean));
  const codes = new Set(
    mappings
      .filter(m => m.designation.toLowerCase() === designation.toLowerCase())
      .map(m => m.room_category_code)
  );
  const keys = categories
    .filter(c => codes.has(c.code) && c.category_key)
    .map(c => c.category_key as string);
  return new Set(keys);
}
