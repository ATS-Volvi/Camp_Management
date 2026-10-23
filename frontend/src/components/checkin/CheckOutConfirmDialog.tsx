import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import { LogOut, User, DoorOpen, Building2, CheckCircle2, AlertTriangle, Star, Ban, Package, FileText, MessageCircle } from "lucide-react";

interface ClearanceItem {
  id: string;
  label: string;
  checked: boolean;
}

interface CheckOutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  employees: Array<{
    id: string;
    name: string;
    employee_id: string;
    designation?: string | null;
    company?: string | null;
    supplier_name?: string | null;
    employee_type?: string;
    checked_in_room_id?: string | null;
  }>;
  rooms: Array<{
    id: string;
    room_number: string;
    category: string;
    current_occupancy: number;
    max_capacity: number;
  }>;
  camp: {
    id: string;
    name: string;
    location: string;
  } | null;
  clearanceItems: ClearanceItem[];
  damageRemarks: string;
  clearanceNotes: string;
  feedback: string;
  feedbackRating: number;
  isBlacklisted: boolean;
  blacklistReason: string;
}

export default function CheckOutConfirmDialog({
  open, onOpenChange, onConfirm, isSubmitting,
  employees, rooms, camp,
  clearanceItems, damageRemarks, clearanceNotes,
  feedback, feedbackRating, isBlacklisted, blacklistReason,
}: CheckOutConfirmDialogProps) {
  const getRoomForEmployee = (emp: any) => {
    return rooms.find(r => r.id === emp.checked_in_room_id);
  };

  const allCleared = clearanceItems.every(i => i.checked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <LogOut size={18} />
            Confirm Check-Out
          </DialogTitle>
          <DialogDescription>
            Review the details below before proceeding with check-out.
          </DialogDescription>
        </DialogHeader>

        {/* Camp Info */}
        {camp && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
            <Building2 size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium">{camp.name}</span>
            <span className="text-xs text-muted-foreground">· {camp.location}</span>
          </div>
        )}

        {/* Employees to check out */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <User size={14} className="text-primary" />
            {employees.length === 1 ? "Employee" : `Employees (${employees.length})`}
          </h4>
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {employees.map((emp, idx) => {
              const room = getRoomForEmployee(emp);
              return (
                <div key={emp.id} className="px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {employees.length > 1 && <span className="text-muted-foreground mr-1">{idx + 1}.</span>}
                      {emp.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {emp.employee_id}
                      {emp.supplier_name && <> · {emp.supplier_name}</>}
                      {emp.company && <> · {emp.company}</>}
                    </p>
                  </div>
                  {room && (
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        <DoorOpen size={10} className="mr-1" />
                        Room {room.room_number}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {getRoomCategoryLabel(room.category)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Clearance Status */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-primary" />
            Clearance Checklist
          </h4>
          <div className="space-y-1">
            {clearanceItems.map(item => (
              <div key={item.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                item.checked ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30" : "text-destructive bg-destructive/5"
              }`}>
                {item.checked ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Remarks */}
        {(damageRemarks || clearanceNotes) && (
          <>
            <Separator />
            <div className="space-y-2">
              {damageRemarks && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={12} /> Damage Remarks
                  </p>
                  <p className="text-xs mt-1">{damageRemarks}</p>
                </div>
              )}
              {clearanceNotes && (
                <div className="px-3 py-2 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileText size={12} /> Clearance Notes
                  </p>
                  <p className="text-xs mt-1">{clearanceNotes}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Feedback */}
        {(feedbackRating > 0 || feedback) && (
          <>
            <Separator />
            <div className="px-3 py-2 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                <Star size={12} className="text-amber-500" /> Feedback
              </p>
              {feedbackRating > 0 && (
                <div className="flex items-center gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={14} className={s <= feedbackRating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{feedbackRating}/5</span>
                </div>
              )}
              {feedback && <p className="text-xs">{feedback}</p>}
            </div>
          </>
        )}

        {/* Blacklist Warning */}
        {isBlacklisted && (
          <>
            <Separator />
            <div className="px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                <Ban size={12} /> Employee will be BLACKLISTED
              </p>
              {blacklistReason && <p className="text-xs mt-1 text-destructive/80">{blacklistReason}</p>}
            </div>
          </>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting || !allCleared}
          >
            {isSubmitting ? "Processing..." : `Confirm Check-Out (${employees.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
