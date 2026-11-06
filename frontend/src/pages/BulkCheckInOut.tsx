import { useState } from "react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, Loader2, Play } from "lucide-react";
import { existingRoomTemplateRows, resolveUploadLocation, type UploadCamp, type UploadBlock, type UploadRoom } from "@/lib/bulkOccupancyLocations";

const HEADERS = ["Camp Code", "Camp Name", "Block Code", "Block Name", "Floor Number", "Room Number", "Employee ID", "Iqama Number", "Check-In Date", "Check-Out Date", "Remarks"];
const ALIASES: Record<string, string[]> = { "Camp Code": ["Camp No"], "Block Code": ["Block No"], "Floor Number": ["Floor No"], "Room Number": ["Room No"] };

type Row = {
  line: number; camp: string; campName: string; block: string; blockName?: string; floor: string; room: string; empCode: string; iqama: string;
  checkIn: string | null; checkOut: string | null; remarks: string;
  campId?: string; roomId?: string; employeeId?: string; action?: string;
  errors: string[]; status?: "done" | "failed"; message?: string;
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const norm = (v: string) => v.toLowerCase().replace(/\s+/g, "");

function toIsoDate(v: unknown): string | null | "invalid" {
  if (v === null || v === undefined || s(v) === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? "invalid" : new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate(), 9)).toISOString();
  if (typeof v === "number") { const d = XLSX.SSF.parse_date_code(v); return d ? new Date(Date.UTC(d.y, d.m - 1, d.d, 9)).toISOString() : "invalid"; }
  const t = s(v); const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 9)).toISOString();
  const d = new Date(t); return isNaN(d.getTime()) ? "invalid" : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 9)).toISOString();
}

async function fetchAll<T>(table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await (supabase.from(table as any).select(cols).order("id").range(from, from + 999) as any);
    if (error) throw error;
    out.push(...(data as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export default function BulkCheckInOut() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [checking, setChecking] = useState(false);
  const [running, setRunning] = useState(false);
  const [fileName, setFileName] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [templateError, setTemplateError] = useState("");

  const downloadTemplate = async () => {
    setDownloading(true); setTemplateError("");
    try {
      const [camps, blocks, rooms] = await Promise.all([
        fetchAll<UploadCamp>("camps", "id,name,camp_code"),
        fetchAll<UploadBlock>("buildings", "id,camp_id,name,block_code"),
        fetchAll<UploadRoom>("rooms", "id,camp_id,building_id,floor,room_number,status"),
      ]);
      const locations = existingRoomTemplateRows(camps, blocks, rooms);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...locations.slice(0, 3).map(location => [...location, "", "", "", "", ""])]);
      ws["!cols"] = HEADERS.map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(wb, ws, "CheckInOut");
      const reference = XLSX.utils.aoa_to_sheet([HEADERS.slice(0, 6), ...locations]);
      reference["!cols"] = HEADERS.slice(0, 6).map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(wb, reference, "Existing Rooms");
      const notes = XLSX.utils.aoa_to_sheet([
        ["Field", "Meaning"],
        ["Camp Code", "The saved camp identifier shown in Camps. Use Camp Code or Camp Name; if both are entered they must match."],
        ["Block Code / Block Name", "Use the saved block code or name within that camp. If both are entered they must match."],
        ["Floor Number / Room Number", "Copy the exact saved values from Existing Rooms, including room prefixes such as A-101."],
        ["Sample rows", "The first three locations are real existing rooms. Enter a registered Employee ID, matching Iqama (optional), and your actual dates, or remove unused rows."],
        ["Dates", "DD/MM/YYYY. Leave Check-Out Date blank for check-in only; leave Check-In Date blank for a current resident's checkout."],
        ["Existing rooms only", "This upload never creates camps, blocks, floors or rooms. Missing locations are rejected."],
      ]);
      notes["!cols"] = [{ wch: 30 }, { wch: 110 }];
      XLSX.utils.book_append_sheet(wb, notes, "Instructions");
      XLSX.writeFile(wb, "bulk_check_in_out_template.xlsx");
    } catch (error: any) { setTemplateError(error.message || "Could not load existing rooms for the template"); }
    finally { setDownloading(false); }
  };

  const onFile = async (file: File) => {
    setFileName(file.name); setChecking(true); setRows([]);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const pick = (r: Record<string, unknown>, h: string) => { const k = Object.keys(r).find((k) => [h, ...(ALIASES[h] || [])].some(label => norm(k) === norm(label))); return k ? r[k] : ""; };

      const [camps, blocks, rooms, emps, ins, outs] = await Promise.all([
        fetchAll<any>("camps", "id,name,camp_code"),
        fetchAll<any>("buildings", "id,camp_id,name,block_code"),
        fetchAll<any>("rooms", "id,camp_id,building_id,floor,room_number,status"),
        fetchAll<any>("employees", "id,employee_id,iqama_number"),
        fetchAll<any>("check_ins", "id,employee_id,room_id,check_in_date"),
        fetchAll<any>("check_outs", "id,employee_id,check_out_date"),
      ]);
      const empByCode = new Map(emps.map((e) => [s(e.employee_id), e]));
      // current room = latest check-in with no later check-out
      const currentRoom = new Map<string, string>();
      const lastOut = new Map<string, string>();
      outs.forEach((o) => { const p = lastOut.get(o.employee_id); if (!p || o.check_out_date > p) lastOut.set(o.employee_id, o.check_out_date); });
      const lastIn = new Map<string, any>();
      ins.forEach((i) => { const p = lastIn.get(i.employee_id); if (!p || i.check_in_date > p.check_in_date) lastIn.set(i.employee_id, i); });
      lastIn.forEach((i, e) => { const o = lastOut.get(e); if (!o || o < i.check_in_date) currentRoom.set(e, i.room_id); });

      const parsed: Row[] = raw.filter((r) => HEADERS.some((h) => s(pick(r, h)) !== "")).map((r, idx) => {
        const errors: string[] = [];
        const row: Row = {
          line: idx + 2, camp: s(pick(r, "Camp Code")), campName: s(pick(r, "Camp Name")), block: s(pick(r, "Block Code")), blockName: s(pick(r, "Block Name")), floor: s(pick(r, "Floor Number")),
          room: s(pick(r, "Room Number")), empCode: s(pick(r, "Employee ID")), iqama: s(pick(r, "Iqama Number")),
          checkIn: null, checkOut: null, remarks: s(pick(r, "Remarks")), errors,
        };
        const ci = toIsoDate(pick(r, "Check-In Date")), co = toIsoDate(pick(r, "Check-Out Date"));
        if (ci === "invalid") errors.push("Invalid check-in date"); else row.checkIn = ci;
        if (co === "invalid") errors.push("Invalid check-out date"); else row.checkOut = co;
        if (!row.checkIn && !row.checkOut && ci !== "invalid" && co !== "invalid") errors.push("Check-in or check-out date required");
        if (row.checkIn && row.checkOut && row.checkOut <= row.checkIn) errors.push("Check-out must be after check-in");

        // Older templates allowed a name in the "No" columns; resolve those aliases without changing saved identifiers.
        if (!Object.keys(r).some(k => norm(k) === norm("Camp Code")) && row.camp && !camps.some(c => norm(s(c.camp_code)) === norm(row.camp))) { row.campName ||= row.camp; row.camp = ""; }
        if (!Object.keys(r).some(k => norm(k) === norm("Block Code")) && row.block && !blocks.some(b => norm(s(b.block_code)) === norm(row.block))) { row.blockName ||= row.block; row.block = ""; }
        const { camp, room, errors: locationErrors } = resolveUploadLocation({ campCode: row.camp, campName: row.campName, blockCode: row.block, blockName: row.blockName || "", floor: row.floor, room: row.room }, camps, blocks, rooms);
        errors.push(...locationErrors);
        const emp = empByCode.get(row.empCode);
        if (!emp) errors.push(`Employee '${row.empCode}' not found`);
        else if (row.iqama && emp.iqama_number && s(emp.iqama_number) !== row.iqama) errors.push("Iqama number does not match employee");

        if (camp) row.campId = camp.id; if (room) row.roomId = room.id; if (emp) row.employeeId = emp.id;
        if (emp && room) {
          const cur = currentRoom.get(emp.id);
          if (row.checkIn) {
            if (cur) errors.push("Employee is already checked in");
            row.action = row.checkOut ? "Check-in + Check-out" : "Check-in";
          } else if (row.checkOut) {
            if (cur !== room.id) errors.push(cur ? "Employee is checked in to a different room" : "Employee is not checked in");
            row.action = "Check-out";
          }
          if (room.status === "under_maintenance" && row.checkIn) errors.push("Room under maintenance");
        }
        return row;
      });
      const seen = new Set<string>();
      parsed.forEach((r) => { if (r.employeeId) { if (seen.has(r.employeeId)) r.errors.push("Employee repeated in file"); seen.add(r.employeeId); } });
      setRows(parsed);
    } catch (e: any) {
      setRows([{ line: 0, camp: "", campName: "", block: "", floor: "", room: "", empCode: "", iqama: "", checkIn: null, checkOut: null, remarks: "", errors: [e.message || "Could not read file"] }]);
    } finally { setChecking(false); }
  };

  const run = async () => {
    setRunning(true);
    const { data: { user } } = await supabase.auth.getUser();
    const next = [...rows];
    for (const r of next) {
      if (r.errors.length || r.status === "done" || !user) continue;
      try {
        const { data: savedRoom, error: roomError } = await supabase.from("rooms").select("id,camp_id,building_id,floor,room_number,buildings(block_code,name),camps(camp_code,name)").eq("id", r.roomId || "").maybeSingle();
        if (roomError) throw roomError;
        if (!savedRoom || savedRoom.camp_id !== r.campId || String(savedRoom.floor) !== r.floor || norm(savedRoom.room_number) !== norm(r.room) ||
          (r.camp && norm(savedRoom.camps?.camp_code || "") !== norm(r.camp)) ||
          (r.campName && norm(savedRoom.camps?.name || "") !== norm(r.campName)) ||
          (r.block && norm(savedRoom.buildings?.block_code || "") !== norm(r.block)) ||
          (r.blockName && norm(savedRoom.buildings?.name || "") !== norm(r.blockName))) throw new Error("The uploaded location no longer matches an existing room. Re-upload using its saved details.");
        if (r.checkIn) {
          const { error } = await supabase.rpc("perform_check_in", {
            p_employee_id: r.employeeId, p_room_id: r.roomId, p_camp_id: r.campId, p_performed_by: user.id,
            p_iqama_number: r.iqama || null, p_passport_number: null, p_food_required: true, p_check_in_date: r.checkIn,
          } as any);
          if (error) throw error;
        }
        if (r.checkOut) {
          const { error } = await supabase.rpc("perform_check_out", {
            p_employee_id: r.employeeId, p_room_id: r.roomId, p_camp_id: r.campId, p_performed_by: user.id,
            p_assets_returned: true, p_damage_remarks: null, p_clearance_notes: r.remarks || "Bulk upload",
            p_is_blacklisted: false, p_blacklist_reason: null, p_feedback: null, p_feedback_rating: null, p_check_out_date: r.checkOut,
          } as any);
          if (error) throw error;
        }
        r.status = "done"; r.message = "Saved";
      } catch (e: any) { r.status = "failed"; r.message = e.message; }
      setRows([...next]);
    }
    ["rooms", "recent-check-ins", "employees", "checked-in-employees", "revenue-data", "invoice-data"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    setRunning(false);
  };

  const valid = rows.filter((r) => !r.errors.length).length;
  const done = rows.filter((r) => r.status === "done").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Check-In / Check-Out</h1>
        <p className="text-sm text-muted-foreground">Upload an Excel file to check employees in, out, or both. Leave Check-Out Date blank to only check in; leave Check-In Date blank to check out a current resident.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">1. Template & upload</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={downloadTemplate} disabled={downloading}>{downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download template</Button>
          <Button asChild variant="secondary">
            <label className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Upload file
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
            </label>
          </Button>
          {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          {checking && <span className="flex items-center text-sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking rows…</span>}
          {templateError && <span className="text-sm text-destructive">{templateError}</span>}
        </CardContent>
      </Card>
      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">2. Preview — {rows.length} rows · {valid} ready · {rows.length - valid} with errors{done ? ` · ${done} saved` : ""}{failed ? ` · ${failed} failed` : ""}</CardTitle>
            <Button onClick={run} disabled={running || valid === done}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Process {valid - done} rows
            </Button>
          </CardHeader>
          <CardContent className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Row</TableHead><TableHead>Camp Code</TableHead><TableHead>Camp Name</TableHead><TableHead>Block Code</TableHead><TableHead>Block Name</TableHead><TableHead>Floor Number</TableHead><TableHead>Room Number</TableHead>
                <TableHead>Employee ID</TableHead><TableHead>Iqama</TableHead><TableHead>Check-In</TableHead><TableHead>Check-Out</TableHead>
                <TableHead>Remarks</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>{rows.map((r) => (
                <TableRow key={r.line}>
                  <TableCell>{r.line}</TableCell><TableCell>{r.camp || "—"}</TableCell><TableCell>{r.campName || "—"}</TableCell><TableCell>{r.block || "—"}</TableCell><TableCell>{r.blockName || "—"}</TableCell><TableCell>{r.floor}</TableCell>
                  <TableCell>{r.room}</TableCell><TableCell>{r.empCode}</TableCell><TableCell>{r.iqama}</TableCell>
                  <TableCell>{fmt(r.checkIn)}</TableCell><TableCell>{fmt(r.checkOut)}</TableCell>
                  <TableCell className="max-w-[160px] truncate" title={r.remarks}>{r.remarks}</TableCell>
                  <TableCell>{r.action || "—"}</TableCell>
                  <TableCell className="min-w-[200px]">
                    {r.errors.length ? <span className="text-xs text-destructive">{r.errors.join("; ")}</span>
                      : r.status === "done" ? <Badge>Saved</Badge>
                      : r.status === "failed" ? <span className="text-xs text-destructive">{r.message}</span>
                      : <Badge variant="secondary">Ready</Badge>}
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
