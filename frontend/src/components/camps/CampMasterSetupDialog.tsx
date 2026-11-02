import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import RoomConfigMasterDialog, {
  RoomSpecification,
  getStoredRoomSpecifications,
  DEFAULT_ROOM_SPECIFICATIONS,
} from "./RoomConfigMasterDialog";
import {
  Building2,
  BedDouble,
  CheckCircle2,
  Trash2,
  Plus,
  Sliders,
  Wind,
  Bath,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Copy,
  Layers,
  Check,
  CheckSquare,
  Search,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Lock,
  Wifi,
  ExternalLink,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
  existingBlocks?: { id: string; name: string; block_type: string; floors: number }[];
  onComplete?: () => void;
}

export interface GeneratedRoomItem {
  tempId: string;
  blockTempId: string;
  blockName: string;
  floor: number;
  room_number: string;
  specId: string; // references RoomSpecification id
  category: string;
  categoryLabel: string;
  max_capacity: number;
  ac: boolean;
  attached_bathroom: boolean;
  daily_rate: number;
  daily_food_rate: number;
}

export interface BlockHierarchyItem {
  id: string;
  name: string;
  block_type: string;
  floors: number;
  supervisor_name: string;
  prefix: string;
  numberingFormat: "3digit" | "4digit" | "g_style" | "sequential";
  isExisting?: boolean;
}

const BLOCK_TYPES = [
  { value: "staff", label: "Staff Wing / Block" },
  { value: "executive", label: "Executive Wing / Block" },
  { value: "worker", label: "Workforce / Worker Wing" },
  { value: "supervisor", label: "Supervisor Wing" },
  { value: "labor", label: "Labor Block" },
  { value: "technician", label: "Technician Wing" },
];

export default function CampMasterSetupDialog({
  open,
  onOpenChange,
  campId,
  campName,
  existingBlocks = [],
  onComplete,
}: Props) {
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roomConfigMasterOpen, setRoomConfigMasterOpen] = useState(false);
  const [availableSpecs, setAvailableSpecs] = useState<RoomSpecification[]>([]);

  // Blocks Hierarchy
  const [blocks, setBlocks] = useState<BlockHierarchyItem[]>([
    {
      id: "b-1",
      name: "Block A - Staff Wing",
      block_type: "staff",
      floors: 3,
      supervisor_name: "Eng. Tariq Al-Otaibi",
      prefix: "A",
      numberingFormat: "3digit",
    },
    {
      id: "b-2",
      name: "Block B - Technical Wing",
      block_type: "technician",
      floors: 2,
      supervisor_name: "Ahmed Hassan",
      prefix: "B",
      numberingFormat: "3digit",
    },
  ]);

  // Tree Expansion state (blockId -> boolean)
  const [expandedBlocks, setExpandedBlocks] = useState<{ [blockId: string]: boolean }>({
    "b-1": true,
    "b-2": true,
  });

  // Current active node in the hierarchy
  const [activeBlockId, setActiveBlockId] = useState<string>("b-1");
  const [activeFloor, setActiveFloor] = useState<number>(1);
  const [treeSearchQuery, setTreeSearchQuery] = useState("");

  // Room Matrix Items
  const [rooms, setRooms] = useState<GeneratedRoomItem[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());

  // Range Tool state
  const [rangeStartRoom, setRangeStartRoom] = useState<string>("");
  const [rangeEndRoom, setRangeEndRoom] = useState<string>("");
  const [rangeSelectedSpecId, setRangeSelectedSpecId] = useState<string>("");

  // Load available specifications
  useEffect(() => {
    if (open) {
      const stored = getStoredRoomSpecifications();
      setAvailableSpecs(stored);
      if (stored.length > 0 && !rangeSelectedSpecId) {
        setRangeSelectedSpecId(stored[2]?.id || stored[0]?.id);
      }
    }
  }, [open]);

  // Helper to build room number
  const buildRoomNumber = (prefix: string, floor: number, index: number, format: string) => {
    const cleanPrefix = prefix.trim() ? `${prefix.trim()}-` : "";
    if (format === "3digit") {
      const num = floor * 100 + index;
      return `${cleanPrefix}${num}`;
    }
    if (format === "4digit") {
      const flrStr = String(floor).padStart(2, "0");
      const idxStr = String(index).padStart(2, "0");
      return `${cleanPrefix}${flrStr}${idxStr}`;
    }
    if (format === "g_style") {
      if (floor === 1) {
        return `${cleanPrefix}G${String(index).padStart(2, "0")}`;
      }
      const num = (floor - 1) * 100 + index;
      return `${cleanPrefix}${num}`;
    }
    return `${cleanPrefix}${index}`;
  };

  // Find next unused room number on a floor
  const findNextRoomNumber = (prefix: string, floor: number, format: string, floorRooms: GeneratedRoomItem[]) => {
    let idx = 1;
    while (true) {
      const candidate = buildRoomNumber(prefix, floor, idx, format);
      if (!floorRooms.some((r) => r.room_number === candidate)) {
        return candidate;
      }
      idx++;
    }
  };

  // Initial scaffolding on open
  useEffect(() => {
    if (open && rooms.length === 0) {
      const specsList = getStoredRoomSpecifications();
      const defaultSpec = specsList.find((s) => s.id === "spec-staff-04") || specsList[0] || DEFAULT_ROOM_SPECIFICATIONS[2];
      const supSpec = specsList.find((s) => s.id === "spec-sup-02") || specsList[1] || DEFAULT_ROOM_SPECIFICATIONS[1];

      const initialRooms: GeneratedRoomItem[] = [];
      blocks.forEach((block) => {
        for (let flr = 1; flr <= block.floors; flr++) {
          const roomsOnThisFloor = 8;
          for (let r = 1; r <= roomsOnThisFloor; r++) {
            // Give first 2 rooms on Floor 1 supervisor spec for demonstration of mixed rooms
            const useSpec = flr === 1 && r <= 2 ? supSpec : defaultSpec;
            const roomNumber = buildRoomNumber(block.prefix, flr, r, block.numberingFormat);
            initialRooms.push({
              tempId: `${block.id}-f${flr}-r${r}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              blockTempId: block.id,
              blockName: block.name,
              floor: flr,
              room_number: roomNumber,
              specId: useSpec.id,
              category: useSpec.categoryValue,
              categoryLabel: useSpec.name,
              max_capacity: useSpec.capacity,
              ac: useSpec.ac,
              attached_bathroom: useSpec.attachedBath,
              daily_rate: useSpec.dailyRate,
              daily_food_rate: useSpec.dailyFoodRate,
            });
          }
        }
      });
      setRooms(initialRooms);
    }
  }, [open]);

  // Active Block & Floor computations
  const currentBlock = useMemo(() => {
    return blocks.find((b) => b.id === activeBlockId) || blocks[0];
  }, [blocks, activeBlockId]);

  const activeFloorRooms = useMemo(() => {
    return rooms.filter((r) => r.blockTempId === activeBlockId && r.floor === activeFloor);
  }, [rooms, activeBlockId, activeFloor]);

  const selectedRoomsOnActiveFloor = useMemo(() => {
    return activeFloorRooms.filter((r) => selectedRoomIds.has(r.tempId));
  }, [activeFloorRooms, selectedRoomIds]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalBlocks = blocks.length;
    const totalFloors = blocks.reduce((acc, b) => acc + (b.floors || 1), 0);
    const totalRooms = rooms.length;
    const totalBeds = rooms.reduce((acc, r) => acc + r.max_capacity, 0);
    const acRooms = rooms.filter((r) => r.ac).length;
    const attachedBathRooms = rooms.filter((r) => r.attached_bathroom).length;
    const estDailyRev = rooms.reduce((acc, r) => acc + r.daily_rate, 0);

    return {
      totalBlocks,
      totalFloors,
      totalRooms,
      totalBeds,
      acRooms,
      attachedBathRooms,
      estDailyRev,
    };
  }, [blocks, rooms]);

  // Hierarchy Tree Actions
  const toggleBlockExpand = (blockId: string) => {
    setExpandedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const handleAddBlock = () => {
    const nextLetter = String.fromCharCode(65 + blocks.length);
    const newBlock: BlockHierarchyItem = {
      id: `b-${Date.now()}`,
      name: `Block ${nextLetter} - Workforce Wing`,
      block_type: "worker",
      floors: 2,
      supervisor_name: "",
      prefix: nextLetter,
      numberingFormat: "3digit",
    };

    setBlocks([...blocks, newBlock]);
    setExpandedBlocks((prev) => ({ ...prev, [newBlock.id]: true }));
    setActiveBlockId(newBlock.id);
    setActiveFloor(1);

    // Scaffold initial rooms for new block
    const specsList = availableSpecs.length > 0 ? availableSpecs : DEFAULT_ROOM_SPECIFICATIONS;
    const defSpec = specsList.find((s) => s.capacity === 6) || specsList[3] || specsList[0];
    const newRooms: GeneratedRoomItem[] = [];

    for (let flr = 1; flr <= newBlock.floors; flr++) {
      for (let r = 1; r <= 8; r++) {
        const roomNumber = buildRoomNumber(newBlock.prefix, flr, r, newBlock.numberingFormat);
        newRooms.push({
          tempId: `${newBlock.id}-f${flr}-r${r}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          blockTempId: newBlock.id,
          blockName: newBlock.name,
          floor: flr,
          room_number: roomNumber,
          specId: defSpec.id,
          category: defSpec.categoryValue,
          categoryLabel: defSpec.name,
          max_capacity: defSpec.capacity,
          ac: defSpec.ac,
          attached_bathroom: defSpec.attachedBath,
          daily_rate: defSpec.dailyRate,
          daily_food_rate: defSpec.dailyFoodRate,
        });
      }
    }
    setRooms([...rooms, newRooms]);
    toast({ title: "New Block Added", description: `Created ${newBlock.name} with 2 floors.` });
  };

  const handleRemoveBlock = (blockId: string) => {
    if (blocks.length <= 1) {
      toast({ title: "At least one block is required", variant: "destructive" });
      return;
    }
    setBlocks(blocks.filter((b) => b.id !== blockId));
    setRooms(rooms.filter((r) => r.blockTempId !== blockId));
    if (activeBlockId === blockId) {
      const remaining = blocks.filter((b) => b.id !== blockId);
      setActiveBlockId(remaining[0].id);
      setActiveFloor(1);
    }
    toast({ title: "Block Removed" });
  };

  const handleAddFloorToBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const nextFloor = block.floors + 1;

    setBlocks(
      blocks.map((b) => (b.id === blockId ? { ...b, floors: nextFloor } : b))
    );

    // Add default rooms for this new floor
    const specsList = availableSpecs.length > 0 ? availableSpecs : DEFAULT_ROOM_SPECIFICATIONS;
    const defSpec = specsList[2] || specsList[0];
    const newRooms: GeneratedRoomItem[] = [];

    for (let r = 1; r <= 8; r++) {
      const roomNumber = buildRoomNumber(block.prefix, nextFloor, r, block.numberingFormat);
      newRooms.push({
        tempId: `${block.id}-f${nextFloor}-r${r}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        blockTempId: block.id,
        blockName: block.name,
        floor: nextFloor,
        room_number: roomNumber,
        specId: defSpec.id,
        category: defSpec.categoryValue,
        categoryLabel: defSpec.name,
        max_capacity: defSpec.capacity,
        ac: defSpec.ac,
        attached_bathroom: defSpec.attachedBath,
        daily_rate: defSpec.dailyRate,
        daily_food_rate: defSpec.dailyFoodRate,
      });
    }

    setRooms([...rooms, ...newRooms]);
    setActiveBlockId(blockId);
    setActiveFloor(nextFloor);
    toast({
      title: "Floor Added",
      description: `Added Floor ${nextFloor} to ${block.name} with 8 rooms.`,
    });
  };

  // Add a single room to current floor
  const handleAddRoom = (spec?: RoomSpecification) => {
    const block = currentBlock;
    const activeSpec =
      spec ||
      availableSpecs.find((s) => s.id === rangeSelectedSpecId) ||
      availableSpecs[2] ||
      DEFAULT_ROOM_SPECIFICATIONS[2];

    const roomNumber = findNextRoomNumber(
      block.prefix,
      activeFloor,
      block.numberingFormat,
      activeFloorRooms
    );

    const newRoom: GeneratedRoomItem = {
      tempId: `extra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      blockTempId: block.id,
      blockName: block.name,
      floor: activeFloor,
      room_number: roomNumber,
      specId: activeSpec.id,
      category: activeSpec.categoryValue,
      categoryLabel: activeSpec.name,
      max_capacity: activeSpec.capacity,
      ac: activeSpec.ac,
      attached_bathroom: activeSpec.attachedBath,
      daily_rate: activeSpec.dailyRate,
      daily_food_rate: activeSpec.dailyFoodRate,
    };

    setRooms([...rooms, newRoom]);
    toast({
      title: "Room Added",
      description: `Created Room ${roomNumber} (${activeSpec.name}) on Floor ${activeFloor}.`,
    });
  };

  // Apply a room specification to a room item
  const applySpecToRoom = (tempId: string, spec: RoomSpecification) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.tempId === tempId
          ? {
              ...r,
              specId: spec.id,
              category: spec.categoryValue,
              categoryLabel: spec.name,
              max_capacity: spec.capacity,
              ac: spec.ac,
              attached_bathroom: spec.attachedBath,
              daily_rate: spec.dailyRate,
              daily_food_rate: spec.dailyFoodRate,
            }
          : r
      )
    );
  };

  // Apply a preset to all rooms on active floor
  const applyPresetToActiveFloor = (spec: RoomSpecification) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.blockTempId === activeBlockId && r.floor === activeFloor
          ? {
              ...r,
              specId: spec.id,
              category: spec.categoryValue,
              categoryLabel: spec.name,
              max_capacity: spec.capacity,
              ac: spec.ac,
              attached_bathroom: spec.attachedBath,
              daily_rate: spec.dailyRate,
              daily_food_rate: spec.dailyFoodRate,
            }
          : r
      )
    );
    toast({
      title: "Floor Preset Applied",
      description: `All rooms on Floor ${activeFloor} set to "${spec.name}".`,
    });
  };

  // Copy current floor room configuration to all other floors in this block
  const copyCurrentFloorToBlock = () => {
    const block = currentBlock;
    const currentFloorPatterns = activeFloorRooms.map((r) => ({
      specId: r.specId,
      category: r.category,
      categoryLabel: r.categoryLabel,
      max_capacity: r.max_capacity,
      ac: r.ac,
      attached_bathroom: r.attached_bathroom,
      daily_rate: r.daily_rate,
      daily_food_rate: r.daily_food_rate,
    }));

    setRooms((prev) => {
      // Keep rooms from other blocks
      const otherRooms = prev.filter((r) => r.blockTempId !== block.id);
      const updatedBlockRooms: GeneratedRoomItem[] = [];

      for (let f = 1; f <= block.floors; f++) {
        if (f === activeFloor) {
          // Keep current floor
          updatedBlockRooms.push(...prev.filter((r) => r.blockTempId === block.id && r.floor === f));
        } else {
          // Mirror pattern to floor f
          currentFloorPatterns.forEach((p, idx) => {
            const roomNumber = buildRoomNumber(block.prefix, f, idx + 1, block.numberingFormat);
            updatedBlockRooms.push({
              tempId: `${block.id}-f${f}-r${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              blockTempId: block.id,
              blockName: block.name,
              floor: f,
              room_number: roomNumber,
              ...p,
            });
          });
        }
      }
      return [...otherRooms, ...updatedBlockRooms];
    });

    toast({
      title: "Floor Duplicated",
      description: `Copied Floor ${activeFloor} room arrangement to all floors of ${block.name}.`,
    });
  };

  // Multi-select & Batch Actions
  const toggleSelectRoom = (tempId: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId);
      else next.add(tempId);
      return next;
    });
  };

  const toggleSelectAllOnFloor = () => {
    const allSelected = activeFloorRooms.every((r) => selectedRoomIds.has(r.tempId));
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        activeFloorRooms.forEach((r) => next.delete(r.tempId));
      } else {
        activeFloorRooms.forEach((r) => next.add(r.tempId));
      }
      return next;
    });
  };

  const batchApplyToSelected = (updates: Partial<GeneratedRoomItem>) => {
    if (selectedRoomIds.size === 0) return;
    setRooms((prev) =>
      prev.map((r) => (selectedRoomIds.has(r.tempId) ? { ...r, ...updates } : r))
    );
    toast({
      title: "Batch Applied",
      description: `Updated ${selectedRoomsOnActiveFloor.length} rooms on Floor ${activeFloor}.`,
    });
  };

  const deleteSelectedRooms = () => {
    if (selectedRoomIds.size === 0) return;
    const count = selectedRoomsOnActiveFloor.length;
    setRooms((prev) => prev.filter((r) => !selectedRoomIds.has(r.tempId)));
    setSelectedRoomIds(new Set());
    toast({
      title: "Rooms Deleted",
      description: `Removed ${count} rooms from Floor ${activeFloor}.`,
    });
  };

  // Range tool application
  const applyRangeTool = () => {
    if (!rangeStartRoom || !rangeEndRoom) {
      toast({ title: "Select start and end room for range", variant: "destructive" });
      return;
    }
    const spec = availableSpecs.find((s) => s.id === rangeSelectedSpecId);
    if (!spec) return;

    const startIdx = activeFloorRooms.findIndex((r) => r.room_number === rangeStartRoom);
    const endIdx = activeFloorRooms.findIndex((r) => r.room_number === rangeEndRoom);

    if (startIdx === -1 || endIdx === -1) {
      toast({ title: "Invalid room range specified", variant: "destructive" });
      return;
    }

    const min = Math.min(startIdx, endIdx);
    const max = Math.max(startIdx, endIdx);
    const targetRooms = activeFloorRooms.slice(min, max + 1);

    setRooms((prev) =>
      prev.map((r) => {
        if (targetRooms.some((tr) => tr.tempId === r.tempId)) {
          return {
            ...r,
            specId: spec.id,
            category: spec.categoryValue,
            categoryLabel: spec.name,
            max_capacity: spec.capacity,
            ac: spec.ac,
            attached_bathroom: spec.attachedBath,
            daily_rate: spec.dailyRate,
            daily_food_rate: spec.dailyFoodRate,
          };
        }
        return r;
      })
    );

    toast({
      title: "Range Applied",
      description: `Rooms ${activeFloorRooms[min].room_number} to ${activeFloorRooms[max].room_number} set to ${spec.name}.`,
    });
  };

  // Final Commit to Database
  const handleConfirmAndSave = async () => {
    if (rooms.length === 0) {
      toast({ title: "No rooms to build", variant: "destructive" });
      return;
    }

    // Check for duplicate room numbers within the entire set
    const seen = new Set<string>();
    for (const r of rooms) {
      if (seen.has(r.room_number)) {
        toast({
          title: "Duplicate Room Numbers Found",
          description: `Room number "${r.room_number}" appears multiple times. Please adjust numbers before saving.`,
          variant: "destructive",
        });
        return;
      }
      seen.add(r.room_number);
    }

    setIsSubmitting(true);
    try {
      // Step A: Create blocks in buildings table
      const blockIdMap = new Map<string, string>();

      for (const block of blocks) {
        if (block.isExisting) {
          blockIdMap.set(block.id, block.id);
        } else {
          const code =
            block.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) +
            "-" +
            String(Date.now()).slice(-4);

          const { data: bData, error: bErr } = await supabase
            .from("buildings")
            .insert({
              camp_id: campId,
              name: block.name.trim(),
              block_type: block.block_type,
              floors: block.floors,
              supervisor_name: block.supervisor_name || null,
              block_code: code,
              status: "active",
            } as any)
            .select()
            .single();

          if (bErr) throw new Error(`Failed to create block ${block.name}: ${bErr.message}`);
          blockIdMap.set(block.id, (bData as any).id);
        }
      }

      // Step B: Batch create all rooms
      const payloadRooms = rooms.map((r) => {
        const buildingId = blockIdMap.get(r.blockTempId);
        if (!buildingId) throw new Error(`Missing building id mapping for room ${r.room_number}`);
        return {
          building_id: buildingId,
          camp_id: campId,
          room_number: r.room_number.trim(),
          category: r.category as any,
          floor: r.floor,
          max_capacity: r.max_capacity,
          current_occupancy: 0,
          status: "available",
          ac: r.ac,
          attached_bathroom: r.attached_bathroom,
          daily_rate: r.daily_rate,
          daily_food_rate: r.daily_food_rate,
        };
      });

      const { error: rErr } = await supabase
        .from("rooms")
        .insert(payloadRooms as any)
        .select();

      if (rErr) throw new Error(`Failed to save rooms: ${rErr.message}`);

      // Refresh react-query caches
      qc.invalidateQueries({ queryKey: ["blocks", campId] });
      qc.invalidateQueries({ queryKey: ["blocks"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["camps-list"] });
      qc.invalidateQueries({ queryKey: ["camp", campId] });

      toast({
        title: "Camp Structure Built Successfully!",
        description: `Created ${blocks.length} blocks with ${rooms.length} rooms and ${summary.totalBeds} total bed capacity.`,
      });

      onOpenChange(false);
      if (onComplete) onComplete();
    } catch (err: any) {
      toast({
        title: "Structure Build Failed",
        description: err.message || "An error occurred while saving the camp structure.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[96vw] w-[1480px] max-h-[96vh] h-[920px] flex flex-col p-0 overflow-hidden bg-background">
          {/* Top Header */}
          <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-blue-950/15 via-primary/5 to-transparent flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                    <Building2 size={13} /> Camp Master Structure Setup
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs font-bold">
                    {campName}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground hidden md:inline">
                    &bull; Hierarchical Infrastructure Scaffold: <strong>Camp &rarr; Block &rarr; Floor &rarr; Room</strong>
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold tracking-tight">
                  Camp Infrastructure & Floor Plan Workbench
                </DialogTitle>
              </div>

              {/* Top Primary Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRoomConfigMasterOpen(true)}
                  className="text-xs h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Sliders size={13} /> Room Configurations Catalog
                </Button>

                <Button
                  size="sm"
                  disabled={isSubmitting || rooms.length === 0}
                  onClick={handleConfirmAndSave}
                  className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Building Structure...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Save & Build Structure ({summary.totalRooms} Rooms &bull; {summary.totalBeds} Beds)
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* KPI Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-3 pt-2.5 border-t border-border/40 text-xs">
              <div className="bg-background/80 p-2 rounded-md border flex flex-col shadow-2xs">
                <span className="text-muted-foreground text-[11px]">Camp Sites</span>
                <span className="font-bold text-sm text-foreground">1 Site</span>
              </div>
              <div className="bg-background/80 p-2 rounded-md border flex flex-col shadow-2xs">
                <span className="text-muted-foreground text-[11px]">Blocks / Wings</span>
                <span className="font-bold text-sm text-foreground">{summary.totalBlocks} Blocks</span>
              </div>
              <div className="bg-background/80 p-2 rounded-md border flex flex-col shadow-2xs">
                <span className="text-muted-foreground text-[11px]">Floor Levels</span>
                <span className="font-bold text-sm text-foreground">{summary.totalFloors} Floors</span>
              </div>
              <div className="bg-background/80 p-2 rounded-md border flex flex-col shadow-2xs">
                <span className="text-muted-foreground text-[11px]">Total Rooms</span>
                <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                  {summary.totalRooms} Rooms
                </span>
              </div>
              <div className="bg-background/80 p-2 rounded-md border flex flex-col shadow-2xs">
                <span className="text-muted-foreground text-[11px]">Total Bed Capacity</span>
                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {summary.totalBeds} Beds
                </span>
              </div>
              <div className="bg-background/80 p-2 rounded-md border flex flex-col shadow-2xs">
                <span className="text-muted-foreground text-[11px]">Est. Daily Revenue</span>
                <span className="font-bold text-sm text-foreground">
                  SAR {summary.estDailyRev.toLocaleString()}
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Main 2-Pane Split Workspace */}
          <div className="flex-1 flex overflow-hidden">
            {/* ════════ LEFT PANE: HIERARCHY TREE EXPLORER (320px) ════════ */}
            <div className="w-[310px] border-r bg-muted/15 flex flex-col flex-shrink-0">
              {/* Tree Explorer Search & Add Block Header */}
              <div className="p-3 border-b space-y-2 bg-background/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers size={13} className="text-primary" /> Facility Tree
                  </span>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-6 text-[11px] gap-1 text-primary hover:bg-primary/10 px-1.5"
                    onClick={handleAddBlock}
                  >
                    <Plus size={12} /> Add Block
                  </Button>
                </div>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={treeSearchQuery}
                    onChange={(e) => setTreeSearchQuery(e.target.value)}
                    placeholder="Search blocks, floors..."
                    className="h-7 pl-7 text-xs bg-background"
                  />
                </div>
              </div>

              {/* Tree Node List */}
              <ScrollArea className="flex-1 p-2 space-y-1 text-xs overflow-y-auto">
                {/* Root: Camp Node */}
                <div className="p-2 rounded-md bg-secondary/30 border font-semibold flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-primary" />
                    <span className="font-bold truncate max-w-[150px]">{campName}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1 py-0 bg-background">
                    {summary.totalRooms} Rms
                  </Badge>
                </div>

                {/* Blocks in tree */}
                {blocks.map((block) => {
                  const isExpanded = !!expandedBlocks[block.id];
                  const isBlockActive = activeBlockId === block.id;
                  const blockRooms = rooms.filter((r) => r.blockTempId === block.id);
                  const blockBeds = blockRooms.reduce((acc, r) => acc + r.max_capacity, 0);

                  return (
                    <div key={block.id} className="space-y-0.5">
                      {/* Block Node Row */}
                      <div
                        className={`group flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors ${
                          isBlockActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-muted text-foreground"
                        }`}
                        onClick={() => {
                          setActiveBlockId(block.id);
                          setActiveFloor(1);
                        }}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBlockExpand(block.id);
                            }}
                            className="p-0.5 text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <Building2 size={13} className={isBlockActive ? "text-primary" : "text-muted-foreground"} />
                          <span className="truncate text-xs">{block.name}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-background">
                            {block.floors}F &bull; {blockRooms.length}R
                          </Badge>
                          {blocks.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveBlock(block.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity"
                              title="Delete block"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Floor Children Nodes */}
                      {isExpanded && (
                        <div className="pl-5 space-y-0.5 border-l-2 border-primary/20 ml-2.5 my-1">
                          {Array.from({ length: block.floors }, (_, i) => i + 1).map((flr) => {
                            const isFloorActive = isBlockActive && activeFloor === flr;
                            const flrRooms = rooms.filter(
                              (r) => r.blockTempId === block.id && r.floor === flr
                            );
                            const flrBeds = flrRooms.reduce((acc, r) => acc + r.max_capacity, 0);

                            return (
                              <div
                                key={flr}
                                onClick={() => {
                                  setActiveBlockId(block.id);
                                  setActiveFloor(flr);
                                  setSelectedRoomIds(new Set());
                                }}
                                className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer text-[11px] transition-colors ${
                                  isFloorActive
                                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                                    : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Layers size={12} />
                                  <span>Floor {flr}</span>
                                </div>
                                <span
                                  className={`text-[10px] px-1 rounded ${
                                    isFloorActive ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground"
                                  }`}
                                >
                                  {flrRooms.length} Rms &bull; {flrBeds} Beds
                                </span>
                              </div>
                            );
                          })}

                          {/* Add Floor to Block Button */}
                          <button
                            type="button"
                            onClick={() => handleAddFloorToBlock(block.id)}
                            className="w-full text-left py-1 px-1.5 text-[11px] text-primary hover:underline flex items-center gap-1"
                          >
                            <Plus size={11} /> Add Floor to {block.name}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            </div>

            {/* ════════ RIGHT PANE: LEVEL WORKBENCH (CAMP > BLOCK > FLOOR) ════════ */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              {/* Floor Header Bar */}
              <div className="p-4 py-3 border-b bg-card space-y-2">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="hover:text-foreground cursor-pointer font-medium">{campName}</span>
                  <ChevronRight size={12} />
                  <span className="hover:text-foreground cursor-pointer font-medium">{currentBlock.name}</span>
                  <ChevronRight size={12} />
                  <span className="font-bold text-foreground">Floor {activeFloor}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Layers size={16} className="text-primary" />
                      {currentBlock.name} &mdash; Floor {activeFloor} Configuration
                    </h3>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {activeFloorRooms.length} Rooms
                    </Badge>
                    <Badge variant="outline" className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {activeFloorRooms.reduce((acc, r) => acc + r.max_capacity, 0)} Total Beds
                    </Badge>
                  </div>

                  {/* Floor Level Tools */}
                  <div className="flex items-center gap-1.5">
                    {/* Apply Preset Dropdown */}
                    <Select
                      onValueChange={(specId) => {
                        const targetSpec = availableSpecs.find((s) => s.id === specId);
                        if (targetSpec) applyPresetToActiveFloor(targetSpec);
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-44">
                        <SelectValue placeholder="Apply Floor Preset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSpecs.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.name} ({s.capacity}B &bull; SAR {s.dailyRate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {currentBlock.floors > 1 && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={copyCurrentFloorToBlock}
                        className="h-7 text-xs gap-1"
                        title="Copy this floor's room layout to all other floors in this block"
                      >
                        <Copy size={12} /> Duplicate Floor to All
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Floor Setup & Action Toolbar */}
              <div className="p-3 bg-muted/20 border-b flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Select All Checkbox */}
                  <div className="flex items-center gap-1.5 mr-1">
                    <Checkbox
                      checked={
                        activeFloorRooms.length > 0 &&
                        activeFloorRooms.every((r) => selectedRoomIds.has(r.tempId))
                      }
                      onCheckedChange={toggleSelectAllOnFloor}
                      id="select-all-floor-main"
                    />
                    <label htmlFor="select-all-floor-main" className="text-xs cursor-pointer font-medium">
                      Select All ({activeFloorRooms.length})
                    </label>
                  </div>

                  {/* Room Prefix & Numbering Input */}
                  <div className="flex items-center gap-1.5 border-l pl-3">
                    <span className="text-muted-foreground text-[11px]">Prefix:</span>
                    <Input
                      value={currentBlock.prefix}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setBlocks(
                          blocks.map((b) => (b.id === currentBlock.id ? { ...b, prefix: val } : b))
                        );
                      }}
                      className="h-6 w-14 text-xs font-mono font-bold uppercase text-center px-1"
                    />
                  </div>

                  {/* Numbering Format Select */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-[11px]">Format:</span>
                    <Select
                      value={currentBlock.numberingFormat}
                      onValueChange={(val: any) => {
                        setBlocks(
                          blocks.map((b) => (b.id === currentBlock.id ? { ...b, numberingFormat: val } : b))
                        );
                      }}
                    >
                      <SelectTrigger className="h-6 text-xs w-28 font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3digit" className="text-xs font-mono">3-Digit (101..)</SelectItem>
                        <SelectItem value="4digit" className="text-xs font-mono">4-Digit (0101..)</SelectItem>
                        <SelectItem value="g_style" className="text-xs font-mono">G-Style (G01..)</SelectItem>
                        <SelectItem value="sequential" className="text-xs font-mono">Sequential (1..)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add Room Dropdown */}
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(specId) => {
                      const spec = availableSpecs.find((s) => s.id === specId);
                      handleAddRoom(spec);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-40 border-primary/40 text-primary font-medium">
                      <SelectValue placeholder="+ Add Room as..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSpecs.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          + {s.name} ({s.capacity} Beds)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Room Range Tool Strip */}
              {activeFloorRooms.length > 1 && (
                <div className="px-4 py-2 bg-secondary/15 border-b flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground">Range Tool:</span>
                  <span className="text-muted-foreground">From</span>
                  <Select value={rangeStartRoom} onValueChange={setRangeStartRoom}>
                    <SelectTrigger className="h-6 text-xs w-24">
                      <SelectValue placeholder="Room" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeFloorRooms.map((r) => (
                        <SelectItem key={r.tempId} value={r.room_number} className="text-xs font-mono">
                          {r.room_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-muted-foreground">to</span>
                  <Select value={rangeEndRoom} onValueChange={setRangeEndRoom}>
                    <SelectTrigger className="h-6 text-xs w-24">
                      <SelectValue placeholder="Room" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeFloorRooms.map((r) => (
                        <SelectItem key={r.tempId} value={r.room_number} className="text-xs font-mono">
                          {r.room_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-muted-foreground">Set To</span>
                  <Select value={rangeSelectedSpecId} onValueChange={setRangeSelectedSpecId}>
                    <SelectTrigger className="h-6 text-xs w-44">
                      <SelectValue placeholder="Select template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSpecs.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name} ({s.capacity}B &bull; SAR {s.dailyRate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="xs"
                    variant="outline"
                    className="h-6 text-xs px-2"
                    onClick={applyRangeTool}
                  >
                    Apply Range
                  </Button>
                </div>
              )}

              {/* Multi-Select Floating Action Bar */}
              {selectedRoomsOnActiveFloor.length > 0 && (
                <div className="p-2.5 px-4 bg-primary text-primary-foreground shadow-md flex flex-wrap items-center justify-between gap-2 text-xs animate-in slide-in-from-top-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckSquare size={14} />
                    <span>{selectedRoomsOnActiveFloor.length} rooms selected on Floor {activeFloor}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      onValueChange={(specId) => {
                        const targetSpec = availableSpecs.find((s) => s.id === specId);
                        if (targetSpec) {
                          batchApplyToSelected({
                            specId: targetSpec.id,
                            category: targetSpec.categoryValue,
                            categoryLabel: targetSpec.name,
                            max_capacity: targetSpec.capacity,
                            ac: targetSpec.ac,
                            attached_bathroom: targetSpec.attachedBath,
                            daily_rate: targetSpec.dailyRate,
                            daily_food_rate: targetSpec.dailyFoodRate,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs bg-background text-foreground w-40">
                        <SelectValue placeholder="Set Room Spec..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSpecs.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.name} ({s.capacity} Beds)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="xs"
                      variant="secondary"
                      className="h-7 text-xs gap-1"
                      onClick={() => batchApplyToSelected({ ac: true })}
                    >
                      <Wind size={12} /> AC On
                    </Button>

                    <Button
                      size="xs"
                      variant="secondary"
                      className="h-7 text-xs gap-1"
                      onClick={() => batchApplyToSelected({ attached_bathroom: true })}
                    >
                      <Bath size={12} /> Bath On
                    </Button>

                    <Button
                      size="xs"
                      variant="destructive"
                      className="h-7 text-xs gap-1"
                      onClick={deleteSelectedRooms}
                    >
                      <Trash2 size={12} /> Delete ({selectedRoomsOnActiveFloor.length})
                    </Button>

                    <Button
                      size="xs"
                      variant="ghost"
                      className="h-7 text-xs text-primary-foreground hover:bg-primary-foreground/20"
                      onClick={() => setSelectedRoomIds(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Room Cards Grid */}
              <ScrollArea className="flex-1 p-4 overflow-y-auto">
                {activeFloorRooms.length === 0 ? (
                  <div className="text-center py-16 border border-dashed rounded-lg">
                    <p className="text-xs text-muted-foreground">No rooms configured on this floor yet.</p>
                    <Button
                      size="xs"
                      className="mt-2 text-xs"
                      onClick={() => handleAddRoom()}
                    >
                      <Plus size={12} className="mr-1" /> Add First Room
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
                    {activeFloorRooms.map((room) => {
                      const isSelected = selectedRoomIds.has(room.tempId);
                      return (
                        <Card
                          key={room.tempId}
                          className={`border shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group ${
                            isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "bg-card"
                          }`}
                        >
                          <div
                            className={`h-1.5 w-full ${
                              room.max_capacity === 1
                                ? "bg-purple-500"
                                : room.max_capacity === 2
                                ? "bg-blue-500"
                                : room.max_capacity <= 4
                                ? "bg-emerald-500"
                                : room.max_capacity <= 6
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                          />
                          <CardContent className="p-3 space-y-2.5">
                            {/* Top row: Checkbox, Room Number, Bed count badge, Delete */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelectRoom(room.tempId)}
                                  className="h-4 w-4"
                                />
                                <Input
                                  value={room.room_number}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setRooms(
                                      rooms.map((r) =>
                                        r.tempId === room.tempId ? { ...r, room_number: val } : r
                                      )
                                    );
                                  }}
                                  className="h-6 w-20 px-1 text-xs font-mono font-bold"
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 font-bold gap-1"
                                >
                                  <BedDouble size={11} /> {room.max_capacity}B
                                </Badge>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-70 group-hover:opacity-100"
                                  onClick={() =>
                                    setRooms(rooms.filter((r) => r.tempId !== room.tempId))
                                  }
                                  title="Delete room"
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </div>

                            {/* Room Specification / Template Selector */}
                            <div className="space-y-1">
                              <Select
                                value={room.specId || ""}
                                onValueChange={(specId) => {
                                  const spec = availableSpecs.find((s) => s.id === specId);
                                  if (spec) applySpecToRoom(room.tempId, spec);
                                }}
                              >
                                <SelectTrigger className="h-7 text-[11px] font-medium">
                                  <SelectValue placeholder="Room Template" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableSpecs.map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                      {s.name} ({s.capacity} Beds)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Amenities and Daily Rent */}
                            <div className="flex items-center justify-between pt-1 border-t text-xs">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRooms(
                                      rooms.map((r) =>
                                        r.tempId === room.tempId ? { ...r, ac: !r.ac } : r
                                      )
                                    )
                                  }
                                  title={room.ac ? "AC Active" : "No AC"}
                                  className={`p-1 rounded transition-colors ${
                                    room.ac
                                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                                      : "text-muted-foreground/40 hover:text-muted-foreground"
                                  }`}
                                >
                                  <Wind size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRooms(
                                      rooms.map((r) =>
                                        r.tempId === room.tempId
                                          ? { ...r, attached_bathroom: !r.attached_bathroom }
                                          : r
                                      )
                                    )
                                  }
                                  title={room.attached_bathroom ? "Ensuite Private Bath" : "Shared Bath"}
                                  className={`p-1 rounded transition-colors ${
                                    room.attached_bathroom
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "text-muted-foreground/40 hover:text-muted-foreground"
                                  }`}
                                >
                                  <Bath size={13} />
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">SAR</span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={room.daily_rate}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setRooms(
                                      rooms.map((r) =>
                                        r.tempId === room.tempId ? { ...r, daily_rate: val } : r
                                      )
                                    );
                                  }}
                                  className="h-6 w-14 text-right px-1 text-[11px] font-semibold"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Bottom Room Config Master Link Banner */}
              <div className="p-3 px-4 border-t bg-primary/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-muted-foreground">
                    Need new room types, custom bed counts, or new workforce roles?
                  </span>
                </div>
                <Button
                  size="xs"
                  variant="link"
                  onClick={() => setRoomConfigMasterOpen(true)}
                  className="h-auto p-0 text-xs font-semibold text-primary gap-1"
                >
                  Manage specifications in Room Configuration Master &rarr;
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Standalone Dedicated Room Configuration Master Dialog */}
      <RoomConfigMasterDialog
        open={roomConfigMasterOpen}
        onOpenChange={(isOpen) => {
          setRoomConfigMasterOpen(isOpen);
          if (!isOpen) {
            // Reload available specs in case user updated them
            setAvailableSpecs(getStoredRoomSpecifications());
          }
        }}
      />
    </>
  );
}
