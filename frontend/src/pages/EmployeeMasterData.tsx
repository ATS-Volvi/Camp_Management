import { useState, useMemo } from "react";
import {
  ListFilter,
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Globe,
  Briefcase,
  Building2,
  Phone,
  Shield,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Tag,
  Hash,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  X,
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
  useEmployeeAttributes,
  type EmployeeAttribute,
  type AttributeCategory,
  type AttributeType,
} from "@/hooks/useEmployeeAttributes";
import * as XLSX from "xlsx";

const CATEGORY_LABELS: Record<AttributeCategory, { label: string; color: string }> = {
  personal: { label: "Personal Info", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  contact: { label: "Contact Details", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  identity: { label: "Identity & Legal", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  job: { label: "Job & Trade", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  custom: { label: "Custom Attribute", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300" },
};

const TYPE_LABELS: Record<AttributeType, string> = {
  text: "Free Text",
  number: "Numeric",
  phone: "Phone Number",
  email: "Email Address",
  dropdown: "Master Dropdown List",
  date: "Date",
  boolean: "Yes / No Toggle",
};

export default function EmployeeMasterData() {
  const {
    attributes,
    addAttribute,
    updateAttribute,
    deleteAttribute,
    addOptionToAttribute,
    removeOptionFromAttribute,
    resetToDefault,
  } = useEmployeeAttributes();

  const [activeTab, setActiveTab] = useState<"attributes" | "lookups">("attributes");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Add / Edit Attribute Modal State
  const [attrDialogOpen, setAttrDialogOpen] = useState(false);
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null);
  const [attrForm, setAttrForm] = useState<{
    name: string;
    key: string;
    category: AttributeCategory;
    type: AttributeType;
    required: boolean;
    description: string;
    placeholder: string;
    optionsText: string;
  }>({
    name: "",
    key: "",
    category: "personal",
    type: "text",
    required: false,
    description: "",
    placeholder: "",
    optionsText: "",
  });

  // Lookup Options Management State
  const [selectedLookupKey, setSelectedLookupKey] = useState<string>("nationality");
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

      const matchCat = categoryFilter === "all" || attr.category === categoryFilter;
      const matchType = typeFilter === "all" || attr.type === typeFilter;

      return matchSearch && matchCat && matchType;
    });
  }, [attributes, search, categoryFilter, typeFilter]);

  // Telemetry KPIs
  const kpis = useMemo(() => {
    const total = attributes.length;
    const required = attributes.filter((a) => a.required).length;
    const dropdowns = attributes.filter((a) => a.type === "dropdown").length;
    const custom = attributes.filter((a) => !a.system).length;
    return { total, required, dropdowns, custom };
  }, [attributes]);

  // Dropdown attributes available for lookup management
  const dropdownAttributes = useMemo(() => {
    return attributes.filter((a) => a.type === "dropdown");
  }, [attributes]);

  const activeLookupAttr = useMemo(() => {
    return attributes.find((a) => a.key === selectedLookupKey) || dropdownAttributes[0];
  }, [attributes, selectedLookupKey, dropdownAttributes]);

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
      category: "personal",
      type: "text",
      required: false,
      description: "",
      placeholder: "",
      optionsText: "",
    });
    setAttrDialogOpen(true);
  };

  const openEditAttributeDialog = (attr: EmployeeAttribute) => {
    setEditingAttrId(attr.id);
    setAttrForm({
      name: attr.name,
      key: attr.key,
      category: attr.category,
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
      attrForm.type === "dropdown"
        ? attrForm.optionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (editingAttrId) {
      updateAttribute(editingAttrId, {
        name: attrForm.name.trim(),
        category: attrForm.category,
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
        category: attrForm.category,
        type: attrForm.type,
        required: attrForm.required,
        description: attrForm.description || undefined,
        placeholder: attrForm.placeholder || undefined,
        options: parsedOptions || [],
        is_active: true,
      });
      toast({ title: "Attribute Created", description: `Added "${attrForm.name}" to employee attributes.` });
    }
    setAttrDialogOpen(false);
  };

  const handleDeleteAttribute = (attr: EmployeeAttribute) => {
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
      "Field Code": a.key,
      "Category": CATEGORY_LABELS[a.category]?.label || a.category,
      "Data Type": TYPE_LABELS[a.type] || a.type,
      "Mandatory": a.required ? "Yes" : "No",
      "System Field": a.system ? "Yes (Built-in)" : "Custom",
      "Active": a.is_active ? "Yes" : "No",
      "Predefined Options": (a.options || []).join("; "),
      "Description": a.description || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employee_Attributes");
    XLSX.writeFile(wb, `Employee_Master_Data_Attributes_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Employee Master Data
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 font-semibold text-xs">
              Attribute Registry & Lookups
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define and manage the master attributes (Name, Phone, Nationality, Designation, Department, IDs) and predefined options describing employee profiles.
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
            Master Data Definition vs. Operational Roster:
          </span>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Employee Master Data</strong> maintains the attribute dictionary and lookup values (such as standard nationalities, job trades, departments, and identification fields). Individual employees are registered and deployed to camps and projects under <strong>Operations &gt; Employee Master</strong>.
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
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Mandatory Fields
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground">{kpis.required}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Globe size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Master Dropdown Lists
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground">{kpis.dropdowns}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Tag size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Custom Fields
              </p>
              <h3 className="text-xl font-bold tracking-tight text-foreground">{kpis.custom}</h3>
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
            <Globe size={13} /> Master Lookup Values ({dropdownAttributes.length} Lists)
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
                  placeholder="Search attribute name, code, description..."
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs w-[140px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                    <SelectItem value="personal" className="text-xs">Personal Info</SelectItem>
                    <SelectItem value="contact" className="text-xs">Contact Details</SelectItem>
                    <SelectItem value="identity" className="text-xs">Identity & Legal</SelectItem>
                    <SelectItem value="job" className="text-xs">Job & Trade</SelectItem>
                    <SelectItem value="custom" className="text-xs">Custom Attribute</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs w-[150px]">
                    <SelectValue placeholder="Data Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Data Types</SelectItem>
                    <SelectItem value="text" className="text-xs">Free Text</SelectItem>
                    <SelectItem value="phone" className="text-xs">Phone Number</SelectItem>
                    <SelectItem value="email" className="text-xs">Email Address</SelectItem>
                    <SelectItem value="dropdown" className="text-xs">Master Dropdown</SelectItem>
                    <SelectItem value="number" className="text-xs">Numeric</SelectItem>
                    <SelectItem value="date" className="text-xs">Date</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
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
                  <TableHead className="text-xs font-bold w-[160px]">Field Code / Key</TableHead>
                  <TableHead className="text-xs font-bold w-[140px]">Category</TableHead>
                  <TableHead className="text-xs font-bold w-[160px]">Data Type</TableHead>
                  <TableHead className="text-xs font-bold w-[130px]">Predefined Options</TableHead>
                  <TableHead className="text-xs font-bold w-[100px]">Requirement</TableHead>
                  <TableHead className="text-xs font-bold w-[80px]">Status</TableHead>
                  <TableHead className="text-xs font-bold text-right w-[110px]">Actions</TableHead>
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
                  filteredAttributes.map((attr) => (
                    <TableRow key={attr.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                            {attr.name}
                            {attr.system && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground">
                                Core
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
                          className={`text-[10px] py-0 px-2 font-medium ${
                            CATEGORY_LABELS[attr.category]?.color || ""
                          }`}
                        >
                          {CATEGORY_LABELS[attr.category]?.label || attr.category}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs text-foreground font-medium flex items-center gap-1.5">
                          {attr.type === "dropdown" ? (
                            <Globe size={13} className="text-purple-600 dark:text-purple-400" />
                          ) : attr.type === "phone" ? (
                            <Phone size={13} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Tag size={13} className="text-muted-foreground" />
                          )}
                          {TYPE_LABELS[attr.type] || attr.type}
                        </span>
                      </TableCell>

                      <TableCell>
                        {attr.type === "dropdown" && attr.options ? (
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
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ════════ TAB 2: MASTER LOOKUP VALUES ════════ */}
        <TabsContent value="lookups" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Sidebar list of dropdown attributes */}
            <Card className="border shadow-sm p-2 space-y-1">
              <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Select Lookup Attribute
              </div>
              {dropdownAttributes.map((dAttr) => (
                <button
                  key={dAttr.key}
                  type="button"
                  onClick={() => {
                    setSelectedLookupKey(dAttr.key);
                    setLookupSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-between transition-colors ${
                    activeLookupAttr?.key === dAttr.key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="truncate">{dAttr.name}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] py-0 px-1.5 ml-2 ${
                      activeLookupAttr?.key === dAttr.key
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {dAttr.options?.length || 0}
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
                          {activeLookupAttr.description || "These options populate selection dropdowns in Employee Master."}
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
                        placeholder={`Add new ${activeLookupAttr.name.toLowerCase()}... (e.g. Sudanese, Safety Officer)`}
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
              {editingAttrId ? "Edit Attribute" : "Add New Employee Attribute"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the attribute specification, data type, and predefined options describing employee profiles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Attribute Display Name *</Label>
              <Input
                value={attrForm.name}
                onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })}
                placeholder="e.g. Blood Group or Driving License"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select
                  value={attrForm.category}
                  onValueChange={(v) => setAttrForm({ ...attrForm, category: v as AttributeCategory })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal" className="text-xs">Personal Info</SelectItem>
                    <SelectItem value="contact" className="text-xs">Contact Details</SelectItem>
                    <SelectItem value="identity" className="text-xs">Identity & Legal</SelectItem>
                    <SelectItem value="job" className="text-xs">Job & Trade</SelectItem>
                    <SelectItem value="custom" className="text-xs">Custom Attribute</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data Type</Label>
                <Select
                  value={attrForm.type}
                  onValueChange={(v) => setAttrForm({ ...attrForm, type: v as AttributeType })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text" className="text-xs">Free Text</SelectItem>
                    <SelectItem value="dropdown" className="text-xs">Master Dropdown</SelectItem>
                    <SelectItem value="phone" className="text-xs">Phone Number</SelectItem>
                    <SelectItem value="email" className="text-xs">Email Address</SelectItem>
                    <SelectItem value="number" className="text-xs">Numeric</SelectItem>
                    <SelectItem value="date" className="text-xs">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {attrForm.type === "dropdown" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Predefined Options (comma separated)</Label>
                <Input
                  value={attrForm.optionsText}
                  onChange={(e) => setAttrForm({ ...attrForm, optionsText: e.target.value })}
                  placeholder="e.g. Option A, Option B, Option C"
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Separate options with commas. You can also manage options in the Master Lookups tab.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description / Helper Text</Label>
              <Input
                value={attrForm.description}
                onChange={(e) => setAttrForm({ ...attrForm, description: e.target.value })}
                placeholder="Brief explanation of this attribute..."
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="req-checkbox"
                checked={attrForm.required}
                onChange={(e) => setAttrForm({ ...attrForm, required: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <Label htmlFor="req-checkbox" className="text-xs font-medium cursor-pointer">
                Mark this attribute as mandatory / required
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
