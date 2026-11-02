import { useState, useMemo, useEffect } from "react";
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
  Filter,
  Grid,
  Hash,
  Boxes,
  FileSpreadsheet,
  ListPlus,
  TableProperties,
  AlertCircle,
  FileText,
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

  // Navigation Mode (Progressive 3-Stage Drilldown: Blocks -> Floors -> Rooms)
  const [currentView, setCurrentView] = useState<"blocks" | "floors" | "rooms">("blocks");

  // Current active node in the hierarchy
  const [activeBlockId, setActiveBlockId] = useState<string>("b-1");
  const [activeFloor, setActiveFloor] = useState<number>(1);
  const [treeSearchQuery, setTreeSearchQuery] = useState("");
  const [treeTypeFilter, setTreeTypeFilter] = useState<string>("all");

  // Multi-Block Batch Generator State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchCount, setBatchCount] = useState<number>(3);
  const [batchNamingStyle, setBatchNamingStyle] = useState<"letters" | "numbers" | "custom">("letters");
  const [batchPrefixName, setBatchPrefixName] = useState<string>("Block");
  const [batchBlockType, setBatchBlockType] = useState<string>("worker");
  const [batchFloors, setBatchFloors] = useState<number>(3);
  const [batchRoomsPerFloor, setBatchRoomsPerFloor] = useState<number>(8);
  const [batchSpecId, setBatchSpecId] = useState<string>("");
  const [batchNumberingFormat, setBatchNumberingFormat] = useState<"3digit" | "4digit" | "g_style" | "sequential">("3digit");

  // Room Matrix Items
  const [rooms, setRooms] = useState<GeneratedRoomItem[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());

  // Individual Custom Room Creation Dialog state
  const [singleRoomModalOpen, setSingleRoomModalOpen] = useState(false);
  const [customRoomNumber, setCustomRoomNumber] = useState("");
  const [customRoomFloor, setCustomRoomFloor] = useState<number>(1);
  const [customRoomSpecId, setCustomRoomSpecId] = useState<string>("");
  const [customRoomCapacity, setCustomRoomCapacity] = useState<number>(4);
  const [customRoomAc, setCustomRoomAc] = useState<boolean>(true);
  const [customRoomBath, setCustomRoomBath] = useState<boolean>(true);
  const [customRoomRate, setCustomRoomRate] = useState<number>(60);
  const [keepSingleRoomOpen, setKeepSingleRoomOpen] = useState<boolean>(false);

  // Bulk Room Entry Dialog state
  const [bulkEntryModalOpen, setBulkEntryModalOpen] = useState(false);
  const [bulkEntryMode, setBulkEntryMode] = useState<"paste" | "table">("paste");
  const [bulkEntryRawText, setBulkEntryRawText] = useState("");
  const [bulkEntrySpecId, setBulkEntrySpecId] = useState<string>("");
  const [bulkEntryTargetFloor, setBulkEntryTargetFloor] = useState<number>(1);
  const [bulkEntryAutoPrefix, setBulkEntryAutoPrefix] = useState<boolean>(false);
  const [bulkGridRows, setBulkGridRows] = useState<
    Array<{
      id: string;
      room_number: string;
      floor: number;
      specId: string;
      capacity: number;
      ac: boolean;
      bath: boolean;
      rate: number;
    }>
  >([]);

  // Range Tool state
  const [rangeStartRoom, setRangeStartRoom] = useState<string>("");
  const [rangeEndRoom, setRangeEndRoom] = useState<string>("");
  const [rangeSelectedSpecId, setRangeSelectedSpecId] = useState<string>("");

  // Load available specifications
  useEffect(() => {
    if (open) {
      const stored = getStoredRoomSpecifications();
      setAvailableSpecs(stored);
      if (stored.length > 0) {
        if (!rangeSelectedSpecId) {
          setRangeSelectedSpecId(stored[2]?.id || stored[0]?.id);
        }
        if (!batchSpecId) {
          setBatchSpecId(stored.find((s) => s.capacity === 6)?.id || stored[2]?.id || stored[0]?.id);
        }
        if (!customRoomSpecId) {
          setCustomRoomSpecId(stored[2]?.id || stored[0]?.id);
        }
        if (!bulkEntrySpecId) {
          setBulkEntrySpecId(stored[2]?.id || stored[0]?.id);
        }
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

  // Helper to determine next available letter prefixes
  const getNextAvailableLetters = (existingPrefixes: string[], count: number) => {
    const used = new Set(existingPrefixes.map((p) => p.trim().toUpperCase()));
    const result: string[] = [];
    let code = 65; // 'A'
    while (result.length < count && code <= 90 + 26) {
      let letter = "";
      if (code <= 90) {
        letter = String.fromCharCode(code);
      } else {
        const offset = code - 91;
        letter = `A${String.fromCharCode(65 + offset)}`;
      }
      if (!used.has(letter)) {
        result.push(letter);
        used.add(letter);
      }
      code++;
    }
    return result;
  };

  // Helper to determine next available number prefixes
  const getNextAvailableNumbers = (existingPrefixes: string[], count: number) => {
    const used = new Set(existingPrefixes.map((p) => p.trim()));
    const result: string[] = [];
    let num = 1;
    while (result.length < count && num <= 99) {
      const str = String(num);
      if (!used.has(str)) {
        result.push(str);
        used.add(str);
      }
      num++;
    }
    return result;
  };

  // Filtered blocks for tree explorer
  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (treeTypeFilter !== "all" && b.block_type !== treeTypeFilter) {
        return false;
      }
      if (treeSearchQuery.trim()) {
        const q = treeSearchQuery.toLowerCase().trim();
        const matchName = b.name.toLowerCase().includes(q);
        const matchSupervisor = (b.supervisor_name || "").toLowerCase().includes(q);
        const matchPrefix = b.prefix.toLowerCase().includes(q);
        const matchRooms = rooms.some(
          (r) => r.blockTempId === b.id && r.room_number.toLowerCase().includes(q)
        );
        return matchName || matchSupervisor || matchPrefix || matchRooms;
      }
      return true;
    });
  }, [blocks, rooms, treeTypeFilter, treeSearchQuery]);

  // Selected room specification for batch modal
  const batchSelectedSpec = useMemo(() => {
    const specs = availableSpecs.length > 0 ? availableSpecs : DEFAULT_ROOM_SPECIFICATIONS;
    return specs.find((s) => s.id === batchSpecId) || specs[0];
  }, [availableSpecs, batchSpecId]);

  // Batch preview blocks
  const batchPreviewBlocks = useMemo(() => {
    const existingPrefixes = blocks.map((b) => b.prefix);
    let prefixes: string[] = [];
    if (batchNamingStyle === "letters") {
      prefixes = getNextAvailableLetters(existingPrefixes, batchCount);
    } else if (batchNamingStyle === "numbers") {
      prefixes = getNextAvailableNumbers(existingPrefixes, batchCount);
    } else {
      prefixes = Array.from({ length: batchCount }, (_, i) => `${i + 1}`);
    }

    const typeObj = BLOCK_TYPES.find((t) => t.value === batchBlockType) || BLOCK_TYPES[2];

    return prefixes.map((pref) => {
      const blockName = `${batchPrefixName} ${pref} - ${typeObj.label.split(" / ")[0]}`;
      return {
        prefix: pref,
        name: blockName,
        floors: batchFloors,
        roomsPerFloor: batchRoomsPerFloor,
      };
    });
  }, [blocks, batchNamingStyle, batchCount, batchPrefixName, batchBlockType, batchFloors, batchRoomsPerFloor]);

  // Batch preview totals
  const batchPreviewTotals = useMemo(() => {
    const totalNewBlocks = batchPreviewBlocks.length;
    const totalNewFloors = totalNewBlocks * batchFloors;
    const totalNewRooms = totalNewFloors * batchRoomsPerFloor;
    const bedsPerRoom = batchSelectedSpec?.capacity || 4;
    const totalNewBeds = totalNewRooms * bedsPerRoom;
    const dailyRate = batchSelectedSpec?.dailyRate || 60;
    const totalEstDailyRev = totalNewRooms * dailyRate;

    return {
      totalNewBlocks,
      totalNewFloors,
      totalNewRooms,
      totalNewBeds,
      totalEstDailyRev,
    };
  }, [batchPreviewBlocks, batchFloors, batchRoomsPerFloor, batchSelectedSpec]);

  // Handle Multi-Block Generation
  const handleBatchGenerateBlocks = () => {
    if (batchCount < 1 || batchCount > 30) {
      toast({ title: "Please enter between 1 and 30 blocks", variant: "destructive" });
      return;
    }
    if (batchFloors < 1 || batchFloors > 20) {
      toast({ title: "Floors must be between 1 and 20", variant: "destructive" });
      return;
    }
    if (batchRoomsPerFloor < 1 || batchRoomsPerFloor > 50) {
      toast({ title: "Rooms per floor must be between 1 and 50", variant: "destructive" });
      return;
    }

    const spec = batchSelectedSpec;
    const newBlocks: BlockHierarchyItem[] = [];
    const newRooms: GeneratedRoomItem[] = [];
    const newExpandedMap: { [id: string]: boolean } = { ...expandedBlocks };

    batchPreviewBlocks.forEach((preview, bIdx) => {
      const blockId = `b-batch-${Date.now()}-${bIdx}-${Math.random().toString(36).substring(2, 6)}`;
      const blockItem: BlockHierarchyItem = {
        id: blockId,
        name: preview.name,
        block_type: batchBlockType,
        floors: batchFloors,
        supervisor_name: "",
        prefix: preview.prefix,
        numberingFormat: batchNumberingFormat,
      };
      newBlocks.push(blockItem);
      newExpandedMap[blockId] = true;

      for (let flr = 1; flr <= batchFloors; flr++) {
        for (let r = 1; r <= batchRoomsPerFloor; r++) {
          const roomNumber = buildRoomNumber(preview.prefix, flr, r, batchNumberingFormat);
          newRooms.push({
            tempId: `${blockId}-f${flr}-r${r}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            blockTempId: blockId,
            blockName: preview.name,
            floor: flr,
            room_number: roomNumber,
            specId: spec.id,
            category: spec.categoryValue,
            categoryLabel: spec.name,
            max_capacity: spec.capacity,
            ac: spec.ac,
            attached_bathroom: spec.attachedBath,
            daily_rate: spec.dailyRate,
            daily_food_rate: spec.dailyFoodRate,
          });
        }
      }
    });

    setBlocks([...blocks, ...newBlocks]);
    setRooms([...rooms, ...newRooms]);
    setExpandedBlocks(newExpandedMap);
    if (newBlocks.length > 0) {
      setActiveBlockId(newBlocks[0].id);
      setActiveFloor(1);
    }

    setBatchModalOpen(false);
    toast({
      title: `⚡ Batch Created ${newBlocks.length} Blocks!`,
      description: `Added ${newBlocks.length} blocks with ${batchPreviewTotals.totalNewRooms} rooms (${batchPreviewTotals.totalNewBeds} beds).`,
    });
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

  // Check if room number already exists in camp
  const isRoomNumberTaken = (roomNum: string, excludeTempId?: string) => {
    if (!roomNum || !roomNum.trim()) return false;
    const clean = roomNum.trim().toUpperCase();
    return rooms.some(
      (r) => r.room_number.trim().toUpperCase() === clean && r.tempId !== excludeTempId
    );
  };

  // Open Individual Room Creator
  const openSingleRoomCreator = (floor?: number) => {
    const targetFloor = floor !== undefined ? floor : activeFloor;
    setActiveFloor(targetFloor);
    setCustomRoomFloor(targetFloor);
    const spec =
      availableSpecs.find((s) => s.id === customRoomSpecId) ||
      availableSpecs[2] ||
      availableSpecs[0] ||
      DEFAULT_ROOM_SPECIFICATIONS[2];

    setCustomRoomSpecId(spec.id);
    setCustomRoomCapacity(spec.capacity);
    setCustomRoomAc(spec.ac);
    setCustomRoomBath(spec.attachedBath);
    setCustomRoomRate(spec.dailyRate);

    // Suggest candidate room number
    const candidate = findNextRoomNumber(
      currentBlock.prefix,
      targetFloor,
      currentBlock.numberingFormat,
      rooms.filter((r) => r.blockTempId === currentBlock.id && r.floor === targetFloor)
    );
    setCustomRoomNumber(candidate);
    setSingleRoomModalOpen(true);
  };

  const handleCustomRoomSpecChange = (specId: string) => {
    setCustomRoomSpecId(specId);
    const spec = availableSpecs.find((s) => s.id === specId);
    if (spec) {
      setCustomRoomCapacity(spec.capacity);
      setCustomRoomAc(spec.ac);
      setCustomRoomBath(spec.attachedBath);
      setCustomRoomRate(spec.dailyRate);
    }
  };

  const handleCreateCustomRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNum = customRoomNumber.trim();
    if (!cleanNum) {
      toast({ title: "Room number cannot be empty", variant: "destructive" });
      return;
    }

    if (isRoomNumberTaken(cleanNum)) {
      toast({
        title: "Duplicate Room Number",
        description: `Room number "${cleanNum}" is already assigned to a room in this camp.`,
        variant: "destructive",
      });
      return;
    }

    const spec =
      availableSpecs.find((s) => s.id === customRoomSpecId) ||
      availableSpecs[0] ||
      DEFAULT_ROOM_SPECIFICATIONS[0];

    const newRoom: GeneratedRoomItem = {
      tempId: `room-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      blockTempId: currentBlock.id,
      blockName: currentBlock.name,
      floor: customRoomFloor,
      room_number: cleanNum,
      specId: spec.id,
      category: spec.categoryValue,
      categoryLabel: spec.name,
      max_capacity: customRoomCapacity || spec.capacity,
      ac: customRoomAc,
      attached_bathroom: customRoomBath,
      daily_rate: customRoomRate ?? spec.dailyRate,
      daily_food_rate: spec.dailyFoodRate,
    };

    setRooms((prev) => [...prev, newRoom]);
    toast({
      title: "Room Created Successfully",
      description: `Created Room ${cleanNum} (${spec.name}) on Floor ${customRoomFloor}.`,
    });

    if (keepSingleRoomOpen) {
      setCustomRoomNumber("");
    } else {
      setSingleRoomModalOpen(false);
      setCustomRoomNumber("");
    }
  };

  // Open Bulk Room Entry
  const openBulkRoomEntry = (floor?: number) => {
    const targetFloor = floor !== undefined ? floor : activeFloor;
    setActiveFloor(targetFloor);
    setBulkEntryTargetFloor(targetFloor);
    const defSpec = availableSpecs[2] || availableSpecs[0] || DEFAULT_ROOM_SPECIFICATIONS[2];
    if (!bulkEntrySpecId) {
      setBulkEntrySpecId(defSpec.id);
    }
    setBulkGridRows([
      { id: "row-1", room_number: "", floor: targetFloor, specId: defSpec.id, capacity: defSpec.capacity, ac: defSpec.ac, bath: defSpec.attachedBath, rate: defSpec.dailyRate },
      { id: "row-2", room_number: "", floor: targetFloor, specId: defSpec.id, capacity: defSpec.capacity, ac: defSpec.ac, bath: defSpec.attachedBath, rate: defSpec.dailyRate },
      { id: "row-3", room_number: "", floor: targetFloor, specId: defSpec.id, capacity: defSpec.capacity, ac: defSpec.ac, bath: defSpec.attachedBath, rate: defSpec.dailyRate },
      { id: "row-4", room_number: "", floor: targetFloor, specId: defSpec.id, capacity: defSpec.capacity, ac: defSpec.ac, bath: defSpec.attachedBath, rate: defSpec.dailyRate },
    ]);
    setBulkEntryModalOpen(true);
  };

  // Parsed bulk rooms from raw text
  const parsedBulkRooms = useMemo(() => {
    if (!bulkEntryRawText.trim()) return [];
    const lines = bulkEntryRawText
      .split(/[\r\n,;]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const prefix = currentBlock.prefix.trim();
    const cleanPrefix = prefix ? `${prefix}-` : "";
    const seenInBatch = new Set<string>();

    return lines.map((line, idx) => {
      let finalNum = line;
      if (bulkEntryAutoPrefix && cleanPrefix && !line.toUpperCase().startsWith(cleanPrefix.toUpperCase())) {
        finalNum = `${cleanPrefix}${line}`;
      }
      const upper = finalNum.toUpperCase();
      const isTaken = isRoomNumberTaken(finalNum);
      const isDuplicateInBatch = seenInBatch.has(upper);
      seenInBatch.add(upper);

      return {
        id: `p-${idx}-${finalNum}`,
        raw: line,
        finalNumber: finalNum,
        isTaken: isTaken,
        isDuplicateInBatch: isDuplicateInBatch,
      };
    });
  }, [bulkEntryRawText, bulkEntryAutoPrefix, currentBlock.prefix, rooms]);

  const handleExecuteBulkPasteImport = () => {
    if (parsedBulkRooms.length === 0) {
      toast({ title: "No room numbers to import", variant: "destructive" });
      return;
    }

    const invalidRooms = parsedBulkRooms.filter((r) => r.isTaken || r.isDuplicateInBatch);
    if (invalidRooms.length > 0) {
      toast({
        title: "Duplicate Room Numbers Detected",
        description: `Room "${invalidRooms[0].finalNumber}" is already in use or duplicated in this batch. Please resolve duplicates before importing.`,
        variant: "destructive",
      });
      return;
    }

    const spec = availableSpecs.find((s) => s.id === bulkEntrySpecId) || availableSpecs[0] || DEFAULT_ROOM_SPECIFICATIONS[0];
    const newItems: GeneratedRoomItem[] = parsedBulkRooms.map((p, idx) => ({
      tempId: `bulk-paste-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      blockTempId: currentBlock.id,
      blockName: currentBlock.name,
      floor: bulkEntryTargetFloor,
      room_number: p.finalNumber,
      specId: spec.id,
      category: spec.categoryValue,
      categoryLabel: spec.name,
      max_capacity: spec.capacity,
      ac: spec.ac,
      attached_bathroom: spec.attachedBath,
      daily_rate: spec.dailyRate,
      daily_food_rate: spec.dailyFoodRate,
    }));

    setRooms((prev) => [...prev, ...newItems]);
    setBulkEntryModalOpen(false);
    setBulkEntryRawText("");

    toast({
      title: `⚡ Bulk Imported ${newItems.length} Rooms!`,
      description: `Added ${newItems.length} custom-numbered rooms to ${currentBlock.name} - Floor ${bulkEntryTargetFloor}.`,
    });
  };

  const handleExecuteBulkTableImport = () => {
    const validRows = bulkGridRows.filter((r) => r.room_number.trim().length > 0);
    if (validRows.length === 0) {
      toast({ title: "Please enter at least one room number", variant: "destructive" });
      return;
    }

    const seen = new Set<string>();
    for (const r of validRows) {
      const num = r.room_number.trim();
      if (isRoomNumberTaken(num)) {
        toast({
          title: "Duplicate Room Number",
          description: `Room "${num}" already exists in this camp.`,
          variant: "destructive",
        });
        return;
      }
      if (seen.has(num.toUpperCase())) {
        toast({
          title: "Duplicate in Table",
          description: `Room "${num}" appears multiple times in your table.`,
          variant: "destructive",
        });
        return;
      }
      seen.add(num.toUpperCase());
    }

    const newItems: GeneratedRoomItem[] = validRows.map((r, idx) => {
      const spec = availableSpecs.find((s) => s.id === r.specId) || availableSpecs[0] || DEFAULT_ROOM_SPECIFICATIONS[0];
      return {
        tempId: `bulk-tbl-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        blockTempId: currentBlock.id,
        blockName: currentBlock.name,
        floor: r.floor || bulkEntryTargetFloor,
        room_number: r.room_number.trim(),
        specId: spec.id,
        category: spec.categoryValue,
        categoryLabel: spec.name,
        max_capacity: r.capacity || spec.capacity,
        ac: r.ac,
        attached_bathroom: r.bath,
        daily_rate: r.rate ?? spec.dailyRate,
        daily_food_rate: spec.dailyFoodRate,
      };
    });

    setRooms((prev) => [...prev, ...newItems]);
    setBulkEntryModalOpen(false);

    toast({
      title: `⚡ Table Imported ${newItems.length} Rooms!`,
      description: `Added ${newItems.length} custom-numbered rooms to ${currentBlock.name}.`,
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

          {/* Main Full-Width Staged Workspace */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Stage Navigation & Breadcrumbs Bar */}
            <div className="px-5 py-2.5 border-b bg-muted/25 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              {/* Stepper Tabs */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCurrentView("blocks")}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    currentView === "blocks"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border"
                  }`}
                >
                  <Building2 size={13} />
                  <span>1. Blocks ({blocks.length})</span>
                </button>

                <ChevronRight size={13} className="text-muted-foreground/60" />

                <button
                  type="button"
                  onClick={() => setCurrentView("floors")}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    currentView === "floors"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border"
                  }`}
                >
                  <Layers size={13} />
                  <span>2. Floors ({currentBlock.floors} Levels in {currentBlock.prefix})</span>
                </button>

                <ChevronRight size={13} className="text-muted-foreground/60" />

                <button
                  type="button"
                  onClick={() => setCurrentView("rooms")}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    currentView === "rooms"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border"
                  }`}
                >
                  <BedDouble size={13} />
                  <span>3. Rooms ({activeFloorRooms.length} on F{activeFloor})</span>
                </button>
              </div>

              {/* Breadcrumb Context & Quick Back Action */}
              <div className="flex items-center gap-2">
                {currentView !== "blocks" && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setCurrentView(currentView === "rooms" ? "floors" : "blocks")}
                    className="h-7 text-xs gap-1 border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                  >
                    &larr; Back to {currentView === "rooms" ? "Floors" : "Blocks"}
                  </Button>
                )}
                <div className="text-[11px] font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded border hidden sm:flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">{campName}</span>
                  <ChevronRight size={11} />
                  <span className="font-semibold text-primary">{currentBlock.name}</span>
                  {currentView === "rooms" && (
                    <>
                      <ChevronRight size={11} />
                      <span className="font-bold text-foreground">Floor {activeFloor}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ════════ STAGE 1: BLOCKS OVERVIEW ════════ */}
            {currentView === "blocks" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Stage 1 Toolbar */}
                <div className="p-4 border-b bg-card/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative w-64">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={treeSearchQuery}
                        onChange={(e) => setTreeSearchQuery(e.target.value)}
                        placeholder="Search blocks by name or supervisor..."
                        className="h-8 pl-7 pr-6 text-xs bg-background"
                      />
                      {treeSearchQuery && (
                        <button
                          onClick={() => setTreeSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                      {[
                        { id: "all", label: "All Blocks" },
                        { id: "worker", label: "Worker" },
                        { id: "staff", label: "Staff" },
                        { id: "technician", label: "Tech" },
                        { id: "labor", label: "Labor" },
                        { id: "supervisor", label: "Supervisor" },
                        { id: "executive", label: "Executive" },
                      ].map((f) => {
                        const isActive = treeTypeFilter === f.id;
                        const count =
                          f.id === "all"
                            ? blocks.length
                            : blocks.filter((b) => b.block_type === f.id).length;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setTreeTypeFilter(f.id)}
                            className={`px-2.5 py-1 rounded-full border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                              isActive
                                ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
                                : "bg-background text-muted-foreground hover:bg-muted border-border"
                            }`}
                          >
                            <span>{f.label}</span>
                            <span
                              className={`text-[9px] px-1 rounded-full ${
                                isActive ? "bg-primary-foreground/25 text-white" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBatchModalOpen(true)}
                      className="text-xs h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 font-medium"
                    >
                      <Sparkles size={13} className="text-amber-500" /> Multi-Block Generator
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddBlock}
                      className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-2xs"
                    >
                      <Plus size={13} /> Add Single Block
                    </Button>
                  </div>
                </div>

                {/* Blocks Grid Cards */}
                <ScrollArea className="flex-1 p-5 overflow-y-auto">
                  {filteredBlocks.length === 0 ? (
                    <div className="text-center py-20 border border-dashed rounded-lg space-y-3">
                      <p className="text-xs text-muted-foreground">No blocks match the selected filter.</p>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setTreeTypeFilter("all");
                          setTreeSearchQuery("");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                      {filteredBlocks.map((block) => {
                        const blockRooms = rooms.filter((r) => r.blockTempId === block.id);
                        const blockBeds = blockRooms.reduce((acc, r) => acc + r.max_capacity, 0);
                        const isCurrent = activeBlockId === block.id;

                        return (
                          <Card
                            key={block.id}
                            className={`border transition-all hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                              isCurrent ? "ring-2 ring-primary border-primary bg-primary/2" : "bg-card"
                            }`}
                          >
                            <CardContent className="p-4 space-y-3">
                              {/* Card Top: Icon, Name, Category Badge, Delete */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                                    <Building2 size={18} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <Input
                                      value={block.name}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setBlocks(blocks.map((b) => (b.id === block.id ? { ...b, name: val } : b)));
                                      }}
                                      className="h-7 text-xs font-bold px-1.5 border-transparent hover:border-input focus:border-input"
                                    />
                                    <div className="flex items-center gap-1.5 pl-1.5">
                                      <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold px-1.5 py-0">
                                        Prefix: {block.prefix}
                                      </Badge>
                                      <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0 font-medium">
                                        {block.block_type}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {blocks.length > 1 && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-70 hover:opacity-100"
                                    onClick={() => handleRemoveBlock(block.id)}
                                    title="Delete block"
                                  >
                                    <Trash2 size={13} />
                                  </Button>
                                )}
                              </div>

                              {/* Block Metrics Bar */}
                              <div className="grid grid-cols-3 gap-2 py-2 border-y bg-muted/20 rounded-md text-center text-xs">
                                <div>
                                  <div className="text-[10px] text-muted-foreground">Floors</div>
                                  <div className="font-bold text-foreground">{block.floors} Levels</div>
                                </div>
                                <div className="border-x">
                                  <div className="text-[10px] text-muted-foreground">Rooms</div>
                                  <div className="font-bold text-blue-600 dark:text-blue-400">
                                    {blockRooms.length} Rooms
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-muted-foreground">Beds</div>
                                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {blockBeds} Beds
                                  </div>
                                </div>
                              </div>

                              {/* Supervisor & Numbering format info */}
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                <span>Supervisor: {block.supervisor_name || "Unassigned"}</span>
                                <span className="font-mono">{block.numberingFormat}</span>
                              </div>
                            </CardContent>

                            {/* Card Footer: Drill down action */}
                            <div className="p-3 border-t bg-muted/15 flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground">
                                Click to configure {block.floors} floors &rarr;
                              </span>
                              <Button
                                size="xs"
                                onClick={() => {
                                  setActiveBlockId(block.id);
                                  setActiveFloor(1);
                                  setCurrentView("floors");
                                }}
                                className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                              >
                                Manage Floors <ArrowRight size={13} />
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* ════════ STAGE 2: FLOOR LEVELS ════════ */}
            {currentView === "floors" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Stage 2 Toolbar */}
                <div className="p-4 border-b bg-card/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setCurrentView("blocks")}
                      className="h-8 text-xs gap-1"
                    >
                      &larr; Back to Blocks
                    </Button>
                    <div>
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Building2 size={15} className="text-primary" />
                        {currentBlock.name} &mdash; Floor Directory
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Select a floor to view and edit individual rooms, or duplicate room layouts across floors.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {currentBlock.floors > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyCurrentFloorToBlock}
                        className="text-xs h-8 gap-1.5"
                        title="Copy Floor 1 layout across all floors in this block"
                      >
                        <Copy size={13} /> Duplicate Floor Layout to All
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleAddFloorToBlock(currentBlock.id)}
                      className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold"
                    >
                      <Plus size={13} /> Add Floor to {currentBlock.prefix}
                    </Button>
                  </div>
                </div>

                {/* Floors Grid */}
                <ScrollArea className="flex-1 p-5 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                    {Array.from({ length: currentBlock.floors }, (_, i) => i + 1).map((flr) => {
                      const flrRooms = rooms.filter(
                        (r) => r.blockTempId === currentBlock.id && r.floor === flr
                      );
                      const flrBeds = flrRooms.reduce((acc, r) => acc + r.max_capacity, 0);
                      const acCount = flrRooms.filter((r) => r.ac).length;
                      const bathCount = flrRooms.filter((r) => r.attached_bathroom).length;
                      const sampleStart = flrRooms[0]?.room_number || "None";
                      const sampleEnd = flrRooms[flrRooms.length - 1]?.room_number || "";

                      return (
                        <Card
                          key={flr}
                          className="border transition-all hover:shadow-md bg-card flex flex-col justify-between"
                        >
                          <CardContent className="p-4 space-y-3">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                  <Layers size={18} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-foreground">Floor {flr}</h4>
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    {flrRooms.length} Rooms &bull; {sampleStart}{sampleEnd && sampleEnd !== sampleStart ? ` ➔ ${sampleEnd}` : ""}
                                  </span>
                                </div>
                              </div>
                              <Badge variant="outline" className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                {flrBeds} Total Beds
                              </Badge>
                            </div>

                            {/* Details bar */}
                            <div className="grid grid-cols-2 gap-2 p-2 rounded bg-muted/20 border text-xs">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Wind size={13} className="text-cyan-600" />
                                <span>{acCount} AC Rooms</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Bath size={13} className="text-emerald-600" />
                                <span>{bathCount} Ensuite Baths</span>
                              </div>
                            </div>
                          </CardContent>

                          {/* Footer */}
                          <div className="p-3 border-t bg-muted/15 flex items-center justify-between gap-2">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => openSingleRoomCreator(flr)}
                              className="text-xs h-7 gap-1 text-primary hover:bg-primary/10"
                            >
                              <Plus size={12} /> Add Room
                            </Button>

                            <Button
                              size="xs"
                              onClick={() => {
                                setActiveFloor(flr);
                                setCurrentView("rooms");
                              }}
                              className="text-xs h-7 gap-1 bg-primary text-primary-foreground font-semibold shadow-xs"
                            >
                              Configure Rooms <ArrowRight size={13} />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* ════════ STAGE 3: ROOM WORKBENCH ════════ */}
            {currentView === "rooms" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Stage 3 Header Bar */}
                <div className="p-3 px-5 border-b bg-card/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setCurrentView("floors")}
                      className="h-8 text-xs gap-1"
                    >
                      &larr; Back to Floors
                    </Button>
                    <div>
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <BedDouble size={16} className="text-primary" />
                        {currentBlock.name} &mdash; Floor {activeFloor} Rooms
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Every room can be individually customized: edit room numbers, assign specifications, adjust beds, and toggle amenities.
                      </p>
                    </div>
                  </div>

                  {/* Top Level Floor Tools */}
                  <div className="flex items-center gap-2">
                    {/* Apply Preset Dropdown */}
                    <Select
                      onValueChange={(specId) => {
                        const targetSpec = availableSpecs.find((s) => s.id === specId);
                        if (targetSpec) applyPresetToActiveFloor(targetSpec);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-44">
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

                    {/* Add Room button */}
                    <Button
                      size="sm"
                      onClick={() => openSingleRoomCreator()}
                      className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                      title="Add an individual room with custom room number"
                    >
                      <Plus size={13} /> Add Room
                    </Button>

                    {/* Bulk Room Entry button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openBulkRoomEntry()}
                      className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/5 font-semibold"
                      title="Bulk paste arbitrary room numbers from Excel"
                    >
                      <FileSpreadsheet size={13} className="text-emerald-600 dark:text-emerald-400" /> Bulk Room Entry
                    </Button>
                  </div>
                </div>

                {/* Selection Bar if multiple rooms selected */}
                {selectedRoomsOnActiveFloor.length > 0 && (
                  <div className="p-2 px-5 bg-primary text-primary-foreground shadow-md flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0 animate-in slide-in-from-top-1">
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

                {/* Select All Row */}
                <div className="px-5 py-2 bg-muted/20 border-b flex items-center justify-between text-xs flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        activeFloorRooms.length > 0 &&
                        activeFloorRooms.every((r) => selectedRoomIds.has(r.tempId))
                      }
                      onCheckedChange={toggleSelectAllOnFloor}
                      id="select-all-rooms"
                    />
                    <label htmlFor="select-all-rooms" className="text-xs cursor-pointer font-medium">
                      Select All on Floor {activeFloor} ({activeFloorRooms.length} Rooms &bull; {activeFloorRooms.reduce((acc, r) => acc + r.max_capacity, 0)} Beds)
                    </label>
                  </div>

                  <span className="text-[11px] text-muted-foreground">
                    Tip: Every room number, template, capacity, and rate can be directly edited right on the card.
                  </span>
                </div>

                {/* Room Cards Grid */}
                <ScrollArea className="flex-1 p-5 overflow-y-auto">
                  {activeFloorRooms.length === 0 ? (
                    <div className="text-center py-20 border border-dashed rounded-lg space-y-3">
                      <div className="p-3 bg-muted/40 rounded-full w-fit mx-auto text-muted-foreground">
                        <BedDouble size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground">No rooms configured on Floor {activeFloor} yet</p>
                        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                          Add rooms individually with custom numbering, or paste a list of arbitrary room numbers in bulk.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <Button
                          size="xs"
                          className="text-xs gap-1 bg-primary text-primary-foreground font-semibold"
                          onClick={() => openSingleRoomCreator()}
                        >
                          <Plus size={12} /> Add Room
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-xs gap-1 border-primary/40 text-primary font-medium"
                          onClick={() => openBulkRoomEntry()}
                        >
                          <FileSpreadsheet size={12} className="text-emerald-500" /> Bulk Room Entry
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pb-6">
                      {activeFloorRooms.map((room) => {
                        const isSelected = selectedRoomIds.has(room.tempId);
                        const isDup = isRoomNumberTaken(room.room_number, room.tempId);

                        return (
                          <Card
                            key={room.tempId}
                            className={`border shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group ${
                              isSelected
                                ? "ring-2 ring-primary border-primary bg-primary/5"
                                : isDup
                                ? "border-destructive bg-destructive/5"
                                : "bg-card"
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
                            <CardContent className="p-3.5 space-y-2.5">
                              {/* Top row: Checkbox, Room Number (Editable!), Bed count badge, Delete */}
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelectRoom(room.tempId)}
                                    className="h-4 w-4 flex-shrink-0"
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
                                    placeholder="Room #"
                                    className={`h-7 text-xs font-mono font-bold px-1.5 ${
                                      isDup ? "border-destructive text-destructive font-black" : ""
                                    }`}
                                  />
                                </div>

                                <div className="flex items-center gap-1">
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 font-bold gap-1 whitespace-nowrap"
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

                              {/* Room Specification Selector */}
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
                                        ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold"
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
                                          r.tempId === room.tempId ? { ...r, attached_bathroom: !r.attached_bathroom } : r
                                        )
                                      )
                                    }
                                    title={room.attached_bathroom ? "Ensuite Private Bath" : "Shared Bath"}
                                    className={`p-1 rounded transition-colors ${
                                      room.attached_bathroom
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
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
              </div>
            )}

            {/* Bottom Room Config Master Link Banner */}
            <div className="p-3 px-5 border-t bg-primary/5 flex items-center justify-between text-xs flex-shrink-0">
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

      {/* ════════ MULTI-BLOCK BATCH GENERATOR MODAL ════════ */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="max-w-[850px] w-full p-0 overflow-hidden bg-background">
          <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-blue-950/15 via-primary/5 to-transparent">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-semibold text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                <Sparkles size={13} /> Multi-Block Batch Scaffolder
              </Badge>
              <Badge variant="outline" className="text-xs">
                {campName}
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold">
              Rapid Multi-Block & Room Generator
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Quickly instantiate multiple blocks at once with pre-assigned room specifications, floor counts, and automated numbering schemes.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 max-h-[75vh] overflow-y-auto">
            {/* Left Column: Form Controls (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              {/* Number of Blocks */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">How Many Blocks to Create?</Label>
                  <span className="text-xs font-mono font-bold text-primary">{batchCount} Blocks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="h-8 text-xs w-24 font-bold font-mono"
                  />
                  <div className="flex items-center gap-1">
                    {[2, 3, 4, 6, 8].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="xs"
                        variant={batchCount === preset ? "default" : "outline"}
                        className="h-7 text-xs px-2"
                        onClick={() => setBatchCount(preset)}
                      >
                        +{preset}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Naming Style & Base Prefix */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Naming Convention</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "letters", label: "Letters (A, B, C...)" },
                    { id: "numbers", label: "Numbers (1, 2, 3...)" },
                    { id: "custom", label: "Custom Style" },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setBatchNamingStyle(style.id as any)}
                      className={`p-2 text-xs rounded-md border text-center transition-all ${
                        batchNamingStyle === style.id
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                          : "hover:bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Base Label</Label>
                    <Input
                      value={batchPrefixName}
                      onChange={(e) => setBatchPrefixName(e.target.value)}
                      placeholder="e.g. Block, Wing, Cluster"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Category / Role</Label>
                    <Select value={batchBlockType} onValueChange={setBatchBlockType}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOCK_TYPES.map((bt) => (
                          <SelectItem key={bt.value} value={bt.value} className="text-xs">
                            {bt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Floors and Rooms per floor */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/15 rounded-lg border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Floors per Block</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={15}
                      value={batchFloors}
                      onChange={(e) => setBatchFloors(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
                      className="h-8 text-xs font-mono font-bold"
                    />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">Levels</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Rooms per Floor</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={batchRoomsPerFloor}
                      onChange={(e) => setBatchRoomsPerFloor(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                      className="h-8 text-xs font-mono font-bold"
                    />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">Rooms</span>
                  </div>
                </div>
              </div>

              {/* Room Template Specification */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Pre-Assigned Room Specification</Label>
                  <Button
                    type="button"
                    size="xs"
                    variant="link"
                    className="h-auto p-0 text-[11px] text-primary"
                    onClick={() => setRoomConfigMasterOpen(true)}
                  >
                    Open Catalog &rarr;
                  </Button>
                </div>
                <Select value={batchSpecId} onValueChange={setBatchSpecId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Room Template" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSpecs.map((spec) => (
                      <SelectItem key={spec.id} value={spec.id} className="text-xs">
                        {spec.name} &bull; {spec.capacity} Beds &bull; SAR {spec.dailyRate}/day
                        {spec.ac ? " • AC" : ""}
                        {spec.attachedBath ? " • Bath" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  All rooms inside these {batchCount} blocks will automatically receive this template layout. You can customize individual rooms later.
                </p>
              </div>

              {/* Room Numbering Format */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Room Numbering Format</Label>
                <Select
                  value={batchNumberingFormat}
                  onValueChange={(val: any) => setBatchNumberingFormat(val)}
                >
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3digit" className="text-xs font-mono">
                      3-Digit Standard (e.g. C-101, C-102, C-201...)
                    </SelectItem>
                    <SelectItem value="4digit" className="text-xs font-mono">
                      4-Digit Padded (e.g. C-0101, C-0102, C-0201...)
                    </SelectItem>
                    <SelectItem value="g_style" className="text-xs font-mono">
                      Ground G-Style (e.g. C-G01, C-G02, C-101...)
                    </SelectItem>
                    <SelectItem value="sequential" className="text-xs font-mono">
                      Sequential (e.g. C-1, C-2, C-3...)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column: Live Architecture Blueprint & Summary (5 cols) */}
            <div className="md:col-span-5 flex flex-col justify-between border rounded-lg p-4 bg-muted/20 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-3 pb-2 border-b">
                  <Boxes size={14} className="text-primary" /> Live Scaffolding Blueprint
                </div>

                {/* Telemetry Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-background border flex flex-col">
                    <span className="text-[10px] text-muted-foreground">Blocks Added</span>
                    <span className="font-bold text-sm text-foreground">
                      +{batchPreviewTotals.totalNewBlocks} Blocks
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-background border flex flex-col">
                    <span className="text-[10px] text-muted-foreground">Floor Levels</span>
                    <span className="font-bold text-sm text-foreground">
                      +{batchPreviewTotals.totalNewFloors} Floors
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-background border flex flex-col">
                    <span className="text-[10px] text-muted-foreground">Total Rooms</span>
                    <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                      +{batchPreviewTotals.totalNewRooms} Rooms
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-background border flex flex-col">
                    <span className="text-[10px] text-muted-foreground">Bed Capacity</span>
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      +{batchPreviewTotals.totalNewBeds} Beds
                    </span>
                  </div>
                </div>

                {/* Generated Blocks Preview List */}
                <div className="mt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Block Names & Room Ranges:
                  </span>
                  <ScrollArea className="h-44 rounded border bg-background p-2 text-xs">
                    <div className="space-y-2">
                      {batchPreviewBlocks.map((b, idx) => {
                        const sampleStart = buildRoomNumber(b.prefix, 1, 1, batchNumberingFormat);
                        const sampleEnd = buildRoomNumber(b.prefix, b.floors, b.roomsPerFloor, batchNumberingFormat);
                        return (
                          <div key={idx} className="p-2 rounded bg-muted/30 border text-[11px] space-y-1">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-foreground flex items-center gap-1">
                                <Building2 size={12} className="text-primary" />
                                {b.name}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono">
                                Prefix: {b.prefix}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                              <span>
                                {b.floors} Floors &bull; {b.floors * b.roomsPerFloor} Rooms
                              </span>
                              <span className="font-mono text-foreground font-medium">
                                {sampleStart} &rarr; {sampleEnd}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Template Highlight */}
              <div className="p-2.5 rounded-md bg-primary/5 border border-primary/20 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[11px] text-primary flex items-center gap-1">
                    <BedDouble size={12} /> {batchSelectedSpec?.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 font-bold">
                    {batchSelectedSpec?.capacity} Beds/Room
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>Est. Daily Rev for batch:</span>
                  <span className="font-bold text-foreground">
                    SAR {batchPreviewTotals.totalEstDailyRev.toLocaleString()}/day
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBatchModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBatchGenerateBlocks}
              className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
            >
              <Sparkles size={13} className="text-amber-400" />
              Generate {batchPreviewTotals.totalNewBlocks} Blocks ({batchPreviewTotals.totalNewRooms} Rooms)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ INDIVIDUAL CUSTOM ROOM CREATION MODAL ════════ */}
      <Dialog open={singleRoomModalOpen} onOpenChange={setSingleRoomModalOpen}>
        <DialogContent className="max-w-[540px] w-full p-0 overflow-hidden bg-background">
          <form onSubmit={handleCreateCustomRoom}>
            <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-blue-950/15 via-primary/5 to-transparent">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                  <Plus size={13} /> Individual Room Setup
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {currentBlock.name} &bull; Floor {customRoomFloor}
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold">
                Add Room with Custom Number
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Assign an exact custom or non-standard room number, choose room specifications, and adjust capacity.
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Room Number Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-room-num" className="text-xs font-semibold">
                    Room Number / Identifier <span className="text-destructive">*</span>
                  </Label>
                  {isRoomNumberTaken(customRoomNumber) && (
                    <span className="text-[11px] text-destructive flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> Already taken in camp
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="custom-room-num"
                    value={customRoomNumber}
                    onChange={(e) => setCustomRoomNumber(e.target.value)}
                    placeholder="e.g. 101-A, VIP-1, Cabin-04, Porta-East"
                    autoFocus
                    className={`h-9 font-mono font-bold text-sm ${
                      isRoomNumberTaken(customRoomNumber)
                        ? "border-destructive focus-visible:ring-destructive"
                        : "border-input"
                    }`}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Can be any arbitrary format (alphanumeric, dashed, or legacy code).
                </p>
              </div>

              {/* Floor Level & Specification */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Floor Level</Label>
                  <Select
                    value={String(customRoomFloor)}
                    onValueChange={(val) => setCustomRoomFloor(parseInt(val))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: currentBlock.floors }, (_, i) => i + 1).map((f) => (
                        <SelectItem key={f} value={String(f)} className="text-xs">
                          Floor {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Room Specification</Label>
                  <Select
                    value={customRoomSpecId}
                    onValueChange={handleCustomRoomSpecChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select template" />
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
              </div>

              {/* Bed Capacity and Daily Rent */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/15 rounded-lg border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <BedDouble size={13} /> Bed Capacity
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={customRoomCapacity}
                      onChange={(e) => setCustomRoomCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-8 text-xs font-bold font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground">Beds</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <DollarSign size={13} /> Daily Rent
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      value={customRoomRate}
                      onChange={(e) => setCustomRoomRate(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-bold font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground">SAR/day</span>
                  </div>
                </div>
              </div>

              {/* Amenities Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div
                  onClick={() => setCustomRoomAc(!customRoomAc)}
                  className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    customRoomAc
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Wind size={14} /> Air Conditioning
                  </span>
                  <Switch checked={customRoomAc} onCheckedChange={setCustomRoomAc} />
                </div>

                <div
                  onClick={() => setCustomRoomBath(!customRoomBath)}
                  className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    customRoomBath
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Bath size={14} /> Ensuite Bath
                  </span>
                  <Switch checked={customRoomBath} onCheckedChange={setCustomRoomBath} />
                </div>
              </div>

              {/* Keep Modal Open Checkbox for continuous rapid entry */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Checkbox
                  id="keep-single-open"
                  checked={keepSingleRoomOpen}
                  onCheckedChange={(checked) => setKeepSingleRoomOpen(!!checked)}
                />
                <label htmlFor="keep-single-open" className="text-xs text-muted-foreground cursor-pointer">
                  Keep dialog open to add another room immediately
                </label>
              </div>
            </div>

            <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSingleRoomModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!customRoomNumber.trim() || isRoomNumberTaken(customRoomNumber)}
                className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
              >
                <Plus size={14} /> Add Room ({customRoomNumber.trim() || "..."})
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════ BULK ROOM ENTRY & IMPORTER MODAL ════════ */}
      <Dialog open={bulkEntryModalOpen} onOpenChange={setBulkEntryModalOpen}>
        <DialogContent className="max-w-[860px] w-full p-0 overflow-hidden bg-background">
          <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-blue-950/15 via-primary/5 to-transparent">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-semibold text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                <FileSpreadsheet size={13} /> Bulk Room Entry & Importer
              </Badge>
              <Badge variant="outline" className="text-xs">
                {currentBlock.name} &bull; Floor {bulkEntryTargetFloor}
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold">
              Bulk Create Arbitrary & Random Room Numbers
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Paste a column of room numbers from Excel or fill a rapid spreadsheet grid to instantiate custom-numbered rooms in bulk.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher Tabs */}
          <div className="px-5 pt-3 border-b bg-muted/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkEntryMode("paste")}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  bulkEntryMode === "paste"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText size={13} /> Fast Paste List (From Excel / Text)
              </button>
              <button
                type="button"
                onClick={() => setBulkEntryMode("table")}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  bulkEntryMode === "table"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <TableProperties size={13} /> Spreadsheet Quick Table
              </button>
            </div>

            {/* Target Floor Picker */}
            <div className="flex items-center gap-1.5 pb-2">
              <span className="text-[11px] text-muted-foreground">Target:</span>
              <Select
                value={String(bulkEntryTargetFloor)}
                onValueChange={(val) => setBulkEntryTargetFloor(parseInt(val))}
              >
                <SelectTrigger className="h-7 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: currentBlock.floors }, (_, i) => i + 1).map((f) => (
                    <SelectItem key={f} value={String(f)} className="text-xs">
                      Floor {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-5 max-h-[70vh] overflow-y-auto">
            {bulkEntryMode === "paste" ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left 7 cols: Paste Input & Config */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="bulk-paste-area" className="text-xs font-semibold">
                        Paste Room Numbers
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        One per line, comma or space separated
                      </span>
                    </div>
                    <textarea
                      id="bulk-paste-area"
                      rows={8}
                      value={bulkEntryRawText}
                      onChange={(e) => setBulkEntryRawText(e.target.value)}
                      placeholder={`Example:\n101A\n101B\nVIP-01\nCabin-4\nPorta-East-3\nG-12`}
                      className="w-full font-mono text-xs p-3 rounded-md border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  {/* Template for Pasted Rooms */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Apply Room Specification to All</Label>
                    <Select value={bulkEntrySpecId} onValueChange={setBulkEntrySpecId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select specification" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSpecs.map((spec) => (
                          <SelectItem key={spec.id} value={spec.id} className="text-xs">
                            {spec.name} &bull; {spec.capacity} Beds &bull; SAR {spec.dailyRate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Auto Prefix Checkbox */}
                  <div className="flex items-center gap-2 p-2.5 rounded border bg-secondary/15">
                    <Checkbox
                      id="bulk-auto-prefix"
                      checked={bulkEntryAutoPrefix}
                      onCheckedChange={(checked) => setBulkEntryAutoPrefix(!!checked)}
                    />
                    <label htmlFor="bulk-auto-prefix" className="text-xs cursor-pointer font-medium">
                      Auto-prepend Block prefix (e.g. <span className="font-mono font-bold">{currentBlock.prefix}-</span>) if not already typed
                    </label>
                  </div>
                </div>

                {/* Right 5 cols: Live Parsed Preview */}
                <div className="md:col-span-5 flex flex-col justify-between border rounded-lg p-3 bg-muted/20 space-y-3">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-primary" /> Parsed Rooms Preview
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {parsedBulkRooms.length} Detected
                      </Badge>
                    </div>

                    {parsedBulkRooms.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground text-xs space-y-1">
                        <p>No room numbers entered yet.</p>
                        <p className="text-[10px]">Type or paste room numbers on the left.</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-56 mt-2 rounded border bg-background p-2">
                        <div className="space-y-1">
                          {parsedBulkRooms.map((item, idx) => (
                            <div
                              key={item.id}
                              className={`p-1.5 rounded flex items-center justify-between text-xs font-mono border ${
                                item.isTaken || item.isDuplicateInBatch
                                  ? "bg-destructive/10 border-destructive/30 text-destructive font-bold"
                                  : "bg-muted/30 border-transparent text-foreground"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-sans">#{idx + 1}</span>
                                {item.finalNumber}
                              </span>
                              {item.isTaken ? (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                  Duplicate in Camp
                                </Badge>
                              ) : item.isDuplicateInBatch ? (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                  Duplicate in List
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                  Ready
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  {parsedBulkRooms.some((r) => r.isTaken || r.isDuplicateInBatch) && (
                    <div className="p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-[11px] flex items-center gap-1.5">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>Resolve duplicate room numbers before creating.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Spreadsheet Quick Table Mode */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Directly type individual room numbers, customize bed capacities, or paste rows from a spreadsheet.
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => {
                        const defSpec = availableSpecs[2] || availableSpecs[0] || DEFAULT_ROOM_SPECIFICATIONS[2];
                        const nextId = `row-${Date.now()}`;
                        setBulkGridRows((prev) => [
                          ...prev,
                          { id: nextId, room_number: "", floor: bulkEntryTargetFloor, specId: defSpec.id, capacity: defSpec.capacity, ac: defSpec.ac, bath: defSpec.attachedBath, rate: defSpec.dailyRate },
                        ]);
                      }}
                    >
                      <Plus size={12} /> Add Row
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => {
                        const defSpec = availableSpecs[2] || availableSpecs[0] || DEFAULT_ROOM_SPECIFICATIONS[2];
                        const newRows = Array.from({ length: 5 }, (_, i) => ({
                          id: `row-${Date.now()}-${i}`,
                          room_number: "",
                          floor: bulkEntryTargetFloor,
                          specId: defSpec.id,
                          capacity: defSpec.capacity,
                          ac: defSpec.ac,
                          bath: defSpec.attachedBath,
                          rate: defSpec.dailyRate,
                        }));
                        setBulkGridRows((prev) => [...prev, ...newRows]);
                      }}
                    >
                      + Add 5 Rows
                    </Button>
                  </div>
                </div>

                <div className="border rounded-md overflow-hidden bg-background">
                  <div className="grid grid-cols-12 gap-2 p-2 bg-muted/40 font-semibold text-[11px] text-muted-foreground border-b">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3">Room Number *</div>
                    <div className="col-span-3">Template / Spec</div>
                    <div className="col-span-2 text-center">Beds</div>
                    <div className="col-span-1 text-center">AC</div>
                    <div className="col-span-1 text-center">Bath</div>
                    <div className="col-span-1 text-center">Del</div>
                  </div>

                  <ScrollArea className="max-h-64 overflow-y-auto">
                    <div className="divide-y text-xs">
                      {bulkGridRows.map((row, idx) => {
                        const isDup = isRoomNumberTaken(row.room_number);
                        return (
                          <div key={row.id} className="grid grid-cols-12 gap-2 p-1.5 items-center hover:bg-muted/20">
                            <div className="col-span-1 text-center text-[10px] text-muted-foreground font-mono">
                              {idx + 1}
                            </div>
                            <div className="col-span-3">
                              <Input
                                value={row.room_number}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkGridRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, room_number: val } : r))
                                  );
                                }}
                                placeholder="e.g. VIP-1, 101A"
                                className={`h-7 text-xs font-mono font-bold ${
                                  isDup ? "border-destructive text-destructive" : ""
                                }`}
                              />
                            </div>
                            <div className="col-span-3">
                              <Select
                                value={row.specId}
                                onValueChange={(val) => {
                                  const spec = availableSpecs.find((s) => s.id === val);
                                  setBulkGridRows((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id
                                        ? {
                                            ...r,
                                            specId: val,
                                            capacity: spec?.capacity || r.capacity,
                                            ac: spec ? spec.ac : r.ac,
                                            bath: spec ? spec.attachedBath : r.bath,
                                            rate: spec?.dailyRate || r.rate,
                                          }
                                        : r
                                    )
                                  );
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableSpecs.map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                      {s.name} ({s.capacity}B)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                min={1}
                                max={20}
                                value={row.capacity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setBulkGridRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, capacity: val } : r))
                                  );
                                }}
                                className="h-7 text-xs font-mono font-bold text-center"
                              />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setBulkGridRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, ac: !r.ac } : r))
                                  );
                                }}
                                className={`p-1 rounded ${row.ac ? "text-cyan-600 bg-cyan-500/10" : "text-muted-foreground/40"}`}
                              >
                                <Wind size={13} />
                              </button>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setBulkGridRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, bath: !r.bath } : r))
                                  );
                                }}
                                className={`p-1 rounded ${row.bath ? "text-emerald-600 bg-emerald-500/10" : "text-muted-foreground/40"}`}
                              >
                                <Bath size={13} />
                              </button>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => setBulkGridRows((prev) => prev.filter((r) => r.id !== row.id))}
                                className="p-1 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBulkEntryModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            {bulkEntryMode === "paste" ? (
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteBulkPasteImport}
                disabled={parsedBulkRooms.length === 0 || parsedBulkRooms.some((r) => r.isTaken || r.isDuplicateInBatch)}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                <Sparkles size={13} />
                Import {parsedBulkRooms.length} Rooms to Floor {bulkEntryTargetFloor}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteBulkTableImport}
                disabled={bulkGridRows.filter((r) => r.room_number.trim().length > 0).length === 0}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              >
                <Sparkles size={13} />
                Import Table Rooms ({bulkGridRows.filter((r) => r.room_number.trim().length > 0).length} Rooms)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
