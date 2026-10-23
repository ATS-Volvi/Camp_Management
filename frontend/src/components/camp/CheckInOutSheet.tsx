import { prepareCheckInReceipt } from "@/lib/checkInReport";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { LogIn, LogOut, Search, Users, Building2, Package, DoorOpen, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import CheckOutConfirmDialog from "@/components/checkin/CheckOutConfirmDialog";

interface ClearanceItem {
  id: string;
  label: string;
  checked: boolean;
}

const defaultClearanceItems: ClearanceItem[] = [
  { id: "assets", label: "All assigned assets returned", checked: false },
  { id: "room", label: "Room inspection completed", checked: false },
  { id: "damages", label: "No damages reported", checked: false },
  { id: "keys", label: "Keys / access cards returned", checked: false },
  { id: "clearance", label: "Clearance form signed", checked: false },
];

interface Props {
  campId: string;
  mode: "checkin" | "checkout";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type EmployeeSource = "own" | "supplier";
type CheckoutFilter = "all" | "supplier" | "project";

export default function CheckInOutSheet({ campId, mode, open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Check-in specific state
  const [employeeSource, setEmployeeSource] = useState<EmployeeSource>("own");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [checkInProject, setCheckInProject] = useState("");
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());

  // Check-out specific state
  const [checkoutSelectedIds, setCheckoutSelectedIds] = useState<Set<string>>(new Set());
  const [checkoutFilter, setCheckoutFilter] = useState<CheckoutFilter>("all");
  const [checkoutFilterValue, setCheckoutFilterValue] = useState("");
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);
  const [clearanceItems, setClearanceItems] = useState<ClearanceItem[]>(defaultClearanceItems);

  // Rooms for check-in (only rooms with available capacity)
  const { data: rooms = [] } = useQuery({
    queryKey: ["camp-rooms-for-checkin", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_number, floor, current_occupancy, max_capacity, status, category, building_id, buildings:building_id(name)")
        .eq("camp_id", campId)
        .in("status", ["vacant", "partially_occupied"])
        .order("room_number");
      if (error) throw error;
      return data;
    },
    enabled: open && mode === "checkin",
  });

  // All rooms for checkout dialog display
  const { data: allRooms = [] } = useQuery({
    queryKey: ["camp-all-rooms-sheet", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_number, category, current_occupancy, max_capacity")
        .eq("camp_id", campId);
      if (error) throw error;
      return data;
    },
    enabled: open && mode === "checkout",
  });

  // Camp info for dialog
  const { data: campInfo } = useQuery({
    queryKey: ["camp-info-sheet", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camps")
        .select("id, name, location")
        .eq("id", campId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && mode === "checkout",
  });

  // Employees list for check-in filtered by type
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-camp-checkin", campId, employeeSource],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, employee_id, company, supplier_name, project, employee_type")
        .eq("employee_type", employeeSource)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open && mode === "checkin",
  });

  // Checked-in employees for this camp (to exclude from check-in list)
  const { data: checkedInIds = new Set<string>() } = useQuery({
    queryKey: ["checked-in-ids-sheet", campId],
    queryFn: async () => {
      const { data: checkIns, error: ciError } = await supabase
        .from("check_ins")
        .select("employee_id, room_id, check_in_date")
        .eq("camp_id", campId);
      if (ciError) throw ciError;

      const { data: checkOuts, error: coError } = await supabase
        .from("check_outs")
        .select("employee_id, room_id, check_out_date")
        .eq("camp_id", campId);
      if (coError) throw coError;

      const lastOutByPair = new Map<string, string>();
      (checkOuts || []).forEach(co => {
        const key = `${co.employee_id}|${co.room_id}`;
        const existing = lastOutByPair.get(key);
        if (!existing || new Date(co.check_out_date) > new Date(existing)) {
          lastOutByPair.set(key, co.check_out_date);
        }
      });

      const activeIds = new Set<string>();
      (checkIns || []).forEach(ci => {
        const lastOut = lastOutByPair.get(`${ci.employee_id}|${ci.room_id}`);
        if (!lastOut || new Date(ci.check_in_date) > new Date(lastOut)) {
          activeIds.add(ci.employee_id);
        }
      });
      return activeIds;
    },
    enabled: open && mode === "checkin",
  });

  // Supplier names for check-in
  const supplierNames = useMemo(() => {
    if (employeeSource !== "supplier") return [];
    return [...new Set(employees.filter((e: any) => e.supplier_name).map((e: any) => e.supplier_name))].sort();
  }, [employees, employeeSource]);

  // Project names for check-in filter
  const checkinProjectNames = useMemo(() => {
    return [...new Set(employees.filter((e: any) => e.project).map((e: any) => e.project))].sort();
  }, [employees]);

  // Currently checked-in employees for check-out
  const { data: checkedInEmployees = [] } = useQuery({
    queryKey: ["checked-in-employees-sheet", campId],
    queryFn: async () => {
      const { data: checkIns, error: ciError } = await supabase
        .from("check_ins")
        .select("employee_id, room_id, check_in_date")
        .eq("camp_id", campId)
        .order("check_in_date", { ascending: false });
      if (ciError) throw ciError;

      const { data: checkOuts, error: coError } = await supabase
        .from("check_outs")
        .select("employee_id, room_id, check_out_date")
        .eq("camp_id", campId);
      if (coError) throw coError;

      const lastOutByPair = new Map<string, string>();
      (checkOuts || []).forEach(co => {
        const key = `${co.employee_id}|${co.room_id}`;
        const existing = lastOutByPair.get(key);
        if (!existing || new Date(co.check_out_date) > new Date(existing)) {
          lastOutByPair.set(key, co.check_out_date);
        }
      });

      const employeeRoomMap = new Map<string, string>();
      (checkIns || []).forEach(ci => {
        if (employeeRoomMap.has(ci.employee_id)) return;
        const lastOut = lastOutByPair.get(`${ci.employee_id}|${ci.room_id}`);
        if (!lastOut || new Date(ci.check_in_date) > new Date(lastOut)) {
          employeeRoomMap.set(ci.employee_id, ci.room_id);
        }
      });

      if (employeeRoomMap.size === 0) return [];

      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("id, name, employee_id, company, supplier_name, project, employee_type")
        .in("id", [...employeeRoomMap.keys()]);
      if (empError) throw empError;

      return (empData || []).map(emp => ({
        ...emp,
        room_id: employeeRoomMap.get(emp.id) || "",
      }));
    },
    enabled: open && mode === "checkout",
  });

  // Unique supplier/project names from checked-in employees
  const checkoutSupplierNames = useMemo(() =>
    [...new Set(checkedInEmployees.filter((e: any) => e.supplier_name).map((e: any) => e.supplier_name))].sort()
  , [checkedInEmployees]);

  const checkoutProjectNames = useMemo(() =>
    [...new Set(checkedInEmployees.filter((e: any) => e.project).map((e: any) => e.project))].sort()
  , [checkedInEmployees]);

  // Filtered employee lists
  const filteredCheckinEmployees = useMemo(() => {
    let list = employees.filter((e: any) => !(checkedInIds instanceof Set ? checkedInIds : new Set()).has(e.id));
    
    if (employeeSource === "supplier" && selectedSupplier) {
      list = list.filter((e: any) => e.supplier_name === selectedSupplier);
    }

    if (selectedProject) {
      list = list.filter((e: any) => e.project === selectedProject);
    }

    if (employeeSearch) {
      const q = employeeSearch.toLowerCase();
      list = list.filter((e: any) =>
        e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, checkedInIds, employeeSource, selectedSupplier, selectedProject, employeeSearch]);

  const filteredCheckoutEmployees = useMemo(() => {
    let list: any[] = checkedInEmployees;

    if (checkoutFilter === "supplier" && checkoutFilterValue) {
      list = list.filter((e: any) => e.supplier_name === checkoutFilterValue);
    } else if (checkoutFilter === "project" && checkoutFilterValue) {
      list = list.filter((e: any) => e.project === checkoutFilterValue);
    }

    if (employeeSearch) {
      const q = employeeSearch.toLowerCase();
      list = list.filter((e: any) =>
        e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [checkedInEmployees, checkoutFilter, checkoutFilterValue, employeeSearch]);

  const displayedEmployees = mode === "checkin" ? filteredCheckinEmployees : filteredCheckoutEmployees;

  const toggleCheckoutEmployee = (empId: string) => {
    setCheckoutSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId); else next.add(empId);
      return next;
    });
  };

  const toggleAllCheckout = () => {
    if (checkoutSelectedIds.size === filteredCheckoutEmployees.length) {
      setCheckoutSelectedIds(new Set());
    } else {
      setCheckoutSelectedIds(new Set(filteredCheckoutEmployees.map((e: any) => e.id)));
    }
  };

  const toggleBulkEmployee = (empId: string) => {
    setBulkSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId); else next.add(empId);
      return next;
    });
  };

  const toggleAllBulk = () => {
    if (bulkSelectedIds.size === filteredCheckinEmployees.length) {
      setBulkSelectedIds(new Set());
    } else {
      setBulkSelectedIds(new Set(filteredCheckinEmployees.map((e: any) => e.id)));
    }
  };

  const updateCheckInProject = async (employeeId: string) => {
    if (!checkInProject) return;
    const { data } = await supabase
      .from("check_ins")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("camp_id", campId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data[0]) {
      await supabase
        .from("check_ins")
        .update({ project: checkInProject } as any)
        .eq("id", data[0].id);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    const successfulIds: string[] = [];
    setLoading(true);
    try {
      if (employeeSource === "supplier" && bulkSelectedIds.size > 0) {
        // Bulk check-in for supplier employees
        if (!selectedRoom) {
          toast({ title: "Select a room", variant: "destructive" });
          setLoading(false);
          return;
        }
        let success = 0, failed = 0;
        for (const empId of bulkSelectedIds) {
          try {
            const { error } = await supabase.rpc("perform_check_in", {
              p_employee_id: empId,
              p_room_id: selectedRoom,
              p_camp_id: campId,
              p_performed_by: user.id,
            });
            if (error) { failed++; } else {
              success++;
              successfulIds.push(empId);
              await updateCheckInProject(empId);
            }
          } catch { failed++; }
        }
        toast({
          title: `Bulk check-in complete`,
          description: `${success} checked in${failed > 0 ? `, ${failed} failed` : ""}`,
          variant: failed > 0 ? "destructive" : "default",
        });
      } else {
        // Single check-in
        if (!selectedEmployee || !selectedRoom) return;
        const { error } = await supabase.rpc("perform_check_in", {
          p_employee_id: selectedEmployee,
          p_room_id: selectedRoom,
          p_camp_id: campId,
          p_performed_by: user.id,
        });
        if (error) throw error;
        successfulIds.push(selectedEmployee);
        await updateCheckInProject(selectedEmployee);
        toast({ title: "Check-in successful" });
      }
      await prepareCheckInReceipt(successfulIds, campId);
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Check-in failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleCheckOutClick = () => {
    if (checkoutSelectedIds.size === 0) return;
    setCheckoutConfirmOpen(true);
  };

  const handleCheckOutConfirmed = async () => {
    if (!user || checkoutSelectedIds.size === 0) return;
    setCheckoutConfirmOpen(false);
    setLoading(true);
    let success = 0, failed = 0;
    for (const empId of checkoutSelectedIds) {
      const emp = checkedInEmployees.find((e: any) => e.id === empId);
      if (!emp) { failed++; continue; }
      try {
        const { error } = await supabase.rpc("perform_check_out", {
          p_employee_id: empId,
          p_room_id: (emp as any).room_id,
          p_camp_id: campId,
          p_performed_by: user.id,
          p_assets_returned: clearanceItems.find(i => i.id === "assets")?.checked ?? true,
          p_damage_remarks: null,
          p_clearance_notes: null,
          p_is_blacklisted: false,
          p_blacklist_reason: null,
          p_feedback: null,
          p_feedback_rating: null,
        });
        if (error) { failed++; } else { success++; }
      } catch { failed++; }
    }
    toast({
      title: `Check-out complete`,
      description: `${success} checked out${failed > 0 ? `, ${failed} failed` : ""}`,
      variant: failed > 0 ? "destructive" : "default",
    });
    setCheckoutSelectedIds(new Set());
    setClearanceItems(defaultClearanceItems);
    setLoading(false);
    if (failed === 0) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployee("");
    setSelectedRoom("");
    setEmployeeSearch("");
    setSelectedSupplier("");
    setSelectedProject("");
    setCheckInProject("");
    setBulkSelectedIds(new Set());
    setCheckoutSelectedIds(new Set());
    setCheckoutFilter("all");
    setCheckoutFilterValue("");
  };

  const isBulkMode = mode === "checkin" && employeeSource === "supplier";

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[460px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {mode === "checkin" ? <LogIn size={20} className="text-primary" /> : <LogOut size={20} className="text-destructive" />}
            {mode === "checkin" ? "Check In Employee" : "Check Out Employees"}
          </SheetTitle>
          <SheetDescription>
            {mode === "checkin"
              ? "Select employee type, choose an employee and assign a room."
              : "Select checked-in employees to check out."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* ===== CHECK-IN: Employee Type Toggle ===== */}
          {mode === "checkin" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Employee Type</Label>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {(["own", "supplier"] as EmployeeSource[]).map(src => (
                  <button
                    key={src}
                    onClick={() => { setEmployeeSource(src); setSelectedEmployee(""); setSelectedSupplier(""); setBulkSelectedIds(new Set()); setEmployeeSearch(""); }}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      employeeSource === src ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {src === "own" ? "Own Employees" : "Supplier Employees"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===== CHECK-IN SUPPLIER: Supplier Name Select ===== */}
          {mode === "checkin" && employeeSource === "supplier" && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Building2 size={12} /> Supplier Name
              </Label>
              <Select value={selectedSupplier} onValueChange={(v) => { setSelectedSupplier(v); setBulkSelectedIds(new Set()); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {supplierNames.map((name: string) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                  {supplierNames.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No suppliers found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ===== CHECK-IN: Project Filter ===== */}
          {mode === "checkin" && checkinProjectNames.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Filter by Project</Label>
              <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v === "__all__" ? "" : v); setBulkSelectedIds(new Set()); setSelectedEmployee(""); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Projects</SelectItem>
                  {checkinProjectNames.map((name: string) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ===== CHECK-OUT: Filter By ===== */}
          {mode === "checkout" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Filter By</Label>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  {(["all", "supplier", "project"] as CheckoutFilter[]).map(f => (
                    <button
                      key={f}
                      onClick={() => { setCheckoutFilter(f); setCheckoutFilterValue(""); setCheckoutSelectedIds(new Set()); }}
                      className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        checkoutFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "all" ? "All" : f === "supplier" ? "Supplier" : "Project"}
                    </button>
                  ))}
                </div>
              </div>
              {checkoutFilter !== "all" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{checkoutFilter === "supplier" ? "Supplier" : "Project"}</Label>
                  <Select value={checkoutFilterValue} onValueChange={(v) => { setCheckoutFilterValue(v); setCheckoutSelectedIds(new Set()); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={`Choose ${checkoutFilter}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(checkoutFilter === "supplier" ? checkoutSupplierNames : checkoutProjectNames).map((name: string) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* ===== Employee Search ===== */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* ===== CHECK-IN OWN: Single Employee Select ===== */}
          {mode === "checkin" && employeeSource === "own" && (
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCheckinEmployees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_id})
                    </SelectItem>
                  ))}
                  {filteredCheckinEmployees.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No employees found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ===== CHECK-IN SUPPLIER: Multi-select employee list ===== */}
          {mode === "checkin" && employeeSource === "supplier" && selectedSupplier && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  <Users size={14} className="inline mr-1" />
                  Employees ({filteredCheckinEmployees.length})
                </Label>
                {filteredCheckinEmployees.length > 0 && (
                  <button onClick={toggleAllBulk} className="text-xs text-primary hover:underline">
                    {bulkSelectedIds.size === filteredCheckinEmployees.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
              {bulkSelectedIds.size > 0 && (
                <p className="text-xs text-muted-foreground">{bulkSelectedIds.size} selected for bulk check-in</p>
              )}
              <div className="border rounded-lg max-h-[35vh] overflow-y-auto divide-y">
                {filteredCheckinEmployees.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    No employees found for this supplier
                  </div>
                ) : (
                  filteredCheckinEmployees.map((emp: any) => (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                        bulkSelectedIds.has(emp.id) ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={bulkSelectedIds.has(emp.id)}
                        onChange={() => toggleBulkEmployee(emp.id)}
                        className="rounded border-muted-foreground/30 text-primary focus:ring-primary shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.employee_id}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ===== CHECK-OUT: Employee Checkbox List ===== */}
          {mode === "checkout" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Employees ({filteredCheckoutEmployees.length})</Label>
                {filteredCheckoutEmployees.length > 0 && (
                  <button onClick={toggleAllCheckout} className="text-xs text-primary hover:underline">
                    {checkoutSelectedIds.size === filteredCheckoutEmployees.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
              {checkoutSelectedIds.size > 0 && (
                <p className="text-xs text-muted-foreground">{checkoutSelectedIds.size} selected</p>
              )}
              <div className="border rounded-lg max-h-[40vh] overflow-y-auto divide-y">
                {filteredCheckoutEmployees.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    No checked-in employees found
                  </div>
                ) : (
                  filteredCheckoutEmployees.map((emp: any) => (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                        checkoutSelectedIds.has(emp.id) ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checkoutSelectedIds.has(emp.id)}
                        onChange={() => toggleCheckoutEmployee(emp.id)}
                        className="rounded border-muted-foreground/30 text-primary focus:ring-primary shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {emp.employee_id}
                          {emp.supplier_name && <> · {emp.supplier_name}</>}
                          {emp.project && <> · {emp.project}</>}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ===== CHECK-IN: Project Name (optional) ===== */}
          {mode === "checkin" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Project (optional)</Label>
              <Input
                value={checkInProject}
                onChange={(e) => setCheckInProject(e.target.value)}
                placeholder="Enter project name..."
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* ===== Room Number (auto-filled or select) ===== */}
          {mode === "checkin" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Room Number</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room..." />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room: any) => (
                    <SelectItem key={room.id} value={room.id}>
                      {(room as any).buildings?.name} / {room.room_number} ({room.current_occupancy}/{room.max_capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRoom && (() => {
                const room = rooms.find((r: any) => r.id === selectedRoom) as any;
                return room ? (
                  <p className="text-[10px] text-muted-foreground px-1">
                    {(room as any).buildings?.name} / {room.room_number} · {room.current_occupancy}/{room.max_capacity} occupied
                  </p>
                ) : null;
              })()}
            </div>
          )}

          {/* ===== Action Button ===== */}
          <Button
            className="w-full"
            variant={mode === "checkin" ? "default" : "destructive"}
            onClick={mode === "checkin" ? handleCheckIn : handleCheckOutClick}
            disabled={loading || (mode === "checkin"
              ? (isBulkMode ? (bulkSelectedIds.size === 0 || !selectedRoom) : (!selectedEmployee || !selectedRoom))
              : checkoutSelectedIds.size === 0)}
          >
            {loading
              ? "Processing..."
              : mode === "checkin"
              ? isBulkMode
                ? `Check In (${bulkSelectedIds.size})`
                : "Check In"
              : `Check Out (${checkoutSelectedIds.size})`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    <CheckOutConfirmDialog
      open={checkoutConfirmOpen}
      onOpenChange={setCheckoutConfirmOpen}
      onConfirm={handleCheckOutConfirmed}
      isSubmitting={loading}
      employees={checkedInEmployees.filter((e: any) => checkoutSelectedIds.has(e.id)).map((e: any) => ({
        ...e,
        checked_in_room_id: e.room_id,
      }))}
      rooms={allRooms as any}
      camp={campInfo || null}
      clearanceItems={clearanceItems}
      damageRemarks=""
      clearanceNotes=""
      feedback=""
      feedbackRating={0}
      isBlacklisted={false}
      blacklistReason=""
    />
    </>
  );
}
