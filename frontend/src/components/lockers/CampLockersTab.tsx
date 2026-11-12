import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Lock, Key, ShieldCheck, AlertTriangle, Plus, Search, Filter, Wrench, CheckCircle2, UserCheck, RefreshCw, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useCampLockers, useActiveLockerAssignments, useCreateLocker, type CampLocker, type InmateLockerAssignment } from "@/hooks/useLockers";
import AssignLockerDialog from "./AssignLockerDialog";
import ReleaseLockerDialog from "./ReleaseLockerDialog";

interface Props {
  campId: string;
}

export default function CampLockersTab({ campId }: Props) {
  const qc = useQueryClient();
  const { data: lockers = [], isLoading: lockersLoading, refetch } = useCampLockers(campId);
  const { data: activeAssignments = [] } = useActiveLockerAssignments(campId);
  const createLocker = useCreateLocker();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<InmateLockerAssignment | null>(null);
  const [selectedInmateForAssign, setSelectedInmateForAssign] = useState<any>(null);

  // New locker form states
  const [newLockerNumber, setNewLockerNumber] = useState("");
  const [newKeyNumber, setNewKeyNumber] = useState("");
  const [newRoomId, setNewRoomId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Map of lockerId -> active assignment
  const assignmentMap = useMemo(() => {
    const map = new Map<string, InmateLockerAssignment>();
    activeAssignments.forEach((a) => {
      map.set(a.locker_id, a);
    });
    return map;
  }, [activeAssignments]);

  // Fetch rooms for this camp to link lockers
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_number, building_id, buildings(name)")
        .eq("camp_id", campId)
        .order("room_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!campId,
  });

  // Filtered lockers
  const filtered = useMemo(() => {
    return lockers.filter((l) => {
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const assignment = assignmentMap.get(l.id);
      const matchesSearch =
        !search ||
        l.locker_number.toLowerCase().includes(search.toLowerCase()) ||
        (l.key_number && l.key_number.toLowerCase().includes(search.toLowerCase())) ||
        (l.rooms?.room_number && l.rooms.room_number.toLowerCase().includes(search.toLowerCase())) ||
        (assignment?.employees?.name && assignment.employees.name.toLowerCase().includes(search.toLowerCase())) ||
        (assignment?.employees?.employee_id && assignment.employees.employee_id.toLowerCase().includes(search.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [lockers, statusFilter, search, assignmentMap]);

  // Stats
  const totalCount = lockers.length;
  const availableCount = lockers.filter((l) => l.status === "available").length;
  const assignedCount = lockers.filter((l) => l.status === "assigned").length;
  const maintenanceCount = lockers.filter((l) => l.status === "maintenance" || l.status === "damaged").length;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLockerNumber.trim()) return;

    const chosenRoom = rooms.find((r: any) => r.id === newRoomId);
    try {
      await createLocker.mutateAsync({
        camp_id: campId,
        building_id: chosenRoom?.building_id || null,
        room_id: newRoomId || null,
        locker_number: newLockerNumber.trim(),
        key_number: newKeyNumber.trim() || null,
        notes: newNotes.trim() || null,
      });
      setAddDialogOpen(false);
      setNewLockerNumber("");
      setNewKeyNumber("");
      setNewRoomId("");
      setNewNotes("");
    } catch {
      // handled in mutation
    }
  };

  const handleReleaseClick = (locker: CampLocker) => {
    const assignment = assignmentMap.get(locker.id);
    if (assignment) {
      setSelectedAssignment(assignment);
      setReleaseDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Lockers</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Available</p>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{availableCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Assigned</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{assignedCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Maintenance / Damaged</p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{maintenanceCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Wrench className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search locker, key, room, or inmate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="damaged">Damaged</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Locker
          </Button>
        </div>
      </div>

      {/* Lockers Table */}
      <div className="rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-32 font-semibold text-xs">Locker #</TableHead>
              <TableHead className="font-semibold text-xs">Location</TableHead>
              <TableHead className="w-28 font-semibold text-xs">Key #</TableHead>
              <TableHead className="w-28 font-semibold text-xs">Status</TableHead>
              <TableHead className="font-semibold text-xs">Assigned Inmate</TableHead>
              <TableHead className="w-24 font-semibold text-xs">Condition</TableHead>
              <TableHead className="w-28 text-right font-semibold text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lockersLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading lockers...
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                  No lockers match your filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => {
                const assignment = assignmentMap.get(l.id);
                return (
                  <TableRow key={l.id} className="text-xs">
                    <TableCell className="font-mono font-bold text-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-primary" /> {l.locker_number}
                    </TableCell>
                    <TableCell>
                      {l.rooms ? (
                        <span>
                          Room <strong className="text-foreground">{l.rooms.room_number}</strong>
                          {l.rooms.buildings?.name && <span className="text-muted-foreground text-[11px]"> ({l.rooms.buildings.name})</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {l.key_number ? (
                        <span className="flex items-center gap-1">
                          <Key className="h-3 w-3 text-amber-500" /> {l.key_number}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {l.status === "available" && (
                        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50/50 dark:bg-green-950/20 text-[11px]">
                          Available
                        </Badge>
                      )}
                      {l.status === "assigned" && (
                        <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 text-[11px]">
                          Assigned
                        </Badge>
                      )}
                      {l.status === "maintenance" && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-[11px]">
                          Maintenance
                        </Badge>
                      )}
                      {l.status === "damaged" && (
                        <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50/50 dark:bg-red-950/20 text-[11px]">
                          Damaged
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment?.employees ? (
                        <div>
                          <p className="font-medium text-foreground">{assignment.employees.name}</p>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {assignment.employees.employee_id} • since {assignment.assigned_date}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`capitalize ${
                        l.condition === "good" ? "text-green-600" : l.condition === "repair" ? "text-amber-600" : "text-red-600 font-medium"
                      }`}>
                        {l.condition}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === "assigned" && assignment && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-50"
                          onClick={() => handleReleaseClick(l)}
                        >
                          Release
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Locker Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Locker</DialogTitle>
            <DialogDescription>
              Register a new locker and assign it to a room or common area.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="add-lck-num" className="text-xs font-medium">Locker Number / Tag *</Label>
              <Input
                id="add-lck-num"
                placeholder="e.g. LCK-A-101-1"
                required
                value={newLockerNumber}
                onChange={(e) => setNewLockerNumber(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-key-num" className="text-xs font-medium">Key Number</Label>
              <Input
                id="add-key-num"
                placeholder="e.g. K-101-1"
                value={newKeyNumber}
                onChange={(e) => setNewKeyNumber(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Assigned Room</Label>
              <Select value={newRoomId} onValueChange={setNewRoomId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select room (optional)..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {rooms.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.room_number} {r.buildings?.name ? `(${r.buildings.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-notes" className="text-xs font-medium">Notes</Label>
              <Input
                id="add-notes"
                placeholder="e.g. Near window, bottom locker"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newLockerNumber.trim() || createLocker.isPending}>
                {createLocker.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Create Locker
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Release Locker Dialog */}
      <ReleaseLockerDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        assignment={selectedAssignment}
      />
    </div>
  );
}

