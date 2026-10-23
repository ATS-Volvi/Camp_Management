import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  LogOut, Package, DoorOpen, AlertTriangle, CheckCircle2, FileText, Star, Ban, Loader2, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Inmate {
  id: string;
  name: string;
  employee_id: string;
  room_id: string;
  room_number: string;
  room_category: string;
  daily_rate: number;
  daily_food_rate: number;
  check_in_date: string;
  passport_number?: string | null;
  iqama_number?: string | null;
  supplier_name?: string | null;
  employee_type?: string;
  project?: string | null;
  designation?: string | null;
  phone?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inmate: Inmate | null;
  campId: string;
  campName: string;
}

interface ClearanceItem {
  id: string;
  label: string;
  checked: boolean;
  icon: React.ReactNode;
}

const defaultClearanceItems: ClearanceItem[] = [
  { id: "assets", label: "All assigned assets returned", checked: false, icon: <Package size={16} /> },
  { id: "room", label: "Room inspection completed", checked: false, icon: <DoorOpen size={16} /> },
  { id: "damages", label: "No damages reported", checked: false, icon: <AlertTriangle size={16} /> },
  { id: "keys", label: "Keys / access cards returned", checked: false, icon: <CheckCircle2 size={16} /> },
  { id: "clearance", label: "Clearance form signed", checked: false, icon: <FileText size={16} /> },
];

export default function InmateCheckoutDialog({ open, onOpenChange, inmate, campId, campName }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clearanceItems, setClearanceItems] = useState<ClearanceItem[]>(defaultClearanceItems);
  const [damageRemarks, setDamageRemarks] = useState("");
  const [clearanceNotes, setClearanceNotes] = useState("");
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const allChecked = clearanceItems.every(i => i.checked);

  const toggleClearance = (id: string) => {
    setClearanceItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const resetForm = () => {
    setClearanceItems(defaultClearanceItems);
    setDamageRemarks("");
    setClearanceNotes("");
    setIsBlacklisted(false);
    setBlacklistReason("");
    setFeedback("");
    setFeedbackRating(0);
  };

  const days = inmate?.check_in_date
    ? Math.max(differenceInDays(new Date(), new Date(inmate.check_in_date)), 1)
    : 1;
  const totalCost = inmate ? days * (inmate.daily_rate + inmate.daily_food_rate) : 0;

  const generatePDF = () => {
    if (!inmate) return;
    const now = new Date();
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Check-Out Report", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Camp: ${campName}`, 14, 24);
    doc.text(`Generated: ${format(now, "dd MMM yyyy, hh:mm a")}`, 14, 31);
    doc.text(`Employee: ${inmate.name}`, pageWidth - 14, 24, { align: "right" });
    doc.text(`Room: ${inmate.room_number}`, pageWidth - 14, 31, { align: "right" });

    autoTable(doc, {
      startY: 44,
      head: [[
        "#", "Employee ID", "Name", "Designation", "Supplier / Company",
        "Project", "Room", "Room Type", "Check-In", "Check-Out", "Days",
        "Rate/Day\n(SAR)", "Food/Day\n(SAR)", "Total Cost\n(SAR)",
      ]],
      body: [[
        1,
        inmate.employee_id,
        inmate.name,
        inmate.designation || "-",
        inmate.employee_type === "own" ? "Own" : (inmate.supplier_name || "-"),
        inmate.project || "-",
        inmate.room_number,
        getRoomCategoryLabel(inmate.room_category),
        format(new Date(inmate.check_in_date), "dd/MM/yyyy"),
        format(now, "dd/MM/yyyy"),
        days,
        inmate.daily_rate.toFixed(2),
        inmate.daily_food_rate.toFixed(2),
        totalCost.toFixed(2),
      ]],
      foot: [["", "", "", "", "", "", "", "", "", "", "TOTAL", "", "", totalCost.toFixed(2)]],
      theme: "grid",
      headStyles: {
        fillColor: [30, 58, 95], textColor: [255, 255, 255],
        fontSize: 7, fontStyle: "bold", halign: "center", valign: "middle",
      },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      footStyles: { fillColor: [240, 240, 240], textColor: [30, 58, 95], fontSize: 9, fontStyle: "bold" },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        10: { halign: "center" },
        11: { halign: "right" },
        12: { halign: "right" },
        13: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;

    // Clearance & Remarks section
    let y = finalY + 12;
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 95);
    doc.setFont("helvetica", "bold");
    doc.text("Clearance Details", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    clearanceItems.forEach(item => {
      doc.text(`${item.checked ? "☑" : "☐"} ${item.label}`, 14, y);
      y += 5;
    });

    if (damageRemarks) {
      y += 3;
      doc.text(`Damage Remarks: ${damageRemarks}`, 14, y);
      y += 5;
    }
    if (clearanceNotes) {
      doc.text(`Clearance Notes: ${clearanceNotes}`, 14, y);
      y += 5;
    }
    if (feedback) {
      doc.text(`Feedback: ${feedback}${feedbackRating ? ` (Rating: ${feedbackRating}/5)` : ""}`, 14, y);
      y += 5;
    }
    if (isBlacklisted) {
      doc.setTextColor(200, 0, 0);
      doc.text(`⚠ BLACKLISTED: ${blacklistReason}`, 14, y);
      y += 5;
    }

    // Footer line
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pageWidth - 14, y);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("This is a system-generated report. All amounts are in SAR.", 14, y + 6);
    doc.text(`Page 1 of 1`, pageWidth - 14, y + 6, { align: "right" });

    doc.save(`Checkout_${inmate.name.replace(/\s+/g, "_")}_${campName.replace(/\s+/g, "_")}_${format(now, "yyyy-MM-dd")}.pdf`);
  };

  const handleCheckout = async () => {
    if (!user || !inmate) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("perform_check_out", {
        p_employee_id: inmate.id,
        p_room_id: inmate.room_id,
        p_camp_id: campId,
        p_performed_by: user.id,
        p_assets_returned: clearanceItems.find(i => i.id === "assets")?.checked ?? true,
        p_damage_remarks: damageRemarks || null,
        p_clearance_notes: clearanceNotes || null,
        p_is_blacklisted: isBlacklisted,
        p_blacklist_reason: isBlacklisted ? blacklistReason : null,
        p_feedback: feedback || null,
        p_feedback_rating: feedbackRating > 0 ? feedbackRating : null,
      });
      if (error) throw error;

      generatePDF();

      queryClient.invalidateQueries({ queryKey: ["camp-inmates"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["recent-check-outs"] });

      toast({ title: "Check-out successful", description: `${inmate.name} checked out. Report downloaded.` });
      resetForm();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Check-out failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!inmate) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut size={18} className="text-destructive" />
            Check-Out: {inmate.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {inmate.employee_id} · Room {inmate.room_number} · {getRoomCategoryLabel(inmate.room_category)} · Since {format(new Date(inmate.check_in_date), "dd MMM yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
          {/* Stay Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border p-2">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-lg font-bold text-foreground">{days} <span className="text-xs font-normal">days</span></p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-xs text-muted-foreground">Rate/Day</p>
              <p className="text-lg font-bold text-foreground">{(inmate.daily_rate + inmate.daily_food_rate).toFixed(0)} <span className="text-xs font-normal">SAR</span></p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-lg font-bold text-primary">{totalCost.toFixed(0)} <span className="text-xs font-normal">SAR</span></p>
            </div>
          </div>

          {/* Clearance Checklist */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clearance Checklist</Label>
            <div className="mt-2 space-y-1.5">
              {clearanceItems.map(item => (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border ${item.checked ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50 border-transparent"}`}
                  onClick={() => toggleClearance(item.id)}
                >
                  <Checkbox checked={item.checked} className="pointer-events-none" />
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Damage Remarks */}
          <div>
            <Label htmlFor="damage" className="text-xs">Damage Remarks</Label>
            <Textarea
              id="damage"
              placeholder="Note any damages found..."
              value={damageRemarks}
              onChange={e => setDamageRemarks(e.target.value)}
              className="mt-1 h-16"
            />
          </div>

          {/* Clearance Notes */}
          <div>
            <Label htmlFor="notes" className="text-xs">Clearance Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional clearance notes..."
              value={clearanceNotes}
              onChange={e => setClearanceNotes(e.target.value)}
              className="mt-1 h-16"
            />
          </div>

          {/* Feedback & Rating */}
          <div className="space-y-2">
            <Label className="text-xs">Camp Boss Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} type="button" onClick={() => setFeedbackRating(s)}>
                  <Star
                    size={20}
                    className={`transition-colors ${s <= feedbackRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                  />
                </button>
              ))}
              {feedbackRating > 0 && (
                <span className="text-xs text-muted-foreground ml-2">{feedbackRating}/5</span>
              )}
            </div>
            <Textarea
              placeholder="Feedback about the employee's stay..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              className="h-16"
            />
          </div>

          {/* Blacklist */}
          <div className="rounded-lg border border-destructive/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban size={16} className="text-destructive" />
                <Label className="text-sm font-medium">Blacklist Employee</Label>
              </div>
              <Switch checked={isBlacklisted} onCheckedChange={setIsBlacklisted} />
            </div>
            {isBlacklisted && (
              <Input
                placeholder="Reason for blacklisting (required)"
                value={blacklistReason}
                onChange={e => setBlacklistReason(e.target.value)}
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCheckout}
            disabled={loading || !allChecked || (isBlacklisted && !blacklistReason)}
            className="gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <><Download size={14} /> Check Out & Download Report</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
