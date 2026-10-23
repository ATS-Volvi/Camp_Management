import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DoorOpen, Loader2, LogOut, History, Calendar, Clock } from "lucide-react";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Badge } from "@/components/ui/badge";

interface Room {
  id: string;
  room_number: string;
  category: string;
  current_occupancy: number;
  max_capacity: number;
  buildings?: { name: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
  campId: string;
}

export default function RoomOccupantsDialog({ open, onOpenChange, room, campId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [checkingOut, setCheckingOut] = useState(false);
  const [activeTab, setActiveTab] = useState("current");

  // Current occupants query
  const { data: occupantsData = [], isLoading } = useQuery({
    queryKey: ["room-occupants-detail", room?.id, campId],
    enabled: open && !!room && !!campId,
    queryFn: async () => {
      const { data: checkIns, error: ciErr } = await supabase
        .from("check_ins")
        .select("employee_id, check_in_date")
        .eq("room_id", room!.id)
        .eq("camp_id", campId)
        .order("check_in_date", { ascending: false });
      if (ciErr) throw ciErr;

      const { data: checkOuts, error: coErr } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .eq("room_id", room!.id)
        .eq("camp_id", campId)
        .order("check_out_date", { ascending: false });
      if (coErr) throw coErr;

      const latestCheckOut = new Map<string, string>();
      (checkOuts || []).forEach(co => {
        if (!latestCheckOut.has(co.employee_id)) {
          latestCheckOut.set(co.employee_id, co.check_out_date);
        }
      });

      const empMap = new Map<string, string>();
      (checkIns || []).forEach(ci => {
        if (empMap.has(ci.employee_id)) return;
        const lastOut = latestCheckOut.get(ci.employee_id);
        if (!lastOut || new Date(ci.check_in_date) > new Date(lastOut)) {
          empMap.set(ci.employee_id, ci.check_in_date);
        }
      });

      if (empMap.size === 0) return [];

      const { data: employees, error: empErr } = await supabase
        .from("employees")
        .select("id, name, employee_id, designation, company, supplier_name, employee_type, nationality, phone, project")
        .in("id", [...empMap.keys()]);
      if (empErr) throw empErr;

      const { data: rateData } = await supabase
        .from("camp_room_rates" as any)
        .select("daily_rate")
        .eq("camp_id", campId)
        .eq("room_category", room!.category)
        .maybeSingle();

      const dailyRate = (rateData as any)?.daily_rate || 0;

      return (employees || []).map((emp: any) => ({
        ...emp,
        check_in_date: empMap.get(emp.id) || null,
        daily_rate: dailyRate,
      }));
    },
  });

  // Room history query — past occupants (checked out from this room)
  const { data: historyData = [], isLoading: historyLoading } = useQuery({
    queryKey: ["room-history", room?.id, campId],
    enabled: open && !!room && !!campId && activeTab === "history",
    queryFn: async () => {
      // Get all check-outs for this room
      const { data: checkOuts, error: coErr } = await supabase
        .from("check_outs")
        .select("employee_id, check_out_date")
        .eq("room_id", room!.id)
        .eq("camp_id", campId)
        .order("check_out_date", { ascending: false });
      if (coErr) throw coErr;

      if (!checkOuts || checkOuts.length === 0) return [];

      // Get all check-ins for this room to find matching check-in dates
      const { data: checkIns, error: ciErr } = await supabase
        .from("check_ins")
        .select("employee_id, check_in_date")
        .eq("room_id", room!.id)
        .eq("camp_id", campId)
        .order("check_in_date", { ascending: false });
      if (ciErr) throw ciErr;

      // Build check-in lookup: for each employee, all check-in dates sorted desc
      const checkInsByEmp = new Map<string, string[]>();
      (checkIns || []).forEach(ci => {
        if (!checkInsByEmp.has(ci.employee_id)) {
          checkInsByEmp.set(ci.employee_id, []);
        }
        checkInsByEmp.get(ci.employee_id)!.push(ci.check_in_date);
      });

      // Build history entries: each checkout paired with the nearest prior check-in
      const empIds = new Set<string>();
      const historyEntries: Array<{
        employee_id: string;
        check_in_date: string;
        check_out_date: string;
        days: number;
      }> = [];

      (checkOuts || []).forEach(co => {
        empIds.add(co.employee_id);
        const empCheckIns = checkInsByEmp.get(co.employee_id) || [];
        // Find the latest check-in that is before or equal to this check-out
        const matchedCheckIn = empCheckIns.find(ciDate => new Date(ciDate) <= new Date(co.check_out_date));
        const checkInDate = matchedCheckIn || co.check_out_date;
        const days = Math.max(differenceInDays(new Date(co.check_out_date), new Date(checkInDate)), 1);

        historyEntries.push({
          employee_id: co.employee_id,
          check_in_date: checkInDate,
          check_out_date: co.check_out_date,
          days,
        });
      });

      if (empIds.size === 0) return [];

      // Fetch employee details
      const { data: employees, error: empErr } = await supabase
        .from("employees")
        .select("id, name, employee_id, designation, company, supplier_name, employee_type, nationality, project")
        .in("id", [...empIds]);
      if (empErr) throw empErr;

      const empMap = new Map((employees || []).map((e: any) => [e.id, e]));

      return historyEntries.map(entry => {
        const emp = empMap.get(entry.employee_id);
        return {
          ...entry,
          name: emp?.name || "Unknown",
          emp_code: emp?.employee_id || "",
          designation: emp?.designation || "",
          supplier_name: emp?.supplier_name || "",
          company: emp?.company || "",
          project: emp?.project || "",
          employee_type: emp?.employee_type || "",
        };
      });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === occupantsData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(occupantsData.map((e: any) => e.id)));
    }
  };

  const handleBulkCheckout = async () => {
    if (!user || !room || selectedIds.size === 0) return;
    setCheckingOut(true);

    const checkoutReport: any[] = [];
    let success = 0, failed = 0;

    for (const empId of selectedIds) {
      try {
        const { error } = await supabase.rpc("perform_check_out", {
          p_employee_id: empId,
          p_room_id: room.id,
          p_camp_id: campId,
          p_performed_by: user.id,
        });
        if (error) { failed++; } else {
          success++;
          const emp = occupantsData.find((e: any) => e.id === empId);
          if (emp) {
            const days = emp.check_in_date ? Math.max(differenceInDays(new Date(), new Date(emp.check_in_date)), 1) : 1;
            checkoutReport.push({
              name: emp.name,
              employee_id: emp.employee_id,
              designation: emp.designation || "",
              supplier_name: emp.supplier_name || "",
              project: emp.project || "",
              check_in_date: emp.check_in_date ? format(new Date(emp.check_in_date), "dd/MM/yyyy") : "",
              check_out_date: format(new Date(), "dd/MM/yyyy"),
              days,
              daily_rate: emp.daily_rate,
              total_cost: days * emp.daily_rate,
            });
          }
        }
      } catch { failed++; }
    }

    // Generate PDF report
    if (checkoutReport.length > 0) {
      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const now = new Date();

      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pageWidth, 38, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Check-Out Report", 14, 16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Room ${room.room_number} · ${getRoomCategoryLabel(room.category)}`, 14, 24);
      doc.text(`Generated: ${format(now, "dd MMM yyyy, hh:mm a")}`, 14, 31);
      doc.setFontSize(10);
      doc.text(`Camp: ${room.room_number}`, pageWidth - 14, 24, { align: "right" });
      doc.text(`Checked out: ${checkoutReport.length} employee(s)`, pageWidth - 14, 31, { align: "right" });

      const totalCost = checkoutReport.reduce((s, r) => s + r.total_cost, 0);
      const totalDailyRate = checkoutReport.reduce((s, r) => s + r.daily_rate, 0);

      autoTable(doc, {
        startY: 44,
        head: [[
          "#", "Employee ID", "Name", "Designation", "Supplier / Company",
          "Project", "Check-In", "Check-Out", "Days", "Daily Rate\n(SAR)", "Total Cost\n(SAR)"
        ]],
        body: checkoutReport.map((r, i) => [
          i + 1, r.employee_id, r.name, r.designation, r.supplier_name,
          r.project, r.check_in_date, r.check_out_date, r.days,
          r.daily_rate.toFixed(2), r.total_cost.toFixed(2),
        ]),
        foot: [["", "", "", "", "", "", "", "TOTAL", "", totalDailyRate.toFixed(2), totalCost.toFixed(2)]],
        theme: "grid",
        headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", halign: "center", valign: "middle" },
        bodyStyles: { fontSize: 8, cellPadding: 3 },
        footStyles: { fillColor: [240, 240, 240], textColor: [30, 58, 95], fontSize: 9, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { halign: "center", cellWidth: 10 }, 8: { halign: "center" }, 9: { halign: "right" }, 10: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, finalY + 10, pageWidth - 14, finalY + 10);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("This is a system-generated report. All amounts are in SAR.", 14, finalY + 16);
      doc.text(`Page 1 of 1`, pageWidth - 14, finalY + 16, { align: "right" });
      doc.save(`Checkout_Report_Room_${room.room_number}_${format(now, "yyyy-MM-dd")}.pdf`);
    }

    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["checked-in-employees"] });
    queryClient.invalidateQueries({ queryKey: ["recent-check-outs"] });
    queryClient.invalidateQueries({ queryKey: ["room-occupants-detail"] });
    queryClient.invalidateQueries({ queryKey: ["room-history"] });

    toast({
      title: `Check-out complete`,
      description: `${success} checked out${failed > 0 ? `, ${failed} failed` : ""}. Report downloaded.`,
      variant: failed > 0 ? "destructive" : "default",
    });

    setSelectedIds(new Set());
    setCheckingOut(false);
    if (failed === 0) onOpenChange(false);
  };

  if (!room) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen size={18} className="text-primary" />
            Room {room.room_number}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs">
            <span>{(room.buildings as any)?.name || "Block"}</span>
            <span>·</span>
            <span>{getRoomCategoryLabel(room.category)}</span>
            <span>·</span>
            <span>{room.current_occupancy}/{room.max_capacity} occupied</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full">
            <TabsTrigger value="current" className="flex-1 gap-1.5">
              <Users size={14} />
              Current ({occupantsData.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5">
              <History size={14} />
              History ({historyData.length})
            </TabsTrigger>
          </TabsList>

          {/* Current Occupants Tab */}
          <TabsContent value="current" className="flex-1 flex flex-col min-h-0 mt-2">
            {occupantsData.length > 1 && (
              <div className="flex items-center justify-between px-1 mb-2">
                <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {selectedIds.size === occupantsData.length ? "Deselect All" : "Select All"}
                </button>
                <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto border rounded-lg divide-y min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  <span className="text-sm">Loading occupants...</span>
                </div>
              ) : occupantsData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users size={24} className="mb-2 opacity-50" />
                  <p className="text-sm">No current occupants</p>
                </div>
              ) : (
                occupantsData.map((emp: any, idx: number) => (
                  <label
                    key={emp.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selectedIds.has(emp.id) ? "bg-primary/5" : "hover:bg-muted/50"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp.id)}
                      onChange={() => toggleSelect(emp.id)}
                      className="rounded border-muted-foreground/30 text-primary focus:ring-primary"
                    />
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.employee_id}
                        {emp.designation && <> · {emp.designation}</>}
                        {emp.supplier_name && <> · {emp.supplier_name}</>}
                        {emp.project && <> · {emp.project}</>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {emp.check_in_date && (
                        <p className="text-[10px] text-muted-foreground">
                          Since {format(new Date(emp.check_in_date), "dd/MM")}
                        </p>
                      )}
                      {emp.daily_rate > 0 && (
                        <p className="text-[10px] text-primary font-medium">
                          SAR {emp.daily_rate}/day
                        </p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="flex justify-end mt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkCheckout}
                  disabled={checkingOut}
                  className="flex items-center gap-1.5"
                >
                  {checkingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                  Check Out ({selectedIds.size}) & Download PDF
                </Button>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 flex flex-col min-h-0 mt-2">
            <div className="flex-1 overflow-y-auto border rounded-lg divide-y min-h-0">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  <span className="text-sm">Loading history...</span>
                </div>
              ) : historyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <History size={24} className="mb-2 opacity-50" />
                  <p className="text-sm">No previous occupants</p>
                </div>
              ) : (
                historyData.map((entry: any, idx: number) => (
                  <div key={`${entry.employee_id}-${entry.check_out_date}-${idx}`} className="px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{entry.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {entry.emp_code}
                            {entry.designation && <> · {entry.designation}</>}
                            {entry.supplier_name && <> · {entry.supplier_name}</>}
                            {entry.project && <> · {entry.project}</>}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                        <Clock size={10} />
                        {entry.days} day{entry.days !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 ml-[38px]">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar size={10} className="text-green-500" />
                        <span>In: {format(new Date(entry.check_in_date), "dd MMM yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar size={10} className="text-destructive" />
                        <span>Out: {format(new Date(entry.check_out_date), "dd MMM yyyy")}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 px-1">
              Showing all past occupants who checked out from this room.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
