import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  User,
  Briefcase,
  Building2,
  Search,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { useBulkInsertEmployees, type Employee } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";
import { useDesignations } from "@/hooks/useDesignations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "own" | "supplier" | "camp_staff";
}

// 3-Section Unified Schema
const EMPLOYEE_COLUMNS = [
  "employee_id",
  "name",
  "designation",
  "department",
  "phone",
  "email",
  "nationality",
  "passport_number",
  "iqama_number",
  "status",
];

const PROJECT_COLUMNS = [
  "project",
  "company",
  "supplier_name",
  "join_date",
  "contract_end_date",
];

const CAMP_COLUMNS = [
  "camp_name",
  "staff_role",
];

interface ParsedRow {
  data: Partial<Employee> & { _camp_name?: string };
  errors: string[];
}

export default function BulkUploadDialog({ open, onOpenChange, type }: Props) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkInsert = useBulkInsertEmployees();

  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const { data: camps = [] } = useQuery({
    queryKey: ["camps-dropdown"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isCampStaff = type === "camp_staff";
  const typeLabel = type === "own" ? "Company / Own" : type === "supplier" ? "Supplier Contractor" : "Camp Staff";

  // Build ordered template columns matching the 3-step sequence
  const templateColumns = useMemo(() => {
    if (type === "own") {
      return [
        // 1. Employee Details
        "employee_id", "name", "designation", "department", "phone", "email", "nationality", "passport_number", "iqama_number", "status",
        // 2. Project Details
        "project", "company", "join_date", "contract_end_date",
        // 3. Camp Details
        "camp_name",
      ];
    } else if (type === "supplier") {
      return [
        // 1. Employee Details
        "employee_id", "name", "designation", "department", "phone", "email", "nationality", "passport_number", "iqama_number", "status",
        // 2. Project Details
        "project", "company", "supplier_name", "join_date", "contract_end_date",
        // 3. Camp Details
        "camp_name",
      ];
    } else {
      return [
        // 1. Employee Details
        "employee_id", "name", "phone", "email", "nationality", "passport_number", "iqama_number", "status",
        // 2. Project Details
        "company", "join_date", "contract_end_date",
        // 3. Camp Details
        "camp_name", "staff_role",
      ];
    }
  }, [type]);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sample data rows matching the 3 sections
    const sampleRows = type === "own" ? [
      {
        employee_id: "EMP-1001",
        name: "Ahmed Al-Harbi",
        designation: "Project Manager",
        department: "Engineering",
        phone: "+966501234567",
        email: "ahmed@expertise.com",
        nationality: "Saudi",
        passport_number: "A1234567",
        iqama_number: "1023456789",
        status: "active",
        project: "Project Alpha",
        company: "Expertise Holding",
        join_date: "2026-01-15",
        contract_end_date: "2027-01-15",
        camp_name: camps[0]?.name || "Expertise Camp 1",
      },
      {
        employee_id: "EMP-1002",
        name: "Rajesh Kumar",
        designation: "Electrician",
        department: "Maintenance",
        phone: "+966559876543",
        email: "rajesh@expertise.com",
        nationality: "Indian",
        passport_number: "P9876543",
        iqama_number: "2458901234",
        status: "active",
        project: "Tanajib Gas Plant",
        company: "Expertise Holding",
        join_date: "2026-02-01",
        contract_end_date: "2026-12-31",
        camp_name: camps[0]?.name || "Expertise Camp 1",
      },
    ] : type === "supplier" ? [
      {
        employee_id: "SUP-2001",
        name: "Mohammed Tariq",
        designation: "Pipe Fitter",
        department: "Operations",
        phone: "+966541122334",
        email: "tariq@alfalak.com",
        nationality: "Pakistani",
        passport_number: "PK7766554",
        iqama_number: "2345678901",
        status: "active",
        project: "Haradh Pipeline",
        company: "Al-Falak Manpower",
        supplier_name: "Al-Falak Manpower Co.",
        join_date: "2026-01-10",
        contract_end_date: "2026-10-10",
        camp_name: camps[0]?.name || "Expertise Camp 1",
      },
    ] : [
      {
        employee_id: "STF-3001",
        name: "Khalid Mansoor",
        phone: "+966533344556",
        email: "khalid@expertise.com",
        nationality: "Saudi",
        passport_number: "SA889900",
        iqama_number: "1098765432",
        status: "active",
        company: "Expertise Holding",
        join_date: "2026-01-01",
        contract_end_date: "2027-01-01",
        camp_name: camps[0]?.name || "Expertise Camp 1",
        staff_role: "Camp Boss",
      },
    ];

    // Sheet 1: Main Employee Upload Template
    const ws1 = XLSX.utils.json_to_sheet(sampleRows, { header: templateColumns });
    XLSX.utils.book_append_sheet(wb, ws1, "Employees");

    // Sheet 2: Reference - Camps
    if (camps.length > 0) {
      const campRef = camps.map((c) => ({
        camp_name: c.name,
        camp_id: c.id,
      }));
      const wsCamps = XLSX.utils.json_to_sheet(campRef);
      XLSX.utils.book_append_sheet(wb, wsCamps, "Ref - Camps");
    }

    // Sheet 3: Reference - Designations
    if (designations.length > 0) {
      const desigRef = designations.map((d) => ({ designation_name: d.name }));
      const wsDesig = XLSX.utils.json_to_sheet(desigRef);
      XLSX.utils.book_append_sheet(wb, wsDesig, "Ref - Designations");
    }

    // Sheet 4: Reference - Departments
    if (departments.length > 0) {
      const deptRef = departments.map((d) => ({ department_name: d.name }));
      const wsDept = XLSX.utils.json_to_sheet(deptRef);
      XLSX.utils.book_append_sheet(wb, wsDept, "Ref - Departments");
    }

    XLSX.writeFile(wb, `${type}_employees_template.xlsx`);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const normalizeDate = (v: any): string | null => {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "number") {
        const parsed = XLSX.SSF.parse_date_code(v);
        if (!parsed) return null;
        const mm = String(parsed.m).padStart(2, "0");
        const dd = String(parsed.d).padStart(2, "0");
        return `${parsed.y}-${mm}-${dd}`;
      }
      if (v instanceof Date) {
        return v.toISOString().split("T")[0];
      }
      const s = String(v).trim();
      if (!s) return null;
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      return null;
    };

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary", cellDates: true });
        const sheetName = wb.SheetNames.find((s) => s.toLowerCase() === "employees") || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { raw: false });

        if (!rows || rows.length === 0) {
          toast({ title: "Empty Spreadsheet", description: "No employee rows were found in the uploaded file.", variant: "destructive" });
          return;
        }

        const parsed: ParsedRow[] = rows.map((row) => {
          const errors: string[] = [];

          // 1. Employee Details
          const empId = String(
            row.employee_id || row["Employee ID"] || row["Emp ID"] || row.emp_id || ""
          ).trim();

          const name = String(
            row.name || row["Full Name"] || row["Employee Name"] || row.full_name || ""
          ).trim();

          const designation = String(row.designation || row["Designation"] || row.job_title || "").trim();
          const department = String(row.department || row["Department"] || row.dept || "").trim();
          const phone = row.phone || row["Phone"] || row["Phone Number"] ? String(row.phone || row["Phone"] || row["Phone Number"]).trim() : null;
          const email = row.email || row["Email"] || row["Email Address"] ? String(row.email || row["Email"] || row["Email Address"]).trim() : null;
          const nationality = String(row.nationality || row["Nationality"] || "").trim() || null;
          const passportNumber = row.passport_number || row["Passport Number"] || row["Passport"] ? String(row.passport_number || row["Passport Number"] || row["Passport"]).trim() : null;
          const iqamaNumber = row.iqama_number || row["Iqama Number"] || row["Iqama"] || row["National ID"] ? String(row.iqama_number || row["Iqama Number"] || row["Iqama"] || row["National ID"]).trim() : null;
          const status = String(row.status || row["Status"] || "active").trim().toLowerCase();

          // 2. Project Details
          const project = String(row.project || row["Project"] || row.project_name || "").trim() || null;
          const company = String(row.company || row["Company"] || (type === "own" ? "Expertise Holding" : "")).trim() || null;
          const supplierName = String(row.supplier_name || row["Supplier Name"] || row.supplier || "").trim() || null;
          const joinDate = normalizeDate(row.join_date || row["Join Date"] || row["Joining Date"]);
          const contractEndDate = normalizeDate(row.contract_end_date || row["Contract End Date"] || row["Expiry Date"]);

          // 3. Camp Details
          const rawCamp = String(row.camp_name || row["Camp Name"] || row.camp || row.camp_id || row["Camp ID"] || "").trim();
          const staffRole = String(row.staff_role || row["Staff Role"] || row.role || "").trim() || null;

          // Resolve camp_id by name or direct UUID
          let resolvedCampId: string | null = null;
          if (rawCamp) {
            const matchedCamp = camps.find(
              (c) =>
                c.name.toLowerCase() === rawCamp.toLowerCase() ||
                c.id.toLowerCase() === rawCamp.toLowerCase()
            );
            if (matchedCamp) {
              resolvedCampId = matchedCamp.id;
            } else {
              errors.push(`Camp "${rawCamp}" not found`);
            }
          }

          // Validation
          if (!empId) errors.push("Missing Employee ID");
          if (!name) errors.push("Missing Full Name");
          if (type === "supplier" && !supplierName) errors.push("Missing Supplier Name");
          if (type === "camp_staff" && !staffRole) errors.push("Missing Staff Role");
          if (type === "camp_staff" && !resolvedCampId) errors.push("Missing Camp Assignment");

          return {
            data: {
              employee_id: empId,
              name,
              employee_type: type,
              designation: designation || null,
              department: department || null,
              company,
              supplier_name: supplierName,
              phone,
              email,
              nationality,
              passport_number: passportNumber,
              iqama_number: iqamaNumber,
              project,
              join_date: joinDate,
              contract_end_date: contractEndDate,
              staff_role: staffRole,
              camp_id: resolvedCampId,
              _camp_name: rawCamp,
              status: ["active", "inactive", "transferred"].includes(status) ? status : "active",
            },
            errors,
          };
        });

        setParsedRows(parsed);
      } catch (err: any) {
        toast({ title: "Parse Error", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const validRows = useMemo(() => parsedRows.filter((r) => r.errors.length === 0), [parsedRows]);
  const errorRows = useMemo(() => parsedRows.filter((r) => r.errors.length > 0), [parsedRows]);

  // Project breakdown
  const projectStats = useMemo(() => {
    const counts: Record<string, number> = {};
    validRows.forEach((r) => {
      const key = r.data.project || "Unassigned";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [validRows]);

  // Camp breakdown
  const campStats = useMemo(() => {
    const counts: Record<string, number> = {};
    validRows.forEach((r) => {
      const campObj = camps.find((c) => c.id === r.data.camp_id);
      const key = campObj?.name || r.data._camp_name || "Unassigned";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [validRows, camps]);

  const filteredRows = useMemo(() => {
    if (!searchFilter.trim()) return parsedRows;
    const term = searchFilter.toLowerCase();
    return parsedRows.filter(
      (r) =>
        r.data.employee_id?.toLowerCase().includes(term) ||
        r.data.name?.toLowerCase().includes(term) ||
        r.data.project?.toLowerCase().includes(term) ||
        r.data.designation?.toLowerCase().includes(term) ||
        r.data._camp_name?.toLowerCase().includes(term)
    );
  }, [parsedRows, searchFilter]);

  const handleUpload = () => {
    if (validRows.length === 0) return;

    // Clean internal temporary fields
    const payload = validRows.map((r) => {
      const clean = { ...r.data };
      delete clean._camp_name;
      return clean;
    });

    bulkInsert.mutate(payload as any, {
      onSuccess: () => {
        toast({
          title: `🎉 ${validRows.length} Employees Uploaded!`,
          description: `Successfully added ${validRows.length} ${typeLabel} records.`,
        });
        setParsedRows([]);
        setFileName("");
        onOpenChange(false);
      },
    });
  };

  const reset = () => {
    setParsedRows([]);
    setFileName("");
    setSearchFilter("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-blue-950/20 via-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-semibold text-xs bg-primary/10 text-primary border-primary/20">
              <FileSpreadsheet size={13} /> Bulk Employee Registration
            </Badge>
            <Badge variant="outline" className="text-xs uppercase">
              {typeLabel}
            </Badge>
          </div>
          <DialogTitle className="text-base font-bold">
            Bulk Upload {typeLabel} Roster
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload an Excel (.xlsx) file mapped by <strong>Employee Details</strong>, <strong>Project Details</strong>, and <strong>Camp Details</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* 3-Section Flow Banner */}
        <div className="px-5 py-2 border-b bg-muted/15 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2 sm:gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground">
              <User size={13} className="text-primary" /> 1. Employee
            </span>
            <ChevronRight size={12} className="text-muted-foreground/40" />
            <span className="flex items-center gap-1.5 text-foreground">
              <Briefcase size={13} className="text-primary" /> 2. Project
            </span>
            <ChevronRight size={12} className="text-muted-foreground/40" />
            <span className="flex items-center gap-1.5 text-foreground">
              <Building2 size={13} className="text-primary" /> 3. Camp
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Matches Add Employee Wizard layout 1:1
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Action Header Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-dashed rounded-xl p-4 flex flex-col justify-between space-y-2 bg-muted/10 hover:border-primary/50 transition-colors">
              <div>
                <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Download size={14} className="text-primary" /> Step 1: Download Standard Template
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Pre-formatted with 3 sections (Employee, Project, Camp) and includes reference sheets for valid Camps, Departments, and Designations.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 text-xs w-fit">
                <Download size={13} /> Download Template (.xlsx)
              </Button>
            </div>

            <div className="border-2 border-dashed border-primary/40 rounded-xl p-4 flex flex-col justify-between space-y-2 bg-primary/5 hover:bg-primary/10 transition-colors">
              <div>
                <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Upload size={14} className="text-primary" /> Step 2: Upload Completed File
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Accepts .xlsx, .xls, and .csv files. Automatically matches camp names and projects.
                </p>
              </div>
              <div>
                <input
                  ref={fileRef}
                  id="employee-bulk-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFile}
                  className="hidden"
                />
                <Button
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="gap-2 text-xs bg-primary text-primary-foreground font-semibold"
                >
                  <Upload size={13} /> {fileName ? "Replace File" : "Choose Excel File"}
                </Button>
                {fileName && <span className="ml-2 text-xs font-mono text-muted-foreground truncate">{fileName}</span>}
              </div>
            </div>
          </div>

          {parsedRows.length > 0 && (
            <div className="space-y-4 pt-2">
              {/* Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 border rounded-lg bg-background">
                  <span className="text-[11px] text-muted-foreground">Total Rows Found</span>
                  <div className="text-base font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <User size={15} className="text-primary" /> {parsedRows.length}
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-background">
                  <span className="text-[11px] text-muted-foreground">Validation Status</span>
                  <div className="text-base font-bold mt-0.5 flex items-center gap-1.5">
                    {errorRows.length === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs font-semibold">
                        <CheckCircle2 size={15} /> All {validRows.length} Valid
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1 text-xs font-semibold">
                        <AlertCircle size={15} /> {errorRows.length} Errors &bull; {validRows.length} Valid
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-background">
                  <span className="text-[11px] text-muted-foreground">Projects Identified</span>
                  <div className="text-base font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mt-0.5">
                    <Briefcase size={15} /> {projectStats.length} Projects
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-background">
                  <span className="text-[11px] text-muted-foreground">Camps Mapped</span>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <Building2 size={15} /> {campStats.length} Camps
                  </div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, name, project, camp..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={reset} className="text-xs h-8">
                    Clear Table
                  </Button>
                </div>
              </div>

              {/* Preview Table with 3-Section Grouping */}
              <div className="max-h-[340px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0">
                    <TableRow>
                      <TableHead className="w-10 text-xs">#</TableHead>
                      {/* Section 1: Employee */}
                      <TableHead className="text-xs font-bold text-primary">Employee ID</TableHead>
                      <TableHead className="text-xs font-bold text-primary">Name</TableHead>
                      <TableHead className="text-xs font-bold text-primary">Designation</TableHead>
                      <TableHead className="text-xs font-bold text-primary">Passport / Iqama</TableHead>
                      {/* Section 2: Project */}
                      <TableHead className="text-xs font-bold text-blue-600 dark:text-blue-400">Project</TableHead>
                      <TableHead className="text-xs font-bold text-blue-600 dark:text-blue-400">{type === "supplier" ? "Supplier" : "Company"}</TableHead>
                      {/* Section 3: Camp */}
                      <TableHead className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Assigned Camp</TableHead>
                      {isCampStaff && <TableHead className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Staff Role</TableHead>}
                      <TableHead className="text-xs text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.slice(0, 150).map((row, i) => {
                      const campObj = camps.find((c) => c.id === row.data.camp_id);
                      return (
                        <TableRow key={i} className={row.errors.length > 0 ? "bg-destructive/10" : ""}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-xs font-mono font-bold">{row.data.employee_id}</TableCell>
                          <TableCell className="text-xs font-semibold">{row.data.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.data.designation || "—"}</TableCell>
                          <TableCell className="text-xs font-mono text-[11px]">
                            {row.data.passport_number || row.data.iqama_number || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.data.project ? (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                {row.data.project}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {type === "supplier" ? row.data.supplier_name || row.data.company || "—" : row.data.company || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {campObj ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                {campObj.name}
                              </Badge>
                            ) : row.data._camp_name ? (
                              <span className="text-destructive text-xs">{row.data._camp_name} (Unmapped)</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          {isCampStaff && (
                            <TableCell className="text-xs font-semibold">{row.data.staff_role || "—"}</TableCell>
                          )}
                          <TableCell className="text-xs text-right">
                            {row.errors.length > 0 ? (
                              <Badge variant="destructive" className="text-[10px]">
                                {row.errors.join("; ")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                Ready
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {filteredRows.length > 150 && (
                <p className="text-[11px] text-center text-muted-foreground">
                  Showing first 150 of {filteredRows.length} rows. All {validRows.length} valid rows will be uploaded.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { reset(); onOpenChange(false); }}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            onClick={handleUpload}
            disabled={validRows.length === 0 || bulkInsert.isPending}
            size="sm"
            className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {bulkInsert.isPending ? (
              "Uploading..."
            ) : (
              <>
                <CheckCircle2 size={14} /> Upload {validRows.length} Employees
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
