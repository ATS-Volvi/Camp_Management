import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAddRoom, useBulkAddRooms } from "@/hooks/useCampManagement";
import { NEW_ROOM_CATEGORIES, getRoomCategoryCapacity, getAllowedDesignations } from "@/constants/roomCategories";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  blockId: string;
  blockName: string;
}

export default function AddRoomDialog({ open, onOpenChange, campId, blockId, blockName }: Props) {
  const addRoom = useAddRoom();
  const bulkAdd = useBulkAddRooms();
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // Single form
  const [form, setForm] = useState({
    room_number: "",
    category: "staff_4bed",
    floor: "1",
    ac: true,
    attached_bathroom: false,
    daily_rate: "70",
    daily_food_rate: "30",
  });

  // Bulk form
  const [bulk, setBulk] = useState({
    prefix: blockName.charAt(0).toUpperCase(),
    startNum: "101",
    count: "10",
    category: "staff_4bed",
    floor: "1",
    ac: true,
    attached_bathroom: false,
    daily_rate: "70",
    daily_food_rate: "30",
  });

  const getCapacity = (cat: string) => getRoomCategoryCapacity(cat);

  const handleSingleSubmit = () => {
    if (!form.room_number.trim()) return;
    addRoom.mutate(
      {
        building_id: blockId,
        camp_id: campId,
        room_number: form.room_number.trim(),
        category: form.category as any,
        floor: parseInt(form.floor) || 1,
        max_capacity: getCapacity(form.category),
        ac: form.ac,
        attached_bathroom: form.attached_bathroom,
        daily_rate: parseFloat(form.daily_rate) || 0,
        daily_food_rate: parseFloat(form.daily_food_rate) || 0,
      } as any,
      {
        onSuccess: () => {
          setForm({ room_number: "", category: "staff_4bed", floor: "1", ac: true, attached_bathroom: false, daily_rate: "70", daily_food_rate: "30" });
          onOpenChange(false);
        },
      }
    );
  };

  const handleBulkSubmit = () => {
    const start = parseInt(bulk.startNum) || 101;
    const count = Math.min(parseInt(bulk.count) || 10, 200);
    const rooms = Array.from({ length: count }, (_, i) => ({
      building_id: blockId,
      camp_id: campId,
      room_number: `${bulk.prefix}-${start + i}`,
      category: bulk.category as any,
      floor: parseInt(bulk.floor) || 1,
      max_capacity: getCapacity(bulk.category),
      ac: bulk.ac,
      attached_bathroom: bulk.attached_bathroom,
      daily_rate: parseFloat(bulk.daily_rate) || 0,
      daily_food_rate: parseFloat(bulk.daily_food_rate) || 0,
    }));
    bulkAdd.mutate(rooms as any, {
      onSuccess: () => {
        setBulk({ prefix: blockName.charAt(0).toUpperCase(), startNum: "101", count: "10", category: "staff_4bed", floor: "1", ac: true, attached_bathroom: false, daily_rate: "70", daily_food_rate: "30" });
        onOpenChange(false);
      },
    });
  };

  const isPending = addRoom.isPending || bulkAdd.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Rooms to {blockName}</DialogTitle>
          <DialogDescription>Create single or bulk rooms.</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1">Single Room</TabsTrigger>
            <TabsTrigger value="bulk" className="flex-1">Bulk Create</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Room Number *</Label>
                <Input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} placeholder="A-101" />
              </div>
              <div className="space-y-1.5">
                <Label>Room Type</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NEW_ROOM_CATEGORIES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label} ({t.capacity} beds)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Floor</Label>
                <Input type="number" min={1} value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Bed Count</Label>
                <Input disabled value={getCapacity(form.category)} />
              </div>
              <div className="space-y-1.5">
                <Label>Daily Room Rate (SAR)</Label>
                <Input type="number" min={0} step={5} value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} placeholder="70" />
              </div>
              <div className="space-y-1.5">
                <Label>Daily Food Rate (SAR)</Label>
                <Input type="number" min={0} step={5} value={form.daily_food_rate} onChange={(e) => setForm({ ...form, daily_food_rate: e.target.value })} placeholder="30" />
              </div>
            </div>
            {getAllowedDesignations(form.category).length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Allowed Designations</Label>
                <div className="flex flex-wrap gap-1">
                  {getAllowedDesignations(form.category).map((d) => (
                    <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.ac} onCheckedChange={(v) => setForm({ ...form, ac: v })} />
                <Label>AC</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.attached_bathroom} onCheckedChange={(v) => setForm({ ...form, attached_bathroom: v })} />
                <Label>Attached Bathroom</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Room Prefix</Label>
                <Input value={bulk.prefix} onChange={(e) => setBulk({ ...bulk, prefix: e.target.value })} placeholder="A" />
              </div>
              <div className="space-y-1.5">
                <Label>Starting Number</Label>
                <Input type="number" value={bulk.startNum} onChange={(e) => setBulk({ ...bulk, startNum: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Number of Rooms</Label>
                <Input type="number" min={1} max={200} value={bulk.count} onChange={(e) => setBulk({ ...bulk, count: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Room Type</Label>
                <Select value={bulk.category} onValueChange={(v) => setBulk({ ...bulk, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NEW_ROOM_CATEGORIES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label} ({t.capacity} beds)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Floor</Label>
                <Input type="number" min={1} value={bulk.floor} onChange={(e) => setBulk({ ...bulk, floor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Bed Count (each)</Label>
                <Input disabled value={getCapacity(bulk.category)} />
              </div>
              <div className="space-y-1.5">
                <Label>Daily Room Rate (SAR)</Label>
                <Input type="number" min={0} step={5} value={bulk.daily_rate} onChange={(e) => setBulk({ ...bulk, daily_rate: e.target.value })} placeholder="70" />
              </div>
              <div className="space-y-1.5">
                <Label>Daily Food Rate (SAR)</Label>
                <Input type="number" min={0} step={5} value={bulk.daily_food_rate} onChange={(e) => setBulk({ ...bulk, daily_food_rate: e.target.value })} placeholder="30" />
              </div>
            </div>
            {getAllowedDesignations(bulk.category).length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Allowed Designations</Label>
                <div className="flex flex-wrap gap-1">
                  {getAllowedDesignations(bulk.category).map((d) => (
                    <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={bulk.ac} onCheckedChange={(v) => setBulk({ ...bulk, ac: v })} />
                <Label>AC</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={bulk.attached_bathroom} onCheckedChange={(v) => setBulk({ ...bulk, attached_bathroom: v })} />
                <Label>Attached Bathroom</Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Preview: {bulk.prefix}-{bulk.startNum} to {bulk.prefix}-{parseInt(bulk.startNum || "101") + parseInt(bulk.count || "10") - 1} ({bulk.count} rooms)
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={mode === "single" ? handleSingleSubmit : handleBulkSubmit}
            disabled={isPending}
          >
            {isPending ? "Creating..." : mode === "single" ? "Create Room" : `Create ${bulk.count} Rooms`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
