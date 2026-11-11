import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { format, endOfMonth, parse } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRevenueData, buildRevenueRows } from "./RevenueReportTab";
import { downloadStatementBlob, statementAmount as fmt } from "./departmentStatement";

const CATEGORIES = ["1x1", "2x1", "3x1", "4x1", "5x1", "6x1", "guest"];
const catLabel = (c: string) => (c === "guest" ? "Guest" : c);

export function summarizeByCategory(rows: any[]) {
  const map = new Map<string, { rooms: Set<string>; residents: number; food: number; room: number }>();
  CATEGORIES.forEach(c => map.set(c, { rooms: new Set(), residents: 0, food: 0, room: 0 }));
  rows.forEach(r => {
    const key = r.category || "—";
    if (!map.has(key)) map.set(key, { rooms: new Set(), residents: 0, food: 0, room: 0 });
    const g = map.get(key)!;
    g.rooms.add(`${r.camp}|${r.room}`);
    g.residents += 1; g.food += r.foodRevenue || 0; g.room += r.roomRevenue || 0;
  });
  return [...map.entries()].map(([category, g]) => ({ category, rooms: g.rooms.size, residents: g.residents, food: g.food, room: g.room, total: g.food + g.room }));
}

export default function MonthlySummaryReportTab() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [dept, setDept] = useState("all");
  const [camp, setCamp] = useState("all");
  const monthDate = parse(month + "-01", "yyyy-MM-dd", new Date());
  const fromDate = format(monthDate, "yyyy-MM-dd");
  const toDate = format(endOfMonth(monthDate), "yyyy-MM-dd");
  const { data, isLoading, isError, refetch } = useRevenueData(fromDate, toDate);
  const rows = useMemo(() => buildRevenueRows(data, fromDate, toDate), [data, fromDate, toDate]);
  const depts = useMemo(() => [...new Set(rows.map((r: any) => r.department))].sort(), [rows]);
  const camps = useMemo(() => [...new Set(rows.map((r: any) => r.camp))].sort(), [rows]);
  const filtered = rows.filter((r: any) => (dept === "all" || r.department === dept) && (camp === "all" || r.camp === camp));
  const summary = summarizeByCategory(filtered);
  const totals = summary.reduce((s, r) => ({ rooms: s.rooms + r.rooms, residents: s.residents + r.residents, food: s.food + r.food, room: s.room + r.room, total: s.total + r.total }), { rooms: 0, residents: 0, food: 0, room: 0, total: 0 });
  const scope = `${camp === "all" ? "All Camps" : camp} | ${dept === "all" ? "All Departments" : dept} | ${format(monthDate, "MMMM yyyy")}`;

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text("Monthly Summary Report", 14, 16);
    doc.setFontSize(9); doc.text(scope, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [["Room Category", "Total Rooms", "Residents", "Food Cost (SAR)", "Accommodation Cost (SAR)", "Total Cost (SAR)"]],
      body: summary.map(r => [catLabel(r.category), r.rooms, r.residents, fmt(r.food), fmt(r.room), fmt(r.total)]),
      foot: [["Total", totals.rooms, totals.residents, fmt(totals.food), fmt(totals.room), fmt(totals.total)]],
      headStyles: { fillColor: [96, 165, 250] }, footStyles: { fillColor: [219, 234, 254], textColor: 20 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    });
    downloadStatementBlob(doc.output("blob"), `monthly-summary-${month}.pdf`);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="flex flex-wrap gap-4 items-end pt-6">
          <div className="space-y-1"><Label className="text-xs">Month</Label>
            <Input type="month" value={month} aria-label="Summary month" onChange={e => e.target.value && setMonth(e.target.value)} className="w-[170px]" /></div>
          <div className="space-y-1"><Label className="text-xs">Camp</Label>
            <Select value={camp} onValueChange={setCamp}><SelectTrigger aria-label="Camp" className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Camps</SelectItem>{camps.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Department</Label>
            <Select value={dept} onValueChange={setDept}><SelectTrigger aria-label="Department" className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Departments</SelectItem>{depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
          <Button disabled={isLoading || isError} onClick={exportPdf}><Download size={16} className="mr-1" /> Download PDF</Button>
        </CardContent>
      </Card>
      <h3 className="font-semibold">Monthly Summary — {scope}</h3>
      {isError ? <div role="alert" className="py-8 text-center">Unable to load summary. <Button variant="outline" onClick={() => refetch()}>Retry</Button></div>
        : isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Room Category</TableHead><TableHead className="text-right">Total Rooms</TableHead>
              <TableHead className="text-right">Residents</TableHead><TableHead className="text-right">Food Cost (SAR)</TableHead>
              <TableHead className="text-right">Accommodation Cost (SAR)</TableHead><TableHead className="text-right">Total Cost (SAR)</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {summary.map(r => (
                <TableRow key={r.category}>
                  <TableCell className="font-medium">{catLabel(r.category)}</TableCell>
                  <TableCell className="text-right">{r.rooms || "-"}</TableCell><TableCell className="text-right">{r.residents || "-"}</TableCell>
                  <TableCell className="text-right">{r.food ? fmt(r.food) : "-"}</TableCell><TableCell className="text-right">{r.room ? fmt(r.room) : "-"}</TableCell>
                  <TableCell className="text-right font-medium">{r.total ? fmt(r.total) : "-"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold border-t-2 bg-primary/10">
                <TableCell>Total</TableCell><TableCell className="text-right">{totals.rooms}</TableCell><TableCell className="text-right">{totals.residents}</TableCell>
                <TableCell className="text-right">{fmt(totals.food)}</TableCell><TableCell className="text-right">{fmt(totals.room)}</TableCell><TableCell className="text-right">{fmt(totals.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
