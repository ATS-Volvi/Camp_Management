import { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle, CheckCircle2, User, Briefcase, Building2, ChevronRight, FileSpreadsheet } from "lucide-react";
import { useBulkInsertEmployees, type Employee } from "@/hooks/useEmployees";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
}

type EmployeeType = "own" | "supplier";

// 3-Section Unified Schema matching AddEmployeeDialog
const TEMPLATE_COLUMNS: Record<EmployeeType, string[]> = {
  own: [
    // 1. Employee Details
    "employee_id", "name", "designation", "department", "phone", "email", "nationality", "passport_number", "iqama_number", "status",
    // 2. Project Details
    "project", "company", "join_date", "contract_end_date",
    // 3. Camp Details
    "camp_name",
  ],
  supplier: [
    // 1. Employee Details
    "employee_id", "name", "designation", "department", "phone", "email", "nationality", "passport_number", "iqama_number", "status",
    // 2. Project Details
    "project", "company", "supplier_name", "join_date", "contract_end_date",
    // 3. Camp Details
    "camp_name",
  ],
};

interface ParsedRow {
  data: Partial<Employee>;
  errors: string[];
}

export default function CampBulkUploadDialog({ open, onOpenChange, campId, campName }: Props) {
  const [employeeType, setEmployeeType] = useState<EmployeeType>("own");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkInsert = useBulkInsertEmployees();

  const columns = TEMPLATE_COLUMNS[employeeType];

  const downloadTemplate = () => {
    const sampleRows = employeeType === "own" ? [
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
        camp_name: campName,
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
        camp_name: campName,
      },
    ] : [
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
        camp_name: campName,
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: columns });
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    const safeName = campName.replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(wb, `${safeName}_${employeeType}_employees_template.xlsx`);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

      const parsed: ParsedRow[] = rows.map((row) => {
        const errors: string[] = [];
        const empId = String(row.employee_id || row["Employee ID"] || row.emp_id || "").trim();
        const name = String(row.name || row["Full Name"] || row["Employee Name"] || "").trim();
        if (!empId) errors.push("Missing employee_id");
        if (!name) errors.push("Missing name");
        if (employeeType === "supplier" && !String(row.supplier_name || row["Supplier Name"] || "").trim()) {
          errors.push("Missing supplier_name");
        }

        return {
          data: {
            employee_id: empId,
            name,
            employee_type: employeeType,
            designation: row.designation || row["Designation"] || null,
            department: row.department || row["Department"] || null,
            company: row.company || row["Company"] || (employeeType === "own" ? "Expertise Holding" : null),
            supplier_name: row.supplier_name || row["Supplier Name"] || null,
            phone: row.phone || row["Phone"] ? String(row.phone || row["Phone"]).trim() : null,
            email: row.email || row["Email"] || null,
            nationality: row.nationality || row["Nationality"] || null,
            passport_number: row.passport_number || row["Passport Number"] ? String(row.passport_number || row["Passport Number"]).trim() : null,
            iqama_number: row.iqama_number || row["Iqama Number"] ? String(row.iqama_number || row["Iqama Number"]).trim() : null,
            project: row.project || row["Project"] || null,
            join_date: row.join_date || row["Join Date"] || null,
            contract_end_date: row.contract_end_date || row["Contract End Date"] || null,
            camp_id: campId,
            status: "active",
          },
          errors,
        };
      });
      setParsedRows(parsed);
    };
    reader.readAsBinaryString(file);
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const errorRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleUpload = () => {
    if (validRows.length === 0) return;
    bulkInsert.mutate(validRows.map((r) => r.data), {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  const reset = () => {
    setParsedRows([]);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-blue-950/20 via-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-semibold text-xs bg-primary/10 text-primary border-primary/20">
              <FileSpreadsheet size={13} /> Camp Roster Bulk Import
            </Badge>
            <Badge variant="outline" className="text-xs">
              {campName}
            </Badge>
          </div>
          <DialogTitle className="text-base font-bold">Bulk Upload Employees — {campName}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload employees assigned to <strong>{campName}</strong> with <strong>Employee</strong>, <strong>Project</strong>, and <strong>Camp</strong> details.
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
              <Building2 size={13} className="text-primary" /> 3. Camp ({campName})
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap p-3 rounded-lg border bg-muted/10">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Employee Type</Label>
              <Select value={employeeType} onValueChange={(v) => { setEmployeeType(v as EmployeeType); reset(); }}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own" className="text-xs">Own Employees</SelectItem>
                  <SelectItem value="supplier" className="text-xs">Supplier Employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 flex-1">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-xs h-8 gap-1.5">
                <Download size={13} /> Download Template (.xlsx)
              </Button>
              <div className="flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFile}
                  className="hidden"
                  id="camp-bulk-file"
                />
                <Button
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold"
                >
                  <Upload size={13} /> {fileName ? "Change File" : "Choose Excel File"}
                </Button>
                {fileName && <span className="ml-2 text-xs font-mono text-muted-foreground">{fileName}</span>}
              </div>
            </div>
          </div>

          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex gap-3 text-xs">
                <Badge variant="secondary" className="gap-1 font-semibold">
                  <CheckCircle2 size={13} /> {validRows.length} valid
                </Badge>
                {errorRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1 font-semibold">
                    <AlertCircle size={13} /> {errorRows.length} errors
                  </Badge>
                )}
              </div>

              <div className="max-h-[350px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0">
                    <TableRow>
                      <TableHead className="w-10 text-xs">#</TableHead>
                      <TableHead className="text-xs font-bold text-primary">Employee ID</TableHead>
                      <TableHead className="text-xs font-bold text-primary">Name</TableHead>
                      <TableHead className="text-xs font-bold text-primary">Designation</TableHead>
                      <TableHead className="text-xs font-bold text-primary">Passport / Iqama</TableHead>
                      <TableHead className="text-xs font-bold text-blue-600 dark:text-blue-400">Project</TableHead>
                      <TableHead className="text-xs font-bold text-blue-600 dark:text-blue-400">{employeeType === "supplier" ? "Supplier" : "Company"}</TableHead>
                      <TableHead className="text-xs text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, i) => (
                      <TableRow key={i} className={row.errors.length > 0 ? "bg-destructive/10" : ""}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-xs font-mono font-bold">{row.data.employee_id}</TableCell>
                        <TableCell className="text-xs font-semibold">{row.data.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.data.designation || "—"}</TableCell>
                        <TableCell className="text-xs font-mono text-[11px]">{row.data.passport_number || row.data.iqama_number || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {row.data.project ? (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                              {row.data.project}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {employeeType === "supplier" ? row.data.supplier_name || "—" : row.data.company || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.errors.length > 0 ? (
                            <Badge variant="destructive" className="text-[10px]">{row.errors.join(", ")}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Ready</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }} className="text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={validRows.length === 0 || bulkInsert.isPending}
            size="sm"
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <Upload size={14} />
            {bulkInsert.isPending ? "Uploading..." : `Upload ${validRows.length} Employees`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
