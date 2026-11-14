import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadInmates } from "@/hooks/useInmatesReport";
import { totalInmatesMatrix } from "@/lib/totalInmates";

const catLabel = (c: string) => (c === "guest" ? "Guest" : c);

export default function TotalInmatesReportTab() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [day, setDay] = useState(today);
  const [camp, setCamp] = useState("all");
  const [dept, setDept] = useState("all");
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["camp-inmates", "total", day], queryFn: () => loadInmates(undefined, day) });
  const camps = useMemo(() => [...new Map(data.map((r: any) => [r.camp_id, r.camp_name])).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]))), [data]);
  const depts = useMemo(() => [...new Set(data.map((r: any) => r.department || "Unassigned"))].sort() as string[], [data]);
  const filtered = data.filter((r: any) => (camp === "all" || r.camp_id === camp) && (dept === "all" || (r.department || "Unassigned") === dept));
  const { statuses, table, grand } = totalInmatesMatrix(filtered);
  const scope = `${camp === "all" ? "All Camps" : camps.find(c => c[0] === camp)?.[1]} | ${dept === "all" ? "All Departments" : dept} | ${format(new Date(day + "T00:00:00"), "dd MMM yyyy")}`;

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text("Total Inmates Report", 14, 16);
    doc.setFontSize(9); doc.text(scope, 14, 23);
    autoTable(doc, { startY: 28, head: [["Room Category", ...statuses, "Total"]],
      body: [...table.map(r => [catLabel(r.category), ...statuses.map(s => r.counts[s]), r.total]), ["Grand Total", ...statuses.map(s => grand.counts[s]), grand.total]],
      headStyles: { fillColor: [99, 165, 218] }, didParseCell: d => { if (d.section === "body" && d.row.index === table.length) d.cell.styles.fontStyle = "bold"; } });
    doc.save(`Total_Inmates_${day}.pdf`);
  };

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-6 grid gap-4 sm:grid-cols-4 items-end">
        <div className="space-y-1"><Label>Camp</Label><Select value={camp} onValueChange={setCamp}><SelectTrigger aria-label="Camp"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Camps</SelectItem>{camps.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Department</Label><Select value={dept} onValueChange={setDept}><SelectTrigger aria-label="Department"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Departments</SelectItem>{depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Day</Label><Input type="date" value={day} max={today} onChange={e => e.target.value && setDay(e.target.value)} /></div>
        <Button variant="outline" onClick={exportPdf} disabled={isLoading || isError} className="gap-2"><Download size={14} /> PDF</Button>
      </CardContent></Card>
      <p className="text-sm text-muted-foreground">{scope}</p>
      {isLoading ? <p className="text-sm text-muted-foreground py-8 text-center">Loading residents…</p>
        : isError ? <p className="text-sm text-destructive py-8 text-center">Could not load residents. <Button variant="link" onClick={() => refetch()}>Retry</Button></p>
        : <div className="border rounded-lg overflow-auto"><Table>
          <TableHeader><TableRow><TableHead>Room Category</TableHead>{statuses.map(s => <TableHead key={s} className="text-right">{s}</TableHead>)}<TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {table.map(r => <TableRow key={r.category}><TableCell className="font-medium">{catLabel(r.category)}</TableCell>
              {statuses.map(s => <TableCell key={s} className="text-right">{r.counts[s] || "-"}</TableCell>)}<TableCell className="text-right font-medium">{r.total || "-"}</TableCell></TableRow>)}
            <TableRow className="font-bold border-t-2 bg-primary/10"><TableCell>Grand Total</TableCell>
              {statuses.map(s => <TableCell key={s} className="text-right">{grand.counts[s]}</TableCell>)}<TableCell className="text-right">{grand.total}</TableCell></TableRow>
          </TableBody></Table></div>}
    </div>
  );
}
