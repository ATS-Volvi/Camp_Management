import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Upload, Users, Building2, Wrench, Pencil, History, Trash2, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmployeeStaysView from "@/components/reports/EmployeeStaysView";
import { useEmployeeStays } from "@/hooks/useEmployeeStays";
import { employeePresence } from "@/lib/employeePresence";
import { useEmployees } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AddEmployeeDialog from "@/components/employees/AddEmployeeDialog";
import EditEmployeeDialog from "@/components/employees/EditEmployeeDialog";
import BulkUploadDialog from "@/components/employees/BulkUploadDialog";
import { Employee } from "@/hooks/useEmployees";
import { TablePager, usePaged } from "@/components/TablePager";

const statusColors: Record<string, string> = {
  Active: "bg-primary/10 text-primary",
  Vacation: "bg-accent text-accent-foreground",
  "On Site": "bg-primary/10 text-primary",
};

type EmployeeTab = "own" | "supplier" | "camp_staff";

export default function EmployeeMaster() {
  const [tab, setTab] = useState<EmployeeTab>("own");
  const [search, setSearch] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const toggleSel = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (ids: string[], on: boolean) => setSelected((p) => { const n = new Set(p); ids.forEach((i) => on ? n.add(i) : n.delete(i)); return n; });
  const doExport = () => {
    const rows = (selected.size ? filtered.filter((e) => selected.has(e.id)) : filtered).map((e: any) => ({
      "Employee ID": e.employee_id, Name: e.name, Type: e.employee_type,
      Designation: e.designation || "", Department: e.department || "", "Department as per SAP": e.sap_department || "",
      "Employee Group": e.employee_group || "", Company: e.company || "", Supplier: e.supplier_name || "",
      Project: e.project || "", "Staff Role": e.staff_role || "",
      "Current Location": e.current_location || "", Remarks: e.remarks || "",
      "Camp No": locationMap[e.id]?.camp || "", "Block No": locationMap[e.id]?.block || "", "Room No": locationMap[e.id]?.room || "",
      "Passport No": e.passport_number || "", "Iqama No": e.iqama_number || "", Phone: e.phone || "",
      Nationality: e.nationality || "", Status: presenceMap[e.id] || "",
    }));
    if (!rows.length) { toast.error("No employees to export"); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Employees");
    XLSX.writeFile(wb, `employee-master-${tab}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const doDelete = async () => {
    setDeleting(true);
    const { data, error } = await supabase.rpc("delete_employees", { p_ids: [...selected] });
    setDeleting(false); setConfirmDelete(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Deleted ${data} employee(s) and their camp records`);
    setSelected(new Set());
    qc.invalidateQueries();
  };
  const { data: stays = [], isLoading: staysLoading, error: staysError } = useEmployeeStays();

  const { data: employees = [], isLoading } = useEmployees(
    tab === "camp_staff" ? "camp_staff" : tab
  );
  const { data: departments = [] } = useDepartments();
  const presenceMap = useMemo(() => Object.fromEntries(employees.map(e => [e.id, staysLoading ? "Loading…" : staysError ? "Unavailable" : employeePresence(e, stays)])), [employees, stays, staysLoading, staysError]);

  const { data: camps = [] } = useQuery({
    queryKey: ["camps-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name, camp_code").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Room → block lookup, paginated so large camps are not truncated.
  const { data: roomLocations = {} } = useQuery({
    queryKey: ["employee-room-locations"],
    queryFn: async () => {
      const rows: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("rooms")
          .select("id, room_number, floor, buildings(name, block_code)")
          .range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return Object.fromEntries(rows.map((r) => [r.id, r])) as Record<string, any>;
    },
  });

  const campMap = useMemo(() => {
    const map: Record<string, string> = {};
    camps.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [camps]);

  const campCodeMap = useMemo(() => {
    const map: Record<string, string> = {};
    camps.forEach((c: any) => { map[c.id] = c.camp_code || c.name; });
    return map;
  }, [camps]);

  // Current camp/block/room per employee, from their active saved stay. Empty when not in a room.
  const locationMap = useMemo(() => {
    const map: Record<string, { camp: string; block: string; room: string }> = {};
    for (const s of stays) {
      if (s.status !== "In camp" || map[s.employee_id]) continue;
      const room = roomLocations[s.room_id];
      map[s.employee_id] = {
        camp: campCodeMap[s.camp_id] ?? s.camp,
        block: room?.buildings?.block_code || room?.buildings?.name || "",
        room: room?.room_number ?? s.room,
      };
    }
    return map;
  }, [stays, roomLocations, campCodeMap]);

  const nationalityOptions = useMemo(
    () => [...new Set(employees.map((e) => e.nationality).filter(Boolean) as string[])].sort(),
    [employees]
  );
  const designationOptions = useMemo(
    () => [...new Set(employees.map((e) => e.designation).filter(Boolean) as string[])].sort(),
    [employees]
  );
  const statusOptions = useMemo(
    () => [...new Set(Object.values(presenceMap).filter((v) => v && v !== "Loading…" && v !== "Unavailable"))].sort(),
    [presenceMap]
  );

  const deptCodeMap = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach((d) => { map[d.name] = d.code; });
    return map;
  }, [departments]);

  const filtered = employees.filter(
    (e) =>
      (nationalityFilter === "all" || e.nationality === nationalityFilter) &&
      (statusFilter === "all" || presenceMap[e.id] === statusFilter) &&
      (designationFilter === "all" || e.designation === designationFilter) &&
      (e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      (e.designation || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.supplier_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.staff_role || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.sap_department || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.employee_group || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.current_location || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.remarks || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Master</h1>
          <p className="text-muted-foreground text-sm">Manage own, supplier, and camp staff employees</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users size={16} /> Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users size={16} /> Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {staysLoading || staysError ? "—" : filtered.filter((e) => presenceMap[e.id] === "Active" || presenceMap[e.id] === "On Site").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 size={16} /> Vacation / Away / Not in camp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">
              {staysLoading || staysError ? "—" : filtered.filter((e) => presenceMap[e.id] !== "Active" && presenceMap[e.id] !== "On Site").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as EmployeeTab); setSearch(""); setSelected(new Set()); }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="own">Own Employees</TabsTrigger>
            <TabsTrigger value="supplier">Supplier Employees</TabsTrigger>
            <TabsTrigger value="camp_staff" className="gap-1">
              <Wrench size={14} /> Camp Staff
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 w-[260px]"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Nationality" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nationalities</SelectItem>
                {nationalityOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={designationFilter} onValueChange={setDesignationFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Designation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {designationOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {selected.size > 0 && (
              <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} className="mr-1" /> Delete ({selected.size})
              </Button>
            )}
            <Button variant="outline" onClick={doExport}>
              <Download size={16} className="mr-1" /> {selected.size ? `Download (${selected.size})` : "Bulk Download"}
            </Button>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload size={16} className="mr-1" /> Bulk Upload
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={16} className="mr-1" />
              {tab === "camp_staff" ? "Add Camp Staff" : "Add Employee"}
            </Button>
          </div>
        </div>

        <TabsContent value="own">
          <EmployeeTable employees={filtered} isLoading={isLoading} type="own" deptCodeMap={deptCodeMap} campMap={campMap} locationMap={locationMap} onEdit={setEditing} onHistory={setHistoryEmployee} presenceMap={presenceMap} selected={selected} onToggle={toggleSel} onToggleAll={toggleAll} />
        </TabsContent>
        <TabsContent value="supplier">
          <EmployeeTable employees={filtered} isLoading={isLoading} type="supplier" deptCodeMap={deptCodeMap} campMap={campMap} locationMap={locationMap} onEdit={setEditing} onHistory={setHistoryEmployee} presenceMap={presenceMap} selected={selected} onToggle={toggleSel} onToggleAll={toggleAll} />
        </TabsContent>
        <TabsContent value="camp_staff">
          <EmployeeTable employees={filtered} isLoading={isLoading} type="camp_staff" deptCodeMap={deptCodeMap} campMap={campMap} locationMap={locationMap} onEdit={setEditing} onHistory={setHistoryEmployee} presenceMap={presenceMap} selected={selected} onToggle={toggleSel} onToggleAll={toggleAll} />
        </TabsContent>
      </Tabs>

      <AddEmployeeDialog open={addOpen} onOpenChange={setAddOpen} type={tab} />
      <EditEmployeeDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        type={editing ? (editing.employee_type as "own" | "supplier" | "camp_staff") : tab}
        employee={editing}
      />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} employee(s)?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the selected employees and all their camp links: check-ins, check-outs, room assignments, transfers, food cancellations and meal records. Their beds will be freed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={(e) => { e.preventDefault(); doDelete(); }}>{deleting ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BulkUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} type={tab} />
      <Dialog open={!!historyEmployee} onOpenChange={open => { if (!open) setHistoryEmployee(null); }}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Employee History · {historyEmployee?.employee_id} · {historyEmployee?.name}</DialogTitle></DialogHeader>
          {historyEmployee && <><p className="text-sm text-muted-foreground">All camps · Current status: {presenceMap[historyEmployee.id]}</p><EmployeeStaysView key={historyEmployee.id} employeeId={historyEmployee.id} /></>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeTable({
  employees,
  isLoading,
  type,
  deptCodeMap,
  campMap,
  locationMap,
  onEdit,
  onHistory,
  presenceMap,
  selected,
  onToggle,
  onToggleAll,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  employees: any[];
  isLoading: boolean;
  type: string;
  deptCodeMap: Record<string, string>;
  campMap: Record<string, string>;
  locationMap: Record<string, { camp: string; block: string; room: string }>;
  onEdit: (emp: any) => void;
  onHistory: (emp: Employee) => void;
  presenceMap: Record<string, string>;
}) {
  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading employees...</div>;
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No {type === "own" ? "own" : type === "supplier" ? "supplier" : "camp staff"} employees found.
      </div>
    );
  }

  const isCampStaff = type === "camp_staff";
  const paged = usePaged(employees);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"><Checkbox checked={employees.length > 0 && employees.every((e) => selected.has(e.id))} onCheckedChange={(v) => onToggleAll(employees.map((e) => e.id), !!v)} aria-label="Select all" /></TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              {isCampStaff ? (
                <>
                  <TableHead>Staff Role</TableHead>
                  <TableHead>Assigned Camp</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Department as per SAP</TableHead>
                  <TableHead>Employee Group</TableHead>
                  <TableHead>{type === "supplier" ? "Supplier" : "Company"}</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Current Location</TableHead>
                  <TableHead>Remarks</TableHead>
                </>
              )}
              <TableHead>Camp No</TableHead>
              <TableHead>Block No</TableHead>
              <TableHead>Room No</TableHead>
              <TableHead>Passport No.</TableHead>
              <TableHead>Iqama No.</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.rows.map((emp) => (
            <TableRow key={emp.id} data-state={selected.has(emp.id) ? "selected" : undefined}>
              <TableCell><Checkbox checked={selected.has(emp.id)} onCheckedChange={() => onToggle(emp.id)} aria-label={`Select ${emp.name}`} /></TableCell>
              <TableCell className="font-medium">{emp.employee_id}</TableCell>
              <TableCell>{emp.name}</TableCell>
              {isCampStaff ? (
                <>
                  <TableCell>
                    <Badge variant="outline" className="font-medium">
                      {emp.staff_role || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>{emp.camp_id ? campMap[emp.camp_id] || "—" : "—"}</TableCell>
                </>
              ) : (
                <>
                  <TableCell>{emp.designation || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                    {emp.department ? (deptCodeMap[emp.department] || emp.department) : "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>{emp.sap_department || "—"}</TableCell>
                  <TableCell>
                    {emp.employee_group ? <Badge variant="outline" className="text-xs">{emp.employee_group}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{type === "supplier" ? emp.supplier_name || "—" : emp.company || "—"}</TableCell>
                  <TableCell>
                    {emp.project ? <Badge variant="secondary" className="text-xs">{emp.project}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{emp.current_location || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={emp.remarks || ""}>{emp.remarks || "—"}</TableCell>
                </>
              )}
              <TableCell>{locationMap[emp.id]?.camp || ""}</TableCell>
              <TableCell>{locationMap[emp.id]?.block || ""}</TableCell>
              <TableCell>{locationMap[emp.id]?.room || ""}</TableCell>
              <TableCell className="font-mono text-xs">{emp.passport_number || "—"}</TableCell>
              <TableCell className="font-mono text-xs">{emp.iqama_number || "—"}</TableCell>
              <TableCell>{emp.phone || "—"}</TableCell>
              <TableCell>{emp.nationality || "—"}</TableCell>
              <TableCell>
                <Badge className={statusColors[presenceMap[emp.id]] || ""} variant="secondary">
                  {presenceMap[emp.id]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(emp)} title="Edit employee">
                  <Pencil size={14} className="mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onHistory(emp)} title="Employee history">
                  <History size={14} className="mr-1" /> History
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <TablePager
        page={paged.page}
        totalPages={paged.totalPages}
        onPageChange={paged.setPage}
        pageSize={paged.pageSize}
        onPageSizeChange={paged.setPageSize}
        totalRows={paged.totalRows}
      />
    </div>
  );
}
