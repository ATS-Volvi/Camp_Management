import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast as uiToast } from "@/hooks/use-toast";
const toast = { success: (t: string) => uiToast({ title: t }), error: (t: string) => uiToast({ title: t, variant: "destructive" }) };
import * as XLSX from "xlsx";

const BLOCK_TYPES = ["executive", "staff", "worker", "supervisor", "technician", "labor"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
  existingBlocks: { name: string; block_code: string | null }[];
  onDone?: () => void;
}

interface Row {
  name: string;
  block_code: string;
  block_type: string;
  floors: number;
  supervisor_name: string;
  errors: string[];
}

export default function BulkBlockUploadDialog({ open, onOpenChange, campId, campName, existingBlocks, onDone }: Props) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      [
        { block_name: "A", block_code: "A", block_type: "staff", floors: 2, supervisor_name: "" },
        { block_name: "B", block_code: "B", block_type: "worker", floors: 3, supervisor_name: "" },
      ],
      { header: ["block_name", "block_code", "block_type", "floors", "supervisor_name"] },
    );
    XLSX.utils.book_append_sheet(wb, ws, "Blocks");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(BLOCK_TYPES.map((t) => ({ block_type: t }))), "Block Types");
    XLSX.writeFile(wb, `${campName}_Block_Upload_Template.xlsx`);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      const existing = new Set(existingBlocks.map((b) => b.name.trim().toLowerCase()));
      const seen = new Set<string>();
      setRows(
        json.map((r) => {
          const name = String(r.block_name ?? r.name ?? "").trim();
          const type = String(r.block_type ?? "staff").trim().toLowerCase() || "staff";
          const floors = parseInt(String(r.floors ?? "1")) || 1;
          const errors: string[] = [];
          if (!name) errors.push("Block name required");
          else if (existing.has(name.toLowerCase())) errors.push("Block already exists");
          else if (seen.has(name.toLowerCase())) errors.push("Duplicate in file");
          if (!BLOCK_TYPES.includes(type)) errors.push(`Invalid type: ${type}`);
          if (floors < 1 || floors > 50) errors.push("Floors must be 1–50");
          seen.add(name.toLowerCase());
          return {
            name,
            block_code: String(r.block_code ?? "").trim() || name,
            block_type: type,
            floors,
            supervisor_name: String(r.supervisor_name ?? "").trim(),
            errors,
          };
        }),
      );
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const valid = rows.filter((r) => r.errors.length === 0);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("buildings").insert(
      valid.map((r) => ({
        camp_id: campId,
        name: r.name,
        block_code: r.block_code,
        block_type: r.block_type,
        floors: r.floors,
        supervisor_name: r.supervisor_name || null,
      })) as any,
    );
    setSaving(false);
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return;
    }
    toast.success(`${valid.length} block(s) created`);
    qc.invalidateQueries();
    qc.invalidateQueries({ queryKey: ["camps-list"] });
    setRows([]);
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Blocks — {campName}</DialogTitle>
          <DialogDescription>
            Step 1: upload blocks. Step 2: use Bulk Upload Rooms to add rooms into these blocks.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-3">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download size={14} className="mr-1" /> Download Template
          </Button>
          <div className="space-y-1">
            <Label>Upload filled file</Label>
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          </div>
        </div>
        {rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Block</TableHead><TableHead>Code</TableHead><TableHead>Type</TableHead>
                <TableHead>Floors</TableHead><TableHead>Supervisor</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.name || "—"}</TableCell>
                  <TableCell>{r.block_code}</TableCell>
                  <TableCell className="capitalize">{r.block_type}</TableCell>
                  <TableCell>{r.floors}</TableCell>
                  <TableCell>{r.supervisor_name || "—"}</TableCell>
                  <TableCell>
                    {r.errors.length ? (
                      <span className="flex items-center gap-1 text-destructive text-xs"><AlertTriangle size={12} />{r.errors.join("; ")}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-primary text-xs"><CheckCircle2 size={12} />Ready</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!valid.length || saving}>
            {saving ? "Creating..." : `Create ${valid.length} Block(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
