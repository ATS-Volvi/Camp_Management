import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Camp {
  id: string;
  name: string;
  camp_code: string | null;
  location: string;
  project_name: string | null;
  managed_by: string | null;
  contact_number: string | null;
  status: string;
  camp_type: string;
  opening_date: string | null;
  notes: string | null;
  amenities: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: string;
  camp_id: string;
  name: string;
  block_code: string | null;
  block_type: string;
  floors: number;
  supervisor_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  room_number: string;
  building_id: string;
  camp_id: string;
  category: string;
  floor: number;
  max_capacity: number;
  current_occupancy: number;
  status: string;
  ac: boolean;
  attached_bathroom: boolean;
  created_at: string;
  updated_at: string;
}

// ── Camps ──

export function useCamps() {
  return useQuery({
    queryKey: ["camps-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camps")
        .select("*, rooms(id, status, current_occupancy, max_capacity)")
        .order("name");
      if (error) throw error;
      return (data as any[]).map((camp) => ({
        ...camp,
        totalRooms: camp.rooms?.length || 0,
        totalCapacity: camp.rooms?.reduce((s: number, r: any) => s + r.max_capacity, 0) || 0,
        totalOccupants: camp.rooms?.reduce((s: number, r: any) => s + r.current_occupancy, 0) || 0,
        vacantBeds:
          (camp.rooms?.reduce((s: number, r: any) => s + r.max_capacity, 0) || 0) -
          (camp.rooms?.reduce((s: number, r: any) => s + r.current_occupancy, 0) || 0),
      }));
    },
  });
}

export function useAddCamp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (camp: Partial<Camp>) => {
      const code = "CAMP-" + String(Date.now()).slice(-6);
      const { data, error } = await supabase
        .from("camps")
        .insert({ ...camp, camp_code: camp.camp_code || code } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camps-list"] });
      toast({ title: "Camp created successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCamp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Camp> & { id: string }) => {
      const { data, error } = await supabase.from("camps").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camps-list"] });
      toast({ title: "Camp updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Blocks ──

export function useBlocks(campId?: string) {
  return useQuery({
    queryKey: ["blocks", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("*, rooms(id, max_capacity, current_occupancy, status)")
        .eq("camp_id", campId!)
        .order("name");
      if (error) throw error;
      return (data as any[]).map((b) => ({
        ...b,
        totalRooms: b.rooms?.length || 0,
        totalCapacity: b.rooms?.reduce((s: number, r: any) => s + r.max_capacity, 0) || 0,
        totalOccupancy: b.rooms?.reduce((s: number, r: any) => s + r.current_occupancy, 0) || 0,
      }));
    },
    enabled: !!campId,
  });
}

export function useAddBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (block: Partial<Block> & { camp_id: string }) => {
      const code = block.name?.toUpperCase().replace(/\s/g, "-").slice(0, 6) + "-" + String(Date.now()).slice(-4);
      const { data, error } = await supabase
        .from("buildings")
        .insert({ ...block, block_code: block.block_code || code } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["blocks", vars.camp_id] });
      qc.invalidateQueries({ queryKey: ["camps-list"] });
      toast({ title: "Block created successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Block> & { id: string }) => {
      const { data, error } = await supabase.from("buildings").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocks"] });
      qc.invalidateQueries({ queryKey: ["camps-list"] });
      toast({ title: "Block updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Rooms ──

export function useRooms(campId?: string, blockId?: string) {
  return useQuery({
    queryKey: ["rooms", campId, blockId],
    queryFn: async () => {
      let q: any = supabase
        .from("rooms")
        .select("*, buildings:building_id(name)")
        .order("room_number");
      if (campId) q = q.eq("camp_id", campId);
      if (blockId) q = q.eq("building_id", blockId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!(campId || blockId),
  });
}

export function useAddRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (room: Partial<Room> & { building_id: string; camp_id: string }) => {
      const { data, error } = await supabase.from("rooms").insert(room as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["blocks"] });
      qc.invalidateQueries({ queryKey: ["camps-list"] });
      toast({ title: "Room created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useBulkAddRooms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rooms: Partial<Room>[]) => {
      const { data, error } = await supabase.from("rooms").insert(rooms as any[]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["blocks"] });
      qc.invalidateQueries({ queryKey: ["camps-list"] });
      toast({ title: `${(data as any[]).length} rooms created` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Room> & { id: string }) => {
      const { data, error } = await supabase.from("rooms").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["blocks"] });
      qc.invalidateQueries({ queryKey: ["camps-list"] });
      toast({ title: "Room updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
