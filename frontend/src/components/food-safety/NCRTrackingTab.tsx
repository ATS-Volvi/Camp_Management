import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, CheckCircle2, Edit } from "lucide-react";
import { useNCRRecords, useUpdateNCR, type NCRRecord } from "@/hooks/useFoodSafetyAudit";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Open", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "default" },
  closed: { label: "Closed", variant: "secondary" },
};

export default function NCRTrackingTab() {
  const { data: ncrs = [] } = useNCRRecords();
  const updateNCR = useUpdateNCR();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editNCR, setEditNCR] = useState<NCRRecord | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAssigned, setEditAssigned] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");

  const filtered = statusFilter === "all" ? ncrs : ncrs.filter(n => n.status === statusFilter);
  const openCount = ncrs.filter(n => n.status === "open").length;
  const inProgressCount = ncrs.filter(n => n.status === "in_progress").length;
  const closedCount = ncrs.filter(n => n.status === "closed").length;
  const overdueCount = ncrs.filter(n => n.status !== "closed" && n.target_date && new Date(n.target_date) < new Date()).length;

  const openEdit = (ncr: NCRRecord) => {
    setEditNCR(ncr);
    setEditStatus(ncr.status);
    setEditNotes(ncr.correction_notes || "");
    setEditAssigned(ncr.assigned_to || "");
    setEditTargetDate(ncr.target_date || "");
  };

  const handleUpdate = () => {
    if (!editNCR) return;
    updateNCR.mutate(
      { id: editNCR.id, status: editStatus, correction_notes: editNotes, assigned_to: editAssigned, target_date: editTargetDate || undefined },
      { onSuccess: () => setEditNCR(null) }
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-destructive cursor-pointer" onClick={() => setStatusFilter("open")}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Open</p>
            <p className="text-2xl font-bold text-red-600">{openCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary cursor-pointer" onClick={() => setStatusFilter("in_progress")}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> In Progress</p>
            <p className="text-2xl font-bold">{inProgressCount}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-l-4" style={{ borderLeftColor: "hsl(142, 71%, 45%)" }} onClick={() => setStatusFilter("closed")}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Closed</p>
            <p className="text-2xl font-bold text-green-600">{closedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 cursor-pointer" onClick={() => setStatusFilter("all")}>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-amber-600">{overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* NCR Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NCR #</TableHead>
                <TableHead>Camp</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Target Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(ncr => {
                const isOverdue = ncr.status !== "closed" && ncr.target_date && new Date(ncr.target_date) < new Date();
                return (
                  <TableRow key={ncr.id} className={isOverdue ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                    <TableCell className="text-xs font-mono">{ncr.ncr_number.slice(-8)}</TableCell>
                    <TableCell className="text-xs">{(ncr as any).camps?.name}</TableCell>
                    <TableCell className="text-xs">{ncr.category}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{ncr.description}</TableCell>
                    <TableCell>
                      <Badge variant={ncr.severity === "critical" ? "destructive" : "outline"} className="text-[10px]">
                        {ncr.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{ncr.assigned_to || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {ncr.target_date ? new Date(ncr.target_date).toLocaleDateString() : "—"}
                      {isOverdue && <Badge variant="destructive" className="ml-1 text-[9px]">Overdue</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_MAP[ncr.status]?.variant || "secondary"} className="text-[10px]">
                        {STATUS_MAP[ncr.status]?.label || ncr.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ncr)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No NCR records found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editNCR} onOpenChange={() => setEditNCR(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update NCR</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned To</Label>
              <Input value={editAssigned} onChange={e => setEditAssigned(e.target.value)} placeholder="Person name" />
            </div>
            <div>
              <Label>Target Date</Label>
              <Input type="date" value={editTargetDate} onChange={e => setEditTargetDate(e.target.value)} />
            </div>
            <div>
              <Label>Correction Notes</Label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} />
            </div>
            <Button className="w-full" onClick={handleUpdate} disabled={updateNCR.isPending}>
              {updateNCR.isPending ? "Updating..." : "Update NCR"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
