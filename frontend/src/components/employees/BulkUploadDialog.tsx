import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { useBulkInsertEmployees, type Employee } from "@/hooks/useEmployees";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "own" | "supplier" | "camp_staff";
}

const COMMON_COLUMNS = ["employee_id", "name", "designation", "department", "phone", "email", "nationality", "passport_number", "iqama_number", "join_date", "contract_end_date"];

const TYPE_CONFIG: Record<string, { label: string; extraColumns: string[]; employeeType: string }> = {
  own: {
    label: "Own Employees",
    extraColumns: ["company", "project"],
    employeeType: "own",
  },
  supplier: {
    label: "Supplier Employees",
    extraColumns: ["company", "supplier_name", "project"],
    employeeType: "supplier",
  },
  camp_staff: {
    label: "Camp Staff",
    extraColumns: ["staff_role", "camp_id"],
    employeeType: "camp_staff",
  },
};

interface ParsedRow {
  data: Partial<Employee>;
  errors: string[];
}

export default function BulkUploadDialog({ open, onOpenChange, type }: Props) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkInsert = useBulkInsertEmployees();

  const config = TYPE_CONFIG[type];
  const templateColumns = [...COMMON_COLUMNS, ...config.extraColumns];

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([templateColumns]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.label);
    XLSX.writeFile(wb, `${type}_employees_template.xlsx`);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const normalizeDate = (v: any): string | null => {
      if (v === null || v === undefined || v === "") return null;
      // Excel serial number
      if (typeof v === "number") {
        const parsed = XLSX.SSF.parse_date_code(v);
        if (!parsed) return null;
        const mm = String(parsed.m).padStart(2, "0");
        const dd = String(parsed.d).padStart(2, "0");
        return `${parsed.y}-${mm}-${dd}`;
      }
      // JS Date object
      if (v instanceof Date) {
        return v.toISOString().split("T")[0];
      }
      // String — try to parse
      const s = String(v).trim();
      if (!s) return null;
      // Already ISO YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      return null;
    };

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { raw: false });

      const parsed: ParsedRow[] = rows.map((row) => {
        const errors: string[] = [];
        const empId = String(row.employee_id || "").trim();
        const name = String(row.name || "").trim();
        if (!empId) errors.push("Missing employee_id");
        if (!name) errors.push("Missing name");
        if (type === "supplier" && !String(row.supplier_name || "").trim()) errors.push("Missing supplier_name");
        if (type === "camp_staff" && !String(row.staff_role || "").trim()) errors.push("Missing staff_role");

        return {
          data: {
            employee_id: empId,
            name,
            employee_type: config.employeeType,
            designation: row.designation || null,
            department: row.department || null,
            company: row.company || null,
            supplier_name: row.supplier_name || null,
            phone: row.phone ? String(row.phone) : null,
            email: row.email || null,
            nationality: row.nationality || null,
            passport_number: row.passport_number ? String(row.passport_number) : null,
            iqama_number: row.iqama_number ? String(row.iqama_number) : null,
            project: row.project || null,
            join_date: normalizeDate(row.join_date),
            contract_end_date: normalizeDate(row.contract_end_date),
            staff_role: row.staff_role || null,
            camp_id: row.camp_id || null,
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
        setParsedRows([]);
        setFileName("");
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
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Upload {config.label}</DialogTitle>
          <DialogDescription>Upload an Excel or CSV file with employee data. Download the template first for the correct format.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download size={16} className="mr-1" /> Download Template
          </Button>
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
        </div>

        {parsedRows.length > 0 && (
          <>
            <div className="flex gap-3 text-sm">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 size={14} /> {validRows.length} valid
              </Badge>
              {errorRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle size={14} /> {errorRows.length} errors
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-md max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Passport No.</TableHead>
                    <TableHead>Iqama No.</TableHead>
                    {type === "supplier" && <TableHead>Supplier</TableHead>}
                    {type === "camp_staff" && <TableHead>Staff Role</TableHead>}
                    {type === "own" && <TableHead>Company</TableHead>}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i} className={row.errors.length > 0 ? "bg-destructive/10" : ""}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>{row.data.employee_id}</TableCell>
                      <TableCell>{row.data.name}</TableCell>
                      <TableCell>{row.data.designation || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.data.passport_number || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.data.iqama_number || "—"}</TableCell>
                      {type === "supplier" && <TableCell>{row.data.supplier_name || "—"}</TableCell>}
                      {type === "camp_staff" && <TableCell>{row.data.staff_role || "—"}</TableCell>}
                      {type === "own" && <TableCell>{row.data.company || "—"}</TableCell>}
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <span className="text-destructive text-xs">{row.errors.join(", ")}</span>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Ready</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button
            onClick={handleUpload}
            disabled={validRows.length === 0 || bulkInsert.isPending}
          >
            <Upload size={16} className="mr-1" />
            {bulkInsert.isPending ? "Uploading..." : `Upload ${validRows.length} Employees`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
