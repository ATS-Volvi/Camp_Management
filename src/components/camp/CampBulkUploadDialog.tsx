import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { useBulkInsertEmployees, type Employee } from "@/hooks/useEmployees";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
}

type EmployeeType = "own" | "supplier";

const TEMPLATE_COLUMNS: Record<EmployeeType, string[]> = {
  own: [
    "employee_id", "name", "designation", "department", "company", "project",
    "phone", "email", "nationality", "passport_number", "iqama_number",
    "join_date", "contract_end_date",
  ],
  supplier: [
    "employee_id", "name", "supplier_name", "designation", "department", "company", "project",
    "phone", "email", "nationality", "passport_number", "iqama_number",
    "join_date", "contract_end_date",
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
    const ws = XLSX.utils.aoa_to_sheet([columns]);
    // Set column widths
    ws["!cols"] = columns.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${employeeType}_employees`);
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
        const empId = String(row.employee_id || "").trim();
        const name = String(row.name || "").trim();
        if (!empId) errors.push("Missing employee_id");
        if (!name) errors.push("Missing name");
        if (employeeType === "supplier" && !String(row.supplier_name || "").trim()) {
          errors.push("Missing supplier_name");
        }

        return {
          data: {
            employee_id: empId,
            name,
            employee_type: employeeType,
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
            join_date: row.join_date || null,
            contract_end_date: row.contract_end_date || null,
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
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Upload Employees — {campName}</DialogTitle>
          <DialogDescription>
            Upload employees for this camp. They will be automatically linked to <strong>{campName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Employee Type</Label>
            <Select value={employeeType} onValueChange={(v) => { setEmployeeType(v as EmployeeType); reset(); }}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="own">Own Employees</SelectItem>
                <SelectItem value="supplier">Supplier Employees</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 flex-1">
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
                    {employeeType === "supplier" && <TableHead>Supplier</TableHead>}
                    <TableHead>Project</TableHead>
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
                      {employeeType === "supplier" && <TableCell>{row.data.supplier_name || "—"}</TableCell>}
                      <TableCell>{row.data.project || "—"}</TableCell>
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
