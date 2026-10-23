import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Users, LogIn, LogOut, Filter, Calendar, Building2, Receipt, TrendingUp, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CHECK_IN_REPORT_SELECT, checkInPeriodBounds, buildCheckInPdf, downloadCheckInPdf, type CheckInPeriod, type CheckInReportRecord } from "@/lib/checkInReport";
import { getRoomCategoryLabel, ROOM_CATEGORIES } from "@/constants/roomCategories";
import CostInvoicingTab from "@/components/reports/CostInvoicingTab";
import RevenueReportTab from "@/components/reports/RevenueReportTab";
import DepartmentMonthlyReportTab from "@/components/reports/DepartmentMonthlyReportTab";
import SupplierCostingReportTab from "@/components/reports/SupplierCostingReportTab";

function useEmployeeReport(type?: string) {
  return useQuery({
    queryKey: ["report-employees", type],
    queryFn: async () => {
      let q = supabase.from("employees").select("*").order("created_at", { ascending: false });
      if (type && type !== "all") q = q.eq("employee_type", type);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

function useCheckInReport(from: string, to: string) {
  return useQuery({
    queryKey: ["report-check-ins", from, to],
    queryFn: async () => {
      const records: CheckInReportRecord[] = [];
      for (let offset = 0; ; offset += 1000) {
        let query = supabase.from("check_ins").select(CHECK_IN_REPORT_SELECT)
          .order("check_in_date", { ascending: false }).order("id")
          .range(offset, offset + 999);
        if (from) query = query.gte("check_in_date", `${from}T00:00:00`);
        if (to) query = query.lt("check_in_date", `${format(new Date(new Date(`${to}T00:00:00`).getTime() + 86400000), "yyyy-MM-dd")}T00:00:00`);
        const { data, error } = await query;
        if (error) throw error;
        records.push(...(data as unknown as CheckInReportRecord[]));
        if (data.length < 1000) break;
      }
      return records;
    },
  });
}

function useCheckOutReport() {
  return useQuery({
    queryKey: ["report-check-outs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_outs")
        .select("*, employees(name, employee_id, employee_type, supplier_name, designation, company, project), rooms(room_number, category), camps(name)")
        .order("check_out_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });
}

function useCampsForFilter() {
  return useQuery({
    queryKey: ["camps-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export default function Reports() {
  const [tab, setTab] = useState("employees");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground text-sm">View and export employee, check-in, and check-out reports</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="employees" className="gap-2">
            <Users size={16} /> Employee Report
          </TabsTrigger>
          <TabsTrigger value="checkins" className="gap-2">
            <LogIn size={16} /> Check-In Report
          </TabsTrigger>
          <TabsTrigger value="checkouts" className="gap-2">
            <LogOut size={16} /> Check-Out Report
          </TabsTrigger>
          <TabsTrigger value="invoicing" className="gap-2">
            <Receipt size={16} /> Cost / Invoicing
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <TrendingUp size={16} /> Revenue
          </TabsTrigger>
          <TabsTrigger value="dept-monthly" className="gap-2">
            <Receipt size={16} /> Department Monthly
          </TabsTrigger>
          <TabsTrigger value="supplier-costing" className="gap-2">
            <Truck size={16} /> Supplier Costing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees"><EmployeeReportTab /></TabsContent>
        <TabsContent value="checkins"><CheckInReportTab /></TabsContent>
        <TabsContent value="checkouts"><CheckOutReportTab /></TabsContent>
        <TabsContent value="invoicing"><CostInvoicingTab /></TabsContent>
        <TabsContent value="revenue"><RevenueReportTab /></TabsContent>
        <TabsContent value="dept-monthly"><DepartmentMonthlyReportTab /></TabsContent>
        <TabsContent value="supplier-costing"><SupplierCostingReportTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function EmployeeReportTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  const { data: employees = [], isLoading } = useEmployeeReport(typeFilter);

  const suppliers = useMemo(() => {
    const set = new Set(employees.filter(e => e.supplier_name).map(e => e.supplier_name!));
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter(e => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (supplierFilter !== "all" && e.supplier_name !== supplierFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return e.name.toLowerCase().includes(s) || e.employee_id.toLowerCase().includes(s) || (e.supplier_name || "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [employees, search, statusFilter, supplierFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    active: filtered.filter(e => e.status === "active").length,
    inactive: filtered.filter(e => e.status === "inactive").length,
    transferred: filtered.filter(e => e.status === "transferred").length,
  }), [filtered]);

  const handleExport = () => {
    const headers = ["Employee ID", "Name", "Type", "Designation", "Department", "Supplier", "Nationality", "Status", "Phone", "Project"];
    const rows = filtered.map(e => [e.employee_id, e.name, e.employee_type, e.designation || "", e.department || "", e.supplier_name || "", e.nationality || "", e.status, e.phone || "", e.project || ""]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `employee-report-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} icon={<Users size={16} />} />
        <StatCard label="Active" value={stats.active} icon={<Users size={16} />} color="text-green-600" />
        <StatCard label="Inactive" value={stats.inactive} icon={<Users size={16} />} color="text-red-600" />
        <StatCard label="Transferred" value={stats.transferred} icon={<Users size={16} />} color="text-yellow-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, ID, or supplier..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="own">Own</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
          </SelectContent>
        </Select>
        {(typeFilter === "supplier" || typeFilter === "all") && suppliers.length > 0 && (
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Supplier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" onClick={handleExport}><Download size={16} className="mr-1" /> Export CSV</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="border rounded-lg max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Nationality</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.employee_id}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell><Badge variant="outline">{e.employee_type}</Badge></TableCell>
                  <TableCell>{e.designation || "—"}</TableCell>
                  <TableCell>{e.department || "—"}</TableCell>
                  <TableCell>{e.supplier_name || "—"}</TableCell>
                  <TableCell>{e.nationality || "—"}</TableCell>
                  <TableCell>{e.project || "—"}</TableCell>
                  <TableCell>
                    <Badge className={
                      e.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                      e.status === "inactive" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    } variant="secondary">{e.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {employees.length} employees</p>
    </div>
  );
}

function CheckInReportTab() {
  const [search, setSearch] = useState("");
  const [campFilter, setCampFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [periodMode, setPeriodMode] = useState<CheckInPeriod>("monthly");
  const [reportDay, setReportDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportMonth, setReportMonth] = useState(format(new Date(), "yyyy-MM"));
  const bounds = checkInPeriodBounds(periodMode, reportDay, reportMonth, dateFrom, dateTo);
  const { data: checkIns = [], isLoading, isError, refetch } = useCheckInReport(bounds.from, bounds.to);
  const invalidRange = Boolean(bounds.from && bounds.to && bounds.from > bounds.to);
  const { data: camps = [] } = useCampsForFilter();

  const { suppliers, designations, categories, companies, projects } = useMemo(() => {
    const campFiltered = campFilter === "all" ? checkIns : checkIns.filter((ci: any) => ci.camp_id === campFilter);
    return {
      suppliers: [...new Set(campFiltered.map((ci: any) => ci.employees?.supplier_name).filter(Boolean))].sort() as string[],
      designations: [...new Set(campFiltered.map((ci: any) => ci.employees?.designation).filter(Boolean))].sort() as string[],
      categories: [...new Set(campFiltered.map((ci: any) => ci.rooms?.category).filter(Boolean))].sort() as string[],
      companies: [...new Set(campFiltered.map((ci: any) => ci.employees?.company).filter(Boolean))].sort() as string[],
      projects: [...new Set(campFiltered.map((ci: any) => ci.project || ci.employees?.project).filter(Boolean))].sort() as string[],
    };
  }, [checkIns, campFilter]);

  const filtered = useMemo(() => {
    return checkIns.filter((ci: any) => {
      if (campFilter !== "all" && ci.camp_id !== campFilter) return false;
      if (typeFilter !== "all" && ci.employees?.employee_type !== typeFilter) return false;
      if (supplierFilter !== "all" && ci.employees?.supplier_name !== supplierFilter) return false;
      if (designationFilter !== "all" && ci.employees?.designation !== designationFilter) return false;
      if (categoryFilter !== "all" && ci.rooms?.category !== categoryFilter) return false;
      if (companyFilter !== "all" && ci.employees?.company !== companyFilter) return false;
      if (projectFilter !== "all" && (ci.project || ci.employees?.project) !== projectFilter) return false;
      if (invalidRange) return false;
      if (search) {
        const s = search.toLowerCase();
        return (ci.employees?.name || "").toLowerCase().includes(s) || (ci.employees?.employee_id || "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [checkIns, search, campFilter, typeFilter, supplierFilter, designationFilter, categoryFilter, companyFilter, projectFilter, invalidRange]);

  const periodLabel = `${bounds.from || "Beginning"} to ${bounds.to || "Present"}`;
  const exportPdf = () => {
    const filterLabels = [
      campFilter === "all" ? "All Camps" : camps.find(c => c.id === campFilter)?.name || "Camp",
      typeFilter !== "all" ? `Type: ${typeFilter}` : "",
      supplierFilter !== "all" ? `Supplier: ${supplierFilter}` : "",
      designationFilter !== "all" ? `Designation: ${designationFilter}` : "",
      companyFilter !== "all" ? `Company: ${companyFilter}` : "",
      projectFilter !== "all" ? `Project: ${projectFilter}` : "",
      categoryFilter !== "all" ? `Category: ${getRoomCategoryLabel(categoryFilter)}` : "",
      search ? `Search: ${search}` : "",
    ].filter(Boolean);
    downloadCheckInPdf(buildCheckInPdf(filtered, periodLabel, filterLabels).output("blob"), `check-in-${bounds.from || "all"}-to-${bounds.to || "present"}.pdf`);
  };

  const handleExport = () => {
    const headers = ["Date", "Employee ID", "Name", "Type", "Company", "Supplier", "Designation", "Project", "Room", "Room Category", "Camp", "Department", "Contact", "Food Required"];
    const rows = filtered.map((ci: any) => [
      format(new Date(ci.check_in_date), "yyyy-MM-dd HH:mm"),
      ci.employees?.employee_id || "", ci.employees?.name || "", ci.employees?.employee_type || "",
      ci.employees?.company || "", ci.employees?.supplier_name || "", ci.employees?.designation || "",
      ci.project || ci.employees?.project || "",
      ci.rooms?.room_number || "", getRoomCategoryLabel(ci.rooms?.category || ""), ci.camps?.name || "", ci.employees?.department || "", ci.employees?.phone || "", ci.food_required === false ? "No" : "Yes"
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    downloadCheckInPdf(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), `check-in-${bounds.from || "all"}-to-${bounds.to || "present"}.csv`);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Check-Ins" value={filtered.length} icon={<LogIn size={16} />} />
        <StatCard label="Own" value={filtered.filter((c: any) => c.employees?.employee_type === "own").length} icon={<Users size={16} />} color="text-blue-600" />
        <StatCard label="Supplier" value={filtered.filter((c: any) => c.employees?.employee_type === "supplier").length} icon={<Users size={16} />} color="text-orange-600" />
        <StatCard label="Today" value={filtered.filter((c: any) => format(new Date(c.check_in_date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length} icon={<Calendar size={16} />} color="text-green-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={campFilter} onValueChange={v => { setCampFilter(v); setSupplierFilter("all"); setDesignationFilter("all"); setCategoryFilter("all"); setCompanyFilter("all"); setProjectFilter("all"); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Camp" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Camps</SelectItem>
            {camps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="own">Own</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
          </SelectContent>
        </Select>
        {suppliers.length > 0 && (
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Supplier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {designations.length > 0 && (
          <Select value={designationFilter} onValueChange={setDesignationFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Designation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Designations</SelectItem>
              {designations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Room Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{getRoomCategoryLabel(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {companies.length > 0 && (
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {projects.length > 0 && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1" role="group" aria-label="Report period">
          {([ ["daily", "Date-wise"], ["monthly", "Month-wise"], ["range", "Date Range"] ] as const).map(([value, label]) => (
            <Button key={value} variant={periodMode === value ? "default" : "outline"} aria-pressed={periodMode === value} onClick={() => setPeriodMode(value)}>{label}</Button>
          ))}
        </div>
        {periodMode === "daily" && <Input aria-label="Check-in report date" type="date" className="w-[170px]" value={reportDay} onChange={e => { if (e.target.value) setReportDay(e.target.value); }} />}
        {periodMode === "monthly" && <Input aria-label="Check-in report month" type="month" className="w-[170px]" value={reportMonth} onChange={e => { if (e.target.value) setReportMonth(e.target.value); }} />}
        {periodMode === "range" && <>
          <Input aria-label="Check-in from date" type="date" className="w-[160px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input aria-label="Check-in to date" type="date" className="w-[160px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </>}
        <Button disabled={isLoading || isError || !filtered.length || invalidRange} variant="outline" onClick={handleExport}><Download size={16} className="mr-1" /> Export CSV</Button>
        <Button disabled={isLoading || isError || !filtered.length || invalidRange} onClick={exportPdf}><Download size={16} className="mr-1" /> Download Check-In PDF</Button>
      </div>

      <h3 className="font-semibold">Check-In Report — {periodLabel}</h3>
      {invalidRange && <p role="alert" className="text-destructive">From date must be on or before to date.</p>}
      {isError ? <div role="alert">Unable to load check-in records. <Button variant="outline" onClick={() => refetch()}>Retry</Button></div> : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No check-in records found.</div>
      ) : (
        <div className="border rounded-lg max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Camp</TableHead>
                <TableHead>Department / Project</TableHead>
                <TableHead>Food</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ci: any) => (
                <TableRow key={ci.id}>
                  <TableCell className="text-xs">{format(new Date(ci.check_in_date), "dd MMM yyyy, HH:mm")}</TableCell>
                  <TableCell className="font-mono text-xs">{ci.employees?.employee_id || "—"}</TableCell>
                  <TableCell className="font-medium">{ci.employees?.name || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{ci.employees?.employee_type || "—"}</Badge></TableCell>
                  <TableCell>{ci.employees?.supplier_name || "—"}</TableCell>
                  <TableCell>{ci.employees?.designation || "—"}</TableCell>
                  <TableCell>{ci.rooms?.room_number || "—"}</TableCell>
                  <TableCell className="text-xs">{getRoomCategoryLabel(ci.rooms?.category || "")}</TableCell>
                  <TableCell>{ci.camps?.name || "—"}</TableCell>
                  <TableCell>{ci.employees?.department || "—"}<div className="text-xs text-muted-foreground">{ci.project || ci.employees?.project || "—"}</div></TableCell>
                  <TableCell>{ci.food_required === false ? "Not required" : "Required"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Showing {filtered.length} records</p>
    </div>
  );
}

function CheckOutReportTab() {
  const [search, setSearch] = useState("");
  const [campFilter, setCampFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: checkOuts = [], isLoading } = useCheckOutReport();
  const { data: camps = [] } = useCampsForFilter();

  const { suppliers, designations, categories, companies, projects } = useMemo(() => {
    const campFiltered = campFilter === "all" ? checkOuts : checkOuts.filter((co: any) => co.camp_id === campFilter);
    return {
      suppliers: [...new Set(campFiltered.map((co: any) => co.employees?.supplier_name).filter(Boolean))].sort() as string[],
      designations: [...new Set(campFiltered.map((co: any) => co.employees?.designation).filter(Boolean))].sort() as string[],
      categories: [...new Set(campFiltered.map((co: any) => co.rooms?.category).filter(Boolean))].sort() as string[],
      companies: [...new Set(campFiltered.map((co: any) => co.employees?.company).filter(Boolean))].sort() as string[],
      projects: [...new Set(campFiltered.map((co: any) => co.employees?.project).filter(Boolean))].sort() as string[],
    };
  }, [checkOuts, campFilter]);

  const filtered = useMemo(() => {
    return checkOuts.filter((co: any) => {
      if (campFilter !== "all" && co.camp_id !== campFilter) return false;
      if (typeFilter !== "all" && co.employees?.employee_type !== typeFilter) return false;
      if (supplierFilter !== "all" && co.employees?.supplier_name !== supplierFilter) return false;
      if (designationFilter !== "all" && co.employees?.designation !== designationFilter) return false;
      if (categoryFilter !== "all" && co.rooms?.category !== categoryFilter) return false;
      if (companyFilter !== "all" && co.employees?.company !== companyFilter) return false;
      if (projectFilter !== "all" && co.employees?.project !== projectFilter) return false;
      if (dateFrom && co.check_out_date < dateFrom) return false;
      if (dateTo && co.check_out_date > dateTo + "T23:59:59") return false;
      if (search) {
        const s = search.toLowerCase();
        return (co.employees?.name || "").toLowerCase().includes(s) || (co.employees?.employee_id || "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [checkOuts, search, campFilter, typeFilter, supplierFilter, designationFilter, categoryFilter, companyFilter, projectFilter, dateFrom, dateTo]);

  const handleExport = () => {
    const headers = ["Date", "Employee ID", "Name", "Type", "Company", "Supplier", "Designation", "Project", "Room", "Room Category", "Camp", "Assets Returned", "Damage Remarks", "Clearance Notes", "Feedback"];
    const rows = filtered.map((co: any) => [
      format(new Date(co.check_out_date), "yyyy-MM-dd HH:mm"),
      co.employees?.employee_id || "", co.employees?.name || "", co.employees?.employee_type || "",
      co.employees?.company || "", co.employees?.supplier_name || "", co.employees?.designation || "",
      co.employees?.project || "",
      co.rooms?.room_number || "", getRoomCategoryLabel(co.rooms?.category || ""), co.camps?.name || "",
      co.assets_returned ? "Yes" : "No", co.damage_remarks || "", co.clearance_notes || "", co.feedback || ""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `checkout-report-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Check-Outs" value={filtered.length} icon={<LogOut size={16} />} />
        <StatCard label="Own" value={filtered.filter((c: any) => c.employees?.employee_type === "own").length} icon={<Users size={16} />} color="text-blue-600" />
        <StatCard label="Supplier" value={filtered.filter((c: any) => c.employees?.employee_type === "supplier").length} icon={<Users size={16} />} color="text-orange-600" />
        <StatCard label="Assets Not Returned" value={filtered.filter((c: any) => !c.assets_returned).length} icon={<Filter size={16} />} color="text-red-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={campFilter} onValueChange={v => { setCampFilter(v); setSupplierFilter("all"); setDesignationFilter("all"); setCategoryFilter("all"); setCompanyFilter("all"); setProjectFilter("all"); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Camp" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Camps</SelectItem>
            {camps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="own">Own</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
          </SelectContent>
        </Select>
        {suppliers.length > 0 && (
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Supplier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {designations.length > 0 && (
          <Select value={designationFilter} onValueChange={setDesignationFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Designation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Designations</SelectItem>
              {designations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Room Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{getRoomCategoryLabel(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {companies.length > 0 && (
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {projects.length > 0 && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" className="w-[160px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
        <Input type="date" className="w-[160px]" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
        <Button variant="outline" onClick={handleExport}><Download size={16} className="mr-1" /> Export CSV</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No check-out records found.</div>
      ) : (
        <div className="border rounded-lg max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Camp</TableHead>
                <TableHead>Assets Returned</TableHead>
                <TableHead>Damage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((co: any) => (
                <TableRow key={co.id}>
                  <TableCell className="text-xs">{format(new Date(co.check_out_date), "dd MMM yyyy, HH:mm")}</TableCell>
                  <TableCell className="font-mono text-xs">{co.employees?.employee_id || "—"}</TableCell>
                  <TableCell className="font-medium">{co.employees?.name || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{co.employees?.employee_type || "—"}</Badge></TableCell>
                  <TableCell>{co.employees?.supplier_name || "—"}</TableCell>
                  <TableCell>{co.employees?.designation || "—"}</TableCell>
                  <TableCell>{co.rooms?.room_number || "—"}</TableCell>
                  <TableCell className="text-xs">{getRoomCategoryLabel(co.rooms?.category || "")}</TableCell>
                  <TableCell>{co.camps?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={co.assets_returned ? "secondary" : "destructive"}>
                      {co.assets_returned ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{co.damage_remarks || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Showing {filtered.length} records</p>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
