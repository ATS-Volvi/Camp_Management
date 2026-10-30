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
import { Checkbox } from "@/components/ui/checkbox";
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
  Copy,
  Layers,
  Check,
  CheckSquare,
  Square,
  ListPlus,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
  existingBlocks?: { id: string; name: string; block_type: string; floors: number }[];
  onComplete?: () => void;
}

export interface FloorRoomGroup {
  id: string;
  name?: string;
  count: number;
  category: string;
  sharing: number;
  ac: boolean;
  attachedBath: boolean;
  dailyRate: number;
  dailyFoodRate: number;
}

export interface FloorCustomConfig {
  floor: number;
  customized: boolean;
  roomsCount: number;
  roomGroups: FloorRoomGroup[];
}

export interface BlockConfig {
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
  // Per-floor custom configuration
  customizeFloorsSeparately: boolean;
  floorConfigs: FloorCustomConfig[];
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

export const SHARING_OPTIONS = [
  { beds: 1, label: "Single (1 Bed / Private)", defaultCat: "executive_single", defaultRate: 120, hasBath: true },
  { beds: 2, label: "2-Sharing (Twin / Double)", defaultCat: "supervisor_twin", defaultRate: 90, hasBath: true },
  { beds: 3, label: "3-Sharing (Triple)", defaultCat: "staff_4bed", defaultRate: 75, hasBath: false },
  { beds: 4, label: "4-Sharing (Quad Room)", defaultCat: "staff_4bed", defaultRate: 70, hasBath: false },
  { beds: 6, label: "6-Sharing (Skilled Labor)", defaultCat: "skilled_6bed", defaultRate: 60, hasBath: false },
  { beds: 8, label: "8-Sharing (General Dorm)", defaultCat: "general_8bed", defaultRate: 50, hasBath: false },
];

function buildDefaultFloorConfigs(
  floors: number,
  roomsPerFloor: number,
  sharing: number,
  category: string,
  ac: boolean,
  attachedBath: boolean,
  dailyRate: number,
  dailyFoodRate: number
): FloorCustomConfig[] {
  const configs: FloorCustomConfig[] = [];
  for (let f = 1; f <= floors; f++) {
    configs.push({
      floor: f,
      customized: false,
      roomsCount: roomsPerFloor,
      roomGroups: [
        {
          id: `fg-${f}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          count: roomsPerFloor,
          sharing,
          category,
          ac,
          attachedBath,
          dailyRate,
          dailyFoodRate,
        },
      ],
    });
  }
  return configs;
}

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

  // Step 1 & 2: Blocks & Floors Configuration
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
      customizeFloorsSeparately: false,
      floorConfigs: buildDefaultFloorConfigs(2, 8, 4, "staff_4bed", true, false, 70, 30),
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
      customizeFloorsSeparately: false,
      floorConfigs: buildDefaultFloorConfigs(2, 8, 6, "skilled_6bed", true, false, 60, 30),
    },
  ]);

  // Step 2 Active Floor Tabs per Block
  const [activeStep2FloorPerBlock, setActiveStep2FloorPerBlock] = useState<{ [blockId: string]: number }>({});

  // Step 3: Generated Rooms Matrix (Interactive Review)
  const [generatedRooms, setGeneratedRooms] = useState<GeneratedRoomItem[]>([]);
  const [activePreviewBlock, setActivePreviewBlock] = useState<string>("");
  const [activePreviewFloor, setActivePreviewFloor] = useState<number>(1);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());

  // Step 3 Range Tool state
  const [rangeStartRoom, setRangeStartRoom] = useState<string>("");
  const [rangeEndRoom, setRangeEndRoom] = useState<string>("");
  const [rangeSelectedSharing, setRangeSelectedSharing] = useState<string>("4");

  // Helper to update a block config
  const updateBlock = (index: number, updates: Partial<BlockConfig>) => {
    setBlocks((prev) => {
      const next = [...prev];
      const current = next[index];
      const merged = { ...current, ...updates };

      // If floors count changed, adjust floorConfigs
      if (updates.floors && updates.floors !== current.floors) {
        const targetFloors = Math.max(1, updates.floors);
        const existingConfigs = current.floorConfigs || [];
        const newConfigs: FloorCustomConfig[] = [];

        for (let f = 1; f <= targetFloors; f++) {
          const match = existingConfigs.find((c) => c.floor === f);
          if (match) {
            newConfigs.push(match);
          } else {
            newConfigs.push({
              floor: f,
              customized: false,
              roomsCount: merged.roomsPerFloor || 8,
              roomGroups: [
                {
                  id: `fg-${f}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  count: merged.roomsPerFloor || 8,
                  sharing: merged.defaultSharing || 4,
                  category: merged.defaultCategory || "staff_4bed",
                  ac: merged.defaultAc ?? true,
                  attachedBath: merged.defaultAttachedBath ?? false,
                  dailyRate: merged.defaultDailyRate || 70,
                  dailyFoodRate: merged.defaultDailyFoodRate || 30,
                },
              ],
            });
          }
        }
        merged.floorConfigs = newConfigs;
      }

      // If default sharing / rooms changed and customizeFloorsSeparately is false, sync uniform defaults
      if (
        !merged.customizeFloorsSeparately &&
        (updates.roomsPerFloor !== undefined ||
          updates.defaultSharing !== undefined ||
          updates.defaultCategory !== undefined ||
          updates.defaultAc !== undefined ||
          updates.defaultAttachedBath !== undefined ||
          updates.defaultDailyRate !== undefined ||
          updates.defaultDailyFoodRate !== undefined)
      ) {
        merged.floorConfigs = buildDefaultFloorConfigs(
          merged.floors,
          merged.roomsPerFloor,
          merged.defaultSharing,
          merged.defaultCategory,
          merged.defaultAc,
          merged.defaultAttachedBath,
          merged.defaultDailyRate,
          merged.defaultDailyFoodRate
        );
      }

      next[index] = merged;
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
      customizeFloorsSeparately: false,
      floorConfigs: buildDefaultFloorConfigs(2, 8, 4, "staff_4bed", true, false, 70, 30),
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
          customizeFloorsSeparately: false,
          floorConfigs: buildDefaultFloorConfigs(2, 10, 4, "staff_4bed", true, false, 70, 30),
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
          customizeFloorsSeparately: false,
          floorConfigs: buildDefaultFloorConfigs(2, 10, 6, "skilled_6bed", true, false, 60, 30),
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
          customizeFloorsSeparately: false,
          floorConfigs: buildDefaultFloorConfigs(3, 6, 1, "executive_single", true, true, 120, 40),
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
          customizeFloorsSeparately: false,
          floorConfigs: buildDefaultFloorConfigs(3, 12, 4, "staff_4bed", true, false, 70, 30),
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
          customizeFloorsSeparately: false,
          floorConfigs: buildDefaultFloorConfigs(3, 12, 6, "skilled_6bed", true, false, 60, 30),
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
          customizeFloorsSeparately: false,
          floorConfigs: buildDefaultFloorConfigs(3, 12, 8, "general_8bed", true, false, 50, 30),
        },
      ]);
    }
  };

  // Generate room numbers based on scheme
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
  const findNextRoomNumber = (prefix: string, floor: number, format: string, existingFloorRooms: GeneratedRoomItem[]) => {
    let idx = 1;
    while (true) {
      const candidate = buildRoomNumber(prefix, floor, idx, format);
      if (!existingFloorRooms.some((r) => r.room_number === candidate)) {
        return candidate;
      }
      idx++;
    }
  };

  // Step 2 Floor Customization Helpers
  const getActiveStep2Floor = (blockId: string) => activeStep2FloorPerBlock[blockId] || 1;

  const setActiveStep2Floor = (blockId: string, floor: number) => {
    setActiveStep2FloorPerBlock((prev) => ({ ...prev, [blockId]: floor }));
  };

  const updateFloorConfig = (
    blockIndex: number,
    floorNumber: number,
    updater: (current: FloorCustomConfig) => FloorCustomConfig
  ) => {
    setBlocks((prev) => {
      const next = [...prev];
      const block = { ...next[blockIndex] };
      const configs = [...(block.floorConfigs || [])];
      const configIdx = configs.findIndex((c) => c.floor === floorNumber);

      if (configIdx >= 0) {
        configs[configIdx] = updater(configs[configIdx]);
      } else {
        const newConf = updater({
          floor: floorNumber,
          customized: true,
          roomsCount: block.roomsPerFloor || 8,
          roomGroups: [
            {
              id: `fg-${floorNumber}-${Date.now()}`,
              count: block.roomsPerFloor || 8,
              sharing: block.defaultSharing || 4,
              category: block.defaultCategory || "staff_4bed",
              ac: block.defaultAc ?? true,
              attachedBath: block.defaultAttachedBath ?? false,
              dailyRate: block.defaultDailyRate || 70,
              dailyFoodRate: block.defaultDailyFoodRate || 30,
            },
          ],
        });
        configs.push(newConf);
      }

      block.floorConfigs = configs;
      block.customizeFloorsSeparately = true;
      next[blockIndex] = block;
      return next;
    });
  };

  const copyFloorToAll = (blockIndex: number, sourceFloor: number) => {
    const block = blocks[blockIndex];
    const sourceConfig = block.floorConfigs?.find((c) => c.floor === sourceFloor);
    if (!sourceConfig) return;

    setBlocks((prev) => {
      const next = [...prev];
      const b = { ...next[blockIndex] };
      const newConfigs: FloorCustomConfig[] = [];

      for (let f = 1; f <= b.floors; f++) {
        newConfigs.push({
          floor: f,
          customized: true,
          roomsCount: sourceConfig.roomGroups.reduce((acc, g) => acc + g.count, 0),
          roomGroups: sourceConfig.roomGroups.map((g, idx) => ({
            ...g,
            id: `fg-${f}-${idx}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          })),
        });
      }

      b.floorConfigs = newConfigs;
      b.customizeFloorsSeparately = true;
      next[blockIndex] = b;
      return next;
    });

    toast({
      title: "Floor Layout Copied",
      description: `Copied Floor ${sourceFloor} configuration to all ${block.floors} floors of ${block.name}.`,
    });
  };

  const applyFloorPreset = (
    blockIndex: number,
    floorNumber: number,
    preset: "all_4bed" | "exec_mix" | "supervisor_mix" | "all_6bed" | "dorm_8bed"
  ) => {
    const totalRooms = 8;
    let newGroups: FloorRoomGroup[] = [];

    if (preset === "all_4bed") {
      newGroups = [
        {
          id: `fg-${Date.now()}-1`,
          count: totalRooms,
          sharing: 4,
          category: "staff_4bed",
          ac: true,
          attachedBath: false,
          dailyRate: 70,
          dailyFoodRate: 30,
        },
      ];
    } else if (preset === "exec_mix") {
      newGroups = [
        {
          id: `fg-${Date.now()}-1`,
          name: "Executive Suites",
          count: 2,
          sharing: 1,
          category: "executive_single",
          ac: true,
          attachedBath: true,
          dailyRate: 120,
          dailyFoodRate: 40,
        },
        {
          id: `fg-${Date.now()}-2`,
          name: "Staff Rooms",
          count: 6,
          sharing: 4,
          category: "staff_4bed",
          ac: true,
          attachedBath: false,
          dailyRate: 70,
          dailyFoodRate: 30,
        },
      ];
    } else if (preset === "supervisor_mix") {
      newGroups = [
        {
          id: `fg-${Date.now()}-1`,
          name: "Supervisor Twins",
          count: 2,
          sharing: 2,
          category: "supervisor_twin",
          ac: true,
          attachedBath: true,
          dailyRate: 90,
          dailyFoodRate: 35,
        },
        {
          id: `fg-${Date.now()}-2`,
          name: "Staff Rooms",
          count: 6,
          sharing: 4,
          category: "staff_4bed",
          ac: true,
          attachedBath: false,
          dailyRate: 70,
          dailyFoodRate: 30,
        },
      ];
    } else if (preset === "all_6bed") {
      newGroups = [
        {
          id: `fg-${Date.now()}-1`,
          count: totalRooms,
          sharing: 6,
          category: "skilled_6bed",
          ac: true,
          attachedBath: false,
          dailyRate: 60,
          dailyFoodRate: 30,
        },
      ];
    } else if (preset === "dorm_8bed") {
      newGroups = [
        {
          id: `fg-${Date.now()}-1`,
          count: totalRooms,
          sharing: 8,
          category: "general_8bed",
          ac: true,
          attachedBath: false,
          dailyRate: 50,
          dailyFoodRate: 30,
        },
      ];
    }

    updateFloorConfig(blockIndex, floorNumber, (c) => ({
      ...c,
      customized: true,
      roomsCount: newGroups.reduce((acc, g) => acc + g.count, 0),
      roomGroups: newGroups,
    }));
  };

  // Compile Step 1 & 2 into Step 3 Matrix
  const generateRoomsMatrix = () => {
    const rooms: GeneratedRoomItem[] = [];

    blocks.forEach((block) => {
      for (let floor = 1; floor <= block.floors; floor++) {
        const floorConfig = block.floorConfigs?.find((fc) => fc.floor === floor);

        if (
          block.customizeFloorsSeparately &&
          floorConfig &&
          floorConfig.roomGroups &&
          floorConfig.roomGroups.length > 0
        ) {
          // Use floor's customized room mix
          let roomIdx = 1;
          floorConfig.roomGroups.forEach((group) => {
            for (let i = 0; i < group.count; i++) {
              const roomNumber = buildRoomNumber(block.prefix, floor, roomIdx, block.numberingFormat);
              rooms.push({
                tempId: `${block.id}-f${floor}-r${roomIdx}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                blockTempId: block.id,
                blockName: block.name,
                floor,
                room_number: roomNumber,
                category: group.category,
                max_capacity: group.sharing,
                ac: group.ac,
                attached_bathroom: group.attachedBath,
                daily_rate: group.dailyRate,
                daily_food_rate: group.dailyFoodRate,
              });
              roomIdx++;
            }
          });
        } else {
          // Uniform block template
          for (let r = 1; r <= block.roomsPerFloor; r++) {
            const roomNumber = buildRoomNumber(block.prefix, floor, r, block.numberingFormat);
            rooms.push({
              tempId: `${block.id}-f${floor}-r${r}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
      }
    });

    setGeneratedRooms(rooms);
    setSelectedRoomIds(new Set());
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

    let estimatedRooms = 0;
    let totalBeds = 0;
    let acRooms = 0;
    let attachedBathRooms = 0;
    let estDailyRev = 0;

    if (currentStep === 3 && generatedRooms.length > 0) {
      estimatedRooms = generatedRooms.length;
      totalBeds = generatedRooms.reduce((acc, r) => acc + r.max_capacity, 0);
      acRooms = generatedRooms.filter((r) => r.ac).length;
      attachedBathRooms = generatedRooms.filter((r) => r.attached_bathroom).length;
      estDailyRev = generatedRooms.reduce((acc, r) => acc + r.daily_rate, 0);
    } else {
      blocks.forEach((b) => {
        if (b.customizeFloorsSeparately && b.floorConfigs && b.floorConfigs.length > 0) {
          b.floorConfigs.forEach((fc) => {
            fc.roomGroups.forEach((g) => {
              estimatedRooms += g.count;
              totalBeds += g.count * g.sharing;
              if (g.ac) acRooms += g.count;
              if (g.attachedBath) attachedBathRooms += g.count;
              estDailyRev += g.count * g.dailyRate;
            });
          });
        } else {
          const flrs = b.floors || 1;
          const rpf = b.roomsPerFloor || 0;
          const rms = flrs * rpf;
          estimatedRooms += rms;
          totalBeds += rms * (b.defaultSharing || 4);
          if (b.defaultAc) acRooms += rms;
          if (b.defaultAttachedBath) attachedBathRooms += rms;
          estDailyRev += rms * (b.defaultDailyRate || 70);
        }
      });
    }

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
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  };

  const addRoomToFloor = (
    blockTempId: string,
    floor: number,
    customSharing?: number,
    customCategory?: string,
    customRate?: number,
    customBath?: boolean
  ) => {
    const block = blocks.find((b) => b.id === blockTempId);
    const blockName = block?.name || "Block";
    const prefix = block?.prefix || "A";
    const floorRooms = generatedRooms.filter(
      (r) => r.blockTempId === blockTempId && r.floor === floor
    );
    const roomNumber = findNextRoomNumber(
      prefix,
      floor,
      block?.numberingFormat || "3digit",
      floorRooms
    );

    const sharing = customSharing ?? block?.defaultSharing ?? 4;
    const category = customCategory ?? block?.defaultCategory ?? "staff_4bed";
    const dailyRate = customRate ?? block?.defaultDailyRate ?? 70;
    const attachedBath = customBath ?? block?.defaultAttachedBath ?? false;

    const newRoom: GeneratedRoomItem = {
      tempId: `extra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      blockTempId,
      blockName,
      floor,
      room_number: roomNumber,
      category,
      max_capacity: sharing,
      ac: block?.defaultAc ?? true,
      attached_bathroom: attachedBath,
      daily_rate: dailyRate,
      daily_food_rate: block?.defaultDailyFoodRate || 30,
    };

    setGeneratedRooms([...generatedRooms, newRoom]);
  };

  const setFloorSharing = (blockTempId: string, floor: number, beds: number, category: string, rate?: number) => {
    setGeneratedRooms((prev) =>
      prev.map((r) => {
        if (r.blockTempId === blockTempId && r.floor === floor) {
          return {
            ...r,
            max_capacity: beds,
            category,
            ...(rate !== undefined ? { daily_rate: rate } : {}),
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

  // Step 3: Multi-select & Batch Actions for current floor
  const activeFloorRooms = useMemo(() => {
    return generatedRooms.filter(
      (r) => r.blockTempId === activePreviewBlock && r.floor === activePreviewFloor
    );
  }, [generatedRooms, activePreviewBlock, activePreviewFloor]);

  const selectedRoomsOnActiveFloor = useMemo(() => {
    return activeFloorRooms.filter((r) => selectedRoomIds.has(r.tempId));
  }, [activeFloorRooms, selectedRoomIds]);

  const toggleSelectRoom = (tempId: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
      }
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
    setGeneratedRooms((prev) =>
      prev.map((r) => (selectedRoomIds.has(r.tempId) ? { ...r, ...updates } : r))
    );
    toast({
      title: "Batch Update Applied",
      description: `Updated ${selectedRoomsOnActiveFloor.length} rooms on Floor ${activePreviewFloor}.`,
    });
  };

  const deleteSelectedRooms = () => {
    if (selectedRoomIds.size === 0) return;
    const count = selectedRoomsOnActiveFloor.length;
    setGeneratedRooms((prev) => prev.filter((r) => !selectedRoomIds.has(r.tempId)));
    setSelectedRoomIds(new Set());
    toast({
      title: "Rooms Deleted",
      description: `Removed ${count} rooms from Floor ${activePreviewFloor}.`,
    });
  };

  // Range batch apply (e.g. from A-101 to A-104)
  const applyRangeCustomization = () => {
    if (!rangeStartRoom || !rangeEndRoom) {
      toast({ title: "Select start and end room for range", variant: "destructive" });
      return;
    }

    const startIdx = activeFloorRooms.findIndex((r) => r.room_number === rangeStartRoom);
    const endIdx = activeFloorRooms.findIndex((r) => r.room_number === rangeEndRoom);

    if (startIdx === -1 || endIdx === -1) {
      toast({ title: "Invalid room range specified", variant: "destructive" });
      return;
    }

    const min = Math.min(startIdx, endIdx);
    const max = Math.max(startIdx, endIdx);
    const targetRooms = activeFloorRooms.slice(min, max + 1);

    const beds = parseInt(rangeSelectedSharing);
    const opt = SHARING_OPTIONS.find((s) => s.beds === beds) || SHARING_OPTIONS[3];

    setGeneratedRooms((prev) =>
      prev.map((r) => {
        if (targetRooms.some((tr) => tr.tempId === r.tempId)) {
          return {
            ...r,
            max_capacity: opt.beds,
            category: opt.defaultCat,
            daily_rate: opt.defaultRate,
            attached_bathroom: opt.hasBath,
          };
        }
        return r;
      })
    );

    toast({
      title: "Range Applied Successfully",
      description: `Updated rooms ${activeFloorRooms[min].room_number} to ${activeFloorRooms[max].room_number} to ${opt.label}.`,
    });
  };

  // Active Floor Category Breakdown for Matrix
  const floorCategoryBreakdown = useMemo(() => {
    const counts: { [label: string]: { count: number; beds: number } } = {};
    activeFloorRooms.forEach((r) => {
      const label = `${r.max_capacity}-Bed (${getRoomCategoryLabel(r.category)})`;
      if (!counts[label]) {
        counts[label] = { count: 0, beds: r.max_capacity };
      }
      counts[label].count += 1;
    });
    return Object.entries(counts).map(([label, data]) => ({
      label,
      count: data.count,
      beds: data.beds,
    }));
  }, [activeFloorRooms]);

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
      <DialogContent className="max-w-4xl max-h-[94vh] flex flex-col p-0 overflow-hidden">
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
                Rapidly scaffold blocks, configure custom rooms per floor, and fine-tune individual room attributes.
              </DialogDescription>
            </div>

            {/* Stepper Pill Indicators */}
            <div className="hidden sm:flex items-center gap-1.5 bg-background/80 p-1 rounded-lg border shadow-xs">
              {[
                { step: 1, label: "Blocks & Floors", icon: Building2 },
                { step: 2, label: "Floor Layout & Sharing", icon: BedDouble },
                { step: 3, label: "Interactive Matrix", icon: Sparkles },
              ].map(({ step, label, icon: Icon }) => {
                const isActive = currentStep === step;
                const isPassed = currentStep > step;
                return (
                  <button
                    key={step}
                    disabled={isSubmitting}
                    onClick={() => {
                      if (step === 3 && generatedRooms.length === 0) {
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
        <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto max-h-[calc(92vh-200px)]">
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

          {/* ═══════════════ STEP 2: FLOOR LAYOUT & ROOM RULES ═══════════════ */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Floor Layout & Room Sharing Configuration</h3>
                  <p className="text-xs text-muted-foreground">
                    Customize each floor individually with unique room counts, bed capacities, and room types — or apply a uniform layout.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {blocks.map((block, index) => {
                  const currentFloorTab = getActiveStep2Floor(block.id);
                  const activeFloorConfig =
                    block.floorConfigs?.find((fc) => fc.floor === currentFloorTab) ||
                    block.floorConfigs?.[0] || {
                      floor: 1,
                      customized: false,
                      roomsCount: block.roomsPerFloor,
                      roomGroups: [],
                    };

                  const totalBlockRooms = block.customizeFloorsSeparately
                    ? block.floorConfigs?.reduce(
                        (acc, fc) => acc + fc.roomGroups.reduce((gAcc, g) => gAcc + g.count, 0),
                        0
                      ) || 0
                    : block.floors * block.roomsPerFloor;

                  const totalBlockBeds = block.customizeFloorsSeparately
                    ? block.floorConfigs?.reduce(
                        (acc, fc) =>
                          acc + fc.roomGroups.reduce((gAcc, g) => gAcc + g.count * g.sharing, 0),
                        0
                      ) || 0
                    : block.floors * block.roomsPerFloor * block.defaultSharing;

                  return (
                    <Card key={block.id} className="border shadow-xs overflow-hidden">
                      <CardHeader className="p-4 pb-3 bg-secondary/30 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-primary" />
                            <CardTitle className="text-sm font-bold">{block.name}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {block.floors} Floors
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-semibold text-foreground">
                              {totalBlockRooms} Rooms • {totalBlockBeds} Total Beds
                            </span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-4">
                        {/* Numbering & Prefix Settings */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Room Prefix</Label>
                            <Input
                              value={block.prefix}
                              onChange={(e) => updateBlock(index, { prefix: e.target.value })}
                              placeholder="e.g. A"
                              className="h-8 text-xs font-mono uppercase"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Generates "{block.prefix}-101", "{block.prefix}-102"...
                            </p>
                          </div>

                          <div className="space-y-1">
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
                          </div>
                        </div>

                        {/* Customization Mode Toggle Card */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Layers size={15} className="text-primary" />
                              <span className="text-xs font-bold text-foreground">
                                Per-Floor Customization
                              </span>
                              {block.customizeFloorsSeparately ? (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary">
                                  Individual Floors Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Uniform Template
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {block.customizeFloorsSeparately
                                ? "Configure each floor with its own unique room mix (e.g. Floor 1 has executive + staff rooms; Floor 2 has worker dorms)."
                                : "Every floor in this block shares the same uniform room count and bed sharing rules."}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={block.customizeFloorsSeparately}
                              onCheckedChange={(checked) => {
                                updateBlock(index, { customizeFloorsSeparately: checked });
                              }}
                            />
                            <Label className="text-xs cursor-pointer font-medium hidden sm:inline">
                              {block.customizeFloorsSeparately ? "Custom Floors" : "Uniform"}
                            </Label>
                          </div>
                        </div>

                        {/* MODE A: UNIFORM TEMPLATE FOR ALL FLOORS */}
                        {!block.customizeFloorsSeparately && (
                          <div className="space-y-4 pt-1 animate-in fade-in-50">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
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
                                  className="h-8 text-xs font-semibold"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                  {block.floors} floors × {block.roomsPerFloor} = {block.floors * block.roomsPerFloor} total rooms.
                                </p>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs font-medium">Daily Room Rate (SAR)</Label>
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
                                <Label className="text-xs font-medium">Daily Food Rate (SAR)</Label>
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

                            {/* Bed Sharing Selection Cards */}
                            <div>
                              <Label className="text-xs font-semibold mb-2 block">
                                Default Room Sharing Capacity:
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
                                        SAR {opt.defaultRate}/day
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Amenities */}
                            <div className="flex items-center gap-6 p-3 rounded-lg bg-secondary/20 border">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={block.defaultAc}
                                  onCheckedChange={(val) => updateBlock(index, { defaultAc: val })}
                                />
                                <div>
                                  <Label className="text-xs cursor-pointer">AC Enabled</Label>
                                  <p className="text-[10px] text-muted-foreground">Air Conditioning in all rooms</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={block.defaultAttachedBath}
                                  onCheckedChange={(val) => updateBlock(index, { defaultAttachedBath: val })}
                                />
                                <div>
                                  <Label className="text-xs cursor-pointer">Attached Bath</Label>
                                  <p className="text-[10px] text-muted-foreground">Private Ensuite in all rooms</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* MODE B: CUSTOMIZE EACH FLOOR INDIVIDUALLY */}
                        {block.customizeFloorsSeparately && (
                          <div className="space-y-4 pt-1 animate-in fade-in-50">
                            {/* Floor Selection Tabs */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b">
                              <span className="text-xs font-semibold text-muted-foreground mr-1">
                                Select Floor:
                              </span>
                              {Array.from({ length: block.floors }, (_, i) => i + 1).map((flr) => {
                                const fc = block.floorConfigs?.find((c) => c.floor === flr);
                                const flrRooms =
                                  fc?.roomGroups.reduce((acc, g) => acc + g.count, 0) || 0;
                                const flrBeds =
                                  fc?.roomGroups.reduce((acc, g) => acc + g.count * g.sharing, 0) || 0;
                                const isCurrent = currentFloorTab === flr;

                                return (
                                  <Button
                                    key={flr}
                                    type="button"
                                    size="xs"
                                    variant={isCurrent ? "default" : "outline"}
                                    onClick={() => setActiveStep2Floor(block.id, flr)}
                                    className="text-xs h-7 gap-1.5"
                                  >
                                    <span>Floor {flr}</span>
                                    <Badge
                                      variant={isCurrent ? "secondary" : "outline"}
                                      className="text-[10px] px-1 py-0 h-4 font-normal"
                                    >
                                      {flrRooms} rms • {flrBeds} beds
                                    </Badge>
                                  </Button>
                                );
                              })}
                            </div>

                            {/* Active Floor Configuration Area */}
                            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3.5">
                              {/* Floor Action Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b">
                                <div>
                                  <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                                    <Layers size={13} className="text-primary" />
                                    Floor {currentFloorTab} Room Composition & Mix
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground">
                                    Add different room types (e.g. 2 executive rooms + 6 staff rooms) on Floor {currentFloorTab}.
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {/* Quick Floor Preset Dropdown */}
                                  <Select
                                    onValueChange={(val: any) =>
                                      applyFloorPreset(index, currentFloorTab, val)
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-xs w-36">
                                      <SelectValue placeholder="Floor Preset..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all_4bed" className="text-xs">
                                        All 4-Bed Staff (8 Rms)
                                      </SelectItem>
                                      <SelectItem value="exec_mix" className="text-xs">
                                        Exec Mix (2 Single + 6 Quad)
                                      </SelectItem>
                                      <SelectItem value="supervisor_mix" className="text-xs">
                                        Supervisor Mix (2 Twin + 6 Quad)
                                      </SelectItem>
                                      <SelectItem value="all_6bed" className="text-xs">
                                        All 6-Bed Labor (8 Rms)
                                      </SelectItem>
                                      <SelectItem value="dorm_8bed" className="text-xs">
                                        All 8-Bed Dorms (8 Rms)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>

                                  {block.floors > 1 && (
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="outline"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => copyFloorToAll(index, currentFloorTab)}
                                      title="Copy this floor's room layout to all other floors in this block"
                                    >
                                      <Copy size={12} /> Copy to All Floors
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Floor Room Groups List */}
                              <div className="space-y-2.5">
                                {activeFloorConfig.roomGroups.map((grp, grpIdx) => (
                                  <div
                                    key={grp.id}
                                    className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-md border bg-card text-xs shadow-2xs hover:border-primary/40 transition-colors"
                                  >
                                    {/* Room Count & Stepper */}
                                    <div className="flex items-center gap-1.5 sm:w-36">
                                      <Label className="text-[11px] text-muted-foreground w-12">
                                        Rooms:
                                      </Label>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-6 w-6 text-xs"
                                        onClick={() => {
                                          updateFloorConfig(index, currentFloorTab, (c) => ({
                                            ...c,
                                            roomGroups: c.roomGroups.map((g, i) =>
                                              i === grpIdx ? { ...g, count: Math.max(1, g.count - 1) } : g
                                            ),
                                          }));
                                        }}
                                      >
                                        -
                                      </Button>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={grp.count}
                                        onChange={(e) => {
                                          const val = Math.max(1, parseInt(e.target.value) || 1);
                                          updateFloorConfig(index, currentFloorTab, (c) => ({
                                            ...c,
                                            roomGroups: c.roomGroups.map((g, i) =>
                                              i === grpIdx ? { ...g, count: val } : g
                                            ),
                                          }));
                                        }}
                                        className="h-6 w-12 text-center font-bold px-1 text-xs"
                                      />
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-6 w-6 text-xs"
                                        onClick={() => {
                                          updateFloorConfig(index, currentFloorTab, (c) => ({
                                            ...c,
                                            roomGroups: c.roomGroups.map((g, i) =>
                                              i === grpIdx ? { ...g, count: g.count + 1 } : g
                                            ),
                                          }));
                                        }}
                                      >
                                        +
                                      </Button>
                                    </div>

                                    {/* Room Category / Sharing Select */}
                                    <div className="flex-1 min-w-[180px]">
                                      <Select
                                        value={String(grp.sharing)}
                                        onValueChange={(val) => {
                                          const beds = parseInt(val);
                                          const opt = SHARING_OPTIONS.find((s) => s.beds === beds) || SHARING_OPTIONS[3];
                                          updateFloorConfig(index, currentFloorTab, (c) => ({
                                            ...c,
                                            roomGroups: c.roomGroups.map((g, i) =>
                                              i === grpIdx
                                                ? {
                                                    ...g,
                                                    sharing: beds,
                                                    category: opt.defaultCat,
                                                    dailyRate: opt.defaultRate,
                                                    attachedBath: opt.hasBath,
                                                  }
                                                : g
                                            ),
                                          }));
                                        }}
                                      >
                                        <SelectTrigger className="h-7 text-xs font-medium">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {SHARING_OPTIONS.map((o) => (
                                            <SelectItem key={o.beds} value={String(o.beds)} className="text-xs">
                                              {o.label} ({o.beds} Beds • SAR {o.defaultRate}/d)
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* AC & Bath Toggles */}
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        size="xs"
                                        variant={grp.ac ? "default" : "outline"}
                                        onClick={() => {
                                          updateFloorConfig(index, currentFloorTab, (c) => ({
                                            ...c,
                                            roomGroups: c.roomGroups.map((g, i) =>
                                              i === grpIdx ? { ...g, ac: !g.ac } : g
                                            ),
                                          }));
                                        }}
                                        className="h-7 text-[11px] gap-1 px-2"
                                        title={grp.ac ? "AC Active" : "No AC"}
                                      >
                                        <Wind size={12} />
                                        <span>AC</span>
                                      </Button>

                                      <Button
                                        type="button"
                                        size="xs"
                                        variant={grp.attachedBath ? "default" : "outline"}
                                        onClick={() => {
                                          updateFloorConfig(index, currentFloorTab, (c) => ({
                                            ...c,
                                            roomGroups: c.roomGroups.map((g, i) =>
                                              i === grpIdx
                                                ? { ...g, attachedBath: !g.attachedBath }
                                                : g
                                            ),
                                          }));
                                        }}
                                        className="h-7 text-[11px] gap-1 px-2"
                                        title={grp.attachedBath ? "Private Attached Bath" : "Shared Bath"}
                                      >
                                        <Bath size={12} />
                                        <span>Bath</span>
                                      </Button>
                                    </div>

                                    {/* Rate Input */}
                                    <div className="flex items-center gap-1 w-24">
                                      <span className="text-[10px] text-muted-foreground font-mono">SAR</span>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={grp.dailyRate}
                                        onChange={(e) => {
                                          const rate = parseFloat(e.target.value) || 0;
                                          updateFloorConfig(index, currentFloorTab, (c) => ({
                                            ...c,
                                            roomGroups: c.roomGroups.map((g, i) =>
                                              i === grpIdx ? { ...g, dailyRate: rate } : g
                                            ),
                                          }));
                                        }}
                                        className="h-7 text-xs font-semibold px-1 text-right"
                                      />
                                    </div>

                                    {/* Remove Group Button */}
                                    {activeFloorConfig.roomGroups.length > 1 && (
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                          updateFloorConfig(index, currentFloorTab, (c) => ({
                                            ...c,
                                            roomGroups: c.roomGroups.filter((_, i) => i !== grpIdx),
                                          }));
                                        }}
                                        title="Remove room type"
                                      >
                                        <Trash2 size={13} />
                                      </Button>
                                    )}
                                  </div>
                                ))}

                                {/* Add Room Type Button */}
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  className="w-full border-dashed h-8 gap-1.5 text-xs text-primary hover:border-primary"
                                  onClick={() => {
                                    updateFloorConfig(index, currentFloorTab, (c) => ({
                                      ...c,
                                      roomGroups: [
                                        ...c.roomGroups,
                                        {
                                          id: `fg-${Date.now()}-${c.roomGroups.length}`,
                                          count: 2,
                                          sharing: 2,
                                          category: "supervisor_twin",
                                          ac: true,
                                          attachedBath: true,
                                          dailyRate: 90,
                                          dailyFoodRate: 30,
                                        },
                                      ],
                                    }));
                                  }}
                                >
                                  <Plus size={13} /> Add Another Room Type to Floor {currentFloorTab}
                                </Button>
                              </div>

                              {/* Floor Summary Footer */}
                              <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  Floor {currentFloorTab} Totals:{" "}
                                  <strong className="text-foreground">
                                    {activeFloorConfig.roomGroups.reduce((acc, g) => acc + g.count, 0)} Rooms
                                  </strong>{" "}
                                  •{" "}
                                  <strong className="text-blue-600 dark:text-blue-400">
                                    {activeFloorConfig.roomGroups.reduce(
                                      (acc, g) => acc + g.count * g.sharing,
                                      0
                                    )}{" "}
                                    Beds
                                  </strong>
                                </span>
                                <span>
                                  Est. Daily:{" "}
                                  <strong className="text-emerald-600 dark:text-emerald-400">
                                    SAR{" "}
                                    {activeFloorConfig.roomGroups
                                      .reduce((acc, g) => acc + g.count * g.dailyRate, 0)
                                      .toLocaleString()}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 3: INTERACTIVE MATRIX PREVIEW ═══════════════ */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Header Box */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-secondary/30 p-3 rounded-lg border">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <Sparkles size={15} className="text-primary" />
                    Interactive Room Matrix & Floor Customizer
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Fine-tune room numbers, bed capacities, amenities, or bulk customize rooms on any floor.
                  </p>
                </div>

                {/* Regenerate Button */}
                <Button
                  size="xs"
                  variant="outline"
                  onClick={generateRoomsMatrix}
                  className="gap-1 text-xs h-7"
                  title="Re-scaffold the matrix using the latest configuration from Step 2"
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
                        setSelectedRoomIds(new Set());
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
                          onClick={() => {
                            setActivePreviewFloor(flr);
                            setSelectedRoomIds(new Set());
                          }}
                          className={`text-xs h-7 px-2.5 font-medium ${
                            activePreviewFloor === flr ? "border border-primary/30 font-bold" : ""
                          }`}
                        >
                          Floor {flr}
                        </Button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Active Floor Overview Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs bg-muted/20 p-2 rounded-md border">
                <span className="font-semibold text-foreground mr-1">
                  Floor {activePreviewFloor} Overview:
                </span>
                <Badge variant="outline" className="text-xs font-bold">
                  {activeFloorRooms.length} Rooms
                </Badge>
                <Badge variant="secondary" className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {activeFloorRooms.reduce((acc, r) => acc + r.max_capacity, 0)} Beds
                </Badge>
                {floorCategoryBreakdown.map((item, idx) => (
                  <Badge key={idx} variant="outline" className="text-[11px] bg-background">
                    {item.count}× {item.beds}-Bed
                  </Badge>
                ))}
              </div>

              {/* Floor Batch Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-md border text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Select All Checkbox */}
                  <div className="flex items-center gap-1.5 mr-2">
                    <Checkbox
                      checked={
                        activeFloorRooms.length > 0 &&
                        activeFloorRooms.every((r) => selectedRoomIds.has(r.tempId))
                      }
                      onCheckedChange={toggleSelectAllOnFloor}
                      id="select-all-floor"
                    />
                    <label htmlFor="select-all-floor" className="text-xs cursor-pointer font-medium">
                      Select All
                    </label>
                  </div>

                  {/* Floor-wide Sharing Dropdown */}
                  <Select
                    onValueChange={(val) => {
                      const opt = SHARING_OPTIONS.find((s) => s.beds === parseInt(val));
                      if (opt) {
                        setFloorSharing(activePreviewBlock, activePreviewFloor, opt.beds, opt.defaultCat, opt.defaultRate);
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

                {/* Add Room Dropdown Menu / Buttons */}
                <div className="flex items-center gap-1.5">
                  <Select
                    onValueChange={(val) => {
                      const opt = SHARING_OPTIONS.find((s) => s.beds === parseInt(val));
                      if (opt) {
                        addRoomToFloor(
                          activePreviewBlock,
                          activePreviewFloor,
                          opt.beds,
                          opt.defaultCat,
                          opt.defaultRate,
                          opt.hasBath
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-36 border-primary/30 text-primary">
                      <SelectValue placeholder="+ Add Room as..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SHARING_OPTIONS.map((o) => (
                        <SelectItem key={o.beds} value={String(o.beds)} className="text-xs">
                          + {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Room Range Tool Bar */}
              {activeFloorRooms.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-secondary/20 border text-xs">
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
                  <Select value={rangeSelectedSharing} onValueChange={setRangeSelectedSharing}>
                    <SelectTrigger className="h-6 text-xs w-32">
                      <SelectValue />
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
                    className="h-6 text-xs px-2"
                    onClick={applyRangeCustomization}
                  >
                    Apply Range
                  </Button>
                </div>
              )}

              {/* MULTI-ROOM SELECTION ACTION BANNER */}
              {selectedRoomsOnActiveFloor.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-primary text-primary-foreground shadow-md animate-in slide-in-from-top-1">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <CheckSquare size={15} />
                    <span>{selectedRoomsOnActiveFloor.length} rooms selected on Floor {activePreviewFloor}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Apply Sharing to Selected */}
                    <Select
                      onValueChange={(val) => {
                        const opt = SHARING_OPTIONS.find((s) => s.beds === parseInt(val));
                        if (opt) {
                          batchApplyToSelected({
                            max_capacity: opt.beds,
                            category: opt.defaultCat,
                            daily_rate: opt.defaultRate,
                            attached_bathroom: opt.hasBath,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs bg-background text-foreground w-36">
                        <SelectValue placeholder="Change Sharing..." />
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
                      Deselect
                    </Button>
                  </div>
                </div>
              )}

              {/* Room Cards Grid for active block & floor */}
              {activeFloorRooms.length === 0 ? (
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
                  {activeFloorRooms.map((room) => {
                    const isSelected = selectedRoomIds.has(room.tempId);
                    return (
                      <Card
                        key={room.tempId}
                        className={`border shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group ${
                          isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : ""
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
                          {/* Top Row: Checkbox, Room Number & Delete */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-1 mr-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectRoom(room.tempId)}
                                className="h-4 w-4"
                              />
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
                                const opt = SHARING_OPTIONS.find((s) => s.defaultCat === val);
                                updateGeneratedRoom(room.tempId, {
                                  category: val,
                                  max_capacity: cap,
                                  ...(opt ? { daily_rate: opt.defaultRate, attached_bathroom: opt.hasBath } : {}),
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
                    );
                  })}
                </div>
              )}
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
                Next: Floor Layout & Rooms <ArrowRight size={14} />
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
