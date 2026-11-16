import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { loadInmates } from "@/hooks/useInmatesReport";
import { departmentInmatesMatrix, filterTotalInmates, totalInmatesMatrix } from "@/lib/totalInmates";

const catLabel = (c: string) => (c === "guest" ? "Guest" : c);

async function loadRoomInventory() {
  const rooms = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("rooms")
      .select("id, camp_id, building_id, category, max_capacity, camps(name), buildings(name)")
      .order("id").range(from, from + 999);
    if (error) throw error;
    rooms.push(...data);
    if (data.length < 1000) return rooms;
  }
}

export default function TotalInmatesReportTab() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [day, setDay] = useState(today);
  const [camp, setCamp] = useState("all");
  const [dept, setDept] = useState("all");
  const [block, setBlock] = useState("all");
  const [nationality, setNationality] = useState("all");
  const residentsQuery = useQuery({ queryKey: ["camp-inmates", "total", day], queryFn: () => loadInmates(undefined, day) });
  const roomsQuery = useQuery({ queryKey: ["total-inmates-room-inventory"], queryFn: loadRoomInventory });
  const data = residentsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];
  const isLoading = residentsQuery.isLoading || roomsQuery.isLoading;
  const isError = residentsQuery.isError || roomsQuery.isError;
  const camps = useMemo(() => [...new Map([
    ...rooms.map(r => [r.camp_id, r.camps?.name ?? "—"] as const),
    ...data.map(r => [r.camp_id, r.camp_name] as const),
  ]).entries()].sort((a, b) => a[1].localeCompare(b[1])), [data, rooms]);
  const blocks = useMemo(() => {
    const map = new Map<string, string>();
    rooms.filter(r => camp === "all" || r.camp_id === camp).forEach(r => {
      if (r.building_id) map.set(r.building_id, camp === "all" ? `${r.camps?.name ?? "—"} / ${r.buildings?.name ?? "—"}` : r.buildings?.name ?? "—");
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rooms, camp]);
  const locationResidents = data.filter(r => (camp === "all" || r.camp_id === camp) && (block === "all" || r.block_id === block));
  const depts = [...new Set(locationResidents.map(r => r.department || "Unassigned"))].sort();
  const nationalities = [...new Set(locationResidents.map(r => r.nationality || "Unassigned"))].sort();
  const filtered = filterTotalInmates(data, { camp, block, dept, nationality });
  const locationRooms = rooms.filter(r => (camp === "all" || r.camp_id === camp) && (block === "all" || r.building_id === block));
  const { statuses, table, grand } = totalInmatesMatrix(filtered, locationRooms, data);
  const departments = departmentInmatesMatrix(filtered);
  const scope = [camp === "all" ? "All Camps" : camps.find(c => c[0] === camp)?.[1],
    block === "all" ? "All Blocks" : blocks.find(b => b[0] === block)?.[1],
    dept === "all" ? "All Departments" : dept, nationality === "all" ? "All Nationalities" : nationality,
    format(new Date(day + "T00:00:00"), "dd MMM yyyy")].join(" | ");

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14); doc.text("Total Inmates Report", 14, 16);
    doc.setFontSize(9);
    const scopeLines = doc.splitTextToSize(scope, 269);
    doc.text(scopeLines, 14, 23);
    autoTable(doc, { startY: 28 + (scopeLines.length - 1) * 4,
      head: [["Room Category", "Available Rooms", ...statuses, "Total Un-occupied", "Total Occupied"]],
      body: table.map(r => [catLabel(r.category), r.availableRooms, ...statuses.map(s => r.counts[s]), r.unoccupied, r.total]),
      foot: [["Grand Total", grand.availableRooms, ...statuses.map(s => grand.counts[s]), grand.unoccupied, grand.total]],
      theme: "grid", styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [99, 165, 218] }, footStyles: { fillColor: [99, 165, 218] } });
    const endY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
    let startY = endY + 14;
    if (startY > 170) { doc.addPage(); startY = 20; }
    doc.setFontSize(11); doc.text("Department-wise Inmates", 14, startY - 4);
    autoTable(doc, { startY, head: [
      [{ content: "Department", rowSpan: 2 }, { content: "Status", colSpan: statuses.length + 1 }, { content: "Room Category — Inmate Counts", colSpan: departments.categories.length + 1 }],
      [...statuses, "Total", ...departments.categories.map(catLabel), "Total"]],
      body: departments.table.map(r => [r.department, ...statuses.map(s => r.counts[s]), r.total, ...departments.categories.map(c => r.categoryCounts[c]), r.total]),
      foot: [["Grand Total", ...statuses.map(s => departments.grand.counts[s]), departments.grand.total, ...departments.categories.map(c => departments.grand.categoryCounts[c]), departments.grand.total]],
      theme: "grid", styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [99, 165, 218] }, footStyles: { fillColor: [99, 165, 218] } });
    doc.save(`Total_Inmates_${day}.pdf`);
  };

  const selectFilter = (label: string, value: string, onChange: (value: string) => void, options: [string, string][], allLabel: string) => (
    <div className="space-y-1 min-w-0"><Label>{label}</Label><Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">{allLabel}</SelectItem>{options.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
    </Select></div>
  );
  const changeCamp = (value: string) => { setCamp(value); setBlock("all"); setDept("all"); setNationality("all"); };
  const changeBlock = (value: string) => { setBlock(value); setDept("all"); setNationality("all"); };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6 items-end">
        {selectFilter("Camp", camp, changeCamp, camps, "All Camps")}
        {selectFilter("Block", block, changeBlock, blocks, "All Blocks")}
        {selectFilter("Department", dept, setDept, depts.map(d => [d, d]), "All Departments")}
        {selectFilter("Nationality", nationality, setNationality, nationalities.map(n => [n, n]), "All Nationalities")}
        <div className="space-y-1"><Label htmlFor="inmates-day">Day</Label><Input id="inmates-day" type="date" className="h-9" value={day} max={today} onChange={e => e.target.value && setDay(e.target.value)} /></div>
        <Button variant="outline" onClick={exportPdf} disabled={isLoading || isError} className="gap-2 h-9"><Download size={14} /> PDF</Button>
      </div>
      <p className="text-xs text-muted-foreground">{scope}</p>
      {isLoading ? <p className="text-sm text-muted-foreground py-8 text-center">Loading report…</p>
        : isError ? <p className="text-sm text-destructive py-8 text-center">Could not load report. <Button variant="link" onClick={() => { residentsQuery.refetch(); roomsQuery.refetch(); }}>Retry</Button></p>
        : <>
          <div className="border rounded-md overflow-auto max-w-fit [&_th]:px-3 [&_th]:h-10 [&_th]:text-xs [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs">
            <Table className="w-auto min-w-[720px] tabular-nums" aria-label="Room category inmates">
              <TableHeader><TableRow><TableHead className="whitespace-nowrap">Room Category</TableHead><TableHead className="text-right">Available<br />Rooms</TableHead>{statuses.map(s => <TableHead key={s} className="text-right whitespace-nowrap">{s}</TableHead>)}<TableHead className="text-right" title="Vacant beds across all residents in the selected camp and block">Total<br />Un-occupied</TableHead><TableHead className="text-right">Total<br />Occupied</TableHead></TableRow></TableHeader>
              <TableBody>
                {table.map(r => <TableRow key={r.category}><TableCell className="font-medium">{catLabel(r.category)}</TableCell><TableCell className="text-right">{r.availableRooms}</TableCell>
                  {statuses.map(s => <TableCell key={s} className="text-right">{r.counts[s] || "-"}</TableCell>)}<TableCell className="text-right">{r.unoccupied}</TableCell><TableCell className="text-right font-medium">{r.total || "-"}</TableCell></TableRow>)}
                <TableRow className="font-bold border-t-2 bg-primary/10"><TableCell>Grand Total</TableCell><TableCell className="text-right">{grand.availableRooms}</TableCell>
                  {statuses.map(s => <TableCell key={s} className="text-right">{grand.counts[s]}</TableCell>)}<TableCell className="text-right">{grand.unoccupied}</TableCell><TableCell className="text-right">{grand.total}</TableCell></TableRow>
              </TableBody>
            </Table>
          </div>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Department-wise Inmates</h2>
            <div className="overflow-auto max-w-full [&_th]:px-3 [&_th]:h-9 [&_th]:text-xs [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs">
              <Table className="w-auto tabular-nums [&_tr]:border-0 [&_th]:border-b [&_td]:border-b" aria-label="Department inmates">
                <TableHeader>
                  <TableRow><TableHead colSpan={statuses.length + 2} className="border-x border-t bg-muted/50 text-center font-semibold">Status</TableHead><TableHead rowSpan={2} className="!w-5 !min-w-5 !px-0 !border-0" aria-hidden="true" /><TableHead colSpan={departments.categories.length + 1} className="border-x border-t bg-muted/50 text-center font-semibold whitespace-nowrap">Room Category — Inmate Counts</TableHead></TableRow>
                  <TableRow><TableHead className="border-l whitespace-nowrap">Department</TableHead>{statuses.map(s => <TableHead key={s} className="text-right whitespace-nowrap">{s}</TableHead>)}<TableHead className="text-right border-r">Total</TableHead>{departments.categories.map((c, i) => <TableHead key={c} className={`text-right whitespace-nowrap ${i === 0 ? "border-l" : ""} `}>{catLabel(c)}</TableHead>)}<TableHead className="text-right border-r font-semibold">Total</TableHead></TableRow>
                </TableHeader>
                <TableBody>{departments.table.map(r => <TableRow key={r.department}><TableCell className="font-medium border-l whitespace-nowrap">{r.department}</TableCell>{statuses.map(s => <TableCell key={s} className="text-right">{r.counts[s] || "-"}</TableCell>)}<TableCell className="text-right font-medium border-r">{r.total}</TableCell><TableCell className="!border-0 !px-0 bg-background" aria-hidden="true" />{departments.categories.map((c, i) => <TableCell key={c} className={`text-right ${i === 0 ? "border-l" : ""} `}>{r.categoryCounts[c]}</TableCell>)}<TableCell className="text-right border-r font-semibold">{r.total}</TableCell></TableRow>)}
                  {!departments.table.length && <TableRow><TableCell colSpan={statuses.length + 4 + departments.categories.length} className="text-center text-muted-foreground">No residents match these filters.</TableCell></TableRow>}
                  <TableRow className="font-bold bg-primary/10"><TableCell className="border-l whitespace-nowrap">Grand Total</TableCell>{statuses.map(s => <TableCell key={s} className="text-right">{departments.grand.counts[s]}</TableCell>)}<TableCell className="text-right border-r">{departments.grand.total}</TableCell><TableCell className="!border-0 !px-0 bg-background" aria-hidden="true" />{departments.categories.map((c, i) => <TableCell key={c} className={`text-right ${i === 0 ? "border-l" : ""} `}>{departments.grand.categoryCounts[c]}</TableCell>)}<TableCell className="text-right border-r">{departments.grand.total}</TableCell></TableRow>
                </TableBody>
              </Table>
            </div>
          </section>
        </>}
    </div>
  );
}
