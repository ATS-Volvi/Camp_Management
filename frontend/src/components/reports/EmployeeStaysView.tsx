import { useMemo, useState } from "react";
import { Download, Printer, Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEmployeeStays } from "@/hooks/useEmployeeStays";
import { scopeEmployeeStays, type EmployeeStay } from "@/lib/employeeStays";
import { downloadEmployeeStaysPdf, readable, stayDate } from "@/lib/employeeStaysPdf";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import "./employeeStaysPrint.css";

function RequestDetails({ stay }: { stay: EmployeeStay }) {
  return <div className="space-y-3">
    <h3 className="font-semibold">{stay.employee?.employee_id} · {stay.employee?.name}</h3>
    <p className="text-sm">{stay.camp} · Room {stay.room} · {stayDate(stay.arrival)} – {stay.departure ? stayDate(stay.departure) : stay.status} · {stay.days ?? "Unknown"} days</p>
    {stay.requests.length ? <Table><TableHeader><TableRow>{["From", "To", "Meals", "Reason", "Status", "Source", "Remarks"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{stay.requests.map(r => <TableRow key={r.id}>
      <TableCell className="whitespace-nowrap">{stayDate(r.from_date)}</TableCell><TableCell className="whitespace-nowrap">{stayDate(r.to_date)}</TableCell>
      <TableCell>{r.food_cancellation_request_meals.map(m => readable(m.meal_type)).join(", ") || "Not recorded"}</TableCell>
      <TableCell>{readable(r.reason)}</TableCell><TableCell><Badge variant="outline">{readable(r.status)}</Badge></TableCell>
      <TableCell>{readable(r.source)}{!r.camp_id && " (unlinked camp)"}</TableCell><TableCell>{r.remarks || "—"}</TableCell>
    </TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No food cancellation requests for this stay.</p>}
    {stay.checkout && <div className="text-sm space-y-1"><p>Assets returned: {stay.checkout.assets_returned === null ? "Not recorded" : stay.checkout.assets_returned ? "Yes" : "No"}</p><p>Damage remarks: {stay.checkout.damage_remarks || "—"}</p><p>Clearance notes: {stay.checkout.clearance_notes || "—"}</p></div>}
  </div>;
}

export default function EmployeeStaysView({ checkoutOnly = false, campId, campName, employeeId }: { checkoutOnly?: boolean; campId?: string; campName?: string; employeeId?: string }) {
  const { data = [], isLoading, error, refetch } = useEmployeeStays();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [page, setPage] = useState(0); const [selected, setSelected] = useState<EmployeeStay | null>(null);
  const base = useMemo(() => scopeEmployeeStays(data, campId, checkoutOnly).filter(r => !employeeId || r.employee_id === employeeId).sort((a, b) => employeeId ? (a.arrival ?? a.departure ?? "").localeCompare(b.arrival ?? b.departure ?? "") : 0), [data, campId, checkoutOnly, employeeId]);
  const filterFields = [
    ["camp", "Camps"], ["department", "Departments"], ["employee_type", "Types"], ["supplier_name", "Suppliers"],
    ["designation", "Designations"], ["company", "Companies"], ["project", "Projects"], ["status", "Statuses"],
  ].filter(([key]) => !campId || key !== "camp");
  const field = (r: EmployeeStay, key: string) => key === "camp" ? r.camp : key === "status" ? r.status : r.employee?.[key as keyof NonNullable<EmployeeStay["employee"]>] ?? "";
  const filtered = useMemo(() => base.filter(r => {
    const text = `${r.employee?.name ?? ""} ${r.employee?.employee_id ?? ""}`.toLowerCase();
    if (!text.includes(search.toLowerCase())) return false;
    if (Object.entries(filters).some(([key, value]) => value !== "all" && field(r, key) !== value)) return false;
    if (checkoutOnly) { const d = r.departure?.slice(0, 10) ?? ""; return (!from || d >= from) && (!to || d <= to); }
    return (!to || !r.arrival || r.arrival.slice(0, 10) <= to) && (!from || !r.departure || r.departure.slice(0, 10) >= from);
  }), [base, search, filters, from, to, checkoutOnly]);
  const pages = Math.max(1, Math.ceil(filtered.length / 50)); const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 50, currentPage * 50 + 50);
  const filterSummary = [employeeId ? `Employee: ${base[0]?.employee?.employee_id ?? ""} ${base[0]?.employee?.name ?? ""} | All camps` : "", campId ? `Camp: ${campName || base[0]?.camp || campId}` : "", search ? `Employee: ${search}` : "", ...Object.entries(filters).filter(([, v]) => v !== "all").map(([k, v]) => `${readable(k)}: ${v}`), from ? `From ${stayDate(from)}` : "", to ? `To ${stayDate(to)}` : ""].filter(Boolean).join(" | ") || "All camps";
  const exportCsv = () => {
    const columns = ["Employee ID", "Name", "Department", "Designation", "Type", "Company", "Supplier", "Project", "Camp", "Room", "Category", "Check-in", "Checkout", "Days stayed", "Status", "Food cancellation requests", "Assets returned", "Damage remarks", "Clearance notes"];
    const rows = filtered.map(r => [r.employee?.employee_id, r.employee?.name, r.employee?.department, r.employee?.designation, r.employee?.employee_type, r.employee?.company, r.employee?.supplier_name, r.employee?.project, r.camp, r.room, getRoomCategoryLabel(r.category), r.arrival, r.departure, r.days, r.status,
      r.requests.map(q => `${q.id}: ${q.from_date} to ${q.to_date}; ${q.food_cancellation_request_meals.map(m => m.meal_type).join("/")}; ${q.status}; ${q.reason}`).join(" | "),
      r.checkout?.assets_returned === null || !r.checkout ? "" : r.checkout.assets_returned ? "Yes" : "No", r.checkout?.damage_remarks, r.checkout?.clearance_notes]);
    const csv = [columns, ...rows].map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = checkoutOnly ? "checkout-report.csv" : "employee-stays.csv";
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  return <section className="space-y-4 employee-stays-view">
    <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
      <div className="flex flex-wrap gap-6 text-sm"><span><strong>{filtered.length}</strong> {checkoutOnly ? "check-outs" : "stays"}</span><span><strong>{new Set(filtered.map(r => r.employee_id)).size}</strong> employees</span><span><strong>{filtered.reduce((n, r) => n + (r.days ?? 0), 0)}</strong> total days{filtered.some(r => r.days === null) ? " (known stays)" : ""}</span><span><strong>{filtered.reduce((n, r) => n + r.requests.length, 0)}</strong> food requests</span></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={isLoading || !!error || !filtered.length} onClick={() => downloadEmployeeStaysPdf(filtered, checkoutOnly, filterSummary)}><Download size={16} className="mr-2" />Export PDF</Button><Button variant="outline" disabled={isLoading || !!error || !filtered.length} onClick={exportCsv}><Download size={16} className="mr-2" />Export CSV</Button><Button variant="outline" disabled={!filtered.length || !!error} onClick={() => window.print()}><Printer size={16} className="mr-2" />Print</Button></div>
    </div>
    <div className="space-y-3 print:hidden">
      <div className="relative max-w-md"><Search size={16} className="absolute left-3 top-3 text-muted-foreground" /><Input aria-label="Search employees" placeholder="Employee name or ID" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{filterFields.map(([key, label]) => <Select key={key} value={filters[key] ?? "all"} onValueChange={value => { setFilters(p => ({ ...p, [key]: value })); setPage(0); }}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All {label}</SelectItem>{[...new Set(base.map(r => field(r, key)).filter(Boolean))].sort().map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>)}</div>
      <div className="flex flex-wrap items-end gap-3"><div><Label htmlFor="stays-from">{checkoutOnly ? "Checkout from" : "Stay from"}</Label><Input id="stays-from" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0); }} /></div><div><Label htmlFor="stays-to">{checkoutOnly ? "Checkout to" : "Stay to"}</Label><Input id="stays-to" type="date" min={from || undefined} value={to} onChange={e => { setTo(e.target.value); setPage(0); }} /></div><Button variant="ghost" onClick={() => { setFilters({}); setSearch(""); setFrom(""); setTo(""); setPage(0); }}>Clear filters</Button></div>
    </div>
    {isLoading ? <p className="py-12 text-center text-muted-foreground">Loading employee stays…</p> : error ? <div role="alert" className="py-8 text-center"><p>Unable to load employee stays.</p><Button variant="outline" onClick={() => refetch()}>Retry</Button></div> : !filtered.length ? <p className="py-12 text-center text-muted-foreground">No stays match these filters.</p> : <>
      <div className="border rounded-lg overflow-auto print:hidden"><Table><TableHeader><TableRow>{["Stay #", "Employee", "Department", "Designation", "Camp", "Room / Type", "Check-in", "Checkout", "Days stayed", "Reason for exit", "Status", "Food requests"].map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}</TableRow></TableHeader><TableBody>{visible.map((r, index) => <TableRow key={r.id}>
        <TableCell>{currentPage * 50 + index + 1}</TableCell>
        <TableCell className="min-w-40"><div className="font-medium">{r.employee?.name ?? "Unknown employee"}</div><div className="text-xs text-muted-foreground">{r.employee?.employee_id ?? "—"}</div></TableCell><TableCell>{r.employee?.department || "—"}</TableCell><TableCell>{r.employee?.designation || "—"}</TableCell><TableCell>{r.camp}</TableCell><TableCell className="whitespace-nowrap">{r.room} / {getRoomCategoryLabel(r.category)}</TableCell><TableCell className="whitespace-nowrap">{stayDate(r.arrival)}</TableCell><TableCell className="whitespace-nowrap">{r.departure ? stayDate(r.departure) : r.status === "In camp" ? "In camp" : "Not recorded"}</TableCell><TableCell>{r.days ?? "Unknown"}</TableCell>
        <TableCell className="max-w-56">{r.checkout?.clearance_notes || "—"}</TableCell>
        <TableCell><Badge variant="outline" className="whitespace-nowrap">{r.status}</Badge></TableCell><TableCell><Button variant="ghost" size="sm" aria-label={`View stay for ${r.employee?.employee_id ?? r.id}`} onClick={() => setSelected(r)}><Eye size={14} className="mr-2" />{r.requests.length}</Button></TableCell>
      </TableRow>)}</TableBody></Table></div>
      <div className="flex items-center justify-between print:hidden"><p className="text-xs text-muted-foreground">{currentPage * 50 + 1}–{Math.min((currentPage + 1) * 50, filtered.length)} of {filtered.length}</p><div className="flex items-center gap-2"><Button aria-label="Previous page" variant="outline" size="icon" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></Button><span className="text-sm">{currentPage + 1} / {pages}</span><Button aria-label="Next page" variant="outline" size="icon" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></Button></div></div>
    </>}
    <div className="hidden print:block"><p>{filterSummary}</p><p>{filtered.length} stays · Arrival included, checkout excluded; ongoing stays through today.</p>{filtered.map(r => <div key={r.id} className="py-4 border-b break-inside-avoid"><RequestDetails stay={r} /></div>)}</div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Stay & Food Cancellation Requests</DialogTitle></DialogHeader>{selected && <><RequestDetails stay={selected} /><Button variant="outline" onClick={() => downloadEmployeeStaysPdf([selected], !!selected.checkout)}><Download size={16} className="mr-2" />Download this stay</Button></>}</DialogContent></Dialog>
  </section>;
}