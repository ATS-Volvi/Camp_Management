import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useBulkAddRooms } from "@/hooks/useCampManagement";
import { NEW_ROOM_CATEGORIES, getRoomCategoryCapacity } from "@/constants/roomCategories";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
  blocks: { id: string; name: string; block_code: string | null }[];
}

interface RoomRow {
  block_name: string;
  room_number: string;
  room_type: string;
  floor: number;
  ac: boolean;
  attached_bathroom: boolean;
  daily_rate: number;
  daily_food_rate: number;
  // resolved
  _blockId?: string;
  _errors: string[];
}

export default function BulkRoomUploadDialog({ open, onOpenChange, campId, campName, blocks }: Props) {
  const bulkAdd = useBulkAddRooms();
  const [rows, setRows] = useState<RoomRow[]>([]);
  const [step, setStep] = useState<"upload" | "preview">("upload");

  const validTypes = NEW_ROOM_CATEGORIES.map(c => c.value);

  const downloadTemplate = () => {
    const headers = ["block_name", "room_number", "room_type", "floor", "ac", "attached_bathroom", "daily_rate", "daily_food_rate"];

    // Reference sheet data
    const refData = NEW_ROOM_CATEGORIES.map(c => ({
      room_type_value: c.value,
      label: c.label,
      bed_capacity: c.capacity,
      typical_usage: c.typicalUsage,
    }));

    const blockRef = blocks.map(b => ({
      block_name: b.name,
      block_code: b.block_code || "",
    }));

    const wb = XLSX.utils.book_new();

    // Main sheet with sample rows
    const sampleRows = blocks.length > 0
      ? [
          { block_name: blocks[0].name, room_number: "A-101", room_type: "staff_4bed", floor: 1, ac: "yes", attached_bathroom: "no", daily_rate: 70, daily_food_rate: 30 },
          { block_name: blocks[0].name, room_number: "A-102", room_type: "skilled_6bed", floor: 1, ac: "yes", attached_bathroom: "yes", daily_rate: 60, daily_food_rate: 30 },
        ]
      : [
          { block_name: "Block A", room_number: "A-101", room_type: "staff_4bed", floor: 1, ac: "yes", attached_bathroom: "no", daily_rate: 70, daily_food_rate: 30 },
        ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    XLSX.utils.book_append_sheet(wb, ws, "Rooms");

    // Room Types reference
    const ws2 = XLSX.utils.json_to_sheet(refData);
    XLSX.utils.book_append_sheet(wb, ws2, "Room Types Reference");

    // Blocks reference
    if (blockRef.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(blockRef);
      XLSX.utils.book_append_sheet(wb, ws3, "Blocks Reference");
    }

    XLSX.writeFile(wb, `${campName}_Room_Upload_Template.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws);

      const parsed: RoomRow[] = json.map((row: any) => {
        const errors: string[] = [];
        const blockName = String(row.block_name || "").trim();
        const roomNumber = String(row.room_number || "").trim();
        const roomType = String(row.room_type || "").trim().toLowerCase();
        const floor = parseInt(row.floor) || 1;
        const ac = String(row.ac || "yes").toLowerCase();
        const bathroom = String(row.attached_bathroom || "no").toLowerCase();
        const dailyRate = parseFloat(row.daily_rate) || 0;
        const dailyFoodRate = parseFloat(row.daily_food_rate) || 0;

        // Validate
        if (!blockName) errors.push("Block name missing");
        if (!roomNumber) errors.push("Room number missing");
        if (!validTypes.includes(roomType)) errors.push(`Invalid room type: ${roomType}`);

        const matchedBlock = blocks.find(b => b.name.toLowerCase() === blockName.toLowerCase());
        if (blockName && !matchedBlock) errors.push(`Block "${blockName}" not found`);

        return {
          block_name: blockName,
          room_number: roomNumber,
          room_type: roomType,
          floor,
          ac: ["yes", "true", "1"].includes(ac),
          attached_bathroom: ["yes", "true", "1"].includes(bathroom),
          daily_rate: dailyRate,
          daily_food_rate: dailyFoodRate,
          _blockId: matchedBlock?.id,
          _errors: errors,
        };
      });

      setRows(parsed);
      setStep("preview");
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const validRows = rows.filter(r => r._errors.length === 0 && r._blockId);
  const errorRows = rows.filter(r => r._errors.length > 0);

  const handleSubmit = () => {
    if (validRows.length === 0) return;

    const roomsToInsert = validRows.map(r => ({
      building_id: r._blockId!,
      camp_id: campId,
      room_number: r.room_number,
      category: r.room_type as any,
      floor: r.floor,
      max_capacity: getRoomCategoryCapacity(r.room_type),
      ac: r.ac,
      attached_bathroom: r.attached_bathroom,
      daily_rate: r.daily_rate,
      daily_food_rate: r.daily_food_rate,
    }));

    bulkAdd.mutate(roomsToInsert as any, {
      onSuccess: () => {
        setRows([]);
        setStep("upload");
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Room Upload — {campName}</DialogTitle>
          <DialogDescription>Upload an Excel file with room data. Download the template first for the correct format.</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 py-4">
            {/* Download Template */}
            <div className="border border-dashed rounded-lg p-6 text-center space-y-3">
              <h3 className="font-semibold">Step 1: Download Template</h3>
              <p className="text-sm text-muted-foreground">
                Template includes reference sheets for room types ({NEW_ROOM_CATEGORIES.length} types) and blocks ({blocks.length} blocks).
              </p>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download size={16} /> Download Template
              </Button>
            </div>

            {/* Upload File */}
            <div className="border border-dashed rounded-lg p-6 text-center space-y-3">
              <h3 className="font-semibold">Step 2: Upload Filled Template</h3>
              <p className="text-sm text-muted-foreground">Supports .xlsx, .xls, and .csv files.</p>
              <Label htmlFor="room-bulk-file" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-secondary transition-colors">
                  <Upload size={16} /> Choose File
                </div>
              </Label>
              <Input id="room-bulk-file" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
            </div>

            {/* Room Types Quick Reference */}
            <div>
              <h3 className="font-semibold mb-2">Available Room Types</h3>
              <div className="grid grid-cols-2 gap-2">
                {NEW_ROOM_CATEGORIES.map(c => (
                  <div key={c.value} className="flex items-center justify-between p-2 rounded bg-secondary/50 text-sm">
                    <span>{c.label}</span>
                    <Badge variant="outline" className="text-xs">{c.capacity} beds • <code className="ml-1">{c.value}</code></Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 size={16} className="text-green-600" />
                <span className="font-medium">{validRows.length} valid</span>
              </div>
              {errorRows.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangle size={16} />
                  <span className="font-medium">{errorRows.length} errors</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setStep("upload"); setRows([]); }}>
                Re-upload
              </Button>
            </div>

            <div className="max-h-[400px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Room #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Beds</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Food</TableHead>
                    <TableHead>AC</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={row._errors.length > 0 ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-sm">{row.block_name}</TableCell>
                      <TableCell className="text-sm font-mono">{row.room_number}</TableCell>
                      <TableCell className="text-xs">{row.room_type}</TableCell>
                      <TableCell className="text-sm">{row.floor}</TableCell>
                      <TableCell className="text-sm">{validTypes.includes(row.room_type) ? getRoomCategoryCapacity(row.room_type) : "?"}</TableCell>
                      <TableCell className="text-sm">{row.daily_rate}</TableCell>
                      <TableCell className="text-sm">{row.daily_food_rate}</TableCell>
                      <TableCell className="text-sm">{row.ac ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        {row._errors.length > 0 ? (
                          <span className="text-xs text-destructive">{row._errors.join("; ")}</span>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-700 border-green-300">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setStep("upload"); setRows([]); }}>
            Cancel
          </Button>
          {step === "preview" && (
            <Button onClick={handleSubmit} disabled={bulkAdd.isPending || validRows.length === 0}>
              {bulkAdd.isPending ? "Creating..." : `Create ${validRows.length} Rooms`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
