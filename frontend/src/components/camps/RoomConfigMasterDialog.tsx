import { useState, useEffect, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  BedDouble,
  Wind,
  Bath,
  Wifi,
  Lock,
  Plus,
  Search,
  Sliders,
  DollarSign,
  Users,
  Copy,
  Trash2,
  Check,
  X,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

export interface RoomSpecification {
  id: string;
  name: string;
  code: string;
  categoryValue: string; // Database room_category enum value
  capacity: number; // beds count
  bedLayout: "single_cots" | "bunks_2tier" | "capsule_pods";
  mattressSpec?: string;
  designationLevel: string;
  allowedDesignations: string[];
  ac: boolean;
  acType: "Split Unit" | "Central AC" | "Window AC" | "None";
  attachedBath: boolean;
  bathType: "Ensuite Private" | "Shared Corridor" | "External Complex";
  lockers: boolean;
  lockersCount: number;
  wifi: boolean;
  fridge: boolean;
  dailyRate: number;
  dailyFoodRate: number;
  serviceFee: number;
  shiftPolicy: "any" | "single_shift" | "day_only" | "night_only";
  status: "active" | "archived";
}

export const DEFAULT_ROOM_SPECIFICATIONS: RoomSpecification[] = [
  {
    id: "spec-exec-01",
    name: "Executive Single Suite",
    code: "ROOM-EXEC-01",
    categoryValue: "executive_single",
    capacity: 1,
    bedLayout: "single_cots",
    mattressSpec: "High-Density Orthopaedic 15cm (Fire-Retardant)",
    designationLevel: "Project Manager / Senior Engineers (Grade 1-3)",
    allowedDesignations: ["Project Manager", "Safety Officer", "QA/QC Inspector", "Site Director"],
    ac: true,
    acType: "Split Unit",
    attachedBath: true,
    bathType: "Ensuite Private",
    lockers: true,
    lockersCount: 1,
    wifi: true,
    fridge: true,
    dailyRate: 140,
    dailyFoodRate: 40,
    serviceFee: 10,
    shiftPolicy: "any",
    status: "active",
  },
  {
    id: "spec-sup-02",
    name: "Supervisor Twin Sharing",
    code: "ROOM-SUP-02",
    categoryValue: "supervisor_twin",
    capacity: 2,
    bedLayout: "single_cots",
    mattressSpec: "Medium-Firm Orthopaedic 12cm",
    designationLevel: "Site Supervisors / Senior Foremen (Grade 4-5)",
    allowedDesignations: ["Static Supervisor", "Static Foreman", "Permit Receiver", "Safety Inspector"],
    ac: true,
    acType: "Split Unit",
    attachedBath: true,
    bathType: "Ensuite Private",
    lockers: true,
    lockersCount: 2,
    wifi: true,
    fridge: false,
    dailyRate: 95,
    dailyFoodRate: 35,
    serviceFee: 5,
    shiftPolicy: "any",
    status: "active",
  },
  {
    id: "spec-staff-04",
    name: "Staff Quad Room",
    code: "ROOM-QUAD-04",
    categoryValue: "staff_4bed",
    capacity: 4,
    bedLayout: "bunks_2tier",
    mattressSpec: "High-Density Foam 10cm (EN Certified)",
    designationLevel: "Technicians & Skilled Operators (Grade 5-7)",
    allowedDesignations: ["BA Technician", "Mechanical Fitter", "Pipe Fitter", "Plumber", "Instrument Tech"],
    ac: true,
    acType: "Split Unit",
    attachedBath: true,
    bathType: "Ensuite Private",
    lockers: true,
    lockersCount: 4,
    wifi: true,
    fridge: false,
    dailyRate: 75,
    dailyFoodRate: 30,
    serviceFee: 5,
    shiftPolicy: "single_shift",
    status: "active",
  },
  {
    id: "spec-skil-06",
    name: "Skilled Labor 6-Sharing",
    code: "ROOM-SKIL-06",
    categoryValue: "skilled_6bed",
    capacity: 6,
    bedLayout: "bunks_2tier",
    mattressSpec: "Standard Heavy-Duty Foam 10cm",
    designationLevel: "Electricians / Welders / Fitters (Grade 7-8)",
    allowedDesignations: ["Electrician", "Tig Welder", "Pipe Fitter", "Hydro Jetter", "Scaffolder"],
    ac: true,
    acType: "Split Unit",
    attachedBath: false,
    bathType: "Shared Corridor",
    lockers: true,
    lockersCount: 6,
    wifi: true,
    fridge: false,
    dailyRate: 60,
    dailyFoodRate: 30,
    serviceFee: 0,
    shiftPolicy: "single_shift",
    status: "active",
  },
  {
    id: "spec-dorm-08",
    name: "General Dormitory 8-Bed",
    code: "ROOM-DORM-08",
    categoryValue: "general_8bed",
    capacity: 8,
    bedLayout: "bunks_2tier",
    mattressSpec: "Standard Industrial 8cm",
    designationLevel: "General Workforce / Helpers (Grade 9-10)",
    allowedDesignations: ["Helper", "Cleaner", "Laborer", "Hydro Jetter Assistant"],
    ac: true,
    acType: "Central AC",
    attachedBath: false,
    bathType: "External Complex",
    lockers: true,
    lockersCount: 8,
    wifi: true,
    fridge: false,
    dailyRate: 45,
    dailyFoodRate: 30,
    serviceFee: 0,
    shiftPolicy: "single_shift",
    status: "active",
  },
  {
    id: "spec-med-01",
    name: "Quarantine / Medical Single",
    code: "ROOM-MED-01",
    categoryValue: "guest_single",
    capacity: 1,
    bedLayout: "single_cots",
    mattressSpec: "Medical Grade Vinyl Antimicrobial 12cm",
    designationLevel: "Isolation / Medical / Health Hold",
    allowedDesignations: ["All Designations (Medical Quarantine)"],
    ac: true,
    acType: "Split Unit",
    attachedBath: true,
    bathType: "Ensuite Private",
    lockers: true,
    lockersCount: 1,
    wifi: true,
    fridge: true,
    dailyRate: 110,
    dailyFoodRate: 35,
    serviceFee: 15,
    shiftPolicy: "any",
    status: "active",
  },
  {
    id: "spec-trn-04",
    name: "Transit 4-Bed Rotation",
    code: "ROOM-TRN-04",
    categoryValue: "transit_4bed",
    capacity: 4,
    bedLayout: "bunks_2tier",
    mattressSpec: "Heavy-Duty Quick-Turn Foam 10cm",
    designationLevel: "Turnaround / Short-Term Rotation Workforce",
    allowedDesignations: ["Temporary Workforce", "Turnaround Crew", "Subcontractor"],
    ac: true,
    acType: "Split Unit",
    attachedBath: false,
    bathType: "Shared Corridor",
    lockers: true,
    lockersCount: 4,
    wifi: true,
    fridge: false,
    dailyRate: 65,
    dailyFoodRate: 30,
    serviceFee: 5,
    shiftPolicy: "any",
    status: "active",
  },
];

const STORAGE_KEY = "camp365_room_specifications";

export function getStoredRoomSpecifications(): RoomSpecification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed to load stored room specs", e);
  }
  return DEFAULT_ROOM_SPECIFICATIONS;
}

export function saveStoredRoomSpecifications(specs: RoomSpecification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(specs));
  } catch (e) {
    console.warn("Failed to save room specs", e);
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSpecification?: (spec: RoomSpecification) => void;
}

export default function RoomConfigMasterDialog({
  open,
  onOpenChange,
  onSelectSpecification,
}: Props) {
  const [specs, setSpecs] = useState<RoomSpecification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [capacityFilter, setCapacityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"capacity" | "rate" | "name">("capacity");

  // Active item in slide-out editing drawer
  const [editingSpec, setEditingSpec] = useState<RoomSpecification | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState("");

  useEffect(() => {
    if (open) {
      setSpecs(getStoredRoomSpecifications());
    }
  }, [open]);

  const filteredSpecs = useMemo(() => {
    return specs
      .filter((s) => {
        if (capacityFilter !== "all" && String(s.capacity) !== capacityFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = s.name.toLowerCase().includes(q);
          const matchesCode = s.code.toLowerCase().includes(q);
          const matchesRoles = s.allowedDesignations.some((d) => d.toLowerCase().includes(q));
          if (!matchesName && !matchesCode && !matchesRoles) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "capacity") return a.capacity - b.capacity;
        if (sortBy === "rate") return a.dailyRate - b.dailyRate;
        return a.name.localeCompare(b.name);
      });
  }, [specs, capacityFilter, searchQuery, sortBy]);

  const handleSaveSpec = (updated: RoomSpecification) => {
    const exists = specs.some((s) => s.id === updated.id);
    let nextList: RoomSpecification[];
    if (exists) {
      nextList = specs.map((s) => (s.id === updated.id ? updated : s));
    } else {
      nextList = [...specs, updated];
    }
    setSpecs(nextList);
    saveStoredRoomSpecifications(nextList);
    setEditingSpec(null);
    setIsCreatingNew(false);
    toast({
      title: "Room Specification Saved",
      description: `Updated template "${updated.name}" (${updated.capacity} Beds).`,
    });
  };

  const handleDeleteSpec = (id: string) => {
    if (specs.length <= 1) {
      toast({ title: "Cannot delete the last room specification", variant: "destructive" });
      return;
    }
    const nextList = specs.filter((s) => s.id !== id);
    setSpecs(nextList);
    saveStoredRoomSpecifications(nextList);
    if (editingSpec?.id === id) {
      setEditingSpec(null);
      setIsCreatingNew(false);
    }
    toast({ title: "Room Specification Removed" });
  };

  const handleDuplicateSpec = (source: RoomSpecification) => {
    const duplicated: RoomSpecification = {
      ...source,
      id: `spec-${Date.now()}`,
      name: `${source.name} (Copy)`,
      code: `${source.code}-CPY`,
    };
    const nextList = [...specs, duplicated];
    setSpecs(nextList);
    saveStoredRoomSpecifications(nextList);
    setEditingSpec(duplicated);
    setIsCreatingNew(false);
    toast({ title: "Template Duplicated", description: `Created copy of "${source.name}".` });
  };

  const handleResetToDefaults = () => {
    setSpecs(DEFAULT_ROOM_SPECIFICATIONS);
    saveStoredRoomSpecifications(DEFAULT_ROOM_SPECIFICATIONS);
    setEditingSpec(null);
    setIsCreatingNew(false);
    toast({ title: "Reset Complete", description: "Standard enterprise room catalog restored." });
  };

  const handleStartCreate = () => {
    const newSpec: RoomSpecification = {
      id: `spec-custom-${Date.now()}`,
      name: "New Custom Room Type",
      code: `ROOM-${Date.now().toString().slice(-4)}`,
      categoryValue: "staff_4bed",
      capacity: 4,
      bedLayout: "bunks_2tier",
      mattressSpec: "High-Density Foam 10cm",
      designationLevel: "Standard Workforce",
      allowedDesignations: ["Technicians", "Laborers"],
      ac: true,
      acType: "Split Unit",
      attachedBath: true,
      bathType: "Ensuite Private",
      lockers: true,
      lockersCount: 4,
      wifi: true,
      fridge: false,
      dailyRate: 70,
      dailyFoodRate: 30,
      serviceFee: 0,
      shiftPolicy: "any",
      status: "active",
    };
    setIsCreatingNew(true);
    setEditingSpec(newSpec);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[94vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-950/10 via-primary/5 to-transparent">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                  <Sliders size={13} /> Room Configuration Master
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  GLOBAL CATALOG
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Accommodations Catalog & Bed Specifications
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Define reusable room templates, bed sharing capacities, hardware amenities, and workforce eligibility rules across all camps.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 gap-1.5"
                onClick={handleResetToDefaults}
              >
                <RefreshCw size={13} /> Reset Defaults
              </Button>
              <Button
                size="sm"
                className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground shadow-xs"
                onClick={handleStartCreate}
              >
                <Plus size={14} /> + Create Room Specification
              </Button>
            </div>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-border/40 text-xs">
            <div className="bg-background/80 p-2.5 rounded-md border flex flex-col shadow-2xs">
              <span className="text-muted-foreground font-medium">Catalog Templates</span>
              <span className="font-bold text-base text-foreground">{specs.length} Models</span>
            </div>
            <div className="bg-background/80 p-2.5 rounded-md border flex flex-col shadow-2xs">
              <span className="text-muted-foreground font-medium">Capacity Range</span>
              <span className="font-bold text-base text-blue-600 dark:text-blue-400">
                1 &ndash; {Math.max(...specs.map((s) => s.capacity), 8)} Beds / Room
              </span>
            </div>
            <div className="bg-background/80 p-2.5 rounded-md border flex flex-col shadow-2xs">
              <span className="text-muted-foreground font-medium">Average Daily Rent</span>
              <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                SAR {Math.round(specs.reduce((acc, s) => acc + s.dailyRate, 0) / (specs.length || 1))} / Day
              </span>
            </div>
            <div className="bg-background/80 p-2.5 rounded-md border flex flex-col shadow-2xs">
              <span className="text-muted-foreground font-medium">Active Policy</span>
              <span className="font-bold text-base text-indigo-600 dark:text-indigo-400">
                Role & Shift Mapped
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Filter and Search Bar */}
        <div className="p-4 py-3 bg-muted/20 border-b flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by room name, code, or workforce role..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground font-medium mr-1">Capacity:</span>
            {["all", "1", "2", "4", "6", "8"].map((cap) => (
              <Button
                key={cap}
                size="xs"
                variant={capacityFilter === cap ? "default" : "outline"}
                className="h-7 text-xs px-2.5"
                onClick={() => setCapacityFilter(cap)}
              >
                {cap === "all" ? "All" : `${cap}-Bed`}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-medium">Sort:</span>
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-7 text-xs w-32 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="capacity" className="text-xs">Capacity (Beds)</SelectItem>
                <SelectItem value="rate" className="text-xs">Daily Rate (SAR)</SelectItem>
                <SelectItem value="name" className="text-xs">Template Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content: Catalog Grid + Slide-Out Drawer */}
        <div className="flex-1 flex overflow-hidden">
          {/* Catalog Cards Grid */}
          <ScrollArea className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {filteredSpecs.map((spec) => {
                const isSelectedForEdit = editingSpec?.id === spec.id;
                return (
                  <Card
                    key={spec.id}
                    className={`border shadow-xs transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelectedForEdit
                        ? "ring-2 ring-primary border-primary bg-primary/5"
                        : "hover:border-primary/50 hover:shadow-sm bg-card"
                    }`}
                  >
                    <div
                      className={`h-1.5 w-full ${
                        spec.capacity === 1
                          ? "bg-purple-500"
                          : spec.capacity === 2
                          ? "bg-blue-500"
                          : spec.capacity <= 4
                          ? "bg-emerald-500"
                          : spec.capacity <= 6
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                    />
                    <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      {/* Top Row: Code & Capacity Badge */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {spec.code}
                          </span>
                          <Badge
                            variant={spec.capacity <= 2 ? "default" : "secondary"}
                            className="text-xs px-2 py-0.5 gap-1 font-bold"
                          >
                            <BedDouble size={13} /> {spec.capacity} {spec.capacity === 1 ? "Bed" : "Beds"}
                          </Badge>
                        </div>

                        <h4 className="font-bold text-sm text-foreground leading-tight pt-1">
                          {spec.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {spec.designationLevel}
                        </p>
                      </div>

                      {/* Amenities Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {spec.ac && (
                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200">
                            <Wind size={11} /> {spec.acType}
                          </Badge>
                        )}
                        {spec.attachedBath && (
                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200">
                            <Bath size={11} /> Ensuite Bath
                          </Badge>
                        )}
                        {spec.lockers && (
                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 bg-secondary text-secondary-foreground">
                            <Lock size={11} /> {spec.lockersCount} Lockers
                          </Badge>
                        )}
                        {spec.wifi && (
                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 bg-secondary text-secondary-foreground">
                            <Wifi size={11} /> Wi-Fi
                          </Badge>
                        )}
                      </div>

                      {/* Eligible Roles Preview */}
                      <div className="space-y-1 pt-1 border-t border-border/50 text-[11px]">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase">
                          Eligible Roles:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {spec.allowedDesignations.slice(0, 3).map((role, idx) => (
                            <span
                              key={idx}
                              className="bg-secondary/40 px-1.5 py-0.5 rounded text-[10px] font-medium"
                            >
                              {role}
                            </span>
                          ))}
                          {spec.allowedDesignations.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{spec.allowedDesignations.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Commercial Rate & Action Footer */}
                      <div className="pt-2 border-t flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Daily Rate:</span>
                          <span className="font-bold text-sm text-foreground">
                            SAR {spec.dailyRate}
                            <span className="text-[10px] text-muted-foreground font-normal"> /day</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {onSelectSpecification && (
                            <Button
                              size="xs"
                              variant="default"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                onSelectSpecification(spec);
                                onOpenChange(false);
                              }}
                            >
                              <Check size={12} /> Apply
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                            onClick={() => {
                              setIsCreatingNew(false);
                              setEditingSpec({ ...spec });
                            }}
                          >
                            <Sliders size={12} /> Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDuplicateSpec(spec)}
                            title="Duplicate specification"
                          >
                            <Copy size={13} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          {/* Slide-out Specification Drawer */}
          {editingSpec && (
            <div className="w-[420px] border-l bg-card flex flex-col shadow-lg animate-in slide-in-from-right duration-200">
              <div className="p-4 border-b flex items-center justify-between bg-secondary/20">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm flex items-center gap-1.5 text-foreground">
                    <Sliders size={14} className="text-primary" />
                    {isCreatingNew ? "Create Room Specification" : "Edit Specification Details"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">{editingSpec.code}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => setEditingSpec(null)}
                >
                  <X size={15} />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4 space-y-4 text-xs overflow-y-auto">
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Specification Name & Code</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Template Name</Label>
                        <Input
                          value={editingSpec.name}
                          onChange={(e) => setEditingSpec({ ...editingSpec, name: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Catalog Code</Label>
                        <Input
                          value={editingSpec.code}
                          onChange={(e) => setEditingSpec({ ...editingSpec, code: e.target.value })}
                          className="h-8 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Bed Capacity & Layout */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Bed Capacity & Physical Setup</Label>
                    <div className="flex items-center justify-between bg-muted/30 p-2.5 rounded-lg border">
                      <div>
                        <span className="font-bold text-sm text-foreground">{editingSpec.capacity} Beds</span>
                        <p className="text-[10px] text-muted-foreground">Maximum room occupants</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 text-xs"
                          onClick={() =>
                            setEditingSpec({
                              ...editingSpec,
                              capacity: Math.max(1, editingSpec.capacity - 1),
                              lockersCount: Math.max(1, editingSpec.capacity - 1),
                            })
                          }
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-bold text-xs">{editingSpec.capacity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 text-xs"
                          onClick={() =>
                            setEditingSpec({
                              ...editingSpec,
                              capacity: Math.min(16, editingSpec.capacity + 1),
                              lockersCount: Math.min(16, editingSpec.capacity + 1),
                            })
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <Label className="text-[11px] text-muted-foreground">Bed Layout Architecture</Label>
                      <Select
                        value={editingSpec.bedLayout}
                        onValueChange={(val: any) => setEditingSpec({ ...editingSpec, bedLayout: val })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single_cots" className="text-xs">Single Independent Cots</SelectItem>
                          <SelectItem value="bunks_2tier" className="text-xs">2-Tier Heavy-Duty Bunks</SelectItem>
                          <SelectItem value="capsule_pods" className="text-xs">Enclosed Capsule Pods</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Mattress Standard</Label>
                      <Input
                        value={editingSpec.mattressSpec || ""}
                        onChange={(e) => setEditingSpec({ ...editingSpec, mattressSpec: e.target.value })}
                        placeholder="e.g. High-Density Orthopaedic 10cm"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Workforce Eligibility */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Workforce Designation Mapping</Label>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Target Seniority Tier</Label>
                      <Input
                        value={editingSpec.designationLevel}
                        onChange={(e) => setEditingSpec({ ...editingSpec, designationLevel: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <Label className="text-[11px] text-muted-foreground">Allowed Job Titles</Label>
                      <div className="flex flex-wrap gap-1 p-2 rounded-md border bg-muted/20 min-h-[50px]">
                        {editingSpec.allowedDesignations.map((role, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-[10px] gap-1 px-1.5 py-0.5 bg-background border"
                          >
                            <span>{role}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextRoles = editingSpec.allowedDesignations.filter((_, i) => i !== idx);
                                setEditingSpec({ ...editingSpec, allowedDesignations: nextRoles });
                              }}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X size={10} />
                            </button>
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <Input
                          value={newRoleInput}
                          onChange={(e) => setNewRoleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newRoleInput.trim()) {
                              e.preventDefault();
                              if (!editingSpec.allowedDesignations.includes(newRoleInput.trim())) {
                                setEditingSpec({
                                  ...editingSpec,
                                  allowedDesignations: [...editingSpec.allowedDesignations, newRoleInput.trim()],
                                });
                              }
                              setNewRoleInput("");
                            }
                          }}
                          placeholder="Type designation and press Add..."
                          className="h-7 text-xs"
                        />
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            if (newRoleInput.trim() && !editingSpec.allowedDesignations.includes(newRoleInput.trim())) {
                              setEditingSpec({
                                ...editingSpec,
                                allowedDesignations: [...editingSpec.allowedDesignations, newRoleInput.trim()],
                              });
                              setNewRoleInput("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Amenities */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Amenities & Hardware Toggles</Label>
                    <div className="space-y-2.5 bg-secondary/15 p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wind size={14} className="text-cyan-600" />
                          <span>Air Conditioning</span>
                        </div>
                        <Switch
                          checked={editingSpec.ac}
                          onCheckedChange={(val) => setEditingSpec({ ...editingSpec, ac: val })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bath size={14} className="text-emerald-600" />
                          <span>Ensuite Attached Bath</span>
                        </div>
                        <Switch
                          checked={editingSpec.attachedBath}
                          onCheckedChange={(val) => setEditingSpec({ ...editingSpec, attachedBath: val })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock size={14} className="text-indigo-600" />
                          <span>Personal Steel Lockers</span>
                        </div>
                        <Switch
                          checked={editingSpec.lockers}
                          onCheckedChange={(val) => setEditingSpec({ ...editingSpec, lockers: val })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wifi size={14} className="text-primary" />
                          <span>High-Speed Wi-Fi</span>
                        </div>
                        <Switch
                          checked={editingSpec.wifi}
                          onCheckedChange={(val) => setEditingSpec({ ...editingSpec, wifi: val })}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Commercial Tariffs */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Commercial Rates & Costing</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Daily Room Rent (SAR)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={editingSpec.dailyRate}
                          onChange={(e) =>
                            setEditingSpec({ ...editingSpec, dailyRate: parseFloat(e.target.value) || 0 })
                          }
                          className="h-8 text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Daily Catering / Food (SAR)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={editingSpec.dailyFoodRate}
                          onChange={(e) =>
                            setEditingSpec({ ...editingSpec, dailyFoodRate: parseFloat(e.target.value) || 0 })
                          }
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg flex items-center justify-between text-xs mt-2">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Total Billing per Occupant:
                      </span>
                      <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                        SAR {(editingSpec.dailyRate + editingSpec.dailyFoodRate).toFixed(2)} / day
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Drawer Footer Actions */}
              <div className="p-3 border-t bg-muted/20 flex items-center justify-between gap-2">
                {!isCreatingNew && (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteSpec(editingSpec.id)}
                  >
                    <Trash2 size={13} className="mr-1" /> Delete
                  </Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setEditingSpec(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    className="h-8 text-xs bg-primary text-primary-foreground font-semibold"
                    onClick={() => handleSaveSpec(editingSpec)}
                  >
                    Save Specification
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

