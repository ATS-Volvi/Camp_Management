import { useNavigate } from "react-router-dom";
import { AlertTriangle, Trash2, Archive, Users, DoorOpen, ShieldAlert } from "lucide-react";
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
  totalOccupants?: number;
  totalRooms?: number;
}

export default function DeleteCampDialog({
  open,
  onOpenChange,
  camp,
  totalOccupants = 0,
  totalRooms = 0,
}: DeleteCampDialogProps) {
  const navigate = useNavigate();
  const deleteCamp = useDeleteCamp();
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
      await deleteCamp.mutateAsync({ id: camp.id, archive: false });
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
            <div className="p-2.5 rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg">Delete Camp</DialogTitle>
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
                <p className={`font-bold text-sm ${hasOccupants ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                  {totalOccupants}
                </p>
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

          {/* Warning banner if inmates/rooms present */}
          {hasOccupants ? (
            <div className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/10 text-xs space-y-2 text-foreground">
              <p className="font-semibold text-destructive flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 shrink-0" /> Warning: {totalOccupants} Active Resident(s) Present
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Deleting <strong>{camp.name}</strong> will permanently remove the facility and its {totalRooms} rooms.
                All {totalOccupants} active residents will be cleanly detached and released from this camp.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 text-xs space-y-1 text-muted-foreground">
              <p className="text-foreground font-medium">Are you sure you want to delete this camp?</p>
              <p>This will permanently remove <strong>{camp.name}</strong> and its {totalRooms} rooms from the system.</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          {hasOccupants && (
            <Button
              variant="outline"
              onClick={handleArchive}
              disabled={deleteCamp.isPending}
              className="gap-1.5 text-xs"
              title="Decommission camp without removing historical records"
            >
              <Archive className="h-3.5 w-3.5 text-amber-600" /> Archive Instead
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteCamp.isPending}
            className="gap-1.5 font-bold shadow-xs"
          >
            <Trash2 className="h-4 w-4" />
            {deleteCamp.isPending ? "Deleting..." : "Delete Camp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
