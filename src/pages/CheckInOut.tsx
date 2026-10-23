import { prepareCheckInReceipt } from "@/lib/checkInReport";
import { useState, useMemo, useCallback, useEffect } from "react";
import { LogIn, LogOut, Search, Users, DoorOpen, CheckCircle2, AlertTriangle, FileText, Package, Star, Ban, Calendar, Clock, Download, Sparkles, DollarSign, ArrowLeftRight } from "lucide-react";
import TransferRequestsList from "@/components/checkin/TransferRequestsList";
import {
  useCamps, useRoomsByCamp, useRecentCheckIns, useRecentCheckOuts,
  useCheckIn, useCheckOut, useEmployeesByType, useSupplierNames, useCheckedInEmployees,
} from "@/hooks/useCheckInOut";
import { format, differenceInDays } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { getSuggestedRooms, getRoomCategoryLabel } from "@/constants/roomCategories";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AIRoomAllocationDialog from "@/components/checkin/AIRoomAllocationDialog";
import RoomVisualMap from "@/components/checkin/RoomVisualMap";
import RoomEmployeeDialog from "@/components/checkin/RoomEmployeeDialog";
import RoomOccupantsDialog from "@/components/checkin/RoomOccupantsDialog";
import BulkCheckoutDialog from "@/components/checkin/BulkCheckoutDialog";
import CheckInConfirmDialog from "@/components/checkin/CheckInConfirmDialog";
import CheckOutConfirmDialog from "@/components/checkin/CheckOutConfirmDialog";

type Mode = "check-in" | "check-out" | "transfer";
type EmployeeSource = "own" | "supplier";
type CheckoutFilterType = "all" | "supplier" | "project";

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

const getNowDate = () => format(new Date(), "yyyy-MM-dd");
const getNowTime = () => format(new Date(), "HH:mm");

export default function CheckInOut() {
  const [mode, setMode] = useState<Mode>("check-in");
  const [employeeSource, setEmployeeSource] = useState<EmployeeSource>("own");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedCamp, setSelectedCamp] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [iqamaNumber, setIqamaNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [checkInDate, setCheckInDate] = useState(getNowDate());
  const [checkInTime, setCheckInTime] = useState(getNowTime());
  const [clearanceItems, setClearanceItems] = useState<ClearanceItem[]>(defaultClearanceItems);
  const [damageRemarks, setDamageRemarks] = useState("");
  const [clearanceNotes, setClearanceNotes] = useState("");
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<number>(0);

  // Checkout multi-select
  const [checkoutSelectedIds, setCheckoutSelectedIds] = useState<Set<string>>(new Set());
  const [checkoutFilterType, setCheckoutFilterType] = useState<CheckoutFilterType>("all");
  const [checkoutFilterValue, setCheckoutFilterValue] = useState("");
  const [checkoutProjectFilter, setCheckoutProjectFilter] = useState("");
  const [checkOutDate, setCheckOutDate] = useState(getNowDate());
  const [checkOutTime, setCheckOutTime] = useState(getNowTime());

  // Supplier bulk check-in: selected employee IDs
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [roomEmployeeDialogOpen, setRoomEmployeeDialogOpen] = useState(false);
  const [occupantsDialogOpen, setOccupantsDialogOpen] = useState(false);
  const [occupantsRoomId, setOccupantsRoomId] = useState<string>("");
  const [checkInProject, setCheckInProject] = useState("");
  const [foodRequired, setFoodRequired] = useState(true);
  const [checkinProjectFilter, setCheckinProjectFilter] = useState("");
  const [bulkCheckoutOpen, setBulkCheckoutOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: camps = [] } = useCamps();
  const { data: rooms = [], isLoading: roomsLoading } = useRoomsByCamp(selectedCamp || null);
  const { data: supplierNames = [] } = useSupplierNames();
  const { data: employeesByType = [] } = useEmployeesByType(mode === "check-in" ? employeeSource : null);
  const { data: checkedInEmployees = [] } = useCheckedInEmployees(selectedCamp || null);
  const checkedInIds = useMemo(() => new Set(checkedInEmployees.map((e: any) => e.id)), [checkedInEmployees]);
  const { data: recentCheckIns = [] } = useRecentCheckIns();
  const { data: recentCheckOuts = [] } = useRecentCheckOuts();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  // Unique project names from all employees (for check-in filter)
  const checkinProjectNames = useMemo(() =>
    [...new Set(employeesByType.filter((e: any) => e.project).map((e: any) => e.project))].sort()
  , [employeesByType]);

  // Supplier employees list for bulk check-in
  const supplierEmployeeList = useMemo(() => {
    if (employeeSource !== "supplier" || !selectedSupplier) return [];
    let list = employeesByType.filter((e: any) => e.supplier_name === selectedSupplier && !checkedInIds.has(e.id));
    if (checkinProjectFilter) {
      list = list.filter((e: any) => e.project === checkinProjectFilter);
    }
    if (employeeSearch) {
      const q = employeeSearch.toLowerCase();
      list = list.filter((e: any) => e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q));
    }
    return list;
  }, [employeesByType, employeeSource, selectedSupplier, checkinProjectFilter, employeeSearch, checkedInIds]);

  // For own check-in: filter
  const checkInEmployeeList = useMemo(() => {
    if (employeeSource !== "own") return [];
    let list = employeesByType.filter((e: any) => !checkedInIds.has(e.id));
    if (checkinProjectFilter) {
      list = list.filter((e: any) => e.project === checkinProjectFilter);
    }
    if (employeeSearch) {
      const q = employeeSearch.toLowerCase();
      list = list.filter((e: any) => e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q));
    }
    return list;
  }, [employeesByType, employeeSource, checkinProjectFilter, employeeSearch, checkedInIds]);

  // For check-out: filter checked-in employees by filter type
  const checkOutEmployeeList = useMemo(() => {
    let list = checkedInEmployees;
    if (checkoutFilterType === "supplier" && checkoutFilterValue) {
      list = list.filter((e: any) => e.supplier_name === checkoutFilterValue);
      if (checkoutProjectFilter) list = list.filter((e: any) => e.project === checkoutProjectFilter);
    } else if (checkoutFilterType === "project" && checkoutFilterValue) {
      list = list.filter((e: any) => e.project === checkoutFilterValue);
    }
    if (employeeSearch) {
      const q = employeeSearch.toLowerCase();
      list = list.filter((e: any) => e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q));
    }
    return list;
  }, [checkedInEmployees, checkoutFilterType, checkoutFilterValue, checkoutProjectFilter, employeeSearch]);

  // Unique supplier names and projects from checked-in employees
  const checkoutSupplierNames = useMemo(() =>
    [...new Set(checkedInEmployees.filter((e: any) => e.supplier_name).map((e: any) => e.supplier_name))].sort()
  , [checkedInEmployees]);

  const checkoutProjectNames = useMemo(() =>
    [...new Set(checkedInEmployees.filter((e: any) => e.project).map((e: any) => e.project))].sort()
  , [checkedInEmployees]);

  const checkoutSupplierProjects = useMemo(() =>
    [...new Set(checkedInEmployees.filter((e: any) => e.supplier_name === checkoutFilterValue && e.project).map((e: any) => e.project))].sort()
  , [checkedInEmployees, checkoutFilterValue]);

  // Auto-select all employees of chosen supplier (+ project)
  useEffect(() => {
    if (mode === "check-out" && checkoutFilterType === "supplier" && checkoutFilterValue) {
      setCheckoutSelectedIds(new Set(checkOutEmployeeList.map((e: any) => e.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutFilterValue, checkoutProjectFilter, checkoutFilterType, mode]);

  const filteredEmployees = mode === "check-in" ? checkInEmployeeList : checkOutEmployeeList;
  const availableRooms = rooms.filter(r => mode === "check-in" ? r.current_occupancy < r.max_capacity : r.current_occupancy > 0);

  // AI Room Suggestion: based on selected employee's designation
  const selectedEmpDesignation = useMemo(() => {
    if (mode !== "check-in") return null;
    const emp = employeesByType.find(e => e.id === selectedEmployee) as any;
    return emp?.designation || null;
  }, [selectedEmployee, employeesByType, mode]);

  const roomSuggestions = useMemo(() => {
    if (mode !== "check-in" || !selectedCamp) return { suggested: [], other: [] };
    return getSuggestedRooms(
      rooms.filter(r => r.current_occupancy < r.max_capacity && r.status !== "under_maintenance"),
      selectedEmpDesignation
    );
  }, [rooms, selectedEmpDesignation, selectedCamp, mode]);

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);
  const selectedEmployeeData = filteredEmployees.find((e: any) => e.id === selectedEmployee) ||
    (mode === "check-out" ? checkedInEmployees.find((e: any) => e.id === selectedEmployee) : null);

  const allClearanceChecked = clearanceItems.every(item => item.checked);

  const handleToggleClearance = (id: string) => {
    setClearanceItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const toggleBulkEmployee = (empId: string) => {
    setBulkSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId); else next.add(empId);
      return next;
    });
  };

  const toggleAllBulk = () => {
    if (bulkSelectedIds.size === supplierEmployeeList.length) {
      setBulkSelectedIds(new Set());
    } else {
      setBulkSelectedIds(new Set(supplierEmployeeList.map((e: any) => e.id)));
    }
  };

  const resetForm = () => {
    setSelectedRoom("");
    setSelectedEmployee("");
    setEmployeeSearch("");
    setIqamaNumber("");
    setPassportNumber("");
    setCheckInDate(getNowDate());
    setCheckInTime(getNowTime());
    setCheckOutDate(getNowDate());
    setCheckOutTime(getNowTime());
    setClearanceItems(defaultClearanceItems);
    setDamageRemarks("");
    setClearanceNotes("");
    setIsBlacklisted(false);
    setBlacklistReason("");
    setFeedback("");
    setFeedbackRating(0);
    setBulkSelectedIds(new Set());
    setCheckInProject("");
    setFoodRequired(true);
    setCheckinProjectFilter("");
    setCheckoutSelectedIds(new Set());
    setCheckoutFilterType("all"); setCheckoutProjectFilter("");
    setCheckoutFilterValue("");
  };

  // Bulk check-in: open confirm dialog
  const handleBulkCheckIn = () => {
    if (!selectedCamp || !selectedRoom || bulkSelectedIds.size === 0) return;
    setConfirmDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedCamp) return;

    if (mode === "check-in") {
      if (!selectedEmployee || !selectedRoom) return;
      setConfirmDialogOpen(true);
      return;
    }

    // Check-out: open confirmation dialog
    if (checkoutSelectedIds.size > 0) {
      setCheckoutConfirmOpen(true);
    }
  };

  const handleBulkCheckOutFromMain = async () => {
    if (!selectedCamp || checkoutSelectedIds.size === 0) return;
    setBulkSubmitting(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      toast({ title: "Not authenticated", variant: "destructive" });
      setBulkSubmitting(false);
      return;
    }

    const campName = camps.find((c: any) => c.id === selectedCamp)?.name || "Camp";
    const supplierName = checkoutFilterType === "supplier" ? checkoutFilterValue : "";
    const now = new Date();
    const checkoutAt = new Date(`${checkOutDate}T${checkOutTime}:00`);

    // Gather pre-checkout data for report: check-in dates, room details
    const selectedEmpIds = [...checkoutSelectedIds];
    const reportData: any[] = [];

    // Fetch check-in dates for selected employees
    const { data: checkInData } = await supabase
      .from("check_ins")
      .select("employee_id, check_in_date, room_id, project")
      .eq("camp_id", selectedCamp)
      .in("employee_id", selectedEmpIds)
      .order("check_in_date", { ascending: false });

    const latestCheckIn = new Map<string, { date: string; room_id: string; project: string | null }>();
    (checkInData || []).forEach((ci: any) => {
      if (!latestCheckIn.has(ci.employee_id)) {
        latestCheckIn.set(ci.employee_id, { date: ci.check_in_date, room_id: ci.room_id, project: ci.project });
      }
    });

    // Fetch room details for all rooms involved
    const roomIds = [...new Set([...latestCheckIn.values()].map(v => v.room_id))];
    const { data: roomDetails } = await supabase
      .from("rooms")
      .select("id, room_number, category, daily_rate, daily_food_rate")
      .in("id", roomIds);

    const roomMap = new Map<string, any>();
    (roomDetails || []).forEach((r: any) => roomMap.set(r.id, r));

    let success = 0, failed = 0;
    for (const empId of selectedEmpIds) {
      const emp = checkedInEmployees.find((e: any) => e.id === empId);
      if (!emp) { failed++; continue; }
      try {
        const { error } = await supabase.rpc("perform_check_out", {
          p_employee_id: empId,
          p_room_id: (emp as any).checked_in_room_id,
          p_camp_id: selectedCamp,
          p_performed_by: authUser.id,
          p_check_out_date: checkoutAt.toISOString(),
          p_assets_returned: clearanceItems.find(i => i.id === "assets")?.checked ?? true,
          p_damage_remarks: damageRemarks || null,
          p_clearance_notes: clearanceNotes || null,
          p_is_blacklisted: isBlacklisted,
          p_blacklist_reason: isBlacklisted ? blacklistReason || null : null,
          p_feedback: feedback || null,
          p_feedback_rating: feedbackRating || null,
        });
        if (error) { failed++; } else {
          success++;
          const ci = latestCheckIn.get(empId);
          const room = ci ? roomMap.get(ci.room_id) : null;
          const checkInDate = ci ? new Date(ci.date) : now;
          const days = Math.max(differenceInDays(checkoutAt, checkInDate), 1);
          const dailyRate = room?.daily_rate || 0;
          const foodRate = room?.daily_food_rate || 0;
          const roomCost = days * dailyRate;
          const foodCost = days * foodRate;
          const totalCharges = roomCost + foodCost;

          reportData.push({
            name: (emp as any).name,
            employee_id: (emp as any).employee_id,
            designation: (emp as any).designation || "-",
            phone: (emp as any).phone || "-",
            supplier_name: (emp as any).supplier_name || ((emp as any).employee_type === "supplier" ? "-" : "Own"),
            project: ci?.project || (emp as any).project || "-",
            room_number: room?.room_number || "-",
            room_type: room ? getRoomCategoryLabel(room.category) : "-",
            daily_rate: dailyRate,
            food_rate: foodRate,
            check_in_date: format(checkInDate, "dd/MM/yyyy HH:mm"),
            check_out_date: format(checkoutAt, "dd/MM/yyyy HH:mm"),
            total_days: days,
            room_cost: roomCost,
            food_cost: foodCost,
            charges: totalCharges,
            comments: [damageRemarks, clearanceNotes, feedback].filter(Boolean).join("; ") || "-",
          });
        }
      } catch { failed++; }
    }

    // Generate PDF report for supplier
    if (reportData.length > 0) {
      const doc = new jsPDF({ orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pageWidth, 42, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Supplier Check-Out Report", 14, 16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (supplierName) doc.text(`Supplier: ${supplierName}`, 14, 25);
      doc.text(`Camp: ${campName}`, 14, 32);
      doc.text(`Generated: ${format(now, "dd MMM yyyy, hh:mm a")}`, 14, 39);
      doc.text(`Employees: ${reportData.length}`, pageWidth - 14, 25, { align: "right" });

      // Table
      const totalCharges = reportData.reduce((s, r) => s + r.charges, 0);

      autoTable(doc, {
        startY: 48,
        head: [[
          "#", "Employee", "Designation", "Contact", "Supplier", "Project",
          "Room", "Type", "Check-In", "Check-Out", "Days",
          "Room Cost\n(SAR)", "Food Cost\n(SAR)", "Total\n(SAR)", "Remarks"
        ]],
        body: reportData.map((r, i) => [
          i + 1,
          `${r.name}\n${r.employee_id}`,
          r.designation,
          r.phone,
          r.supplier_name,
          r.project,
          r.room_number,
          r.room_type,
          r.check_in_date,
          r.check_out_date,
          r.total_days,
          r.room_cost.toFixed(2),
          r.food_cost.toFixed(2),
          r.charges.toFixed(2),
          r.comments,
        ]),
        foot: [[
          "", "", "", "", "", "", "", "", "", "", "TOTAL",
          reportData.reduce((s, r) => s + r.room_cost, 0).toFixed(2),
          reportData.reduce((s, r) => s + r.food_cost, 0).toFixed(2),
          totalCharges.toFixed(2),
          ""
        ]],
        theme: "grid",
        headStyles: {
          fillColor: [30, 58, 95],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        bodyStyles: { fontSize: 7, cellPadding: 2 },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [30, 58, 95],
          fontSize: 8,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: "center", cellWidth: 8 },
          10: { halign: "center" },
          11: { halign: "right" },
          12: { halign: "right" },
          13: { halign: "right" },
          14: { cellWidth: 30 },
        },
        margin: { left: 8, right: 8 },
      });

      // Footer
      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, finalY + 10, pageWidth - 14, finalY + 10);
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 95);
      doc.setFont("helvetica", "bold");
      doc.text(`Grand Total: SAR ${totalCharges.toFixed(2)}`, pageWidth - 14, finalY + 18, { align: "right" });
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "normal");
      doc.text("This is a system-generated report. All amounts are in SAR.", 14, finalY + 18);
      doc.text(`Page 1 of 1`, pageWidth / 2, finalY + 25, { align: "center" });

      const fileName = supplierName
        ? `Checkout_Report_${supplierName.replace(/\s+/g, "_")}_${format(now, "yyyy-MM-dd")}.pdf`
        : `Checkout_Report_${format(now, "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
    }

    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["recent-check-outs"] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["checked-in-employees"] });

    toast({
      title: `Check-out complete`,
      description: `${success} checked out${failed > 0 ? `, ${failed} failed` : ""}. ${reportData.length > 0 ? "PDF report downloaded." : ""}`,
      variant: failed > 0 ? "destructive" : "default",
    });
    setBulkSubmitting(false);
    resetForm();
  };

  const handleConfirmedCheckIn = () => {
    if (!selectedCamp || !selectedEmployee || !selectedRoom) return;
    checkInMutation.mutate(
      {
        employeeId: selectedEmployee,
        roomId: selectedRoom,
        campId: selectedCamp,
        iqamaNumber: iqamaNumber || null,
        passportNumber: passportNumber || null,
        foodRequired,
        checkInDate: new Date(`${checkInDate}T${checkInTime}:00`).toISOString(),
      },
      {
        onSuccess: async () => {
          if (checkInProject) {
            const { data } = await supabase
              .from("check_ins")
              .select("id")
              .eq("employee_id", selectedEmployee)
              .eq("camp_id", selectedCamp)
              .order("created_at", { ascending: false })
              .limit(1);
            if (data && data[0]) {
              await supabase
                .from("check_ins")
                .update({ project: checkInProject } as any)
                .eq("id", data[0].id);
            }
          }
          await prepareCheckInReceipt([selectedEmployee], selectedCamp);
          queryClient.invalidateQueries({ queryKey: ["report-check-ins"] });
          setConfirmDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleBulkCheckInConfirmed = async () => {
    if (!selectedCamp || !selectedRoom || bulkSelectedIds.size === 0) return;
    setBulkSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      setBulkSubmitting(false);
      return;
    }

    const successfulIds: string[] = [];
    let success = 0;
    let failed = 0;
    for (const empId of bulkSelectedIds) {
      try {
        const { error } = await supabase.rpc("perform_check_in", {
          p_employee_id: empId,
          p_room_id: selectedRoom,
          p_camp_id: selectedCamp,
          p_performed_by: user.id,
          p_food_required: foodRequired,
          p_check_in_date: new Date(`${checkInDate}T${checkInTime}:00`).toISOString(),
        } as any);
        if (error) { failed++; } else {
          success++;
          successfulIds.push(empId);
          // Save project if specified
          if (checkInProject) {
            const { data } = await supabase
              .from("check_ins")
              .select("id")
              .eq("employee_id", empId)
              .eq("camp_id", selectedCamp)
              .order("created_at", { ascending: false })
              .limit(1);
            if (data && data[0]) {
              await supabase
                .from("check_ins")
                .update({ project: checkInProject } as any)
                .eq("id", data[0].id);
            }
          }
        }
      } catch { failed++; }
    }

    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["recent-check-ins"] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["checked-in-employees"] });

    toast({
      title: `Bulk check-in complete`,
      description: `${success} succeeded, ${failed} failed`,
      variant: failed > 0 ? "destructive" : "default",
    });
    await prepareCheckInReceipt(successfulIds, selectedCamp);
    queryClient.invalidateQueries({ queryKey: ["report-check-ins"] });
    setBulkSubmitting(false);
    setConfirmDialogOpen(false);
    resetForm();
  };

  const handleSelectEmployee = (empId: string, empName: string) => {
    setSelectedEmployee(empId);
    setEmployeeSearch(empName);
    if (mode === "check-out") {
      const emp = checkedInEmployees.find((e: any) => e.id === empId) as any;
      if (emp?.checked_in_room_id) {
        setSelectedRoom(emp.checked_in_room_id);
      }
    }
    if (mode === "check-in") {
      const emp = employeesByType.find(e => e.id === empId) as any;
      if (emp?.iqama_number) setIqamaNumber(emp.iqama_number);
      if (emp?.passport_number) setPassportNumber(emp.passport_number);
    }
  };

  const toggleCheckoutEmployee = (empId: string) => {
    setCheckoutSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId); else next.add(empId);
      return next;
    });
  };

  const toggleAllCheckout = () => {
    if (checkoutSelectedIds.size === checkOutEmployeeList.length) {
      setCheckoutSelectedIds(new Set());
    } else {
      setCheckoutSelectedIds(new Set(checkOutEmployeeList.map((e: any) => e.id)));
    }
  };

  const recentRecords = mode === "check-in" ? recentCheckIns : recentCheckOuts;
  const isSubmitting = checkInMutation.isPending || checkOutMutation.isPending;
  const isSupplierCheckIn = mode === "check-in" && employeeSource === "supplier" && !!selectedSupplier;
  const isSupplierCheckOut = mode === "check-out" && checkoutFilterType === "supplier" && !!checkoutFilterValue;

  // Generate supplier attendance report
  const generateSupplierAttendanceReport = useCallback(async () => {
    if (!checkoutFilterValue || !selectedCamp) {
      toast({ title: "Select a supplier and camp first", variant: "destructive" });
      return;
    }

    const campName = camps.find((c: any) => c.id === selectedCamp)?.name || "Camp";

    const { data: supplierEmps } = await supabase
      .from("employees")
      .select("id, name, employee_id, designation, status")
      .eq("employee_type", "supplier")
      .eq("supplier_name", checkoutFilterValue);

    if (!supplierEmps || supplierEmps.length === 0) {
      toast({ title: "No employees found for this supplier", variant: "destructive" });
      return;
    }

    const empIds = supplierEmps.map(e => e.id);

    const { data: ciData } = await supabase
      .from("check_ins")
      .select("employee_id, check_in_date, room_id")
      .eq("camp_id", selectedCamp)
      .in("employee_id", empIds)
      .order("check_in_date", { ascending: false });

    const { data: coData } = await supabase
      .from("check_outs")
      .select("employee_id, check_out_date, clearance_notes, damage_remarks, feedback")
      .eq("camp_id", selectedCamp)
      .in("employee_id", empIds)
      .order("check_out_date", { ascending: false });

    const ciMap = new Map<string, any>();
    (ciData || []).forEach((ci: any) => {
      if (!ciMap.has(ci.employee_id)) ciMap.set(ci.employee_id, ci);
    });
    const coMap = new Map<string, any>();
    (coData || []).forEach((co: any) => {
      if (!coMap.has(co.employee_id)) coMap.set(co.employee_id, co);
    });

    // Fetch room details
    const roomIds = [...new Set([...ciMap.values()].map(v => v.room_id).filter(Boolean))];
    const { data: roomDetails } = await supabase
      .from("rooms")
      .select("id, room_number, category, daily_rate, daily_food_rate")
      .in("id", roomIds.length > 0 ? roomIds : ["00000000-0000-0000-0000-000000000000"]);

    const roomMap = new Map<string, any>();
    (roomDetails || []).forEach((r: any) => roomMap.set(r.id, r));

    const now = new Date();
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 42, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Supplier Attendance Report", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Supplier: ${checkoutFilterValue}`, 14, 25);
    doc.text(`Camp: ${campName}`, 14, 32);
    doc.text(`Generated: ${format(now, "dd MMM yyyy, hh:mm a")}`, 14, 39);
    doc.text(`Employees: ${supplierEmps.length}`, pageWidth - 14, 25, { align: "right" });

    const rows = supplierEmps.map((emp: any, i: number) => {
      const ci = ciMap.get(emp.id);
      const co = coMap.get(emp.id);
      const room = ci ? roomMap.get(ci.room_id) : null;
      const checkInDate = ci ? new Date(ci.date || ci.check_in_date) : null;
      const checkOutDate = co ? new Date(co.check_out_date) : null;
      const days = checkInDate && checkOutDate ? Math.max(differenceInDays(checkOutDate, checkInDate), 1) : checkInDate ? Math.max(differenceInDays(now, checkInDate), 1) : 0;
      const dailyRate = room?.daily_rate || 0;
      const foodRate = room?.daily_food_rate || 0;
      const totalCharges = days * (dailyRate + foodRate);
      const comments = [co?.clearance_notes, co?.damage_remarks, co?.feedback].filter(Boolean).join("; ") || "-";

      return [
        i + 1,
        emp.name,
        room?.room_number || "-",
        room ? getRoomCategoryLabel(room.category) : "-",
        dailyRate.toFixed(2),
        foodRate > 0 ? `Yes (${foodRate})` : "No",
        checkInDate ? format(checkInDate, "dd/MM/yyyy") : "-",
        checkOutDate ? format(checkOutDate, "dd/MM/yyyy") : "Still In",
        days,
        totalCharges.toFixed(2),
        comments,
      ];
    });

    const totalCharges = rows.reduce((s, r) => s + parseFloat(r[9] as string), 0);

    autoTable(doc, {
      startY: 48,
      head: [[
        "#", "Employee Name", "Room No.", "Room Type", "Rate/Day\n(SAR)",
        "Food Included", "Check-In", "Check-Out", "Total\nDays", "Total Charges\n(SAR)", "Comments"
      ]],
      body: rows,
      foot: [["", "", "", "", "", "", "", "", "TOTAL", totalCharges.toFixed(2), ""]],
      theme: "grid",
      headStyles: {
        fillColor: [30, 58, 95], textColor: [255, 255, 255],
        fontSize: 8, fontStyle: "bold", halign: "center", valign: "middle",
      },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      footStyles: { fillColor: [240, 240, 240], textColor: [30, 58, 95], fontSize: 9, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        4: { halign: "right" },
        8: { halign: "center" },
        9: { halign: "right" },
        10: { cellWidth: 40 },
      },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY + 10, pageWidth - 14, finalY + 10);
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 95);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: SAR ${totalCharges.toFixed(2)}`, pageWidth - 14, finalY + 18, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text("This is a system-generated report. All amounts are in SAR.", 14, finalY + 18);

    doc.save(`Attendance_Report_${checkoutFilterValue.replace(/\s+/g, "_")}_${campName.replace(/\s+/g, "_")}_${format(now, "yyyy-MM-dd")}.pdf`);

    toast({ title: "Report downloaded", description: `Attendance report for ${checkoutFilterValue} generated.` });
  }, [checkoutFilterValue, selectedCamp, camps]);

  return (
    <div className="space-y-3">
      {/* Header row: Mode toggle + Date/Time */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          <button
            onClick={() => { setMode("check-in"); resetForm(); }}
            className={`tab-btn flex items-center gap-2 ${mode === "check-in" ? "tab-btn-active" : "tab-btn-inactive"}`}
          >
            <LogIn size={16} /> Check In
          </button>
          <button
            onClick={() => { setMode("check-out"); resetForm(); }}
            className={`tab-btn flex items-center gap-2 ${mode === "check-out" ? "tab-btn-active" : "tab-btn-inactive"}`}
          >
            <LogOut size={16} /> Check Out
          </button>
          <button
            onClick={() => { setMode("transfer"); resetForm(); }}
            className={`tab-btn flex items-center gap-2 ${mode === "transfer" ? "tab-btn-active" : "tab-btn-inactive"}`}
          >
            <ArrowLeftRight size={16} /> Transfer Requests
          </button>
        </div>
        {mode !== "transfer" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-muted-foreground" />
              <input
                type="date"
                value={mode === "check-in" ? checkInDate : checkOutDate}
                onChange={e => (mode === "check-in" ? setCheckInDate(e.target.value) : setCheckOutDate(e.target.value))}
                className="border rounded-lg px-2 py-1.5 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-muted-foreground" />
              <input
                type="time"
                value={mode === "check-in" ? checkInTime : checkOutTime}
                onChange={e => (mode === "check-in" ? setCheckInTime(e.target.value) : setCheckOutTime(e.target.value))}
                className="border rounded-lg px-2 py-1.5 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {mode === "transfer" ? (
        <TransferRequestsList />
      ) : (<>
      {/* Main layout: Room Map (left) + Form (right) */}
      <div className="grid grid-cols-5 gap-4">
        {/* LEFT: Visual Room Map */}
        <div className="col-span-3 stat-card !py-3">
          <RoomVisualMap
            rooms={rooms as any}
            selectedRoom={selectedRoom}
            onSelectRoom={(id) => {
              setSelectedRoom(id);
            }}
            onViewOccupants={(id) => {
              setOccupantsRoomId(id);
              setOccupantsDialogOpen(true);
            }}
            mode={mode as "check-in" | "check-out"}
            camps={camps as any}
            selectedCamp={selectedCamp}
            onSelectCamp={(campId) => {
              setSelectedCamp(campId);
              setSelectedRoom("");
              setSelectedEmployee("");
              setEmployeeSearch("");
              setBulkSelectedIds(new Set());
            }}
          />
        </div>

        {/* RIGHT: Check-in / Check-out Form */}
        <div className="col-span-2 space-y-3">
          {/* Compact filters */}
          <div className="stat-card !py-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Camp</label>
              <select
                value={selectedCamp}
                onChange={e => { setSelectedCamp(e.target.value); setSelectedRoom(""); setSelectedEmployee(""); setEmployeeSearch(""); setBulkSelectedIds(new Set()); }}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
              >
                <option value="">Choose a camp...</option>
                {camps.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.location}</option>
                ))}
              </select>
            </div>
            {mode === "check-in" && (
              <>
                <div className="flex items-end gap-3">
                  <div className="shrink-0">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                    <div className="flex gap-1 bg-muted rounded-lg p-1">
                      <button
                        onClick={() => { setEmployeeSource("own"); setSelectedSupplier(""); setSelectedEmployee(""); setEmployeeSearch(""); setBulkSelectedIds(new Set()); setCheckinProjectFilter(""); }}
                        className={`tab-btn text-sm ${employeeSource === "own" ? "tab-btn-active" : "tab-btn-inactive"}`}
                      >
                        Own
                      </button>
                      <button
                        onClick={() => { setEmployeeSource("supplier"); setSelectedEmployee(""); setEmployeeSearch(""); setBulkSelectedIds(new Set()); setCheckinProjectFilter(""); }}
                        className={`tab-btn text-sm ${employeeSource === "supplier" ? "tab-btn-active" : "tab-btn-inactive"}`}
                      >
                        Supplier
                      </button>
                    </div>
                  </div>
                  {employeeSource === "supplier" && (
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Supplier</label>
                      <select
                        value={selectedSupplier}
                        onChange={e => { setSelectedSupplier(e.target.value); setSelectedEmployee(""); setEmployeeSearch(""); setBulkSelectedIds(new Set()); }}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
                      >
                        <option value="">Choose...</option>
                        {supplierNames.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {checkinProjectNames.length > 0 && (
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Project</label>
                      <select
                        value={checkinProjectFilter}
                        onChange={e => { setCheckinProjectFilter(e.target.value); setSelectedEmployee(""); setEmployeeSearch(""); setBulkSelectedIds(new Set()); }}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
                      >
                        <option value="">All Projects</option>
                        {checkinProjectNames.map((name: string) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}

            {mode === "check-out" && (
              <div className="flex items-end gap-3">
                <div className="shrink-0">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Filter By</label>
                  <div className="flex gap-1 bg-muted rounded-lg p-1">
                    <button
                      onClick={() => { setCheckoutFilterType("all"); setCheckoutFilterValue(""); setCheckoutProjectFilter(""); setCheckoutSelectedIds(new Set()); setSelectedEmployee(""); setEmployeeSearch(""); }}
                      className={`tab-btn text-sm ${checkoutFilterType === "all" ? "tab-btn-active" : "tab-btn-inactive"}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => { setCheckoutFilterType("supplier"); setCheckoutFilterValue(""); setCheckoutProjectFilter(""); setCheckoutSelectedIds(new Set()); setSelectedEmployee(""); setEmployeeSearch(""); }}
                      className={`tab-btn text-sm ${checkoutFilterType === "supplier" ? "tab-btn-active" : "tab-btn-inactive"}`}
                    >
                      Supplier
                    </button>
                    <button
                      onClick={() => { setCheckoutFilterType("project"); setCheckoutFilterValue(""); setCheckoutProjectFilter(""); setCheckoutSelectedIds(new Set()); setSelectedEmployee(""); setEmployeeSearch(""); }}
                      className={`tab-btn text-sm ${checkoutFilterType === "project" ? "tab-btn-active" : "tab-btn-inactive"}`}
                    >
                      Project
                    </button>
                  </div>
                </div>
                {checkoutFilterType !== "all" && (
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {checkoutFilterType === "supplier" ? "Supplier" : "Project"}
                    </label>
                    <select
                      value={checkoutFilterValue}
                      onChange={e => { setCheckoutFilterValue(e.target.value); setCheckoutProjectFilter(""); setCheckoutSelectedIds(new Set()); setSelectedEmployee(""); setEmployeeSearch(""); }}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
                    >
                      <option value="">Choose...</option>
                      {(checkoutFilterType === "supplier" ? checkoutSupplierNames : checkoutProjectNames).map((name: string) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {checkoutFilterType === "supplier" && checkoutFilterValue && (
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Project</label>
                    <select
                      value={checkoutProjectFilter}
                      onChange={e => { setCheckoutProjectFilter(e.target.value); setSelectedEmployee(""); setEmployeeSearch(""); }}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
                    >
                      <option value="">All Projects</option>
                      {checkoutSupplierProjects.map((name: string) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Room Number field */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Room Number</label>
              <div className="relative">
                <DoorOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={selectedRoomData ? `${(selectedRoomData as any).buildings?.name ? (selectedRoomData as any).buildings.name + ' / ' : ''}${selectedRoomData.room_number}` : ""}
                  readOnly
                  placeholder="Click a room on the map or it will be auto-filled..."
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-muted/30 focus:ring-2 focus:ring-ring outline-none cursor-default"
                />
              </div>
              {selectedRoomData && (
                <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {getRoomCategoryLabel(selectedRoomData.category)} · {selectedRoomData.current_occupancy}/{selectedRoomData.max_capacity} occupied
                </p>
              )}
            </div>
          </div>

          {/* Employee selection area */}
          <div className="stat-card !py-3">
            {/* SUPPLIER CHECK-IN: Employee checklist */}
            {isSupplierCheckIn && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">
                    Select Employees ({bulkSelectedIds.size} / {supplierEmployeeList.length})
                  </label>
                  <button onClick={toggleAllBulk} className="text-xs text-primary hover:underline">
                    {bulkSelectedIds.size === supplierEmployeeList.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={employeeSearch}
                    onChange={e => setEmployeeSearch(e.target.value)}
                    placeholder="Filter employees..."
                    className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
                  />
                </div>
                <div className="border rounded-lg max-h-[calc(100vh-480px)] overflow-y-auto divide-y">
                  {supplierEmployeeList.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground text-center">No employees found</p>
                  ) : (
                    supplierEmployeeList.map((emp: any) => (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                          bulkSelectedIds.has(emp.id) ? "bg-primary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={bulkSelectedIds.has(emp.id)}
                          onChange={() => toggleBulkEmployee(emp.id)}
                          className="rounded border-muted-foreground/30 text-primary focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {emp.name}
                            {emp.is_blacklisted && (
                              <span className="ml-1 text-[10px] bg-destructive/10 text-destructive px-1 py-0.5 rounded-full">Blacklisted</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{emp.employee_id} · {emp.passport_number || "No passport"}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{emp.iqama_number || "No iqama"}</span>
                      </label>
                    ))
                  )}
                </div>
                {/* Project (optional) for supplier check-in */}
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 items-end">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">Project (optional)</label>
                    <input
                      value={checkInProject}
                      onChange={e => setCheckInProject(e.target.value)}
                      placeholder="Enter project name..."
                      className="w-full border rounded-lg px-3 py-1.5 text-xs bg-card focus:ring-2 focus:ring-ring outline-none"
                    />
                  </div>
                  <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs whitespace-nowrap transition-colors ${foodRequired ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted/40 border-border text-muted-foreground"}`}>
                    <input
                      type="checkbox"
                      checked={foodRequired}
                      onChange={e => setFoodRequired(e.target.checked)}
                      className="accent-primary"
                    />
                    🍽️ Food
                  </label>
                </div>
              </div>
            )}

            {/* OWN CHECK-IN: Single employee search */}
            {mode === "check-in" && employeeSource === "own" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Select Employee
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={employeeSearch}
                    onChange={e => { setEmployeeSearch(e.target.value); setSelectedEmployee(""); }}
                    placeholder="Search by name or ID..."
                    className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
                  />
                </div>
                {employeeSearch && !selectedEmployee && (
                  <div className="border rounded-lg mt-1 max-h-[calc(100vh-500px)] overflow-y-auto bg-card shadow-sm">
                    {filteredEmployees.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No employees found</p>
                    ) : (
                      filteredEmployees.slice(0, 20).map((emp: any) => (
                        <button
                          key={emp.id}
                          onClick={() => handleSelectEmployee(emp.id, emp.name)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium">{emp.name}</span>
                            {emp.is_blacklisted && <Ban size={12} className="inline ml-1 text-destructive" />}
                          </div>
                          <span className="text-muted-foreground text-xs">{emp.employee_id}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedEmployeeData && (
                  <div className="mt-2 flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users size={12} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {(selectedEmployeeData as any).name}
                        {(selectedEmployeeData as any).is_blacklisted && (
                          <span className="ml-1 text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">Blacklisted</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedEmployeeData as any).employee_id} · {(selectedEmployeeData as any).company || (selectedEmployeeData as any).supplier_name || "N/A"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Iqama & Passport display */}
                {selectedEmployee && selectedEmployeeData && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="px-2 py-1.5 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">Iqama</p>
                      <p className="text-xs font-medium font-mono">{(selectedEmployeeData as any).iqama_number || "—"}</p>
                    </div>
                    <div className="px-2 py-1.5 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">Passport</p>
                      <p className="text-xs font-medium font-mono">{(selectedEmployeeData as any).passport_number || "—"}</p>
                    </div>
                  </div>
                )}

                {/* Project (optional) + Food toggle */}
                {selectedEmployee && (
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 items-end">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Project (optional)</label>
                      <input
                        value={checkInProject}
                        onChange={e => setCheckInProject(e.target.value)}
                        placeholder="Enter project name..."
                        className="w-full border rounded-lg px-3 py-1.5 text-xs bg-card focus:ring-2 focus:ring-ring outline-none"
                      />
                    </div>
                    <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs whitespace-nowrap transition-colors ${foodRequired ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted/40 border-border text-muted-foreground"}`}>
                      <input
                        type="checkbox"
                        checked={foodRequired}
                        onChange={e => setFoodRequired(e.target.checked)}
                        className="accent-primary"
                      />
                      🍽️ Food
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* CHECK-OUT: Filtered occupant list with checkboxes */}
            {mode === "check-out" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">
                    Checked-In Employees ({checkOutEmployeeList.length})
                  </label>
                  {checkOutEmployeeList.length > 0 && (
                    <button onClick={toggleAllCheckout} className="text-xs text-primary hover:underline">
                      {checkoutSelectedIds.size === checkOutEmployeeList.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={employeeSearch}
                    onChange={e => { setEmployeeSearch(e.target.value); setSelectedEmployee(""); }}
                    placeholder="Filter by name or ID..."
                    className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
                  />
                </div>
                {checkoutSelectedIds.size > 0 && (
                  <p className="text-xs text-muted-foreground mb-1 px-1">{checkoutSelectedIds.size} selected</p>
                )}
                <div className="border rounded-lg max-h-[calc(100vh-480px)] overflow-y-auto divide-y">
                  {checkOutEmployeeList.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                      {!selectedCamp ? "Select a camp first" : "No checked-in employees found"}
                    </p>
                  ) : (
                    checkOutEmployeeList.map((emp: any) => {
                      const empRoom = rooms.find(r => r.id === emp.checked_in_room_id);
                      const isChecked = checkoutSelectedIds.has(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            isChecked ? "bg-primary/5" : "hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheckoutEmployee(emp.id)}
                            className="rounded border-muted-foreground/30 text-primary focus:ring-primary shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {emp.name}
                              {emp.is_blacklisted && (
                                <span className="ml-1 text-[10px] bg-destructive/10 text-destructive px-1 py-0.5 rounded-full">Blacklisted</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {emp.employee_id}
                              {emp.designation && <> · {emp.designation}</>}
                              {emp.company && <> · {emp.company}</>}
                              {emp.supplier_name && <> · {emp.supplier_name}</>}
                              {emp.project && <> · {emp.project}</>}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {empRoom && (
                              <p className="text-[10px] text-muted-foreground">Room {empRoom.room_number}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground">{emp.nationality || emp.employee_type}</p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Clearance Checklist (Check-Out only) */}
            {mode === "check-out" && (
              <div className="mt-4 border-t pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-primary" /> Clearance Checklist
                </h3>
                <div className="space-y-1.5">
                  {clearanceItems.map(item => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                        item.checked ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleClearance(item.id)}
                        className="rounded border-muted-foreground/30 text-primary focus:ring-primary"
                      />
                      <span className="text-muted-foreground">{item.icon}</span>
                      <span className="text-xs">{item.label}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Damage Remarks</label>
                  <textarea
                    value={damageRemarks}
                    onChange={e => setDamageRemarks(e.target.value)}
                    placeholder="Note any damages..."
                    className="w-full border rounded-lg px-3 py-2 text-xs bg-card focus:ring-2 focus:ring-ring outline-none resize-none h-14"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Clearance Notes</label>
                  <textarea
                    value={clearanceNotes}
                    onChange={e => setClearanceNotes(e.target.value)}
                    placeholder="Additional notes..."
                    className="w-full border rounded-lg px-3 py-2 text-xs bg-card focus:ring-2 focus:ring-ring outline-none resize-none h-14"
                  />
                </div>

                {/* Feedback */}
                <div className="border-t pt-3">
                  <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Star size={12} className="text-amber-500" /> Feedback
                  </h3>
                  <div className="flex items-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} onClick={() => setFeedbackRating(star)} className="p-0.5">
                        <Star size={16} className={star <= feedbackRating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"} />
                      </button>
                    ))}
                    {feedbackRating > 0 && <span className="text-[10px] text-muted-foreground ml-1">{feedbackRating}/5</span>}
                  </div>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Feedback..."
                    className="w-full border rounded-lg px-3 py-2 text-xs bg-card focus:ring-2 focus:ring-ring outline-none resize-none h-12"
                  />
                </div>

                {/* Blacklist */}
                <div className="border-t pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBlacklisted}
                      onChange={e => setIsBlacklisted(e.target.checked)}
                      className="rounded border-muted-foreground/30 text-destructive focus:ring-destructive"
                    />
                    <Ban size={14} className="text-destructive" />
                    <span className="text-xs font-medium text-destructive">Blacklist employee</span>
                  </label>
                  {isBlacklisted && (
                    <textarea
                      value={blacklistReason}
                      onChange={e => setBlacklistReason(e.target.value)}
                      placeholder="Reason..."
                      className="mt-2 w-full border border-destructive/30 rounded-lg px-3 py-2 text-xs bg-card focus:ring-2 focus:ring-destructive outline-none resize-none h-12"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {isSupplierCheckIn ? (
                <>
                  <button
                    onClick={() => setAiDialogOpen(true)}
                    disabled={!selectedCamp || bulkSelectedIds.size === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles size={14} /> AI Allocate
                  </button>
                  <button
                    onClick={handleBulkCheckIn}
                    disabled={!selectedCamp || !selectedRoom || bulkSelectedIds.size === 0 || bulkSubmitting}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-primary/30 text-primary hover:bg-primary/5"
                  >
                    {bulkSubmitting ? "Processing..." : `Check In (${bulkSelectedIds.size})`}
                  </button>
                </>
              ) : mode === "check-in" ? (
                <button
                  onClick={handleSubmit}
                  disabled={!selectedCamp || !selectedEmployee || isSubmitting || !selectedRoom}
                  className="px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? "Processing..." : "Confirm Check-In"}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!selectedCamp || checkoutSelectedIds.size === 0 || bulkSubmitting || !allClearanceChecked}
                  className="px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {bulkSubmitting ? "Processing..." : `Check Out (${checkoutSelectedIds.size})`}
                </button>
              )}
              <button onClick={resetForm} className="px-3 py-2 border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors">
                Reset
              </button>
              {isSupplierCheckOut && (
                <button
                  onClick={generateSupplierAttendanceReport}
                  className="px-3 py-2 border rounded-lg text-xs font-medium text-primary border-primary/30 hover:bg-primary/5 transition-colors flex items-center gap-1"
                >
                  <Download size={12} /> Report
                </button>
              )}
              {mode === "check-out" && selectedCamp && (
                <button
                  onClick={() => setBulkCheckoutOpen(true)}
                  className="px-3 py-2 border rounded-lg text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/5 transition-colors flex items-center gap-1"
                >
                  <Users size={12} /> Bulk Checkout + Report
                </button>
              )}
              {mode === "check-out" && !allClearanceChecked && checkoutSelectedIds.size > 0 && (
                <p className="text-[10px] text-destructive flex items-center gap-1">
                  <AlertTriangle size={10} /> Complete clearance items
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      </>)}

      {/* AI Room Allocation Dialog */}
      {isSupplierCheckIn && (
        <AIRoomAllocationDialog
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          employees={supplierEmployeeList.filter((e: any) => bulkSelectedIds.has(e.id))}
          rooms={rooms}
          campId={selectedCamp}
          onSuccess={resetForm}
        />
      )}

      {/* Room Employee Dialog removed - right-side form handles check-in with filters */}

      {/* Room Occupants Dialog */}
      <RoomOccupantsDialog
        open={occupantsDialogOpen}
        onOpenChange={setOccupantsDialogOpen}
        room={rooms.find(r => r.id === occupantsRoomId) as any}
        campId={selectedCamp}
      />

      {/* Bulk Checkout Dialog */}
      <BulkCheckoutDialog
        open={bulkCheckoutOpen}
        onOpenChange={setBulkCheckoutOpen}
        campId={selectedCamp}
        campName={camps.find((c: any) => c.id === selectedCamp)?.name || "Camp"}
      />

      {/* Check-In Confirmation Dialog */}
      <CheckInConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={isSupplierCheckIn ? handleBulkCheckInConfirmed : handleConfirmedCheckIn}
        isSubmitting={isSubmitting || bulkSubmitting}
        employee={!isSupplierCheckIn && selectedEmployeeData ? selectedEmployeeData as any : null}
        room={selectedRoomData as any}
        camp={camps.find((c: any) => c.id === selectedCamp) as any}
        project={checkInProject}
        checkInDate={checkInDate}
        checkInTime={checkInTime}
        bulkEmployees={isSupplierCheckIn ? supplierEmployeeList.filter((e: any) => bulkSelectedIds.has(e.id)) : undefined}
      />
      {/* Check-Out Confirmation Dialog */}
      <CheckOutConfirmDialog
        open={checkoutConfirmOpen}
        onOpenChange={setCheckoutConfirmOpen}
        onConfirm={() => {
          setCheckoutConfirmOpen(false);
          handleBulkCheckOutFromMain();
        }}
        isSubmitting={bulkSubmitting}
        employees={checkedInEmployees.filter((e: any) => checkoutSelectedIds.has(e.id))}
        rooms={rooms as any}
        camp={camps.find((c: any) => c.id === selectedCamp) as any}
        clearanceItems={clearanceItems}
        damageRemarks={damageRemarks}
        clearanceNotes={clearanceNotes}
        feedback={feedback}
        feedbackRating={feedbackRating}
        isBlacklisted={isBlacklisted}
        blacklistReason={blacklistReason}
      />
    </div>
  );
}
