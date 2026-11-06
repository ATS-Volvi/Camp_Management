import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Layers, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { blockFloorNumbers, floorLabel, nextRoomNumbers } from "@/lib/blockStructure";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campId: string;
  block: { id: string; name: string; block_type: string; floors: number };
}

type RoomRow = { id: string; room_number: string; category: string; floor: number; max_capacity: number; current_occupancy: number };
type Category = { category_key: string; name: string; code: string; beds: number; daily_rate: number };

export function useRoomCategoryOptions() {
  return useQuery({
    queryKey: ["room-category-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("room_categories").select("category_key,name,code,beds,daily_rate").eq("is_active", true).order("code");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

export function useBlockFloorNames(blockId?: string) {
  return useQuery({
    queryKey: ["block-floors", blockId],
    queryFn: async () => {
      if (!blockId) return {};
      const { data, error } = await supabase.from("block_floors").select("floor_number,name").eq("building_id", blockId);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((f) => [f.floor_number, f.name])) as Record<number, string>;
    },
    enabled: !!blockId,
  });
}

export default function BlockStructureDialog({ open, onOpenChange, campId, block }: Props) {
  const qc = useQueryClient();
  const { data: categories = [] } = useRoomCategoryOptions();
  const { data: floorNames = {} } = useBlockFloorNames(block.id);
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", campId, block.id, "structure"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id,room_number,category,floor,max_capacity,current_occupancy").eq("building_id", block.id).order("room_number");
      if (error) throw error;
      return (data ?? []) as RoomRow[];
    },
  });

  const [blockName, setBlockName] = useState(block.name);
  const [floorCount, setFloorCount] = useState(block.floors || 1);
  const [floorDrafts, setFloorDrafts] = useState<Record<number, string>>({});
  const [roomDrafts, setRoomDrafts] = useState<Record<string, { room_number: string; category: string }>>({});
  const [adding, setAdding] = useState<Record<number, { category: string; count: string }>>({});
  const [busy, setBusy] = useState(false);
  const [visibleFloor, setVisibleFloor] = useState("all");

  useEffect(() => { setBlockName(block.name); setFloorCount(block.floors || 1); }, [block.id, block.name, block.floors]);

  const floors = useMemo(() => {
    return blockFloorNumbers(floorCount, rooms, floorNames);
  }, [floorCount, rooms, floorNames]);

  const refresh = () => {
    ["rooms", "blocks", "camps-list", "block-floors"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const fail = (e: any) => toast({ title: "Could not save", description: e.message, variant: "destructive" });
  const catOf = (key: string) => categories.find((c) => c.category_key === key);

  const hasDrafts = blockName.trim() !== block.name || Object.keys(floorDrafts).length > 0;

  const saveAll = async () => {
    if (!blockName.trim()) return fail({ message: "Block name is required" });
    setBusy(true);
    try {
      for (const [floorStr, draft] of Object.entries(floorDrafts)) {
        const floor = Number(floorStr);
        const name = draft.trim();
        const { error } = name
          ? await supabase.from("block_floors").upsert({ building_id: block.id, floor_number: floor, name }, { onConflict: "building_id,floor_number" })
          : await supabase.from("block_floors").delete().eq("building_id", block.id).eq("floor_number", floor);
        if (error) throw error;
      }
      if (blockName.trim() !== block.name) {
        const { error } = await supabase.from("buildings").update({ name: blockName.trim(), floors: Math.max(...floors) }).eq("id", block.id);
        if (error) throw error;
      }
      setFloorDrafts({});
      toast({ title: "Block structure saved" });
      refresh();
    } catch (e: any) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const addFloor = async () => {
    const n = Math.max(...floors) + 1;
    const { error } = await supabase.from("buildings").update({ floors: n }).eq("id", block.id);
    if (error) return fail(error);
    setFloorCount(n);
    refresh();
  };


  const saveRoom = async (room: RoomRow) => {
    const draft = roomDrafts[room.id];
    if (!draft) return;
    const cat = catOf(draft.category);
    const beds = cat?.beds ?? room.max_capacity;
    if (!draft.room_number.trim()) return fail({ message: "Room number is required" });
    if (beds < room.current_occupancy) return fail({ message: `${room.room_number} has ${room.current_occupancy} residents; choose a type with at least that many beds.` });
    const { error } = await supabase.from("rooms").update({
      room_number: draft.room_number.trim(),
      category: draft.category as any,
      max_capacity: beds,
    }).eq("id", room.id);
    if (error) return fail(error.code === "23505" ? { message: "That room number already exists in this block." } : error);
    setRoomDrafts((d) => { const { [room.id]: _, ...rest } = d; return rest; });
    toast({ title: "Room updated" });
    refresh();
  };

  const addRooms = async (floor: number) => {
    const a = adding[floor];
    const cat = a && catOf(a.category);
    const count = Math.min(Math.max(parseInt(a?.count || "0"), 0), 100);
    if (!cat || !count) return fail({ message: "Choose a room type and how many rooms." });
    const numbers = nextRoomNumbers(blockName || block.name, floor, count, rooms.map((r) => r.room_number));
    setBusy(true);
    const { error } = await supabase.from("rooms").insert(numbers.map((room_number) => ({
      building_id: block.id, camp_id: campId, room_number, floor,
      category: cat.category_key as any, max_capacity: cat.beds, daily_rate: cat.daily_rate,
    })));
    setBusy(false);
    if (error) return fail(error);
    if (floor > (block.floors || 1)) await supabase.from("buildings").update({ floors: floor }).eq("id", block.id);
    toast({ title: `${count} room${count > 1 ? "s" : ""} added to ${floorLabel(floor, floorNames)}` });
    setAdding((s) => ({ ...s, [floor]: { category: a.category, count: "" } }));
    refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Layers size={18} /> Manage block structure</DialogTitle>
          <DialogDescription>Rename the block and floors, add floors, add rooms per floor, and edit room numbers or types. One Save changes button applies block and floor name edits. Existing residents and history stay linked.</DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2 rounded-lg border p-3">
          <div className="flex-1 space-y-1.5">
            <Label>Block name</Label>
            <Input value={blockName} onChange={(e) => setBlockName(e.target.value)} />
          </div>
          <Button onClick={saveAll} disabled={busy || !hasDrafts}><Save size={14} className="mr-1" /> Save changes</Button>
          <Button variant="outline" onClick={addFloor}><Plus size={14} className="mr-1" /> Add floor</Button>
        </div>

        <Select value={visibleFloor} onValueChange={setVisibleFloor}>
          <SelectTrigger aria-label="Floor to edit"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All floors</SelectItem>
            {floors.map((floor) => <SelectItem key={floor} value={String(floor)}>{floorLabel(floor, floorNames)} · Floor {floor}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="space-y-4">
          {floors.filter((floor) => visibleFloor === "all" || String(floor) === visibleFloor).map((floor) => {
            const floorRooms = rooms.filter((r) => (r.floor ?? 1) === floor);
            const nameValue = floorDrafts[floor] ?? floorNames[floor] ?? "";
            const add = adding[floor] ?? { category: "", count: "" };
            return (
              <div key={floor} className="rounded-lg border">
                <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 p-3">
                  <Badge variant="secondary">Floor {floor}</Badge>
                  <Input aria-label={`Floor ${floor} name`} className="h-8 max-w-[220px]" placeholder={`Floor ${floor}`} value={nameValue}
                    onChange={(e) => setFloorDrafts((d) => ({ ...d, [floor]: e.target.value }))} />
                  <span className="ml-auto text-xs text-muted-foreground">{floorRooms.length} rooms</span>
                </div>

                <div className="p-3 space-y-2">
                  {floorRooms.map((room) => {
                    const d = roomDrafts[room.id] ?? { room_number: room.room_number, category: room.category };
                    const dirty = !!roomDrafts[room.id];
                    return (
                      <div key={room.id} className="grid grid-cols-[1fr_1.6fr_auto_auto] items-center gap-2">
                        <Input className="h-8" value={d.room_number} onChange={(e) => setRoomDrafts((s) => ({ ...s, [room.id]: { ...d, room_number: e.target.value } }))} />
                        <Select value={d.category} onValueChange={(v) => setRoomDrafts((s) => ({ ...s, [room.id]: { ...d, category: v } }))}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Room type" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => <SelectItem key={c.category_key} value={c.category_key}>{c.code} · {c.name} ({c.beds} bed)</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground w-16 text-right">{room.current_occupancy}/{room.max_capacity} beds</span>
                        <Button size="sm" variant={dirty ? "default" : "ghost"} disabled={!dirty} onClick={() => saveRoom(room)}>
                          {dirty ? <Save size={13} /> : <Pencil size={13} />}
                        </Button>
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed">
                    <span className="text-xs font-medium">Add rooms:</span>
                    <Select value={add.category} onValueChange={(v) => setAdding((s) => ({ ...s, [floor]: { ...add, category: v } }))}>
                      <SelectTrigger className="h-8 w-[260px]"><SelectValue placeholder="Room type from master" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.category_key} value={c.category_key}>{c.code} · {c.name} ({c.beds} bed)</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input className="h-8 w-20" type="number" min={1} max={100} placeholder="Qty" value={add.count}
                      onChange={(e) => setAdding((s) => ({ ...s, [floor]: { ...add, count: e.target.value } }))} />
                    <Button size="sm" disabled={busy} onClick={() => addRooms(floor)}><Plus size={13} className="mr-1" /> Add</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
