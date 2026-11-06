import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Building2,
  BedDouble,
  Wind,
  Bath,
  Search,
  Sparkles,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  mapRawRoomTypeToCategory,
  parseFloorInput,
  NEW_ROOM_CATEGORIES,
} from "@/constants/roomCategories";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
  blocks: { id: string; name: string; block_code: string | null }[];
}

interface ParsedRoomRow {
  block_name: string;
  room_number: string;
  raw_type: string;
  category: string;
  capacity: number;
  type_label: string;
  raw_floor: string;
  floor: number;
  floor_code: string;
  floor_display: string;
  ac: boolean;
  attached_bathroom: boolean;
  daily_rate: number;
  daily_food_rate: number;
  _blockId?: string;
  _isNewBlock: boolean;
  _errors: string[];
}

export default function BulkRoomUploadDialog({ open, onOpenChange, campId, campName, blocks }: Props) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ParsedRoomRow[]>([]);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [searchFilter, setSearchFilter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  const downloadTemplate = () => {
    const headers = ["block_name", "room_number", "room_type", "floor", "ac", "attached_bathroom"];

    const sampleRows = [
      { block_name: "A", room_number: "A01", room_type: "2x1", floor: "G", ac: "No", attached_bathroom: "No" },
      { block_name: "A", room_number: "A02", room_type: "3x1", floor: "G", ac: "No", attached_bathroom: "No" },
      { block_name: "A", room_number: "A14", room_type: "4x1", floor: "F", ac: "Yes", attached_bathroom: "No" },
      { block_name: "A", room_number: "A23", room_type: "6x1", floor: "S", ac: "Yes", attached_bathroom: "Yes" },
      { block_name: "B", room_number: "B01", room_type: "2x1", floor: "G", ac: "No", attached_bathroom: "No" },
      { block_name: "B", room_number: "B12", room_type: "4x1", floor: "F", ac: "Yes", attached_bathroom: "No" },
    ];

    const refTypes = [
      { code: "1x1", bed_capacity: 1, standard_category: "executive_single", description: "Executive Single Suite (1 Bed)" },
      { code: "2x1", bed_capacity: 2, standard_category: "supervisor_twin", description: "Supervisor Twin Sharing (2 Beds)" },
      { code: "3x1", bed_capacity: 3, standard_category: "supervisor_twin", description: "Triple Sharing (3 Beds)" },
      { code: "4x1", bed_capacity: 4, standard_category: "staff_4bed", description: "Staff Room (4 Beds)" },
      { code: "5x1", bed_capacity: 5, standard_category: "skilled_6bed", description: "5-Bed Workforce Sharing (5 Beds)" },
      { code: "6x1", bed_capacity: 6, standard_category: "skilled_6bed", description: "Skilled Worker Sharing (6 Beds)" },
      { code: "8x1", bed_capacity: 8, standard_category: "general_8bed", description: "General Worker Accommodation (8 Beds)" },
    ];

    const refFloors = [
      { code: "G", description: "Ground Floor" },
      { code: "F", description: "First Floor" },
      { code: "S", description: "Second Floor" },
      { code: "T", description: "Third Floor (optional)" },
    ];

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    XLSX.utils.book_append_sheet(wb, ws1, "Rooms");

    const ws2 = XLSX.utils.json_to_sheet(refTypes);
    XLSX.utils.book_append_sheet(wb, ws2, "Room Types Reference");

    const ws3 = XLSX.utils.json_to_sheet(refFloors);
    XLSX.utils.book_append_sheet(wb, ws3, "Floors Reference");

    XLSX.writeFile(wb, `${campName || "Camp"}_Room_Upload_Template.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        // Find sheet named 'Rooms' or default to first sheet
        const sheetName = wb.SheetNames.find((s) => s.toLowerCase() === "rooms") || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(ws);

        if (!json || json.length === 0) {
          toast({ title: "Empty Spreadsheet", description: "No room rows were found in the uploaded file.", variant: "destructive" });
          return;
        }

        const parsed: ParsedRoomRow[] = json.map((row: any) => {
          const errors: string[] = [];

          // Extract fields with multiple header aliases
          const blockName = String(
            row.block_name || row.block || row.Building || row.Block || row.Wing || ""
          ).trim();

          const roomNumber = String(
            row.room_number || row.room || row["Room No"] || row["Room #"] || row["Room Number"] || ""
          ).trim();

          const rawType = String(
            row.room_type || row.type || row["Room Type"] || row.capacity || "4x1"
          ).trim();

          const rawFloor = String(
            row.floor || row.Floor || row.Level || row.level || "G"
          ).trim();

          const rawAc = String(row.ac || row.AC || row["Air Conditioned"] || "No").trim().toLowerCase();
          const rawBath = String(
            row.attached_bathroom || row.bathroom || row.bath || row["Attached Bath"] || "No"
          ).trim().toLowerCase();

          const dailyRate = parseFloat(row.daily_rate) || 0;
          const dailyFoodRate = parseFloat(row.daily_food_rate) || 0;

          if (!blockName) errors.push("Block name is required");
          if (!roomNumber) errors.push("Room number is required");

          // Map room type and floor
          const typeMapping = mapRawRoomTypeToCategory(rawType);
          const floorMapping = parseFloorInput(rawFloor);

          const matchedBlock = blocks.find(
            (b) =>
              b.name.toLowerCase() === blockName.toLowerCase() ||
              (b.block_code && b.block_code.toLowerCase() === blockName.toLowerCase())
          );

          const isAc = ["yes", "true", "1", "y"].includes(rawAc);
          const isBath = ["yes", "true", "1", "y"].includes(rawBath);

          return {
            block_name: blockName,
            room_number: roomNumber,
            raw_type: rawType,
            category: typeMapping.category,
            capacity: typeMapping.capacity,
            type_label: typeMapping.label,
            raw_floor: rawFloor,
            floor: floorMapping.floorNumber,
            floor_code: floorMapping.floorCode,
            floor_display: floorMapping.displayName,
            ac: isAc,
            attached_bathroom: isBath,
            daily_rate: dailyRate,
            daily_food_rate: dailyFoodRate,
            _blockId: matchedBlock?.id,
            _isNewBlock: !matchedBlock,
            _errors: errors,
          };
        });

        setRows(parsed);
        setStep("preview");
      } catch (err: any) {
        toast({
          title: "File Reading Error",
          description: err.message || "Failed to read excel file",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const validRows = useMemo(() => rows.filter((r) => r._errors.length === 0), [rows]);
  const errorRows = useMemo(() => rows.filter((r) => r._errors.length > 0), [rows]);

  // Distinct block analysis
  const blockStats = useMemo(() => {
    const map = new Map<string, { count: number; maxFloor: number; isExisting: boolean; existingId?: string }>();
    validRows.forEach((r) => {
      const existing = map.get(r.block_name) || {
        count: 0,
        maxFloor: 1,
        isExisting: !r._isNewBlock,
        existingId: r._blockId,
      };
      existing.count += 1;
      existing.maxFloor = Math.max(existing.maxFloor, r.floor);
      map.set(r.block_name, existing);
    });
    return map;
  }, [validRows]);

  const newBlocksCount = useMemo(() => {
    let count = 0;
    blockStats.forEach((info) => {
      if (!info.isExisting) count++;
    });
    return count;
  }, [blockStats]);

  // Breakdown by room type
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    validRows.forEach((r) => {
      const key = r.raw_type || `${r.capacity}x1`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [validRows]);

  const filteredPreviewRows = useMemo(() => {
    if (!searchFilter.trim()) return rows;
    const term = searchFilter.toLowerCase();
    return rows.filter(
      (r) =>
        r.block_name.toLowerCase().includes(term) ||
        r.room_number.toLowerCase().includes(term) ||
        r.type_label.toLowerCase().includes(term) ||
        r.floor_display.toLowerCase().includes(term)
    );
  }, [rows, searchFilter]);

  const handleSubmit = async () => {
    if (validRows.length === 0) return;
    setIsSubmitting(true);
    setSubmitProgress(10);
    setStatusMessage("Verifying camp blocks...");

    try {
      // Step 1: Create any missing blocks in the database
      const blockIdMap = new Map<string, string>();

      // Populate existing blocks
      blockStats.forEach((info, name) => {
        if (info.isExisting && info.existingId) {
          blockIdMap.set(name.toLowerCase(), info.existingId);
        }
      });

      // Insert new blocks
      const missingBlockNames: string[] = [];
      blockStats.forEach((info, name) => {
        if (!info.isExisting) missingBlockNames.push(name);
      });

      if (missingBlockNames.length > 0) {
        setStatusMessage(`Creating ${missingBlockNames.length} new blocks...`);
        for (let i = 0; i < missingBlockNames.length; i++) {
          const bName = missingBlockNames[i];
          const info = blockStats.get(bName)!;
          const { data: newBlock, error: bErr } = await supabase
            .from("buildings")
            .insert({
              camp_id: campId,
              name: bName,
              block_type: "staff",
              floors: Math.max(info.maxFloor, 3), // Ensure floor count covers data (at least 3 floors: G, F, S)
              block_code: bName,
              status: "active",
            } as any)
            .select("id")
            .single();

          if (bErr) throw new Error(`Failed to create block ${bName}: ${bErr.message}`);
          blockIdMap.set(bName.toLowerCase(), (newBlock as any).id);
        }
      }

      setSubmitProgress(40);
      setStatusMessage(`Preparing ${validRows.length} rooms...`);

      // Step 2: Prepare rooms payload
      const roomsToInsert = validRows.map((r) => {
        const buildingId = blockIdMap.get(r.block_name.toLowerCase());
        if (!buildingId) throw new Error(`Missing block identifier for ${r.block_name}`);

        return {
          building_id: buildingId,
          camp_id: campId,
          room_number: r.room_number,
          category: r.category as any,
          floor: r.floor,
          max_capacity: r.capacity,
          current_occupancy: 0,
          status: "available",
          ac: r.ac,
          attached_bathroom: r.attached_bathroom,
          daily_rate: r.daily_rate,
          daily_food_rate: r.daily_food_rate,
        };
      });

      // Step 3: Insert rooms in batches of 100
      const BATCH_SIZE = 100;
      const totalBatches = Math.ceil(roomsToInsert.length / BATCH_SIZE);

      for (let i = 0; i < totalBatches; i++) {
        const batch = roomsToInsert.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        setStatusMessage(`Inserting batch ${i + 1} of ${totalBatches} (${batch.length} rooms)...`);
        
        const { error: rErr } = await supabase.from("rooms").insert(batch as any);
        if (rErr) throw new Error(`Failed inserting room batch ${i + 1}: ${rErr.message}`);

        const pct = 40 + Math.round(((i + 1) / totalBatches) * 55);
        setSubmitProgress(pct);
      }

      setSubmitProgress(100);
      setStatusMessage("Finalizing cache...");

      // Step 4: Refresh react-query caches
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["rooms"] }),
        qc.invalidateQueries({ queryKey: ["blocks"] }),
        qc.invalidateQueries({ queryKey: ["blocks", campId] }),
        qc.invalidateQueries({ queryKey: ["camp", campId] }),
        qc.invalidateQueries({ queryKey: ["camps-list"] }),
      ]);

      toast({
        title: `🎉 Successfully Created ${validRows.length} Rooms!`,
        description: `Imported across ${blockStats.size} blocks (${newBlocksCount} new blocks auto-created).`,
      });

      setRows([]);
      setStep("upload");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Import Failed",
        description: err.message || "An unexpected error occurred during bulk room insertion.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!isSubmitting ? onOpenChange(o) : null)}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-blue-950/20 via-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-semibold text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              <FileSpreadsheet size={13} /> Bulk Room & Block Importer
            </Badge>
            <Badge variant="outline" className="text-xs">
              {campName}
            </Badge>
          </div>
          <DialogTitle className="text-base font-bold">
            Import Real Camp Structure from Excel (.xlsx / .csv)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Instantly import hundreds of rooms. Supports custom codes (G/F/S floors, 1x1 to 6x1 room types, arbitrary numbering) and automatically provisions any missing blocks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {step === "upload" && (
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Download Template Card */}
                <div className="border border-dashed rounded-xl p-5 text-center flex flex-col justify-between items-center space-y-3 bg-muted/20 hover:border-primary/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                    <Download size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Download Standard Template</h3>
                    <p className="text-xs text-muted-foreground mt-1 px-4">
                      Pre-formatted with real column names (<code>block_name</code>, <code>room_number</code>, <code>room_type</code>, <code>floor</code>, <code>ac</code>, <code>attached_bathroom</code>) and reference guides.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 text-xs">
                    <Download size={14} /> Download Template (.xlsx)
                  </Button>
                </div>

                {/* Upload File Card */}
                <div className="border-2 border-dashed border-primary/40 rounded-xl p-5 text-center flex flex-col justify-between items-center space-y-3 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-1">
                    <Upload size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Upload Filled Room Master</h3>
                    <p className="text-xs text-muted-foreground mt-1 px-4">
                      Select or drop your camp room spreadsheet. Compatible with files like <code>Expertise Camp1_Room_Upload_Data.xlsx</code>.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="camp-room-upload-input" className="cursor-pointer">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md shadow hover:bg-primary/90 transition-colors">
                        <Upload size={14} /> Choose Excel File
                      </div>
                    </Label>
                    <Input
                      id="camp-room-upload-input"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Supported Conventions Quick Card */}
              <div className="border rounded-lg p-4 bg-muted/10 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Sparkles size={14} className="text-primary" /> Auto-Detected Standard Conventions
                  </span>
                  <Badge variant="outline" className="text-[10px]">Zero Manual Conversion Needed</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-background border space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1">
                      <Layers size={13} className="text-primary" /> Floor Codes
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Recognizes <strong>G</strong> (Ground), <strong>F</strong> (First), <strong>S</strong> (Second), or standard integers.
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-background border space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1">
                      <BedDouble size={13} className="text-primary" /> Multipliers
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Maps <strong>1x1</strong>, <strong>2x1</strong>, <strong>3x1</strong>, <strong>4x1</strong>, <strong>5x1</strong>, <strong>6x1</strong> to verified workforce bed configurations.
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-background border space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1">
                      <Building2 size={13} className="text-primary" /> Auto-Block Creation
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Blocks (A through R) not yet registered in this camp are <strong>automatically provisioned</strong> without separate clicks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {/* Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 border rounded-lg bg-background">
                  <span className="text-[11px] text-muted-foreground">Total Rooms Found</span>
                  <div className="text-lg font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <BedDouble size={16} className="text-primary" />
                    {rows.length}
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-background">
                  <span className="text-[11px] text-muted-foreground">Distinct Blocks</span>
                  <div className="text-lg font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <Building2 size={16} className="text-blue-500" />
                    {blockStats.size} Blocks
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-background">
                  <span className="text-[11px] text-muted-foreground">New Blocks to Create</span>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <Sparkles size={16} />
                    {newBlocksCount > 0 ? `${newBlocksCount} Auto-Provisioned` : "All Exist"}
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-background">
                  <span className="text-[11px] text-muted-foreground">Validation Status</span>
                  <div className="text-lg font-bold mt-0.5 flex items-center gap-1.5">
                    {errorRows.length === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={16} /> 100% Valid
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1">
                        <AlertTriangle size={16} /> {errorRows.length} Issues
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Type breakdown pills */}
              <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-lg border bg-muted/20 text-xs">
                <span className="font-semibold text-muted-foreground mr-1">Sharing Mix:</span>
                {typeBreakdown.map(([type, count]) => (
                  <Badge key={type} variant="secondary" className="gap-1 font-mono text-[11px]">
                    <span className="font-bold">{type}</span>: {count} rooms
                  </Badge>
                ))}
              </div>

              {/* Submission progress indicator */}
              {isSubmitting && (
                <div className="p-4 border rounded-lg bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{statusMessage}</span>
                    <span>{submitProgress}%</span>
                  </div>
                  <Progress value={submitProgress} className="h-2" />
                </div>
              )}

              {/* Search & Actions Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search block, room #, floor..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="h-8 pl-8 text-xs"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStep("upload");
                      setRows([]);
                    }}
                    disabled={isSubmitting}
                    className="text-xs h-8"
                  >
                    Upload Different File
                  </Button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="max-h-[340px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0">
                    <TableRow>
                      <TableHead className="w-12 text-xs">#</TableHead>
                      <TableHead className="text-xs">Block</TableHead>
                      <TableHead className="text-xs">Room Number</TableHead>
                      <TableHead className="text-xs">Sharing / Type</TableHead>
                      <TableHead className="text-xs">Floor</TableHead>
                      <TableHead className="text-xs">AC</TableHead>
                      <TableHead className="text-xs">Bath</TableHead>
                      <TableHead className="text-xs text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPreviewRows.slice(0, 150).map((row, i) => (
                      <TableRow key={i} className={row._errors.length > 0 ? "bg-destructive/10" : ""}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-xs font-bold flex items-center gap-1.5">
                          <Building2 size={12} className="text-muted-foreground" />
                          {row.block_name}
                          {row._isNewBlock && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                              New Block
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-semibold">{row.room_number}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                            <BedDouble size={11} /> {row.raw_type || `${row.capacity}x1`} ({row.capacity}B)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {row.floor_display}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.ac ? (
                            <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1 font-semibold text-[11px]">
                              <Wind size={12} /> Yes
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.attached_bathroom ? (
                            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold text-[11px]">
                              <Bath size={12} /> Yes
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row._errors.length > 0 ? (
                            <Badge variant="destructive" className="text-[10px]">
                              {row._errors.join(", ")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              Ready
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredPreviewRows.length > 150 && (
                <p className="text-[11px] text-center text-muted-foreground">
                  Showing first 150 of {filteredPreviewRows.length} rooms in preview. All {validRows.length} valid rooms will be imported.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              setStep("upload");
              setRows([]);
            }}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>

          {step === "preview" && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || validRows.length === 0}
              size="sm"
              className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmitting ? (
                <>Deploying {validRows.length} Rooms...</>
              ) : (
                <>
                  <CheckCircle2 size={14} /> Import {validRows.length} Rooms & Blocks
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
