import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Users, LogOut, Loader2, Download, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
}

export default function BulkCheckoutDialog({ open, onOpenChange, campId, campName }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<"supplier" | "project">("supplier");
  const [filterValue, setFilterValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [checkingOut, setCheckingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get all checked-in employees for this camp
  const { data: allCheckedIn = [], isLoading } = useQuery({
    queryKey: ["bulk-checkout-employees", campId],
    enabled: open && !!campId,
    queryFn: async () => {
      const { data: checkIns, error: ciErr } = await supabase
        .from("check_ins")
        .select("employee_id, room_id, check_in_date, project")
        .eq("camp_id", campId);
      if (ciErr) throw ciErr;

      const { data: checkOuts, error: coErr } = await supabase
        .from("check_outs")
        .select("employee_id")
        .eq("camp_id", campId);
      if (coErr) throw coErr;

      const checkedOutSet = new Set((checkOuts || []).map(co => co.employee_id));
      const empMap = new Map<string, { room_id: string; check_in_date: string; project: string | null }>();
      (checkIns || []).forEach(ci => {
        if (!checkedOutSet.has(ci.employee_id)) {
          empMap.set(ci.employee_id, { room_id: ci.room_id, check_in_date: ci.check_in_date, project: ci.project });
        }
      });

      if (empMap.size === 0) return [];

      const { data: employees, error: empErr } = await supabase
        .from("employees")
        .select("id, name, employee_id, designation, company, supplier_name, employee_type, project")
        .in("id", [...empMap.keys()]);
      if (empErr) throw empErr;

      // Get all rates for this camp
      const { data: ratesData } = await supabase
        .from("camp_room_rates" as any)
        .select("room_category, daily_rate")
        .eq("camp_id", campId);
      const ratesMap = new Map((ratesData || []).map((r: any) => [r.room_category, r.daily_rate]));

      // Get room categories
      const roomIds = [...new Set([...empMap.values()].map(v => v.room_id))];
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("id, room_number, category")
        .in("id", roomIds);
      const roomMap = new Map((roomsData || []).map(r => [r.id, r]));

      return (employees || []).map((emp: any) => {
        const ciInfo = empMap.get(emp.id)!;
        const room = roomMap.get(ciInfo.room_id);
        const dailyRate = room ? (ratesMap.get(room.category) || 0) : 0;
        return {
          ...emp,
          room_id: ciInfo.room_id,
          room_number: room?.room_number || "?",
          check_in_date: ciInfo.check_in_date,
          checkin_project: ciInfo.project,
          daily_rate: dailyRate,
        };
      });
    },
  });

  // Get unique supplier names and projects
  const suppliers = useMemo(() => [...new Set(allCheckedIn.filter((e: any) => e.supplier_name).map((e: any) => e.supplier_name))].sort(), [allCheckedIn]);
  const projects = useMemo(() => [...new Set(allCheckedIn.filter((e: any) => e.checkin_project || e.project).map((e: any) => e.checkin_project || e.project))].sort(), [allCheckedIn]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    let list = allCheckedIn;
    if (filterValue) {
      if (filterType === "supplier") {
        list = list.filter((e: any) => e.supplier_name === filterValue);
      } else {
        list = list.filter((e: any) => (e.checkin_project || e.project) === filterValue);
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e: any) => e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q));
    }
    return list;
  }, [allCheckedIn, filterType, filterValue, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e: any) => e.id)));
    }
  };

  const handleBulkCheckout = async () => {
    if (!user || selectedIds.size === 0) return;
    setCheckingOut(true);

    const checkoutReport: any[] = [];
    let success = 0, failed = 0;

    for (const empId of selectedIds) {
      const emp = allCheckedIn.find((e: any) => e.id === empId);
      if (!emp) { failed++; continue; }
      try {
        const { error } = await supabase.rpc("perform_check_out", {
          p_employee_id: empId,
          p_room_id: emp.room_id,
          p_camp_id: campId,
          p_performed_by: user.id,
        });
        if (error) { failed++; } else {
          success++;
          const days = emp.check_in_date ? Math.max(differenceInDays(new Date(), new Date(emp.check_in_date)), 1) : 1;
          checkoutReport.push({
            employee_id: emp.employee_id,
            name: emp.name,
            designation: emp.designation || "",
            supplier_name: emp.supplier_name || "",
            project: emp.checkin_project || emp.project || "",
            room: emp.room_number,
            check_in: emp.check_in_date ? format(new Date(emp.check_in_date), "dd/MM/yyyy") : "",
            check_out: format(new Date(), "dd/MM/yyyy"),
            days,
            daily_rate: emp.daily_rate,
            total_cost: days * emp.daily_rate,
          });
        }
      } catch { failed++; }
    }

    // Generate CSV report
    if (checkoutReport.length > 0) {
      const header = ["Employee ID", "Name", "Designation", "Supplier", "Project", "Room", "Check-In", "Check-Out", "Days", "Daily Rate (SAR)", "Total Cost (SAR)"];
      const rows = checkoutReport.map(r => [r.employee_id, r.name, r.designation, r.supplier_name, r.project, r.room, r.check_in, r.check_out, r.days, r.daily_rate, r.total_cost]);
      const totalCost = checkoutReport.reduce((s, r) => s + r.total_cost, 0);
      rows.push(["", "", "", "", "", "", "", "TOTAL", "", "", totalCost]);
      const csvContent = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const label = filterType === "supplier" ? filterValue : filterValue;
      link.download = `Bulk_Checkout_${label.replace(/\s+/g, "_")}_${campName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }

    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["checked-in-employees"] });
    queryClient.invalidateQueries({ queryKey: ["recent-check-outs"] });
    queryClient.invalidateQueries({ queryKey: ["bulk-checkout-employees"] });

    toast({
      title: "Bulk check-out complete",
      description: `${success} checked out${failed > 0 ? `, ${failed} failed` : ""}. Report downloaded.`,
      variant: failed > 0 ? "destructive" : "default",
    });

    setSelectedIds(new Set());
    setCheckingOut(false);
    if (failed === 0) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            Bulk Check-Out — {campName}
          </DialogTitle>
          <DialogDescription>Check out multiple employees by supplier or project and generate cost report.</DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Filter By</Label>
            <Select value={filterType} onValueChange={(v: any) => { setFilterType(v); setFilterValue(""); setSelectedIds(new Set()); }}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">{filterType === "supplier" ? "Supplier" : "Project"}</Label>
            <Select value={filterValue} onValueChange={(v) => { setFilterValue(v); setSelectedIds(new Set()); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={`Choose ${filterType}...`} />
              </SelectTrigger>
              <SelectContent>
                {(filterType === "supplier" ? suppliers : projects).map((name: any) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search employee..."
            className="pl-9 h-8 text-xs"
          />
        </div>

        {filteredEmployees.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {selectedIds.size === filteredEmployees.length ? "Deselect All" : "Select All"}
            </button>
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto border rounded-lg divide-y min-h-0 max-h-[40vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users size={24} className="mb-2 opacity-50" />
              <p className="text-sm">{filterValue ? "No employees found" : "Select a filter above"}</p>
            </div>
          ) : (
            filteredEmployees.map((emp: any) => {
              const days = emp.check_in_date ? Math.max(differenceInDays(new Date(), new Date(emp.check_in_date)), 1) : 1;
              const cost = days * emp.daily_rate;
              return (
                <label
                  key={emp.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${selectedIds.has(emp.id) ? "bg-primary/5" : "hover:bg-muted/50"}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(emp.id)}
                    onChange={() => toggleSelect(emp.id)}
                    className="rounded border-muted-foreground/30 text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.employee_id} · Room {emp.room_number}
                      {emp.supplier_name && <> · {emp.supplier_name}</>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">{days} day{days !== 1 ? "s" : ""}</p>
                    {emp.daily_rate > 0 && (
                      <p className="text-xs font-medium text-primary">SAR {cost.toFixed(0)}</p>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkCheckout}
              disabled={checkingOut}
              className="flex items-center gap-1.5"
            >
              {checkingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Check Out ({selectedIds.size}) & Download Report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
