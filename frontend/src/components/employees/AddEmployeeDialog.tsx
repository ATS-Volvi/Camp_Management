import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddEmployee, CAMP_STAFF_ROLES, type Employee } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";
import { useDesignations } from "@/hooks/useDesignations";
import { useEmployeeAttributes } from "@/hooks/useEmployeeAttributes";
import { useProjectAttributes } from "@/hooks/useProjectAttributes";
import { useCampAttributes } from "@/hooks/useCampAttributes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  User,
  Briefcase,
  Building2,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Utensils,
  BedDouble,
  ShieldAlert,
  Info,
  Globe,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "own" | "supplier" | "camp_staff";
}

type TabType = "employee" | "project" | "camp";

export default function AddEmployeeDialog({ open, onOpenChange, type }: Props) {
  const addEmployee = useAddEmployee();
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const { attributes, getOptionsFor } = useEmployeeAttributes();
  const { attributes: projectAttributes, getOptionsFor: getProjectOptions } = useProjectAttributes();
  const { attributes: campAttributes, getOptionsFor: getCampOptions } = useCampAttributes();

  const masterProjectSites = useMemo(() => getProjectOptions("site_location"), [projectAttributes]);
  const masterProjectClients = useMemo(() => getProjectOptions("client"), [projectAttributes]);

  const masterRoomCategories = useMemo(() => {
    const opts = getCampOptions("room_category");
    return opts.length > 0 ? opts : [
      "1x1 (Single Executive)",
      "2x1 (Double / Supervisor)",
      "3x1 (Triple Room)",
      "4x1 (Standard Quad)",
      "5x1 (Five Occupancy)",
      "6x1 (Six Occupancy)",
    ];
  }, [campAttributes]);

  const { data: camps = [] } = useQuery({
    queryKey: ["camps-dropdown"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [currentTab, setCurrentTab] = useState<TabType>("employee");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCampStaff = type === "camp_staff";

  // Master attributes lookup options
  const masterNationalities = useMemo(() => {
    return getOptionsFor("nationality");
  }, [attributes]);

  const combinedDesignations = useMemo(() => {
    const fromDb = designations.map((d) => d.name);
    const fromMaster = getOptionsFor("designation");
    return Array.from(new Set([...fromDb, ...fromMaster])).sort();
  }, [designations, attributes]);

  const combinedDepartments = useMemo(() => {
    const fromDb = departments.map((d) => d.name);
    const fromMaster = getOptionsFor("department");
    return Array.from(new Set([...fromDb, ...fromMaster])).sort();
  }, [departments, attributes]);

  const initialForm = {
    // 1. Employee Attributes
    employee_id: "",
    name: "",
    designation: "",
    department: "",
    phone: "",
    email: "",
    nationality: "Saudi",
    passport_number: "",
    iqama_number: "",
    status: "active",

    // 2. Project Details
    project: "",
    company: type === "own" ? "Expertise Holding" : "",
    supplier_name: "",
    work_location: "",
    join_date: new Date().toISOString().split("T")[0],
    contract_end_date: "",

    // 3. Camp Details
    camp_id: "",
    staff_role: "",
    room_preference: masterRoomCategories[0] || "4x1 (Standard Quad)",
    catering_enrolled: true,
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (open) {
      setCurrentTab("employee");
      setErrors({});
      setForm({
        ...initialForm,
        room_preference: masterRoomCategories[0] || "4x1 (Standard Quad)",
        company: type === "own" ? "Expertise Holding" : "",
      });
    }
  }, [open, type, masterRoomCategories]);

  const update = (key: string, val: any) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!form.employee_id.trim()) newErrors.employee_id = "Employee ID is required";
    if (!form.name.trim()) newErrors.name = "Full Name is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Missing Information",
        description: "Please fill in Employee ID and Full Name before proceeding.",
        variant: "destructive",
      });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNextToProject = () => {
    if (validateStep1()) {
      setCurrentTab("project");
    }
  };

  const handleNextToCamp = () => {
    setCurrentTab("camp");
  };

  const handleSubmit = () => {
    if (!validateStep1()) {
      setCurrentTab("employee");
      return;
    }

    if (isCampStaff && !form.staff_role) {
      setCurrentTab("camp");
      setErrors({ staff_role: "Staff role is required" });
      toast({ title: "Role Required", description: "Please assign a staff role.", variant: "destructive" });
      return;
    }

    if (isCampStaff && !form.camp_id) {
      setCurrentTab("camp");
      setErrors({ camp_id: "Camp selection is required" });
      toast({ title: "Camp Required", description: "Please assign this staff member to a camp.", variant: "destructive" });
      return;
    }

    addEmployee.mutate(
      {
        employee_id: form.employee_id.trim(),
        name: form.name.trim(),
        employee_type: type,
        designation: isCampStaff ? form.staff_role : form.designation || null,
        department: form.department || null,
        company: form.company || null,
        supplier_name: type === "supplier" ? form.supplier_name || null : null,
        phone: form.phone || null,
        email: form.email || null,
        nationality: form.nationality || null,
        passport_number: form.passport_number || null,
        iqama_number: form.iqama_number || null,
        project: form.project || null,
        status: form.status,
        staff_role: isCampStaff ? form.staff_role : null,
        camp_id: form.camp_id ? form.camp_id : null,
        join_date: form.join_date || null,
        contract_end_date: form.contract_end_date || null,
      } as any,
      {
        onSuccess: () => {
          toast({
            title: "Employee Added Successfully",
            description: `${form.name} (${form.employee_id}) has been registered.`,
          });
          onOpenChange(false);
        },
      }
    );
  };

  const title = isCampStaff
    ? "Add Camp Staff Member"
    : `Add ${type === "own" ? "Company / Own" : "Supplier"} Employee`;

  const selectedCampName = camps.find((c) => c.id === form.camp_id)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-blue-950/20 via-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="secondary"
              className="gap-1 px-2.5 py-0.5 font-semibold text-xs bg-primary/10 text-primary border-primary/20"
            >
              <User size={13} /> Employee Registration Wizard
            </Badge>
            <Badge variant="outline" className="text-xs uppercase">
              {type === "own" ? "Company Own" : type === "supplier" ? "Supplier Contractor" : "Camp Staff"}
            </Badge>
          </div>
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Register personnel across employee master attributes, project allocation, and camp accommodation details.
          </DialogDescription>
        </DialogHeader>

        {/* 3 Stepper Tabs Bar */}
        <div className="flex items-center justify-between border-b px-6 py-2.5 bg-muted/15">
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold w-full">
            {/* Tab 1: Employee */}
            <button
              type="button"
              onClick={() => setCurrentTab("employee")}
              className={`flex items-center gap-2 pb-1.5 border-b-2 transition-all ${
                currentTab === "employee"
                  ? "border-primary text-primary"
                  : form.employee_id && form.name
                  ? "border-emerald-500/50 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentTab === "employee"
                    ? "bg-primary text-primary-foreground"
                    : form.employee_id && form.name
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {form.employee_id && form.name && currentTab !== "employee" ? (
                  <CheckCircle2 size={12} />
                ) : (
                  "1"
                )}
              </div>
              <span>Employee</span>
            </button>

            <ChevronRight size={13} className="text-muted-foreground/40" />

            {/* Tab 2: Project Details */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setCurrentTab("project");
              }}
              className={`flex items-center gap-2 pb-1.5 border-b-2 transition-all ${
                currentTab === "project"
                  ? "border-primary text-primary"
                  : form.project
                  ? "border-emerald-500/50 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentTab === "project"
                    ? "bg-primary text-primary-foreground"
                    : form.project
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {form.project && currentTab !== "project" ? (
                  <CheckCircle2 size={12} />
                ) : (
                  "2"
                )}
              </div>
              <span>Project Details</span>
            </button>

            <ChevronRight size={13} className="text-muted-foreground/40" />

            {/* Tab 3: Camp Details */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setCurrentTab("camp");
              }}
              className={`flex items-center gap-2 pb-1.5 border-b-2 transition-all ${
                currentTab === "camp"
                  ? "border-primary text-primary"
                  : form.camp_id
                  ? "border-emerald-500/50 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentTab === "camp"
                    ? "bg-primary text-primary-foreground"
                    : form.camp_id
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {form.camp_id && currentTab !== "camp" ? (
                  <CheckCircle2 size={12} />
                ) : (
                  "3"
                )}
              </div>
              <span>Camp Details</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {/* ════════ TAB 1: EMPLOYEE DETAILS ════════ */}
          {currentTab === "employee" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <User size={14} className="text-primary" /> Step 1: Personal & Identification Attributes
                </span>
                <span className="text-[11px] text-muted-foreground">* Indicates required fields</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Employee ID *</Label>
                  <Input
                    value={form.employee_id}
                    onChange={(e) => update("employee_id", e.target.value)}
                    placeholder="EMP-001 or 10423"
                    className={`h-9 text-xs font-mono ${errors.employee_id ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {errors.employee_id && (
                    <span className="text-[10px] text-destructive flex items-center gap-1">
                      <ShieldAlert size={11} /> {errors.employee_id}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. Mohammed Al-Otaibi or John Doe"
                    className={`h-9 text-xs ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {errors.name && (
                    <span className="text-[10px] text-destructive flex items-center gap-1">
                      <ShieldAlert size={11} /> {errors.name}
                    </span>
                  )}
                </div>

                {!isCampStaff && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Designation / Trade</Label>
                      <Select
                        value={form.designation}
                        onValueChange={(v) => update("designation", v)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {combinedDesignations.map((dName) => (
                            <SelectItem key={dName} value={dName} className="text-xs">
                              {dName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Department</Label>
                      <Select
                        value={form.department}
                        onValueChange={(v) => update("department", v)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {combinedDepartments.map((dName) => (
                            <SelectItem key={dName} value={dName} className="text-xs">
                              {dName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone Number</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+966 5X XXX XXXX"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="user@expertise.com"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Nationality</Label>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Globe size={10} /> Master Data
                    </span>
                  </div>
                  <Select
                    value={form.nationality}
                    onValueChange={(v) => update("nationality", v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {masterNationalities.map((nat) => (
                        <SelectItem key={nat} value={nat} className="text-xs">
                          {nat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Passport Number</Label>
                  <Input
                    value={form.passport_number}
                    onChange={(e) => update("passport_number", e.target.value)}
                    placeholder="A1234567"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Iqama / National ID</Label>
                  <Input
                    value={form.iqama_number}
                    onChange={(e) => update("iqama_number", e.target.value)}
                    placeholder="24XXXXXXXX"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Status</Label>
                  <Select value={form.status} onValueChange={(v) => update("status", v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active" className="text-xs">
                        Active
                      </SelectItem>
                      <SelectItem value="inactive" className="text-xs">
                        Inactive
                      </SelectItem>
                      <SelectItem value="transferred" className="text-xs">
                        Transferred
                      </SelectItem>
                      <SelectItem value="on_leave" className="text-xs">
                        On Leave
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ════════ TAB 2: PROJECT DETAILS ════════ */}
          {currentTab === "project" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Briefcase size={14} className="text-primary" /> Step 2: Project Allocation & Contract
                </span>
                <span className="text-[11px] text-muted-foreground">Assign employee to work site & contractor</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Project Assigned</Label>
                  <Input
                    value={form.project}
                    onChange={(e) => update("project", e.target.value)}
                    placeholder="e.g. Project Alpha or Aramco Berri"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Company / Employer</Label>
                  <Input
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    placeholder="Expertise Holding"
                    className="h-9 text-xs"
                  />
                </div>

                {type === "supplier" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Supplier / Contractor Name *</Label>
                    <Input
                      value={form.supplier_name}
                      onChange={(e) => update("supplier_name", e.target.value)}
                      placeholder="e.g. Al-Falak Subcontracting"
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Work Location / Site</Label>
                  <Input
                    list="project-site-locations"
                    value={form.work_location}
                    onChange={(e) => update("work_location", e.target.value)}
                    placeholder="e.g. Jubail Industrial City (Zone 1 & 2)"
                    className="h-9 text-xs"
                  />
                  <datalist id="project-site-locations">
                    {masterProjectSites.map((site) => (
                      <option key={site} value={site} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Joining / Mobilization Date</Label>
                  <Input
                    type="date"
                    value={form.join_date}
                    onChange={(e) => update("join_date", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Contract End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={form.contract_end_date}
                    onChange={(e) => update("contract_end_date", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════════ TAB 3: CAMP DETAILS ════════ */}
          {currentTab === "camp" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 size={14} className="text-primary" /> Step 3: Camp Accommodation & Mess Allocation
                </span>
                <span className="text-[11px] text-muted-foreground">Select camp accommodation & boarding</span>
              </div>

              <div className="space-y-4">
                {isCampStaff && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Camp Staff Role *</Label>
                    <Select
                      value={form.staff_role}
                      onValueChange={(v) => update("staff_role", v)}
                    >
                      <SelectTrigger className={`h-9 text-xs ${errors.staff_role ? "border-destructive focus-visible:ring-destructive" : ""}`}>
                        <SelectValue placeholder="Select camp staff role" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMP_STAFF_ROLES.map((role) => (
                          <SelectItem key={role} value={role} className="text-xs">
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.staff_role && (
                      <span className="text-[10px] text-destructive flex items-center gap-1">
                        <ShieldAlert size={11} /> {errors.staff_role}
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      Assigned Camp {isCampStaff ? "*" : "(Optional - Can assign later)"}
                    </Label>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Building2 size={10} className="text-primary" /> Master Data
                    </span>
                  </div>
                  <Select
                    value={form.camp_id}
                    onValueChange={(v) => update("camp_id", v)}
                  >
                    <SelectTrigger className={`h-9 text-xs ${errors.camp_id ? "border-destructive focus-visible:ring-destructive" : ""}`}>
                      <SelectValue placeholder="Select camp location" />
                    </SelectTrigger>
                    <SelectContent>
                      {camps.map((camp: any) => (
                        <SelectItem key={camp.id} value={camp.id} className="text-xs">
                          {camp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.camp_id && (
                    <span className="text-[10px] text-destructive flex items-center gap-1">
                      <ShieldAlert size={11} /> {errors.camp_id}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Room Preference / Tier</Label>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                      <BedDouble size={10} className="text-primary" /> Camp Master Data
                    </span>
                  </div>
                  <Select
                    value={form.room_preference}
                    onValueChange={(v) => update("room_preference", v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select room category from master data" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {masterRoomCategories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Utensils size={14} className="text-primary" /> Auto-Enroll in Camp Mess Catering
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically activate daily meal eligibility upon check-in
                    </p>
                  </div>
                  <Switch
                    checked={form.catering_enrolled}
                    onCheckedChange={(checked) => update("catering_enrolled", checked)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between">
          <div>
            {currentTab === "employee" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
            ) : currentTab === "project" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentTab("employee")}
                className="text-xs h-8 gap-1.5"
              >
                <ArrowLeft size={13} /> Back to Employee
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentTab("project")}
                className="text-xs h-8 gap-1.5"
              >
                <ArrowLeft size={13} /> Back to Project
              </Button>
            )}
          </div>

          <div>
            {currentTab === "employee" ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNextToProject}
                className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold"
              >
                Next: Project Details <ArrowRight size={13} />
              </Button>
            ) : currentTab === "project" ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNextToCamp}
                className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold"
              >
                Next: Camp Details <ArrowRight size={13} />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={addEmployee.isPending}
                className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {addEmployee.isPending ? (
                  "Adding..."
                ) : (
                  <>
                    <CheckCircle2 size={13} /> {isCampStaff ? "Add Camp Staff" : "Add Employee"}
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
