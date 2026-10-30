import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  NEW_ROOM_CATEGORIES,
  getRoomCategoryCapacity,
  getRoomCategoryLabel,
} from "@/constants/roomCategories";
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
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
  existingBlocks?: { id: string; name: string; block_type: string; floors: number }[];
  onComplete?: () => void;
}

interface BlockConfig {
  id: string; // temp id or existing block id
  isExisting?: boolean;
  name: string;
  block_type: string;
  floors: number;
  supervisor_name: string;
  // Floor template config
  roomsPerFloor: number;
  prefix: string;
  numberingFormat: "3digit" | "4digit" | "g_style" | "sequential";
  defaultCategory: string;
  defaultSharing: number;
  defaultAc: boolean;
  defaultAttachedBath: boolean;
  defaultDailyRate: number;
  defaultDailyFoodRate: number;
}

export interface GeneratedRoomItem {
  tempId: string;
  blockTempId: string;
  blockName: string;
  floor: number;
  room_number: string;
  category: string;
  max_capacity: number;
  ac: boolean;
  attached_bathroom: boolean;
  daily_rate: number;
  daily_food_rate: number;
}

const BLOCK_TYPES = [
  { value: "staff", label: "Staff Block" },
  { value: "executive", label: "Executive Block" },
  { value: "worker", label: "Worker Block" },
  { value: "supervisor", label: "Supervisor Block" },
  { value: "labor", label: "Labor Block" },
  { value: "technician", label: "Technician Block" },
];

const SHARING_OPTIONS = [
  { beds: 1, label: "Single (1 Bed / Private)", defaultCat: "executive_single", defaultRate: 120, hasBath: true },
  { beds: 2, label: "2-Sharing (Twin / Double)", defaultCat: "supervisor_twin", defaultRate: 90, hasBath: true },
  { beds: 3, label: "3-Sharing (Triple)", defaultCat: "staff_4bed", defaultRate: 75, hasBath: false },
  { beds: 4, label: "4-Sharing (Quad Room)", defaultCat: "staff_4bed", defaultRate: 70, hasBath: false },
  { beds: 6, label: "6-Sharing (Skilled Labor)", defaultCat: "skilled_6bed", defaultRate: 60, hasBath: false },
  { beds: 8, label: "8-Sharing (General Dorm)", defaultCat: "general_8bed", defaultRate: 50, hasBath: false },
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Blocks Configuration
  const [blocks, setBlocks] = useState<BlockConfig[]>([
    {
      id: "b-1",
      name: "Block A",
      block_type: "staff",
      floors: 2,
      supervisor_name: "",
      roomsPerFloor: 8,
      prefix: "A",
      numberingFormat: "3digit",
      defaultCategory: "staff_4bed",
      defaultSharing: 4,
      defaultAc: true,
      defaultAttachedBath: false,
      defaultDailyRate: 70,
      defaultDailyFoodRate: 30,
    },
    {
      id: "b-2",
      name: "Block B",
      block_type: "worker",
      floors: 2,
      supervisor_name: "",
      roomsPerFloor: 8,
      prefix: "B",
      numberingFormat: "3digit",
      defaultCategory: "skilled_6bed",
      defaultSharing: 6,
      defaultAc: true,
      defaultAttachedBath: false,
      defaultDailyRate: 60,
      defaultDailyFoodRate: 30,
    },
  ]);

  // Step 3: Generated Rooms Matrix (Interactive Review)
  const [generatedRooms, setGeneratedRooms] = useState<GeneratedRoomItem[]>([]);
  const [activePreviewBlock, setActivePreviewBlock] = useState<string>("");
  const [activePreviewFloor, setActivePreviewFloor] = useState<number>(1);

  // Helper to update a block config
  const updateBlock = (index: number, updates: Partial<BlockConfig>) => {
    setBlocks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Add block
  const handleAddBlock = () => {
    const nextLetter = String.fromCharCode(65 + blocks.length);
    const newBlock: BlockConfig = {
      id: `b-${Date.now()}-${blocks.length}`,
      name: `Block ${nextLetter}`,
      block_type: "staff",
      floors: 2,
      supervisor_name: "",
      roomsPerFloor: 8,
      prefix: nextLetter,
      numberingFormat: "3digit",
      defaultCategory: "staff_4bed",
      defaultSharing: 4,
      defaultAc: true,
      defaultAttachedBath: false,
      defaultDailyRate: 70,
      defaultDailyFoodRate: 30,
    };
    setBlocks([...blocks, newBlock]);
  };

  // Remove block
  const handleRemoveBlock = (index: number) => {
    if (blocks.length <= 1) return;
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  // Quick preset templates
  const applyPreset = (preset: "standard2" | "single_exec" | "large3") => {
    if (preset === "standard2") {
      setBlocks([
        {
          id: `b-a-${Date.now()}`,
          name: "Block A",
          block_type: "staff",
          floors: 2,
          supervisor_name: "",
          roomsPerFloor: 10,
          prefix: "A",
          numberingFormat: "3digit",
          defaultCategory: "staff_4bed",
          defaultSharing: 4,
          defaultAc: true,
          defaultAttachedBath: false,
          defaultDailyRate: 70,
          defaultDailyFoodRate: 30,
        },
        {
          id: `b-b-${Date.now()}`,
          name: "Block B",
          block_type: "worker",
          floors: 2,
          supervisor_name: "",
          roomsPerFloor: 10,
          prefix: "B",
          numberingFormat: "3digit",
          defaultCategory: "skilled_6bed",
          defaultSharing: 6,
          defaultAc: true,
          defaultAttachedBath: false,
          defaultDailyRate: 60,
          defaultDailyFoodRate: 30,
        },
      ]);
    } else if (preset === "single_exec") {
      setBlocks([
        {
          id: `b-exec-${Date.now()}`,
          name: "Executive Wing",
          block_type: "executive",
          floors: 3,
          supervisor_name: "",
          roomsPerFloor: 6,
          prefix: "EX",
          numberingFormat: "3digit",
          defaultCategory: "executive_single",
          defaultSharing: 1,
          defaultAc: true,
          defaultAttachedBath: true,
          defaultDailyRate: 120,
          defaultDailyFoodRate: 40,
        },
      ]);
    } else if (preset === "large3") {
      setBlocks([
        {
          id: `b-a-${Date.now()}`,
          name: "Block A (Staff)",
          block_type: "staff",
          floors: 3,
          supervisor_name: "",
          roomsPerFloor: 12,
          prefix: "A",
          numberingFormat: "3digit",
          defaultCategory: "staff_4bed",
          defaultSharing: 4,
          defaultAc: true,
          defaultAttachedBath: false,
          defaultDailyRate: 70,
          defaultDailyFoodRate: 30,
        },
        {
          id: `b-b-${Date.now()}`,
          name: "Block B (Technicians)",
          block_type: "technician",
          floors: 3,
          supervisor_name: "",
          roomsPerFloor: 12,
          prefix: "B",
          numberingFormat: "3digit",
          defaultCategory: "skilled_6bed",
          defaultSharing: 6,
          defaultAc: true,
          defaultAttachedBath: false,
          defaultDailyRate: 60,
          defaultDailyFoodRate: 30,
        },
        {
          id: `b-c-${Date.now()}`,
          name: "Block C (General)",
          block_type: "labor",
          floors: 3,
          supervisor_name: "",
          roomsPerFloor: 12,
          prefix: "C",
          numberingFormat: "3digit",
          defaultCategory: "general_8bed",
          defaultSharing: 8,
          defaultAc: true,
          defaultAttachedBath: false,
          defaultDailyRate: 50,
          defaultDailyFoodRate: 30,
        },
      ]);
    }
  };

  // Generate room numbers based on scheme
  const buildRoomNumber = (prefix: string, floor: number, index: number, format: string) => {
    const cleanPrefix = prefix.trim() ? `${prefix.trim()}-` : "";
    if (format === "3digit") {
      // Floor 1 => 101, 102...
      const num = floor * 100 + index;
      return `${cleanPrefix}${num}`;
    }
    if (format === "4digit") {
      // Floor 1 => 0101, 0102...
      const flrStr = String(floor).padStart(2, "0");
      const idxStr = String(index).padStart(2, "0");
      return `${cleanPrefix}${flrStr}${idxStr}`;
    }
    if (format === "g_style") {
      // Ground floor = G01, Floor 2 = 101, Floor 3 = 201
      if (floor === 1) {
        return `${cleanPrefix}G${String(index).padStart(2, "0")}`;
      }
      const num = (floor - 1) * 100 + index;
      return `${cleanPrefix}${num}`;
    }
    // Sequential
    return `${cleanPrefix}${index}`;
  };

  // Compile Step 1 & 2 into Step 3 Matrix
  const generateRoomsMatrix = () => {
    const rooms: GeneratedRoomItem[] = [];
    blocks.forEach((block) => {
      for (let floor = 1; floor <= block.floors; floor++) {
        for (let r = 1; r <= block.roomsPerFloor; r++) {
          const roomNumber = buildRoomNumber(block.prefix, floor, r, block.numberingFormat);
          rooms.push({
            tempId: `${block.id}-f${floor}-r${r}-${Date.now()}`,
            blockTempId: block.id,
            blockName: block.name,
            floor,
            room_number: roomNumber,
            category: block.defaultCategory,
            max_capacity: block.defaultSharing,
            ac: block.defaultAc,
            attached_bathroom: block.defaultAttachedBath,
            daily_rate: block.defaultDailyRate,
            daily_food_rate: block.defaultDailyFoodRate,
          });
        }
      }
    });

    setGeneratedRooms(rooms);
    if (blocks.length > 0) {
      setActivePreviewBlock(blocks[0].id);
      setActivePreviewFloor(1);
    }
    setCurrentStep(3);
  };

  // Summary Metrics
  const summary = useMemo(() => {
    const totalBlocks = blocks.length;
    const totalFloors = blocks.reduce((acc, b) => acc + (b.floors || 1), 0);
    const estimatedRooms =
      currentStep === 3
        ? generatedRooms.length
        : blocks.reduce((acc, b) => acc + (b.floors || 1) * (b.roomsPerFloor || 0), 0);
    const totalBeds =
      currentStep === 3
        ? generatedRooms.reduce((acc, r) => acc + r.max_capacity, 0)
        : blocks.reduce((acc, b) => acc + (b.floors || 1) * (b.roomsPerFloor || 0) * (b.defaultSharing || 4), 0);
    const acRooms =
      currentStep === 3
        ? generatedRooms.filter((r) => r.ac).length
        : blocks.reduce((acc, b) => acc + (b.defaultAc ? (b.floors || 1) * (b.roomsPerFloor || 0) : 0), 0);
    const attachedBathRooms =
      currentStep === 3
        ? generatedRooms.filter((r) => r.attached_bathroom).length
        : blocks.reduce(
            (acc, b) => acc + (b.defaultAttachedBath ? (b.floors || 1) * (b.roomsPerFloor || 0) : 0),
            0
          );
    const estDailyRev =
      currentStep === 3
        ? generatedRooms.reduce((acc, r) => acc + r.daily_rate, 0)
        : blocks.reduce(
            (acc, b) => acc + (b.floors || 1) * (b.roomsPerFloor || 0) * (b.defaultDailyRate || 70),
            0
          );

    return {
      totalBlocks,
      totalFloors,
      totalRooms: estimatedRooms,
      totalBeds,
      acRooms,
      attachedBathRooms,
      estDailyRev,
    };
  }, [blocks, generatedRooms, currentStep]);

  // Matrix inline adjustments
  const updateGeneratedRoom = (tempId: string, updates: Partial<GeneratedRoomItem>) => {
    setGeneratedRooms((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, ...updates } : r))
    );
  };

  const removeGeneratedRoom = (tempId: string) => {
    setGeneratedRooms((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const addRoomToFloor = (blockTempId: string, floor: number) => {
    const block = blocks.find((b) => b.id === blockTempId);
    const blockName = block?.name || "Block";
    const prefix = block?.prefix || "A";
    const floorRooms = generatedRooms.filter(
      (r) => r.blockTempId === blockTempId && r.floor === floor
    );
    const nextIdx = floorRooms.length + 1;
    const roomNumber = buildRoomNumber(
      prefix,
      floor,
      nextIdx,
      block?.numberingFormat || "3digit"
    );

    const newRoom: GeneratedRoomItem = {
      tempId: `extra-${Date.now()}-${nextIdx}`,
      blockTempId,
      blockName,
      floor,
      room_number: roomNumber,
      category: block?.defaultCategory || "staff_4bed",
      max_capacity: block?.defaultSharing || 4,
      ac: block?.defaultAc ?? true,
      attached_bathroom: block?.defaultAttachedBath ?? false,
      daily_rate: block?.defaultDailyRate || 70,
      daily_food_rate: block?.defaultDailyFoodRate || 30,
    };

    setGeneratedRooms([...generatedRooms, newRoom]);
  };

  const setFloorSharing = (blockTempId: string, floor: number, beds: number, category: string) => {
    setGeneratedRooms((prev) =>
      prev.map((r) => {
        if (r.blockTempId === blockTempId && r.floor === floor) {
          return {
            ...r,
            max_capacity: beds,
            category,
          };
        }
        return r;
      })
    );
  };

  const toggleFloorAc = (blockTempId: string, floor: number, state: boolean) => {
    setGeneratedRooms((prev) =>
      prev.map((r) => {
        if (r.blockTempId === blockTempId && r.floor === floor) {
          return { ...r, ac: state };
        }
        return r;
      })
    );
  };

  const toggleFloorBath = (blockTempId: string, floor: number, state: boolean) => {
    setGeneratedRooms((prev) =>
      prev.map((r) => {
        if (r.blockTempId === blockTempId && r.floor === floor) {
          return { ...r, attached_bathroom: state };
        }
        return r;
      })
    );
  };

  // Final Commit to Database
  const handleConfirmAndSave = async () => {
    if (generatedRooms.length === 0) {
      toast({ title: "No rooms to create", variant: "destructive" });
      return;
    }

    // Check for duplicate room numbers within the set
    const seen = new Set<string>();
    for (const r of generatedRooms) {
      if (seen.has(r.room_number)) {
        toast({
          title: "Duplicate Room Numbers Found",
          description: `Room number "${r.room_number}" appears multiple times. Please adjust room numbers in Step 3 before saving.`,
          variant: "destructive",
        });
        return;
      }
      seen.add(r.room_number);
    }

    setIsSubmitting(true);
    try {
      // Step A: Create blocks in buildings table
      const blockIdMap = new Map<string, string>(); // tempId -> real building_id

      for (const block of blocks) {
        if (block.isExisting) {
          blockIdMap.set(block.id, block.id);
        } else {
          const code =
            block.name.toUpperCase().replace(/\s/g, "-").slice(0, 6) +
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
      const payloadRooms = generatedRooms.map((r) => {
        const buildingId = blockIdMap.get(r.blockTempId);
        if (!buildingId) throw new Error(`Missing block id mapping for room ${r.room_number}`);
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

      // Invalidate queries so CampDetails updates live
      qc.invalidateQueries({ queryKey: ["blocks", campId] });
      qc.invalidateQueries({ queryKey: ["blocks"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["camps-list"] });
      qc.invalidateQueries({ queryKey: ["camp", campId] });

      toast({
        title: "Camp Structure Initialized Successfully!",
        description: `Created ${blocks.length} blocks with ${generatedRooms.length} rooms and ${summary.totalBeds} total bed capacity.`,
      });

      onOpenChange(false);
      if (onComplete) onComplete();
    } catch (err: any) {
      toast({
        title: "Setup Failed",
        description: err.message || "An error occurred while saving the camp structure.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-900/10 via-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                  <Sliders size={13} /> Master Property Setup
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {campName}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Master Camp Structure & Room Builder
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Rapidly scaffold blocks, multiple floors, customized bed sharing capacity, and room amenities in one seamless flow.
              </DialogDescription>
            </div>

            {/* Stepper Pill Indicators */}
            <div className="hidden sm:flex items-center gap-1.5 bg-background/80 p-1 rounded-lg border shadow-xs">
              {[
                { step: 1, label: "Blocks & Floors", icon: Building2 },
                { step: 2, label: "Sharing Rules", icon: BedDouble },
                { step: 3, label: "Interactive Matrix", icon: Sparkles },
              ].map(({ step, label, icon: Icon }) => {
                const isActive = currentStep === step;
                const isPassed = currentStep > step;
                return (
                  <button
                    key={step}
                    disabled={isSubmitting}
                    onClick={() => {
                      if (step === 3 && currentStep !== 3) {
                        generateRoomsMatrix();
                      } else {
                        setCurrentStep(step as any);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : isPassed
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KPI Mini-Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-4 pt-3 border-t border-border/40 text-xs">
            <div className="bg-background/60 p-2 rounded-md border flex flex-col">
              <span className="text-muted-foreground">Blocks</span>
              <span className="font-bold text-sm text-foreground">{summary.totalBlocks}</span>
            </div>
            <div className="bg-background/60 p-2 rounded-md border flex flex-col">
              <span className="text-muted-foreground">Floors</span>
              <span className="font-bold text-sm text-foreground">{summary.totalFloors}</span>
            </div>
            <div className="bg-background/60 p-2 rounded-md border flex flex-col">
              <span className="text-muted-foreground">Rooms</span>
              <span className="font-bold text-sm text-foreground">{summary.totalRooms}</span>
            </div>
            <div className="bg-background/60 p-2 rounded-md border flex flex-col">
              <span className="text-muted-foreground">Total Beds</span>
              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                {summary.totalBeds} Beds
              </span>
            </div>
            <div className="bg-background/60 p-2 rounded-md border flex flex-col">
              <span className="text-muted-foreground">AC Enabled</span>
              <span className="font-bold text-sm text-cyan-600 dark:text-cyan-400">
                {summary.acRooms} Rooms
              </span>
            </div>
            <div className="bg-background/60 p-2 rounded-md border flex flex-col">
              <span className="text-muted-foreground">Est. Daily Rev</span>
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                SAR {summary.estDailyRev.toLocaleString()}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body - Tabbed Steps */}
        <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto max-h-[calc(90vh-190px)]">
          {/* ═══════════════ STEP 1: BLOCKS & FLOORS ═══════════════ */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Camp Building Blocks</h3>
                  <p className="text-xs text-muted-foreground">
                    Define the building wings, blocks, and floor levels for {campName}.
                  </p>
                </div>
                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Presets:</span>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => applyPreset("standard2")}
                    className="text-xs h-7"
                  >
                    2-Block Standard
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => applyPreset("large3")}
                    className="text-xs h-7"
                  >
                    3-Block Complex
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => applyPreset("single_exec")}
                    className="text-xs h-7"
                  >
                    Executive Wing
                  </Button>
                </div>
              </div>

              {/* Block Cards List */}
              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <Card key={block.id} className="border shadow-xs hover:border-primary/40 transition-colors">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {index + 1}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{block.name || `Block ${index + 1}`}</CardTitle>
                          <CardDescription className="text-xs">
                            {block.floors} {block.floors === 1 ? "Floor" : "Floors"} • {block.block_type.toUpperCase()}
                          </CardDescription>
                        </div>
                      </div>
                      {blocks.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveBlock(index)}
                          title="Remove block"
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="p-4 pt-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Block Name *</Label>
                        <Input
                          value={block.name}
                          onChange={(e) => updateBlock(index, { name: e.target.value })}
                          placeholder="e.g. Block A"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Block Category</Label>
                        <Select
                          value={block.block_type}
                          onValueChange={(val) => updateBlock(index, { block_type: val })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOCK_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="text-xs">
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Floors in Block</Label>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateBlock(index, { floors: Math.max(1, block.floors - 1) })}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            max={12}
                            value={block.floors}
                            onChange={(e) =>
                              updateBlock(index, { floors: Math.max(1, parseInt(e.target.value) || 1) })
                            }
                            className="h-8 text-xs text-center font-semibold"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateBlock(index, { floors: Math.min(12, block.floors + 1) })}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Supervisor (Optional)</Label>
                        <Input
                          value={block.supervisor_name}
                          onChange={(e) => updateBlock(index, { supervisor_name: e.target.value })}
                          placeholder="Supervisor in charge"
                          className="h-8 text-xs"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddBlock}
                  className="w-full border-dashed border-2 py-4 gap-2 hover:border-primary hover:text-primary"
                >
                  <Plus size={16} /> Add Another Building Block
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 2: SHARING & ROOM RULES ═══════════════ */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Floor Layout & Sharing Configuration</h3>
                <p className="text-xs text-muted-foreground">
                  Specify how many rooms per floor, room numbering conventions, and bed sharing capacity.
                </p>
              </div>

              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <Card key={block.id} className="border shadow-xs">
                    <CardHeader className="p-4 pb-3 bg-secondary/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-primary" />
                          <CardTitle className="text-sm font-bold">{block.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {block.floors} Floors
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {block.floors * block.roomsPerFloor} Rooms • {block.floors * block.roomsPerFloor * block.defaultSharing} Beds
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {/* Top Row: Rooms per floor & Numbering */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Rooms per Floor</Label>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={block.roomsPerFloor}
                            onChange={(e) =>
                              updateBlock(index, {
                                roomsPerFloor: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            className="h-8 text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Creates {block.roomsPerFloor} rooms per floor level.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Room Prefix</Label>
                          <Input
                            value={block.prefix}
                            onChange={(e) => updateBlock(index, { prefix: e.target.value })}
                            placeholder="e.g. A"
                            className="h-8 text-xs font-mono uppercase"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            e.g. "{block.prefix}-101", "{block.prefix}-102"
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Numbering Pattern</Label>
                          <Select
                            value={block.numberingFormat}
                            onValueChange={(val: any) => updateBlock(index, { numberingFormat: val })}
                          >
                            <SelectTrigger className="h-8 text-xs font-mono">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3digit" className="text-xs font-mono">
                                3-Digit Floor (101, 102...)
                              </SelectItem>
                              <SelectItem value="4digit" className="text-xs font-mono">
                                4-Digit Floor (0101, 0102...)
                              </SelectItem>
                              <SelectItem value="g_style" className="text-xs font-mono">
                                Ground Floor Style (G01, 101...)
                              </SelectItem>
                              <SelectItem value="sequential" className="text-xs font-mono">
                                Sequential (1, 2, 3...)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Preview: {buildRoomNumber(block.prefix, 1, 1, block.numberingFormat)},{" "}
                            {buildRoomNumber(block.prefix, 1, 2, block.numberingFormat)}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Bed Sharing Selection Cards */}
                      <div>
                        <Label className="text-xs font-semibold mb-2 block">
                          Bed Sharing Capacity & Designation Level:
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {SHARING_OPTIONS.map((opt) => {
                            const isSelected = block.defaultSharing === opt.beds;
                            return (
                              <button
                                key={opt.beds}
                                type="button"
                                onClick={() => {
                                  updateBlock(index, {
                                    defaultSharing: opt.beds,
                                    defaultCategory: opt.defaultCat,
                                    defaultDailyRate: opt.defaultRate,
                                    defaultAttachedBath: opt.hasBath,
                                  });
                                }}
                                className={`text-left p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                                  isSelected
                                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                                    : "border-border hover:border-primary/40 bg-card"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs">{opt.label}</span>
                                  <Badge
                                    variant={isSelected ? "default" : "outline"}
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {opt.beds} Beds
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-1">
                                  {getRoomCategoryLabel(opt.defaultCat)}
                                </div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                                  Default: SAR {opt.defaultRate}/day
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Room Amenities & Commercials */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 bg-secondary/20 p-3 rounded-lg border">
                        <div className="flex items-center justify-between sm:justify-start gap-2">
                          <Switch
                            checked={block.defaultAc}
                            onCheckedChange={(val) => updateBlock(index, { defaultAc: val })}
                          />
                          <div>
                            <Label className="text-xs cursor-pointer">AC Enabled</Label>
                            <p className="text-[10px] text-muted-foreground">Air Conditioning</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-start gap-2">
                          <Switch
                            checked={block.defaultAttachedBath}
                            onCheckedChange={(val) => updateBlock(index, { defaultAttachedBath: val })}
                          />
                          <div>
                            <Label className="text-xs cursor-pointer">Attached Bath</Label>
                            <p className="text-[10px] text-muted-foreground">Private Ensuite</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Daily Room Rate (SAR)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={block.defaultDailyRate}
                            onChange={(e) =>
                              updateBlock(index, {
                                defaultDailyRate: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Daily Food Rate (SAR)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={block.defaultDailyFoodRate}
                            onChange={(e) =>
                              updateBlock(index, {
                                defaultDailyFoodRate: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 3: INTERACTIVE MATRIX PREVIEW ═══════════════ */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-secondary/30 p-3 rounded-lg border">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <Sparkles size={15} className="text-primary" />
                    Room Matrix & Customisation Grid
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Click any room to adjust room number, bed sharing capacity, AC, or bathroom.
                  </p>
                </div>

                {/* Regenerate Button */}
                <Button
                  size="xs"
                  variant="outline"
                  onClick={generateRoomsMatrix}
                  className="gap-1 text-xs h-7"
                >
                  <RefreshCw size={12} /> Regenerate Matrix
                </Button>
              </div>

              {/* Block & Floor Navigation Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b pb-3">
                {/* Block Selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs font-semibold text-muted-foreground mr-1">Block:</span>
                  {blocks.map((b) => (
                    <Button
                      key={b.id}
                      size="xs"
                      variant={activePreviewBlock === b.id ? "default" : "outline"}
                      onClick={() => {
                        setActivePreviewBlock(b.id);
                        setActivePreviewFloor(1);
                      }}
                      className="text-xs h-7"
                    >
                      {b.name}
                    </Button>
                  ))}
                </div>

                {/* Floor Selector for active block */}
                {(() => {
                  const currBlock = blocks.find((b) => b.id === activePreviewBlock);
                  const totalFloors = currBlock?.floors || 1;
                  return (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-muted-foreground mr-1">Floor:</span>
                      {Array.from({ length: totalFloors }, (_, i) => i + 1).map((flr) => (
                        <Button
                          key={flr}
                          size="xs"
                          variant={activePreviewFloor === flr ? "secondary" : "ghost"}
                          onClick={() => setActivePreviewFloor(flr)}
                          className={`text-xs h-7 px-2.5 font-medium ${
                            activePreviewFloor === flr ? "border border-primary/30" : ""
                          }`}
                        >
                          Floor {flr}
                        </Button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Floor Batch Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-md border text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    Floor {activePreviewFloor} Bulk Adjustments:
                  </span>
                  <Select
                    onValueChange={(val) => {
                      const opt = SHARING_OPTIONS.find((s) => s.beds === parseInt(val));
                      if (opt) {
                        setFloorSharing(activePreviewBlock, activePreviewFloor, opt.beds, opt.defaultCat);
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue placeholder="Set Floor Beds..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SHARING_OPTIONS.map((o) => (
                        <SelectItem key={o.beds} value={String(o.beds)} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="xs"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => toggleFloorAc(activePreviewBlock, activePreviewFloor, true)}
                  >
                    <Wind size={12} /> AC On All
                  </Button>

                  <Button
                    size="xs"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => toggleFloorBath(activePreviewBlock, activePreviewFloor, true)}
                  >
                    <Bath size={12} /> Bath On All
                  </Button>
                </div>

                <Button
                  size="xs"
                  variant="outline"
                  className="h-7 text-xs gap-1 border-primary/30 hover:border-primary text-primary"
                  onClick={() => addRoomToFloor(activePreviewBlock, activePreviewFloor)}
                >
                  <Plus size={12} /> Add Room to Floor {activePreviewFloor}
                </Button>
              </div>

              {/* Room Cards Grid for active block & floor */}
              {(() => {
                const floorRooms = generatedRooms.filter(
                  (r) => r.blockTempId === activePreviewBlock && r.floor === activePreviewFloor
                );

                if (floorRooms.length === 0) {
                  return (
                    <div className="text-center py-10 border border-dashed rounded-lg">
                      <p className="text-xs text-muted-foreground">No rooms on this floor yet.</p>
                      <Button
                        size="xs"
                        className="mt-2 text-xs"
                        onClick={() => addRoomToFloor(activePreviewBlock, activePreviewFloor)}
                      >
                        <Plus size={12} className="mr-1" /> Add First Room
                      </Button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
                    {floorRooms.map((room) => (
                      <Card
                        key={room.tempId}
                        className="border shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden group"
                      >
                        <div
                          className={`h-1 w-full ${
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
                          {/* Room Number & Delete */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-1 mr-2">
                              <Input
                                value={room.room_number}
                                onChange={(e) =>
                                  updateGeneratedRoom(room.tempId, { room_number: e.target.value })
                                }
                                className="h-7 text-xs font-mono font-bold w-24 px-1.5"
                                placeholder="Room #"
                              />
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 font-medium whitespace-nowrap"
                              >
                                {room.max_capacity} Bed Sharing
                              </Badge>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-80 group-hover:opacity-100"
                              onClick={() => removeGeneratedRoom(room.tempId)}
                              title="Delete room"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>

                          {/* Room Category Select */}
                          <div className="space-y-1">
                            <Select
                              value={room.category}
                              onValueChange={(val) => {
                                const cap = getRoomCategoryCapacity(val);
                                updateGeneratedRoom(room.tempId, {
                                  category: val,
                                  max_capacity: cap,
                                });
                              }}
                            >
                              <SelectTrigger className="h-7 text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {NEW_ROOM_CATEGORIES.map((c) => (
                                  <SelectItem key={c.value} value={c.value} className="text-xs">
                                    {c.label} ({c.capacity} beds)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Capacity Adjuster (+ / -) */}
                          <div className="flex items-center justify-between bg-secondary/30 px-2 py-1 rounded text-xs">
                            <span className="text-[11px] text-muted-foreground">Sharing Beds:</span>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-xs"
                                onClick={() =>
                                  updateGeneratedRoom(room.tempId, {
                                    max_capacity: Math.max(1, room.max_capacity - 1),
                                  })
                                }
                              >
                                -
                              </Button>
                              <span className="w-5 text-center font-bold text-xs">{room.max_capacity}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-xs"
                                onClick={() =>
                                  updateGeneratedRoom(room.tempId, {
                                    max_capacity: Math.min(16, room.max_capacity + 1),
                                  })
                                }
                              >
                                +
                              </Button>
                            </div>
                          </div>

                          {/* Amenities and Daily Rate */}
                          <div className="flex items-center justify-between pt-1 border-t text-xs">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateGeneratedRoom(room.tempId, { ac: !room.ac })}
                                title={room.ac ? "AC active" : "No AC"}
                                className={`p-1 rounded transition-colors ${
                                  room.ac
                                    ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                                    : "text-muted-foreground/40 hover:text-muted-foreground"
                                }`}
                              >
                                <Wind size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateGeneratedRoom(room.tempId, {
                                    attached_bathroom: !room.attached_bathroom,
                                  })
                                }
                                title={room.attached_bathroom ? "Ensuite bath" : "Shared bath"}
                                className={`p-1 rounded transition-colors ${
                                  room.attached_bathroom
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground/40 hover:text-muted-foreground"
                                }`}
                              >
                                <Bath size={14} />
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">SAR</span>
                              <Input
                                type="number"
                                min={0}
                                value={room.daily_rate}
                                onChange={(e) =>
                                  updateGeneratedRoom(room.tempId, {
                                    daily_rate: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-6 w-14 text-right px-1 text-[11px] font-semibold"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </ScrollArea>

        {/* Modal Footer / Navigation Controls */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setCurrentStep((currentStep - 1) as any)}
                className="gap-1 text-xs"
              >
                <ArrowLeft size={14} /> Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>

            {currentStep === 1 && (
              <Button
                size="sm"
                onClick={() => setCurrentStep(2)}
                className="gap-1 text-xs"
              >
                Next: Sharing Rules <ArrowRight size={14} />
              </Button>
            )}

            {currentStep === 2 && (
              <Button
                size="sm"
                onClick={generateRoomsMatrix}
                className="gap-1 text-xs bg-primary hover:bg-primary/90"
              >
                Generate Matrix & Preview <Sparkles size={14} />
              </Button>
            )}

            {currentStep === 3 && (
              <Button
                size="sm"
                disabled={isSubmitting || generatedRooms.length === 0}
                onClick={handleConfirmAndSave}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Creating Camp Structure...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Confirm & Build Structure ({summary.totalRooms} Rooms)
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
