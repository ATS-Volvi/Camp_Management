import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DrillRecord {
  id: string;
  label: string;
  fields: Record<string, string | number | boolean | null | undefined>;
  children?: DrillRecord[];
  href?: string;
}
export interface ChartSelection { title: string; description?: string; rows: DrillRecord[] }
const display = (value: unknown) => value === null || value === undefined || value === "" ? "—" : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);

export function ChartDrilldown({ selection, onClose, theme, onRecordOpen, detailRows, detailLoading, detailError }: { selection: ChartSelection | null; onClose: () => void; theme?: "light" | "dark"; onRecordOpen?: (record: DrillRecord) => void; detailRows?: DrillRecord[]; detailLoading?: boolean; detailError?: boolean }) {
  const [path, setPath] = useState<DrillRecord[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => { setPath([]); setSearch(""); setPage(0); }, [selection]);
  const current = path.at(-1);
  const rows = current?.children ?? selection?.rows ?? [];
  const leaf = Boolean(current && !current.children);
  const filtered = useMemo(() => rows.filter(row => `${row.label} ${Object.values(row.fields).map(display).join(" ")}`.toLowerCase().includes(search.toLowerCase())), [rows, search]);
  const columns = [...new Set(rows.flatMap(row => Object.keys(row.fields)))].slice(0, 5);
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const openRecord = (row: DrillRecord) => { setPath(prev => [...prev, row]); setSearch(""); setPage(0); if (path.length === 0) onRecordOpen?.(row); };
  return <Dialog open={Boolean(selection)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className={`max-w-5xl w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto ${theme ? "command-dashboard" : ""}`} data-dashboard-theme={theme}>
      <DialogHeader><DialogTitle className="pr-6 leading-snug">{current?.label ?? selection?.title}</DialogTitle><DialogDescription>{selection?.description ?? "Saved records"}{!leaf && ` · ${rows.length.toLocaleString()} records`}</DialogDescription></DialogHeader>
      {path.length > 0 && <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => { setPath(prev => prev.slice(0, -1)); setSearch(""); setPage(0); }}><ArrowLeft />Back to {path.length > 1 ? path[path.length - 2].label : selection?.title}</Button>}
      {leaf && current ? <>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">{Object.entries(current.fields).map(([key, value]) => <div key={key} className="border-b pb-3 min-w-0"><dt className="text-xs text-muted-foreground">{key}</dt><dd className="text-sm font-medium mt-1 break-words whitespace-pre-wrap">{display(value)}</dd></div>)}</dl>
        {path.length === 1 && detailRows !== undefined && <div className="space-y-2"><h3 className="font-semibold text-sm">Inspection responses</h3>{detailLoading ? <p role="status" className="text-sm text-muted-foreground">Loading responses…</p> : detailError ? <p role="alert" className="text-destructive text-sm">Unable to load responses.</p> : detailRows.length ? detailRows.map(row => <Button key={row.id} variant="outline" className="w-full h-auto py-3 justify-between whitespace-normal text-left" onClick={() => openRecord(row)}>{row.label}<ChevronRight /></Button>) : <p className="text-sm text-muted-foreground">No saved inspection responses</p>}</div>}
        {current.href && <Button asChild variant="outline" className="justify-self-start"><a href={current.href}>Open full record<ChevronRight /></a></Button>}
      </> : <>
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search drill-down records" placeholder="Search records" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted"><tr><th className="text-left p-3">Record</th>{columns.map(key => <th key={key} className="text-left p-3 whitespace-nowrap font-medium">{key}</th>)}<th className="p-3"><span className="sr-only">Details</span></th></tr></thead><tbody>{filtered.slice(page * 25, (page + 1) * 25).map(row => <tr key={row.id} className="border-b hover:bg-muted/50"><td className="p-3 min-w-40"><Button variant="link" className="p-0 h-auto text-left whitespace-normal justify-start" onClick={() => openRecord(row)}>{row.label}</Button></td>{columns.map(key => <td key={key} className="p-3 whitespace-nowrap">{display(row.fields[key])}</td>)}<td className="p-3"><Button variant="ghost" size="icon" aria-label={`View ${row.label}`} title={`View ${row.label}`} onClick={() => openRecord(row)}><Eye /></Button></td></tr>)}{!filtered.length && <tr><td colSpan={columns.length + 2} className="text-center p-8 text-muted-foreground">No matching saved records</td></tr>}</tbody></table></div>
        <div className="flex justify-between items-center text-xs text-muted-foreground"><span>{filtered.length} records · Page {page + 1} of {pages}</span><div className="flex gap-1"><Button variant="outline" size="icon" aria-label="Previous records" disabled={page === 0} onClick={() => setPage(prev => prev - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Next records" disabled={page + 1 >= pages} onClick={() => setPage(prev => prev + 1)}><ChevronRight /></Button></div></div>
      </>}
    </DialogContent>
  </Dialog>;
}