import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Trash2, Archive, Building2, Users, DoorOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDeleteCamp } from "@/hooks/useCampManagement";

interface DeleteCampDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camp: {
    id: string;
    name: string;
    camp_code?: string | null;
    status?: string;
  };
  totalOccupants: number;
  totalRooms: number;
}

export default function DeleteCampDialog({
  open,
  onOpenChange,
  camp,
  totalOccupants,
  totalRooms,
}: DeleteCampDialogProps) {
  const navigate = useNavigate();
  const deleteCamp = useDeleteCamp();
  const [confirmText, setConfirmText] = useState("");
  const hasOccupants = totalOccupants > 0;

  const handleArchive = async () => {
    try {
      await deleteCamp.mutateAsync({ id: camp.id, archive: true });
      onOpenChange(false);
      navigate("/camps");
    } catch {
      // Error handled by hook toast
    }
  };

  const handleDelete = async () => {
    try {
      const res: any = await deleteCamp.mutateAsync({ id: camp.id, archive: false });
      onOpenChange(false);
      navigate("/camps");
    } catch {
      // Error handled by hook toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full ${hasOccupants ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" : "bg-destructive/10 text-destructive"}`}>
              {hasOccupants ? <AlertTriangle className="h-6 w-6" /> : <Trash2 className="h-6 w-6" />}
            </div>
            <div>
              <DialogTitle className="text-lg">
                {hasOccupants ? "Decommission / Archive Camp" : "Delete Camp"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {camp.name} {camp.camp_code && `(${camp.camp_code})`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Camp Snapshot */}
          <div className="grid grid-cols-2 gap-2 text-xs border rounded-lg p-3 bg-muted/40">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">Active Occupants</p>
                <p className="font-bold text-sm text-foreground">{totalOccupants}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">Total Rooms</p>
                <p className="font-bold text-sm text-foreground">{totalRooms}</p>
              </div>
            </div>
          </div>

          {hasOccupants ? (
            /* Warning when active occupants exist */
            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-2 text-foreground">
              <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Cannot Hard Delete: Active Residents Present
              </p>
              <p className="text-muted-foreground">
                This camp currently houses <strong>{totalOccupants} active resident(s)</strong>.
                Hard-deleting is restricted to prevent breaking active room stays, attendance logs, and catering reports.
              </p>
              <p className="text-muted-foreground">
                You can <strong>Archive / Decommission</strong> this camp instead. This changes its status to <Badge variant="secondary" className="text-[10px] uppercase">inactive</Badge>, prevents new check-ins, while keeping all financial and historical records safe.
              </p>
            </div>
          ) : (
            /* Confirm hard deletion when empty */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This camp has <strong>0 active residents</strong>. Proceeding will remove the camp and its empty rooms.
              </p>
              <p className="text-xs text-muted-foreground">
                <em>Note: If historical records (such as past audits, historical room assignments, or invoices) reference this camp, the system will safely decommission/archive it instead to protect data integrity.</em>
              </p>
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-foreground">
                  Type <span className="font-bold select-all text-destructive">{camp.name}</span> to confirm deletion:
                </label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={camp.name}
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          {hasOccupants ? (
            <Button
              variant="default"
              onClick={handleArchive}
              disabled={deleteCamp.isPending}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Archive className="h-4 w-4" /> Decommission / Archive Camp
            </Button>
          ) : (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleArchive}
                disabled={deleteCamp.isPending}
                className="flex-1 sm:flex-none gap-1.5"
                title="Mark inactive without deleting rows"
              >
                <Archive className="h-4 w-4" /> Archive Only
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteCamp.isPending || confirmText !== camp.name}
                className="flex-1 sm:flex-none gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Delete Permanently
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
