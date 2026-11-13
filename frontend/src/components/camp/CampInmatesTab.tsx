import { useState } from "react";
import { useInmatesReport } from "@/hooks/useInmatesReport";
import { matchesInmateLocation } from "@/lib/inmatesReport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, LogOut, MessageCircle, Phone, Upload, Download, FileText, RotateCcw, Lock, Plus } from "lucide-react";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import CampBulkUploadDialog from "@/components/camp/CampBulkUploadDialog";
import InmateCheckoutDialog from "@/components/camp/InmateCheckoutDialog";
import PresenceStatusCell from "@/components/employees/PresenceStatusCell";
import { useActiveLockerAssignments, type InmateLockerAssignment } from "@/hooks/useLockers";
import AssignLockerDialog from "@/components/lockers/AssignLockerDialog";
import ReleaseLockerDialog from "@/components/lockers/ReleaseLockerDialog";

interface Props {
  campId?: string;
  campName?: string;
}

export default function CampInmatesTab({ campId, campName }: Props) {
  const [search, setSearch] = useState("");
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedInmate, setSelectedInmate] = useState<any>(null);

  const [campFilter, setCampFilter] = useState("all");
  const [blockFilter, setBlockFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");

  const [assignLockerOpen, setAssignLockerOpen] = useState(false);
  const [releaseLockerOpen, setReleaseLockerOpen] = useState(false);
  const [lockerInmate, setLockerInmate] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<InmateLockerAssignment | null>(null);

  const { data: activeAssignments = [] } = useActiveLockerAssignments(campId);
  const assignmentsByEmployeeId = new Map<string, InmateLockerAssignment>();
  (Array.isArray(activeAssignments) ? activeAssignments : []).forEach((a) => {
    if (a?.employee_id) assignmentsByEmployeeId.set(a.employee_id, a);
  });

  const { data: inmates = [], isLoading, isError, refetch } = useInmatesReport(campId);
  const resetLocations = () => { setBlockFilter("all"); setFloorFilter("all"); setRoomFilter("all"); };
  const scope = { camp: campId ?? campFilter, block: blockFilter, floor: floorFilter, room: roomFilter };
  const options = (rows: any[], key: string, label: (row: any) => string) =>
    [...new Map(rows.map(row => [row[key], { value: row[key], label: label(row) }])).values()]
      .filter(o => o.value).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const campRows = inmates.filter(row => matchesInmateLocation(row, { ...scope, block: "all", floor: "all", room: "all" }));
  const blockRows = campRows.filter(row => blockFilter === "all" || row.block_id === blockFilter);
  const floorRows = blockRows.filter(row => floorFilter === "all" || row.floor_key === floorFilter);
  const filterSelect = (label: string, value: string, change: (value: string) => void, items: { value: string; label: string }[]) => (
    <div className="min-w-0 space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={change}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All {label === "Camp" ? "Camps" : label === "Block" ? "Blocks" : label === "Floor" ? "Floors" : "Rooms"}</SelectItem>
          {items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const handleCheckoutClick = (inmate: any) => {
    setSelectedInmate(inmate);
    setCheckoutDialogOpen(true);
  };

  const handleAssignLockerClick = (inmate: any) => {
    setLockerInmate(inmate);
    setAssignLockerOpen(true);
  };

  const handleLockerClick = (inmate: any, assignment: InmateLockerAssignment) => {
    setLockerInmate(inmate);
    setSelectedAssignment(assignment);
    setReleaseLockerOpen(true);
  };

  const filtered = inmates.filter((i: any) => {
    if (!matchesInmateLocation(i, scope)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      i.name?.toLowerCase().includes(s) ||
      i.employee_id?.toLowerCase().includes(s) ||
      i.passport_number?.toLowerCase().includes(s) ||
      i.supplier_name?.toLowerCase().includes(s) ||
      i.project?.toLowerCase().includes(s) ||
      i.room_number?.toLowerCase().includes(s)
    );
  });

  const exportRows = filtered.map((i: any) => ({
    "Employee ID": i.employee_id, Name: i.name, Camp: i.camp_name, Block: i.block_name,
    Floor: i.floor_name, Room: i.room_number, "Room Type": getRoomCategoryLabel(i.room_category),
    Locker: assignmentsByEmployeeId.get(i.id)?.camp_lockers?.locker_number || "None",
    Project: i.project ?? "", Supplier: i.employee_type === "own" ? "Own" : i.supplier_name ?? "",
    "Check-In Date": new Date(i.check_in_date).toLocaleDateString("en-GB"),
    "Passport / Iqama": i.passport_number || i.iqama_number || "", Presence: i.presence_status ?? "active",
    "Room Rate / Day (SAR)": i.daily_rate, "Food Rate / Day (SAR)": i.daily_food_rate,
    "Tariff / Day (SAR)": Number((i.daily_rate + i.daily_food_rate).toFixed(2)),
  }));
  const exportExcel = () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(exportRows), "Inmates");
    XLSX.writeFile(book, "Inmates_Report.xlsx");
  };
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16); doc.text(`Inmates Report — ${campName ?? "All Camps"}`, 14, 16);
    doc.setFontSize(9); doc.text(`${filtered.length} inmates • ${new Date().toLocaleDateString("en-GB")}`, 14, 23);
    const columns = Object.keys(exportRows[0] ?? {});
    autoTable(doc, { startY: 28, head: [columns], body: exportRows.map(row => Object.values(row)),
      styles: { fontSize: 7 }, headStyles: { fillColor: [99, 165, 218] } });
    doc.save("Inmates_Report.pdf");
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    return phone.replace(/[^0-9+]/g, "");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          Inmates ({filtered.length})
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!filtered.length || isLoading || isError} className="gap-1.5"><Download size={14} /> Excel</Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={!filtered.length || isLoading || isError} className="gap-1.5"><FileText size={14} /> PDF</Button>
          {campId && <Button variant="outline" size="sm" onClick={() => setBulkUploadOpen(true)} className="gap-1.5">
            <Upload size={14} /> Bulk Upload
          </Button>}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search name, ID, passport, supplier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className={`grid gap-3 items-end ${campId ? "sm:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-5"}`}>
        {!campId && filterSelect("Camp", campFilter, value => { setCampFilter(value); resetLocations(); }, options(inmates, "camp_id", row => row.camp_name))}
        {filterSelect("Block", blockFilter, value => { setBlockFilter(value); setFloorFilter("all"); setRoomFilter("all"); }, options(campRows, "block_id", row => !campId && campFilter === "all" ? `${row.camp_name} / ${row.block_name}` : row.block_name))}
        {filterSelect("Floor", floorFilter, value => { setFloorFilter(value); setRoomFilter("all"); }, options(blockRows, "floor_key", row => blockFilter === "all" ? `${row.block_name} / ${row.floor_name}` : row.floor_name))}
        {filterSelect("Room", roomFilter, setRoomFilter, options(floorRows, "room_id", row => `${row.block_name} / ${row.floor_name} / ${row.room_number}`))}
        <Button variant="outline" onClick={() => { setCampFilter("all"); resetLocations(); setSearch(""); }} className="gap-2"><RotateCcw size={14} /> Reset</Button>
      </div>

      {isError ? <div className="text-sm text-destructive py-8 text-center">Unable to load inmates. <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button></div> : isLoading ? (
        <p className="text-muted-foreground text-sm text-center py-8">Loading inmates...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No inmates found.</p>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Passport / Iqama</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Check-In Date</TableHead>
                {!campId && <TableHead>Camp</TableHead>}
                <TableHead>Block</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Locker</TableHead>
                <TableHead>Food</TableHead>
                <TableHead>Presence</TableHead>
                <TableHead className="text-right">Tariff/Day</TableHead>
                <TableHead>Contact</TableHead>
                {campId && <TableHead className="text-center">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inmate: any, idx: number) => {
                const phone = formatPhone(inmate.phone);
                const waLink = phone
                  ? `https://wa.me/${phone.startsWith("+") ? phone.slice(1) : phone}`
                  : null;

                return (
                  <TableRow key={inmate.id}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {inmate.name}
                      <div className="text-xs text-muted-foreground">{inmate.employee_id}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {inmate.passport_number || inmate.iqama_number || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{inmate.project || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={inmate.employee_type === "own" ? "default" : "secondary"} className="text-xs">
                        {inmate.employee_type === "own" ? "Own" : inmate.supplier_name || "Supplier"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(inmate.check_in_date).toLocaleDateString("en-US", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </TableCell>
                    {!campId && <TableCell className="text-sm whitespace-nowrap">{inmate.camp_name}</TableCell>}
                    <TableCell>{inmate.block_name}</TableCell>
                    <TableCell>{inmate.floor_name}</TableCell>
                    <TableCell className="font-mono text-sm">{inmate.room_number}</TableCell>
                    <TableCell className="text-xs">
                      {getRoomCategoryLabel(inmate.room_category)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const assignment = assignmentsByEmployeeId.get(inmate.id);
                        if (assignment) {
                          return (
                            <Badge
                              variant="outline"
                              className="font-mono text-[11px] gap-1 border-primary/40 bg-primary/5 text-foreground cursor-pointer hover:bg-primary/10 transition-colors py-0.5"
                              onClick={() => handleLockerClick(inmate, assignment)}
                              title="Click to inspect or release locker"
                            >
                              <Lock size={11} className="text-primary shrink-0" />
                              <span>{assignment.camp_lockers?.locker_number || "Assigned"}</span>
                              {assignment.camp_lockers?.key_number && (
                                <span className="text-muted-foreground text-[10px]">({assignment.camp_lockers.key_number})</span>
                              )}
                            </Badge>
                          );
                        }
                        return campId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] text-muted-foreground hover:text-primary gap-1 px-2 border border-dashed border-border hover:border-primary/50"
                            onClick={() => handleAssignLockerClick(inmate)}
                          >
                            <Plus size={11} /> Assign
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {inmate.daily_food_rate > 0 ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                          Included
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Not Included
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {campId ? <PresenceStatusCell employeeId={inmate.id} status={inmate.presence_status} /> : <Badge variant="secondary">{inmate.presence_status?.replace("_", " ") ?? "active"}</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {(inmate.daily_rate + inmate.daily_food_rate).toFixed(2)} SAR
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {phone && (
                          <>
                            <a href={`tel:${phone}`} title="Call">
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Phone size={14} />
                              </Button>
                            </a>
                            {waLink && (
                              <a href={waLink} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600">
                                  <MessageCircle size={14} />
                                </Button>
                              </a>
                            )}
                          </>
                        )}
                        {!phone && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    {campId && <TableCell className="text-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleCheckoutClick(inmate)}
                      >
                        <LogOut size={12} />
                        Check Out
                      </Button>
                    </TableCell>}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {campId && <>
      <CampBulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        campId={campId}
        campName={campName || "Camp"}
      />

      <InmateCheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        inmate={selectedInmate}
        campId={campId}
        campName={campName || "Camp"}
      />

      <AssignLockerDialog
        open={assignLockerOpen}
        onOpenChange={setAssignLockerOpen}
        inmate={lockerInmate}
        campId={campId}
      />

      <ReleaseLockerDialog
        open={releaseLockerOpen}
        onOpenChange={setReleaseLockerOpen}
        assignment={selectedAssignment}
        inmateName={lockerInmate?.name}
        inmateNumber={lockerInmate?.employee_id}
      />
      </>}
    </div>
  );
}
