import { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  CheckCircle2,
  Tag,
  SlidersHorizontal,
  Info,
  Layers,
  ChevronRight,
  X,
  BedDouble,
  MapPin,
  Sparkles,
  Wifi,
  DoorOpen,
  Home,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  useCampAttributes,
  type CampAttribute,
  type CampAttributeScope,
  type CampAttributeType,
} from "@/hooks/useCampAttributes";
import * as XLSX from "xlsx";

const SCOPE_BADGES: Record<CampAttributeScope, { label: string; color: string; icon: any }> = {
  camp: { label: "Camp Level", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Building2 },
  block: { label: "Block Level", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", icon: Home },
  room: { label: "Room Level", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: BedDouble },
  custom: { label: "Custom Scope", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: Tag },
};

const TYPE_LABELS: Record<CampAttributeType, string> = {
  text: "Free Text",
  number: "Numeric",
  dropdown: "Master Dropdown List",
  multiselect: "Multi-Select Amenities",
  boolean: "Yes / No Toggle",
  date: "Date",
};

export default function CampMasterData() {
  const {
    attributes,
    addAttribute,
    updateAttribute,
    deleteAttribute,
    addOptionToAttribute,
    removeOptionFromAttribute,
    resetToDefault,
  } = useCampAttributes();

  const [activeTab, setActiveTab] = useState<"attributes" | "lookups">("attributes");
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Add / Edit Attribute Modal State
  const [attrDialogOpen, setAttrDialogOpen] = useState(false);
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null);
  const [attrForm, setAttrForm] = useState<{
    name: string;
    key: string;
    scope: CampAttributeScope;
    type: CampAttributeType;
    required: boolean;
    description: string;
    placeholder: string;
    optionsText: string;
  }>({
    name: "",
    key: "",
    scope: "camp",
    type: "dropdown",
    required: false,
    description: "",
    placeholder: "",
    optionsText: "",
  });

  // Lookup Options Management State
  const [selectedLookupKey, setSelectedLookupKey] = useState<string>("camp_type");
  const [newOptionInput, setNewOptionInput] = useState("");
  const [lookupSearch, setLookupSearch] = useState("");

  // Filtered attributes list
  const filteredAttributes = useMemo(() => {
    return attributes.filter((attr) => {
      const matchSearch =
        !search.trim() ||
        attr.name.toLowerCase().includes(search.toLowerCase()) ||
        attr.key.toLowerCase().includes(search.toLowerCase()) ||
        (attr.description || "").toLowerCase().includes(search.toLowerCase());

      const matchScope = scopeFilter === "all" || attr.scope === scopeFilter;
      const matchType = typeFilter === "all" || attr.type === typeFilter;

      return matchSearch && matchScope && matchType;
    });
  }, [attributes, search, scopeFilter, typeFilter]);

  // Telemetry KPIs
  const kpis = useMemo(() => {
    const total = attributes.length;
    const campScope = attributes.filter((a) => a.scope === "camp").length;
    const blockScope = attributes.filter((a) => a.scope === "block").length;
    const roomScope = attributes.filter((a) => a.scope === "room").length;
    return { total, campScope, blockScope, roomScope };
  }, [attributes]);

  // Attributes that have options
  const optionAttributes = useMemo(() => {
    return attributes.filter((a) => a.type === "dropdown" || a.type === "multiselect");
  }, [attributes]);

  const activeLookupAttr = useMemo(() => {
    return attributes.find((a) => a.key === selectedLookupKey) || optionAttributes[0];
  }, [attributes, selectedLookupKey, optionAttributes]);

  const filteredLookupOptions = useMemo(() => {
    if (!activeLookupAttr?.options) return [];
    if (!lookupSearch.trim()) return activeLookupAttr.options;
    return activeLookupAttr.options.filter((opt) =>
      opt.toLowerCase().includes(lookupSearch.toLowerCase())
    );
  }, [activeLookupAttr, lookupSearch]);

  const openNewAttributeDialog = () => {
    setEditingAttrId(null);
    setAttrForm({
      name: "",
      key: "",
      scope: "camp",
      type: "dropdown",
      required: false,
      description: "",
      placeholder: "",
      optionsText: "",
    });
    setAttrDialogOpen(true);
  };

  const openEditAttributeDialog = (attr: CampAttribute) => {
    setEditingAttrId(attr.id);
    setAttrForm({
      name: attr.name,
      key: attr.key,
      scope: attr.scope,
      type: attr.type,
      required: attr.required,
      description: attr.description || "",
      placeholder: attr.placeholder || "",
      optionsText: (attr.options || []).join(", "),
    });
    setAttrDialogOpen(true);
  };

  const handleSaveAttribute = () => {
    if (!attrForm.name.trim()) {
      toast({ title: "Name Required", description: "Attribute name is required.", variant: "destructive" });
      return;
    }

    const key = attrForm.key.trim()
      ? attrForm.key.trim().toLowerCase().replace(/\s+/g, "_")
      : attrForm.name.toLowerCase().replace(/[^a-z0-9]/g, "_");

    const parsedOptions =
      attrForm.type === "dropdown" || attrForm.type === "multiselect"
        ? attrForm.optionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (editingAttrId) {
      updateAttribute(editingAttrId, {
        name: attrForm.name.trim(),
        scope: attrForm.scope,
        type: attrForm.type,
        required: attrForm.required,
        description: attrForm.description || undefined,
        placeholder: attrForm.placeholder || undefined,
        options: parsedOptions,
      });
      toast({ title: "Attribute Updated", description: `Updated attribute "${attrForm.name}".` });
    } else {
      addAttribute({
        name: attrForm.name.trim(),
        key,
        scope: attrForm.scope,
        type: attrForm.type,
        required: attrForm.required,
        description: attrForm.description || undefined,
        placeholder: attrForm.placeholder || undefined,
        options: parsedOptions || [],
        is_active: true,
      });
      toast({ title: "Attribute Created", description: `Added "${attrForm.name}" to camp attributes.` });
    }
    setAttrDialogOpen(false);
  };

  const handleDeleteAttribute = (attr: CampAttribute) => {
    if (attr.system) {
      toast({
        title: "System Attribute",
        description: "Standard system attributes cannot be deleted. You can disable them if needed.",
        variant: "destructive",
      });
      return;
    }
    if (confirm(`Are you sure you want to delete custom attribute "${attr.name}"?`)) {
      deleteAttribute(attr.id);
      toast({ title: "Attribute Deleted", description: `Removed "${attr.name}".` });
    }
  };

  const handleAddLookupOption = () => {
    if (!newOptionInput.trim() || !activeLookupAttr) return;
    addOptionToAttribute(activeLookupAttr.key, newOptionInput.trim());
    toast({
      title: "Option Added",
      description: `Added "${newOptionInput.trim()}" to ${activeLookupAttr.name}.`,
    });
    setNewOptionInput("");
  };

  const handleRemoveLookupOption = (option: string) => {
    if (!activeLookupAttr) return;
    removeOptionFromAttribute(activeLookupAttr.key, option);
    toast({
      title: "Option Removed",
      description: `Removed "${option}" from ${activeLookupAttr.name}.`,
    });
  };

  const exportAttributesExcel = () => {
    const data = attributes.map((a) => ({
      "Attribute Name": a.name,
      "Field Key": a.key,
      "Hierarchy Scope": SCOPE_BADGES[a.scope]?.label || a.scope,
      "Data Type": TYPE_LABELS[a.type] || a.type,
      "Mandatory": a.required ? "Yes" : "No",
      "System Field": a.system ? "Yes (Built-in)" : "Custom",
      "Active": a.is_active ? "Yes" : "No",
      "Configured Options": (a.options || []).join("; "),
      "Description": a.description || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Camp_Attributes");
    XLSX.writeFile(wb, `Camp_Master_Data_Attributes_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Camp Master Data
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 font-semibold text-xs">
              Attribute Registry & Lookups
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure the structural attributes and predefined master options governing camps, blocks, and rooms across the enterprise.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAttributesExcel}
            className="text-xs h-9 gap-1.5"
          >
            <Download size={14} /> Export Attributes
          </Button>
          <Button
            size="sm"
            onClick={openNewAttributeDialog}
            className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground font-semibold"
          >
            <Plus size={15} /> Add Attribute
          </Button>
        </div>
      </div>

      {/* Conceptual Clarity Banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border bg-gradient-to-r from-blue-50/70 via-background to-blue-50/30 dark:from-blue-950/20 dark:via-background dark:to-blue-950/10 text-xs">
        <Info size={16} className="text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground">
            Master Data Definition vs. Operational Camps:
          </span>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Camp Master Data</strong> maintains the master attributes and lookup options (Camp Types, Operating Regions, On-site Facilities, Block Structural Types, Room Categories 1x1–6x1, and Floor Codes). Individual physical camp facilities with live rooms and occupants are managed in <strong>Operations &gt; Camp Management</strong>.
          </p>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Attributes
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground">{kpis.total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Camp Attributes
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground">{kpis.campScope}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Home size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Block Attributes
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground">{kpis.blockScope}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <BedDouble size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Room Attributes
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground">{kpis.roomScope}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Attribute Dictionary vs. Predefined Lookup Values */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="attributes" className="text-xs font-semibold gap-1.5">
            <Layers size={13} /> Attributes Dictionary ({attributes.length})
          </TabsTrigger>
          <TabsTrigger value="lookups" className="text-xs font-semibold gap-1.5">
            <SlidersHorizontal size={13} /> Master Lookup Options ({optionAttributes.length} Lists)
          </TabsTrigger>
        </TabsList>

        {/* ════════ TAB 1: ATTRIBUTES DICTIONARY ════════ */}
        <TabsContent value="attributes" className="space-y-4 mt-4">
          {/* Search & Filters */}
          <Card className="border shadow-sm">
            <CardContent className="p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search camp, block, or room attribute..."
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Select value={scopeFilter} onValueChange={setScopeFilter}>
                  <SelectTrigger className="h-8 text-xs w-[140px]">
                    <SelectValue placeholder="Hierarchy Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Scopes</SelectItem>
                    <SelectItem value="camp" className="text-xs">Camp Level</SelectItem>
                    <SelectItem value="block" className="text-xs">Block Level</SelectItem>
                    <SelectItem value="room" className="text-xs">Room Level</SelectItem>
                    <SelectItem value="custom" className="text-xs">Custom Scope</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs w-[160px]">
                    <SelectValue placeholder="Data Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Data Types</SelectItem>
                    <SelectItem value="dropdown" className="text-xs">Master Dropdown</SelectItem>
                    <SelectItem value="multiselect" className="text-xs">Multi-Select List</SelectItem>
                    <SelectItem value="text" className="text-xs">Free Text</SelectItem>
                    <SelectItem value="number" className="text-xs">Numeric</SelectItem>
                    <SelectItem value="boolean" className="text-xs">Yes / No Toggle</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setScopeFilter("all");
                    setTypeFilter("all");
                  }}
                  className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Attributes Table */}
          <Card className="border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold w-[220px]">Attribute Name</TableHead>
                  <TableHead className="text-xs font-bold w-[160px]">Field Key</TableHead>
                  <TableHead className="text-xs font-bold w-[130px]">Hierarchy Scope</TableHead>
                  <TableHead className="text-xs font-bold w-[160px]">Data Type</TableHead>
                  <TableHead className="text-xs font-bold w-[140px]">Configured Options</TableHead>
                  <TableHead className="text-xs font-bold w-[100px]">Requirement</TableHead>
                  <TableHead className="text-xs font-bold w-[80px]">Status</TableHead>
                  <TableHead className="text-xs font-bold text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttributes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                      No attributes matching the current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttributes.map((attr) => {
                    const ScopeIcon = SCOPE_BADGES[attr.scope]?.icon || Tag;
                    return (
                      <TableRow key={attr.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                              {attr.name}
                              {attr.system && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground">
                                  Standard
                                </Badge>
                              )}
                            </div>
                            {attr.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {attr.description}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <code className="text-[11px] bg-muted/60 px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                            {attr.key}
                          </code>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] py-0 px-2 font-medium flex items-center gap-1 w-fit ${
                              SCOPE_BADGES[attr.scope]?.color || ""
                            }`}
                          >
                            <ScopeIcon size={11} />
                            {SCOPE_BADGES[attr.scope]?.label || attr.scope}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="text-xs text-foreground font-medium">
                            {TYPE_LABELS[attr.type] || attr.type}
                          </span>
                        </TableCell>

                        <TableCell>
                          {attr.options && attr.options.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLookupKey(attr.key);
                                setActiveTab("lookups");
                              }}
                              className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                            >
                              <span>{attr.options.length} options</span>
                              <ChevronRight size={12} />
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {attr.required ? (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-semibold">
                              Mandatory *
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                              Optional
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] py-0 px-1.5 ${
                              attr.is_active
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {attr.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditAttributeDialog(attr)}
                              title="Edit Attribute"
                            >
                              <Pencil size={13} />
                            </Button>
                            {!attr.system && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteAttribute(attr)}
                                title="Delete Attribute"
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ════════ TAB 2: MASTER LOOKUP VALUES ════════ */}
        <TabsContent value="lookups" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Sidebar list of attributes with options */}
            <Card className="border shadow-sm p-2 space-y-1">
              <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Camp &amp; Room Lookups
              </div>
              {optionAttributes.map((oAttr) => (
                <button
                  key={oAttr.key}
                  type="button"
                  onClick={() => {
                    setSelectedLookupKey(oAttr.key);
                    setLookupSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-between transition-colors ${
                    activeLookupAttr?.key === oAttr.key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="truncate">{oAttr.name}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] py-0 px-1.5 ml-2 ${
                      activeLookupAttr?.key === oAttr.key
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {oAttr.options?.length || 0}
                  </Badge>
                </button>
              ))}
            </Card>

            {/* Main Options Manager Panel */}
            <Card className="border shadow-sm md:col-span-3">
              <CardContent className="p-5 space-y-4">
                {activeLookupAttr ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-foreground">
                            {activeLookupAttr.name} Values
                          </h3>
                          <Badge variant="outline" className="text-xs font-mono">
                            {activeLookupAttr.key}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activeLookupAttr.description || "These options populate selection fields during camp and room setup."}
                        </p>
                      </div>

                      <Badge variant="secondary" className="text-xs py-1 px-2.5 bg-primary/10 text-primary self-start sm:self-center">
                        {activeLookupAttr.options?.length || 0} Configured Values
                      </Badge>
                    </div>

                    {/* Add new option form */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={newOptionInput}
                        onChange={(e) => setNewOptionInput(e.target.value)}
                        placeholder={`Add new ${activeLookupAttr.name.toLowerCase()}... (e.g. Neom Oxagon, VIP Suite)`}
                        className="h-9 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddLookupOption();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleAddLookupOption}
                        className="h-9 text-xs px-4 bg-primary text-primary-foreground font-semibold shrink-0 gap-1.5"
                      >
                        <Plus size={14} /> Add Value
                      </Button>
                    </div>

                    {/* Search inside options */}
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={lookupSearch}
                        onChange={(e) => setLookupSearch(e.target.value)}
                        placeholder="Filter configured options..."
                        className="pl-8 h-8 text-xs bg-muted/20"
                      />
                    </div>

                    {/* Chips / Options Grid */}
                    <div className="flex flex-wrap gap-2 pt-1 max-h-[360px] overflow-y-auto">
                      {filteredLookupOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 w-full text-center">
                          No matching options found.
                        </p>
                      ) : (
                        filteredLookupOptions.map((opt) => (
                          <div
                            key={opt}
                            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-xs font-medium text-foreground hover:border-primary/50 transition-colors shadow-xs"
                          >
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLookupOption(opt)}
                              className="text-muted-foreground/60 hover:text-destructive transition-colors ml-0.5"
                              title={`Remove ${opt}`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Select an attribute from the list to view and manage its values.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Attribute Dialog */}
      <Dialog open={attrDialogOpen} onOpenChange={setAttrDialogOpen}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingAttrId ? "Edit Camp Attribute" : "Add New Camp Attribute"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the attribute specification, hierarchy scope, and predefined options for camp facilities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Attribute Display Name *</Label>
              <Input
                value={attrForm.name}
                onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })}
                placeholder="e.g. Water Tank Capacity or Solar Power"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Hierarchy Scope</Label>
                <Select
                  value={attrForm.scope}
                  onValueChange={(v) => setAttrForm({ ...attrForm, scope: v as CampAttributeScope })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camp" className="text-xs">Camp Level</SelectItem>
                    <SelectItem value="block" className="text-xs">Block Level</SelectItem>
                    <SelectItem value="room" className="text-xs">Room Level</SelectItem>
                    <SelectItem value="custom" className="text-xs">Custom Scope</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data Type</Label>
                <Select
                  value={attrForm.type}
                  onValueChange={(v) => setAttrForm({ ...attrForm, type: v as CampAttributeType })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dropdown" className="text-xs">Master Dropdown</SelectItem>
                    <SelectItem value="multiselect" className="text-xs">Multi-Select List</SelectItem>
                    <SelectItem value="text" className="text-xs">Free Text</SelectItem>
                    <SelectItem value="number" className="text-xs">Numeric</SelectItem>
                    <SelectItem value="boolean" className="text-xs">Yes / No Toggle</SelectItem>
                    <SelectItem value="date" className="text-xs">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(attrForm.type === "dropdown" || attrForm.type === "multiselect") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Predefined Options (comma separated)</Label>
                <Input
                  value={attrForm.optionsText}
                  onChange={(e) => setAttrForm({ ...attrForm, optionsText: e.target.value })}
                  placeholder="e.g. Option A, Option B, Option C"
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description / Helper Text</Label>
              <Input
                value={attrForm.description}
                onChange={(e) => setAttrForm({ ...attrForm, description: e.target.value })}
                placeholder="Brief description of this attribute..."
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="camp-req-checkbox"
                checked={attrForm.required}
                onChange={(e) => setAttrForm({ ...attrForm, required: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <Label htmlFor="camp-req-checkbox" className="text-xs font-medium cursor-pointer">
                Mark this attribute as mandatory
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAttrDialogOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAttribute}
              className="text-xs h-8 bg-primary text-primary-foreground font-semibold"
            >
              {editingAttrId ? "Save Changes" : "Create Attribute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

