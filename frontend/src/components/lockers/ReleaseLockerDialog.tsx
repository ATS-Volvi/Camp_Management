import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Lock, Key, AlertTriangle, CheckCircle2, Wrench, Loader2 } from "lucide-react";
import { useReleaseLocker, type InmateLockerAssignment } from "@/hooks/useLockers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: InmateLockerAssignment | null;
  inmateName?: string;
  inmateNumber?: string;
}

export default function ReleaseLockerDialog({
  open,
  onOpenChange,
  assignment,
  inmateName,
  inmateNumber,
}: Props) {
  const releaseLocker = useReleaseLocker();

  const [keyReturned, setKeyReturned] = useState<boolean>(true);
  const [condition, setCondition] = useState<"good" | "repair" | "damaged">("good");
  const [damageRemarks, setDamageRemarks] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      setKeyReturned(true);
      setCondition("good");
      setDamageRemarks("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;

    try {
      await releaseLocker.mutateAsync({
        assignmentId: assignment.id,
        lockerId: assignment.locker_id,
        keyReturned,
        condition,
        damageRemarks: condition !== "good" ? damageRemarks : undefined,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      // toast is handled in mutation
    }
  };

  const locker = assignment?.camp_lockers;
  const displayName = inmateName || assignment?.employees?.name || "Inmate";
  const displayId = inmateNumber || assignment?.employees?.employee_id || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Release Locker Assignment</DialogTitle>
              <DialogDescription>
                Verify key return and inspect locker condition before closing assignment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {assignment && (
          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            {/* Locker Info Summary */}
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground">Inmate:</span>
                  <p className="font-semibold text-sm text-foreground">{displayName}</p>
                </div>
                {displayId && <Badge variant="outline" className="font-mono text-xs">{displayId}</Badge>}
              </div>

              <div className="flex items-center gap-3 pt-1 border-t border-border/50 text-xs">
                <span className="flex items-center gap-1 font-mono font-medium text-foreground">
                  <Lock className="h-3 w-3 text-primary" /> {locker?.locker_number || "Locker"}
                </span>
                {locker?.key_number && (
                  <span className="flex items-center gap-1 font-mono text-muted-foreground">
                    <Key className="h-3 w-3 text-amber-500" /> Key: {locker.key_number}
                  </span>
                )}
                <span className="text-muted-foreground ml-auto">
                  Assigned: {assignment.assigned_date}
                </span>
              </div>
            </div>

            {/* Key Return Switch */}
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="key-switch" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Key className="h-4 w-4 text-amber-500" /> Physical Key Returned
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Did the inmate hand over the locker key?
                </p>
              </div>
              <Switch
                id="key-switch"
                checked={keyReturned}
                onCheckedChange={setKeyReturned}
              />
            </div>

            {!keyReturned && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Status will be recorded as <strong>Lost Key</strong>. Key replacement may apply.</span>
              </div>
            )}

            {/* Locker Condition Radio Group */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Locker Condition on Return</Label>
              <RadioGroup
                value={condition}
                onValueChange={(v) => setCondition(v as any)}
                className="grid grid-cols-3 gap-2"
              >
                <div className={`flex flex-col items-center justify-center rounded-lg border p-2 cursor-pointer text-center transition-colors ${
                  condition === "good" ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300" : "border-border/60 hover:bg-muted/50"
                }`}>
                  <RadioGroupItem value="good" id="cond-good" className="sr-only" />
                  <label htmlFor="cond-good" className="cursor-pointer w-full flex flex-col items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Good / Clean</span>
                  </label>
                </div>

                <div className={`flex flex-col items-center justify-center rounded-lg border p-2 cursor-pointer text-center transition-colors ${
                  condition === "repair" ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border/60 hover:bg-muted/50"
                }`}>
                  <RadioGroupItem value="repair" id="cond-repair" className="sr-only" />
                  <label htmlFor="cond-repair" className="cursor-pointer w-full flex flex-col items-center gap-1">
                    <Wrench className="h-4 w-4" />
                    <span className="text-xs font-medium">Needs Repair</span>
                  </label>
                </div>

                <div className={`flex flex-col items-center justify-center rounded-lg border p-2 cursor-pointer text-center transition-colors ${
                  condition === "damaged" ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300" : "border-border/60 hover:bg-muted/50"
                }`}>
                  <RadioGroupItem value="damaged" id="cond-damaged" className="sr-only" />
                  <label htmlFor="cond-damaged" className="cursor-pointer w-full flex flex-col items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">Damaged</span>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {condition !== "good" && (
              <div className="space-y-1">
                <Label htmlFor="damage-remarks" className="text-xs font-medium text-red-600 dark:text-red-400">
                  Damage / Repair Remarks *
                </Label>
                <Textarea
                  id="damage-remarks"
                  placeholder="Describe damage (e.g., broken latch, dented door, missing lock)"
                  rows={2}
                  required
                  value={damageRemarks}
                  onChange={(e) => setDamageRemarks(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}

            {/* General Clearance Remarks */}
            <div className="space-y-1">
              <Label htmlFor="release-notes" className="text-xs font-medium">Clearance Notes</Label>
              <Textarea
                id="release-notes"
                placeholder="Optional notes regarding handover..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={condition === "good" ? "default" : "destructive"}
                disabled={releaseLocker.isPending || (condition !== "good" && !damageRemarks.trim())}
                className="gap-2"
              >
                {releaseLocker.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Release & Return
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

