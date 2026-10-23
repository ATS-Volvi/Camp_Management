import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Upload, Users, Building2, Wrench } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AddEmployeeDialog from "@/components/employees/AddEmployeeDialog";
import BulkUploadDialog from "@/components/employees/BulkUploadDialog";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  transferred: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

type EmployeeTab = "own" | "supplier" | "camp_staff";

export default function EmployeeMaster() {
  const [tab, setTab] = useState<EmployeeTab>("own");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data: employees = [], isLoading } = useEmployees(
    tab === "camp_staff" ? "camp_staff" : tab
  );
  const { data: departments = [] } = useDepartments();

  const { data: camps = [] } = useQuery({
    queryKey: ["camps-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const campMap = useMemo(() => {
    const map: Record<string, string> = {};
    camps.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [camps]);

  const deptCodeMap = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach((d) => { map[d.name] = d.code; });
    return map;
  }, [departments]);

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      (e.designation || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.supplier_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.staff_role || "").toLowerCase().includes(search.toLowerCase())
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
              {filtered.filter((e) => e.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 size={16} /> Inactive / Transferred
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">
              {filtered.filter((e) => e.status !== "active").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as EmployeeTab); setSearch(""); }}>
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
          <EmployeeTable employees={filtered} isLoading={isLoading} type="own" deptCodeMap={deptCodeMap} campMap={campMap} />
        </TabsContent>
        <TabsContent value="supplier">
          <EmployeeTable employees={filtered} isLoading={isLoading} type="supplier" deptCodeMap={deptCodeMap} campMap={campMap} />
        </TabsContent>
        <TabsContent value="camp_staff">
          <EmployeeTable employees={filtered} isLoading={isLoading} type="camp_staff" deptCodeMap={deptCodeMap} campMap={campMap} />
        </TabsContent>
      </Tabs>

      <AddEmployeeDialog open={addOpen} onOpenChange={setAddOpen} type={tab} />
      <BulkUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} type={tab} />
    </div>
  );
}

function EmployeeTable({
  employees,
  isLoading,
  type,
  deptCodeMap,
  campMap,
}: {
  employees: any[];
  isLoading: boolean;
  type: string;
  deptCodeMap: Record<string, string>;
  campMap: Record<string, string>;
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

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
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
                <TableHead>{type === "supplier" ? "Supplier" : "Company"}</TableHead>
                <TableHead>Project</TableHead>
              </>
            )}
            <TableHead>Passport No.</TableHead>
            <TableHead>Iqama No.</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Nationality</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => (
            <TableRow key={emp.id}>
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
                  <TableCell>{type === "supplier" ? emp.supplier_name || "—" : emp.company || "—"}</TableCell>
                  <TableCell>
                    {emp.project ? <Badge variant="secondary" className="text-xs">{emp.project}</Badge> : "—"}
                  </TableCell>
                </>
              )}
              <TableCell className="font-mono text-xs">{emp.passport_number || "—"}</TableCell>
              <TableCell className="font-mono text-xs">{emp.iqama_number || "—"}</TableCell>
              <TableCell>{emp.phone || "—"}</TableCell>
              <TableCell>{emp.nationality || "—"}</TableCell>
              <TableCell>
                <Badge className={statusColors[emp.status] || ""} variant="secondary">
                  {emp.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
