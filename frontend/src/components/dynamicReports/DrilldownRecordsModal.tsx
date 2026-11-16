import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  Search,
  Users,
  Download,
  X,
  Building,
  Tag,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

interface DrilldownRecordsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  records: Array<Record<string, any>>;
  metricValue?: string;
  datasetUnit?: string;
  datasetRecordsName?: string;
}

export default function DrilldownRecordsModal({
  open,
  onOpenChange,
  title,
  subtitle,
  records,
  metricValue,
  datasetUnit,
  datasetRecordsName = "Records",
}: DrilldownRecordsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Determine top columns to display
  const columns = useMemo(() => {
    if (!records || records.length === 0) return [];
    const allKeys = Object.keys(records[0]);
    // Prioritize common human-readable fields
    const priority = [
      "name",
      "employee_name",
      "badge_number",
      "camp",
      "department",
      "room_category",
      "room_number",
      "building",
      "floor",
      "nationality",
      "designation",
      "check_in_date",
      "check_out_date",
      "grand_total",
      "total_cost",
      "status",
    ];

    const sorted = [...allKeys].sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    // Display top 7 columns to keep table neat
    return sorted.slice(0, 7);
  }, [records]);

  // Client-side search
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();
    return records.filter((r) =>
      Object.values(r).some((v) =>
        v !== null && v !== undefined && String(v).toLowerCase().includes(term)
      )
    );
  }, [records, searchTerm]);

  // Export to Excel
  const handleExport = () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      toast.error("No records to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(filteredRecords);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
    XLSX.writeFile(wb, `3D_Drilldown_${safeTitle}_${Date.now()}.xlsx`);
    toast.success("Exported records to Excel (.xlsx)");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Users size={18} className="text-primary" />
                <span>{datasetRecordsName} List: {title}</span>
              </DialogTitle>
              {subtitle && (
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {subtitle}
                </DialogDescription>
              )}
            </div>

            {metricValue && (
              <Badge variant="outline" className="text-xs font-mono font-bold px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-800 dark:text-amber-300">
                Total: {metricValue}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Toolbar: Search & Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, badge, camp, room, dept..."
              className="pl-8 h-8 text-xs bg-background"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground font-semibold">
              Showing {filteredRecords.length} of {records.length} {records.length === 1 ? datasetRecordsName.toLowerCase() : `${datasetRecordsName.toLowerCase()}`}
            </span>
            <Button
              size="sm"
              onClick={handleExport}
              className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
              title="Download Excel spreadsheet with all matching rows"
            >
              <FileSpreadsheet size={13} />
              <span>Download Excel Sheet</span>
            </Button>
          </div>
        </div>

        {/* Records Table Scroll Area */}
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/80 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-[10px] font-bold text-muted-foreground uppercase">#</TableHead>
                {columns.map((col) => (
                  <TableHead
                    key={col}
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {col.replace(/_/g, " ")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-32 text-center text-muted-foreground">
                    No matching records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.slice(0, 150).map((record, i) => (
                  <TableRow key={i} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-[10px] text-muted-foreground/80 py-2">
                      {i + 1}
                    </TableCell>
                    {columns.map((col) => {
                      const val = record[col];
                      const isNumber = typeof val === "number";
                      return (
                        <TableCell
                          key={col}
                          className={`py-2 whitespace-nowrap ${
                            isNumber ? "font-mono font-semibold text-foreground text-right" : "text-foreground"
                          }`}
                        >
                          {val !== null && val !== undefined ? String(val) : "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredRecords.length > 150 && (
          <div className="text-[11px] text-muted-foreground text-center pt-2">
            Displaying first 150 rows. Click "Download Excel Sheet" to save all {filteredRecords.length} records.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
