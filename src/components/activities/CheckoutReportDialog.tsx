import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileText, Building2, DoorOpen, User, Calendar, Star, AlertTriangle, Ban, CheckCircle2, Download } from "lucide-react";

interface CheckoutReport {
  id: string;
  employee_name: string;
  employee_id_code: string;
  room_number: string;
  room_category: string | null;
  camp_name: string;
  check_in_date: string | null;
  check_out_date: string;
  stay_days: number;
  daily_rate: number;
  total_cost: number;
  assets_returned: boolean;
  clearance_notes: string | null;
  damage_remarks: string | null;
  feedback: string | null;
  feedback_rating: number | null;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: CheckoutReport | null;
}

export default function CheckoutReportDialog({ open, onOpenChange, report }: Props) {
  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Checkout Report
          </DialogTitle>
          <DialogDescription>
            Auto-generated report for {report.employee_name}
          </DialogDescription>
        </DialogHeader>

        {/* Employee Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <User size={16} className="text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">{report.employee_name}</p>
              <p className="text-xs text-muted-foreground">ID: {report.employee_id_code}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
              <Building2 size={14} className="text-muted-foreground shrink-0" />
              <span className="text-xs font-medium truncate">{report.camp_name}</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
              <DoorOpen size={14} className="text-muted-foreground shrink-0" />
              <span className="text-xs font-medium">Room {report.room_number}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Stay Duration */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Stay Duration</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Check-In</p>
              <p className="font-medium">{report.check_in_date ? format(new Date(report.check_in_date), "dd MMM yyyy, HH:mm") : "—"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Check-Out</p>
              <p className="font-medium">{format(new Date(report.check_out_date), "dd MMM yyyy, HH:mm")}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Calendar size={14} className="text-primary" />
            <span className="text-sm font-semibold">{report.stay_days} day{report.stay_days !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <Separator />

        {/* Financial Summary */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Financial Summary</h4>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Daily Rate</span>
              <span>{report.daily_rate.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span>× {report.stay_days} days</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-primary">{report.total_cost.toFixed(2)} SAR</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Clearance */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Clearance Status</h4>
          <div className={`flex items-center gap-2 p-2 rounded text-xs ${report.assets_returned ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30" : "text-destructive bg-destructive/5"}`}>
            {report.assets_returned ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            Assets {report.assets_returned ? "Returned" : "Not Returned"}
          </div>
        </div>

        {/* Damage Remarks */}
        {report.damage_remarks && (
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle size={12} /> Damage Remarks
            </p>
            <p className="text-xs mt-1">{report.damage_remarks}</p>
          </div>
        )}

        {report.clearance_notes && (
          <div className="px-3 py-2 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground">Clearance Notes</p>
            <p className="text-xs mt-1">{report.clearance_notes}</p>
          </div>
        )}

        {/* Feedback */}
        {(report.feedback_rating || report.feedback) && (
          <>
            <Separator />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feedback</h4>
              {report.feedback_rating && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={14} className={s <= report.feedback_rating! ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{report.feedback_rating}/5</span>
                </div>
              )}
              {report.feedback && <p className="text-xs">{report.feedback}</p>}
            </div>
          </>
        )}

        {/* Blacklist */}
        {report.is_blacklisted && (
          <div className="px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1">
              <Ban size={12} /> BLACKLISTED
            </p>
            {report.blacklist_reason && <p className="text-xs mt-1 text-destructive/80">{report.blacklist_reason}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
