import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Lock, Key, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { useCampLockers, useAssignLocker, type CampLocker } from "@/hooks/useLockers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inmate: {
    id: string; // employee uuid
    name: string;
    employee_id: string;
    room_id?: string | null;
    room_number?: string;
    camp_id?: string;
  } | null;
  campId?: string;
}

export default function AssignLockerDialog({ open, onOpenChange, inmate, campId: propCampId }: Props) {
  const campId = inmate?.camp_id || propCampId || "";
  const { data: lockers = [], isLoading } = useCampLockers(campId);
  const assignLocker = useAssignLocker();

  const [selectedLockerId, setSelectedLockerId] = useState<string>("");
  const [keyNumber, setKeyNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Filter available lockers
  const availableLockers = useMemo(() => {
    return lockers.filter((l) => l.status === "available");
  }, [lockers]);

  // Recommend lockers located in the inmate's room first
  const sameRoomLockers = useMemo(() => {
    if (!inmate?.room_id) return [];
    return availableLockers.filter((l) => l.room_id === inmate.room_id);
  }, [availableLockers, inmate?.room_id]);

  const otherLockers = useMemo(() => {
    if (!inmate?.room_id) return availableLockers;
    return availableLockers.filter((l) => l.room_id !== inmate.room_id);
  }, [availableLockers, inmate?.room_id]);

  // Handle selecting a locker
  const handleSelectLocker = (id: string) => {
    setSelectedLockerId(id);
    const found = lockers.find((l) => l.id === id);
    if (found?.key_number) {
      setKeyNumber(found.key_number);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSelectedLockerId("");
      setKeyNumber("");
      setNotes("");
    }
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inmate || !selectedLockerId || !campId) return;

    try {
      await assignLocker.mutateAsync({
        lockerId: selectedLockerId,
        employeeId: inmate.id,
        campId,
        roomId: inmate.room_id || null,
        keyNumber: keyNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      handleOpenChange(false);
    } catch {
      // toast is already handled in mutation
    }
  };

  const selectedLocker = lockers.find((l) => l.id === selectedLockerId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Assign Locker</DialogTitle>
              <DialogDescription>
                Allocate a secure locker and issue key to inmate.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {inmate && (
          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            {/* Inmate Card */}
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{inmate.name}</span>
                <Badge variant="outline" className="font-mono text-xs">{inmate.employee_id}</Badge>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Room: <strong className="text-foreground">{inmate.room_number || "Unassigned"}</strong></span>
              </div>
            </div>

            {/* Locker Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="locker-select" className="text-xs font-medium">Select Available Locker</Label>
                <span className="text-[11px] text-muted-foreground">
                  {availableLockers.length} available
                </span>
              </div>

              {availableLockers.length === 0 ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>No available lockers found in this camp. Please create or release one first.</span>
                </div>
              ) : (
                <Select value={selectedLockerId} onValueChange={handleSelectLocker}>
                  <SelectTrigger id="locker-select" className="w-full">
                    <SelectValue placeholder="Choose a locker..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {sameRoomLockers.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[11px] font-semibold text-primary flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Same Room Lockers (Recommended)
                        </div>
                        {sameRoomLockers.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            🔒 {l.locker_number} (Room {l.rooms?.room_number || inmate.room_number})
                          </SelectItem>
                        ))}
                      </>
                    )}

                    {otherLockers.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground mt-1">
                          Other Camp Lockers
                        </div>
                        {otherLockers.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            🔒 {l.locker_number} {l.rooms ? `(Room ${l.rooms.room_number})` : "(Common)"}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Key Number */}
            <div className="space-y-1">
              <Label htmlFor="key-number" className="text-xs font-medium flex items-center gap-1">
                <Key className="h-3 w-3 text-muted-foreground" /> Key Tag / Key Number
              </Label>
              <Input
                id="key-number"
                placeholder="e.g. K-101-1"
                value={keyNumber}
                onChange={(e) => setKeyNumber(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Matches physical key issued to inmate upon assignment.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="assign-notes" className="text-xs font-medium">Remarks / Condition Notes</Label>
              <Textarea
                id="assign-notes"
                placeholder="Optional notes (e.g. key handed over, locker inspected clean)"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedLockerId || assignLocker.isPending}
                className="gap-2"
              >
                {assignLocker.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Assignment
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
