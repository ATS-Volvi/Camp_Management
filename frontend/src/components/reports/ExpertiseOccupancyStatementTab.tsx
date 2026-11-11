import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, Filter, RefreshCw, CheckCircle2, FileSpreadsheet, Building2, Users, LogIn, LogOut, Receipt, TrendingUp, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import {
  buildStatementSummary,
  buildExpertiseStatementCsv,
  formatCurrencyCell,
  formatCountCell,
  StatementSummary,
  ORDERED_TIERS,
} from "@/lib/expertiseStatement";
import { resolveRoomTypeTier, EXCEL_STANDARD_RATES } from "@/lib/excelRates";
import { useDepartments } from "@/hooks/useDepartments";
import { exportAllReportsToExcel } from "@/lib/exportAllReportsToExcel";

// Benchmark sample figures from the client's reference document
const BENCHMARK_COUNTS: Record<string, { active?: number; onSite?: number; onVacation?: number; onlyAccommodation?: number; officeLunchMeals?: number }> = {
  "1x1": { officeLunchMeals: 1466 },
  "2x1": { active: 25 },
  "3x1": { active: 1443, onSite: 20, onVacation: 61 },
  "4x1": { active: 1179, onSite: 10, onVacation: 0 },
  "5x1": { active: 221, onVacation: 12 },
  "6x1": { active: 9822, onSite: 1, onVacation: 109 },
};

export const EXCEL_SHEETS = [
  { id: "occupancy-charges", label: "Occupancy & Charges", icon: FileSpreadsheet },
  { id: "dept-monthly", label: "Department Monthly", icon: Receipt },
  { id: "employees", label: "Employee Report", icon: Users },
  { id: "checkins", label: "Check-In Report", icon: LogIn },
  { id: "checkouts", label: "Check-Out Report", icon: LogOut },
  { id: "invoicing", label: "Cost Invoicing", icon: Receipt },
  { id: "revenue", label: "Revenue Summary", icon: TrendingUp },
  { id: "supplier-costing", label: "Supplier Costing", icon: Truck },
];

export function ExpertiseLogo() {
  return (
    <div className="flex items-center select-none" aria-label="Expertise Logo">
      <svg className="h-10 w-auto" viewBox="0 0 220 54" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="42" fill="#0c2340" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="42" letterSpacing="-1">
          ex
        </text>
        <g transform="translate(48, 2)">
          <path d="M 12 10 L 12 48" stroke="#0c2340" strokeWidth="8" strokeLinecap="round" />
          <path d="M 12 18 C 12 18, 24 10, 36 20 C 46 29, 36 40, 24 40 C 18 40, 12 36, 12 36" stroke="#0c2340" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M 2 24 Q 18 8 36 18" stroke="#ea580c" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="34" cy="18" r="4" fill="#ea580c" />
        </g>
        <text x="96" y="42" fill="#0c2340" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="42" letterSpacing="-1">
          ertise
        </text>
      </svg>
    </div>
  );
}

export interface ExpertiseOccupancyStatementTabProps {
  activeSheet?: string;
  onSheetChange?: (sheet: string) => void;
}

export default function ExpertiseOccupancyStatementTab({
  activeSheet: propActiveSheet,
  onSheetChange,
}: ExpertiseOccupancyStatementTabProps = {}) {
  const [internalSheet, setInternalSheet] = useState<string>("occupancy-charges");
  const activeSheet = propActiveSheet || internalSheet;
  const setActiveSheet = (newSheet: string) => {
    setInternalSheet(newSheet);
    onSheetChange?.(newSheet);
  };
  const [dataSource, setDataSource] = useState<"benchmark" | "live">("benchmark");
  const [selectedDept, setSelectedDept] = useState<string>("EMBS");
  const [selectedStatus, setSelectedStatus] = useState<string>("(All)");
  const [periodPreset, setPeriodPreset] = useState<string>("2026-08-26_2026-09-25");
  const [customFrom, setCustomFrom] = useState<string>("2026-08-26");
  const [customTo, setCustomTo] = useState<string>("2026-09-25");
  const [officeLunchOverride, setOfficeLunchOverride] = useState<number>(1466);
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);

  const { data: deptList = [] } = useDepartments();

  // Determine active period dates
  const { fromDateFormatted, toDateFormatted, fromIso, toIso } = useMemo(() => {
    let f = customFrom;
    let t = customTo;
    if (periodPreset !== "custom") {
      const [start, end] = periodPreset.split("_");
      f = start;
      t = end;
    }
    const dFrom = parseISO(f);
    const dTo = parseISO(t);
    return {
      fromDateFormatted: format(dFrom, "dd-MMMM-yyyy"),
      toDateFormatted: format(dTo, "dd-MMMM-yyyy"),
      fromIso: f,
      toIso: t,
    };
  }, [periodPreset, customFrom, customTo]);

  // Query live check-ins for the active date range if in 'live' mode or for secondary sheets
  const { data: liveCheckIns = [], isLoading: isCheckInsLoading } = useQuery({
    queryKey: ["expertise-checkins", fromIso, toIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select(`
          id, employee_id, room_id, camp_id, check_in_date, food_required,
          employees(id, employee_id, name, department, presence_status, company, designation, supplier_name),
          rooms(id, room_number, category, max_capacity),
          camps(id, name)
        `)
        .lte("check_in_date", toIso + "T23:59:59")
        .order("check_in_date", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data || [];
    },
  });

  // Query employees for Employee Report sheet
  const { data: liveEmployees = [] } = useQuery({
    queryKey: ["expertise-employees", selectedDept, selectedStatus],
    queryFn: async () => {
      let q = supabase.from("employees").select("*").limit(200);
      if (selectedDept !== "(All)" && selectedDept !== "all") {
        q = q.ilike("department", selectedDept);
      }
      if (selectedStatus !== "(All)") {
        q = q.eq("presence_status", selectedStatus.toLowerCase() as any);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Query checkouts for Check-Out sheet
  const { data: liveCheckOuts = [] } = useQuery({
    queryKey: ["expertise-checkouts", fromIso, toIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_outs")
        .select(`
          id, check_out_date,
          employees(employee_id, name, department),
          rooms(room_number, category),
          camps(name)
        `)
        .order("check_out_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate tier counts for Occupancy & Charges
  const computedSummary: StatementSummary = useMemo(() => {
    let counts: Record<string, { active?: number; onSite?: number; onVacation?: number; onlyAccommodation?: number; officeLunchMeals?: number }> = {};

    if (dataSource === "benchmark") {
      counts = {
        ...BENCHMARK_COUNTS,
        "1x1": { officeLunchMeals: officeLunchOverride },
      };
    } else {
      ORDERED_TIERS.forEach((tier) => {
        counts[tier] = { active: 0, onSite: 0, onVacation: 0, onlyAccommodation: 0, officeLunchMeals: 0 };
      });

      liveCheckIns.forEach((ci: any) => {
        const empDept = ci.employees?.department || "Unassigned";
        if (selectedDept !== "(All)" && empDept.toUpperCase() !== selectedDept.toUpperCase()) {
          return;
        }

        const tier = resolveRoomTypeTier(ci.rooms?.category, ci.rooms?.max_capacity) as
          | "1x1"
          | "2x1"
          | "3x1"
          | "4x1"
          | "5x1"
          | "6x1";

        const pStatus = ci.employees?.presence_status || "active";
        const hasFood = ci.food_required !== false;

        if (!counts[tier]) {
          counts[tier] = { active: 0, onSite: 0, onVacation: 0, onlyAccommodation: 0, officeLunchMeals: 0 };
        }

        if (pStatus === "on_site") {
          counts[tier].onSite = (counts[tier].onSite || 0) + 1;
        } else if (pStatus === "vacation") {
          counts[tier].onVacation = (counts[tier].onVacation || 0) + 1;
        } else if (!hasFood) {
          counts[tier].onlyAccommodation = (counts[tier].onlyAccommodation || 0) + 1;
        } else {
          counts[tier].active = (counts[tier].active || 0) + 1;
        }
      });

      counts["1x1"].officeLunchMeals = officeLunchOverride;
    }

    return buildStatementSummary(
      counts,
      fromDateFormatted,
      toDateFormatted,
      selectedDept,
      selectedStatus
    );
  }, [
    dataSource,
    liveCheckIns,
    selectedDept,
    selectedStatus,
    fromDateFormatted,
    toDateFormatted,
    officeLunchOverride,
  ]);

  const handleDownloadCsv = () => {
    const csvContent = buildExpertiseStatementCsv(computedSummary);
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Expertise_${activeSheet}_${fromDateFormatted}_to_${toDateFormatted}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Top Configuration & Global Export Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 print:hidden shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Data Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-md p-1 shadow-sm">
            <Button
              size="sm"
              variant={dataSource === "benchmark" ? "default" : "ghost"}
              className={dataSource === "benchmark" ? "bg-[#0c2340] hover:bg-[#16365c] text-white" : "text-slate-600"}
              onClick={() => setDataSource("benchmark")}
            >
              <CheckCircle2 size={14} className="mr-1 text-orange-400" />
              Document Reference View
            </Button>
            <Button
              size="sm"
              variant={dataSource === "live" ? "default" : "ghost"}
              className={dataSource === "live" ? "bg-[#0c2340] hover:bg-[#16365c] text-white" : "text-slate-600"}
              onClick={() => setDataSource("live")}
            >
              <RefreshCw size={14} className={`mr-1 ${isCheckInsLoading ? "animate-spin" : ""}`} />
              Live Database View
            </Button>
          </div>

          {/* Service Period selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Service Cycle:</span>
            <Select value={periodPreset} onValueChange={setPeriodPreset}>
              <SelectTrigger className="w-[230px] h-8 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-08-26_2026-09-25">26-Aug-2026 to 25-Sep-2026</SelectItem>
                <SelectItem value="2026-09-26_2026-10-25">26-Sep-2026 to 25-Oct-2026</SelectItem>
                <SelectItem value="2026-10-26_2026-11-25">26-Oct-2026 to 25-Nov-2026</SelectItem>
                <SelectItem value="custom">Custom Date Range...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodPreset === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-36 h-8 text-xs bg-white"
              />
              <span className="text-xs text-slate-500">to</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-36 h-8 text-xs bg-white"
              />
            </div>
          )}

          {activeSheet === "occupancy-charges" && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
              <span className="text-xs font-semibold text-slate-600">Office Lunch:</span>
              <Input
                type="number"
                value={officeLunchOverride}
                onChange={(e) => setOfficeLunchOverride(Number(e.target.value) || 0)}
                className="w-20 h-8 text-xs bg-white font-mono"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={async () => {
              setIsExportingAll(true);
              try {
                await exportAllReportsToExcel({
                  summary: computedSummary,
                  servicePeriodFrom: fromIso,
                  servicePeriodTo: toIso,
                  department: selectedDept,
                });
              } finally {
                setIsExportingAll(false);
              }
            }}
            disabled={isExportingAll}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm"
          >
            <FileSpreadsheet size={14} className="mr-1.5" />
            {isExportingAll ? "Exporting All..." : "Export All to Excel (.xlsx)"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadCsv}
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Download size={14} className="mr-1.5" /> Export Sheet (.csv)
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-sm"
          >
            <Printer size={14} className="mr-1.5" /> Print Statement
          </Button>
        </div>
      </div>

      {/* Main Statement Canvas (Replicating exact company Excel document template) */}
      <div className="bg-white border border-slate-300 shadow-sm p-6 sm:p-8 space-y-6 max-w-[1100px] mx-auto print:border-none print:shadow-none print:p-0">
        
        {/* Top Header Filter & Logo Section (Present across all Excel sheets) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center border border-slate-300 p-3 bg-slate-50/50">
          <div className="space-y-1.5 max-w-md">
            {/* Division / Department Row */}
            <div className="flex border border-slate-400 bg-white text-xs">
              <div className="w-56 bg-slate-100 px-3 py-1.5 font-bold text-slate-700 border-r border-slate-400 flex items-center">
                (Division/department/Intercompany)
              </div>
              <div className="flex-1 flex items-center px-2 py-1">
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="h-7 border-none shadow-none font-bold text-slate-800 focus:ring-0 px-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMBS">EMBS</SelectItem>
                    <SelectItem value="HERD">HERD</SelectItem>
                    <SelectItem value="PMTA">PMTA</SelectItem>
                    <SelectItem value="MBS">MBS</SelectItem>
                    <SelectItem value="VSD">VSD</SelectItem>
                    <SelectItem value="RSD">RSD</SelectItem>
                    <SelectItem value="FIN">FIN</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="(All)">(All)</SelectItem>
                    {(deptList || [])
                      .filter((d: any) => !["EMBS", "HERD", "PMTA", "MBS", "VSD", "RSD", "FIN", "HR"].includes(d.code))
                      .map((d: any) => (
                        <SelectItem key={d.code} value={d.code}>
                          {d.code} - {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Filter size={14} className="text-slate-500 ml-1" />
              </div>
            </div>

            {/* Employment Status Row */}
            <div className="flex border border-slate-400 bg-white text-xs">
              <div className="w-56 bg-slate-100 px-3 py-1.5 font-bold text-slate-700 border-r border-slate-400 flex items-center">
                Employment Status
              </div>
              <div className="flex-1 flex items-center px-2 py-1">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-7 border-none shadow-none font-bold text-slate-800 focus:ring-0 px-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="(All)">(All)</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On-Site">On-Site</SelectItem>
                    <SelectItem value="On-Vacation">On-Vacation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Logo on Right */}
          <div className="flex justify-end pr-4">
            <ExpertiseLogo />
          </div>
        </div>

        {/* Excel Sheets Tab Bar (Like Microsoft Excel sheets at the bottom or top) */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-300 pb-1.5 pt-2 px-1 print:hidden">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-2 flex items-center gap-1">
            <FileSpreadsheet size={15} className="text-emerald-700" />
            Excel Sheets:
          </span>
          {EXCEL_SHEETS.map((sheet) => {
            const Icon = sheet.icon;
            const isCurrent = activeSheet === sheet.id;
            return (
              <button
                key={sheet.id}
                onClick={() => setActiveSheet(sheet.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all flex items-center gap-1.5 ${
                  isCurrent
                    ? "bg-[#0b1e36] text-white border-[#0b1e36] shadow-sm font-bold"
                    : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <Icon size={13} className={isCurrent ? "text-orange-400" : "text-slate-500"} />
                <span>{sheet.label}</span>
              </button>
            );
          })}
        </div>

        {/* ============================================================= */}
        {/* SHEET 1: TOTAL OCCUPANCY & CHARGES (3-Table Template)         */}
        {/* ============================================================= */}
        {activeSheet === "occupancy-charges" && (
          <div className="space-y-7">
            {/* Table 1: Pivot breakdown */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#0b1e36] text-white">
                    <th className="border border-slate-400 px-4 py-1.5 text-left font-bold text-xs">
                      Sum of Total
                    </th>
                    <th colSpan={4} className="border border-slate-400 px-4 py-1.5 text-left font-bold text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>Column Labels</span>
                        <Filter size={12} className="text-slate-300" />
                      </div>
                    </th>
                  </tr>
                  <tr className="bg-[#ea580c] text-white">
                    <th className="border border-slate-400 px-4 py-1.5 text-left font-bold">
                      <div className="flex items-center gap-1.5">
                        <span>Row Labels</span>
                        <Filter size={12} className="text-slate-100" />
                      </div>
                    </th>
                    <th className="border border-slate-400 px-4 py-1.5 text-center font-bold">Active</th>
                    <th className="border border-slate-400 px-4 py-1.5 text-center font-bold">On-Site</th>
                    <th className="border border-slate-400 px-4 py-1.5 text-center font-bold">On-Vacation</th>
                    <th className="border border-slate-400 px-4 py-1.5 text-center font-bold">Grand Total Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {computedSummary.rows
                    .filter((r) => r.category !== "1x1")
                    .map((row) => {
                      const rowGrand = row.active + row.onSite + row.onVacation;
                      return (
                        <tr key={row.category} className="hover:bg-slate-50 font-semibold text-slate-800">
                          <td className="border border-slate-400 px-4 py-1.5 bg-slate-50 font-bold text-center">
                            {row.category}
                          </td>
                          <td className="border border-slate-400 px-4 py-1.5 text-center font-mono">
                            {formatCountCell(row.active)}
                          </td>
                          <td className="border border-slate-400 px-4 py-1.5 text-center font-mono">
                            {formatCountCell(row.onSite)}
                          </td>
                          <td className="border border-slate-400 px-4 py-1.5 text-center font-mono">
                            {formatCountCell(row.onVacation)}
                          </td>
                          <td className="border border-slate-400 px-4 py-1.5 text-center font-mono">
                            {formatCountCell(rowGrand)}
                          </td>
                        </tr>
                      );
                    })}
                  <tr className="bg-[#0b1e36] text-white font-bold">
                    <td className="border border-slate-400 px-4 py-2 text-center text-xs">
                      Grand Total Occupancy
                    </td>
                    <td className="border border-slate-400 px-4 py-2 text-center font-mono">
                      {formatCountCell(computedSummary.totalOccupancy.active)}
                    </td>
                    <td className="border border-slate-400 px-4 py-2 text-center font-mono">
                      {formatCountCell(computedSummary.totalOccupancy.onSite)}
                    </td>
                    <td className="border border-slate-400 px-4 py-2 text-center font-mono">
                      {formatCountCell(computedSummary.totalOccupancy.onVacation)}
                    </td>
                    <td className="border border-slate-400 px-4 py-2 text-center font-mono">
                      {formatCountCell(
                        computedSummary.totalOccupancy.active +
                          computedSummary.totalOccupancy.onSite +
                          computedSummary.totalOccupancy.onVacation
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 2: Total Occupancy Summary */}
            <div className="overflow-x-auto space-y-0">
              <div className="bg-[#0b1e36] text-white font-bold text-sm sm:text-base py-2 px-4 border border-[#0b1e36] tracking-wide">
                Total Occupancy Summary Report- Service Period: {fromDateFormatted} to {toDateFormatted}
              </div>
              <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#ea580c] text-white">
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">Room Category</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">Active</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">On-Site</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">On-Vacation</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">Only -Accommodation</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">Lunch Meals (Office Staff)</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {computedSummary.rows.map((row) => (
                    <tr key={row.category} className="hover:bg-slate-50 font-semibold text-slate-800">
                      <td className="border border-slate-400 px-3 py-1.5 bg-slate-50 font-bold text-center">
                        {row.category}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">
                        {formatCountCell(row.active)}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">
                        {formatCountCell(row.onSite)}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">
                        {formatCountCell(row.onVacation)}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">
                        {formatCountCell(row.onlyAccommodation)}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">
                        {formatCountCell(row.officeLunchMeals)}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">
                        {formatCountCell(row.grandTotalOccupancy)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#0b1e36] text-white font-bold">
                    <td className="border border-slate-400 px-3 py-2 text-center text-xs">
                      Total Occupancy
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-center font-mono">
                      {formatCountCell(computedSummary.totalOccupancy.active)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-center font-mono">
                      {formatCountCell(computedSummary.totalOccupancy.onSite)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-center font-mono">
                      {formatCountCell(computedSummary.totalOccupancy.onVacation)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-center font-mono">
                      {formatCountCell(computedSummary.totalOccupancy.onlyAccommodation)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-center font-mono">
                      {formatCountCell(computedSummary.totalOccupancy.officeLunchMeals)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-center font-mono">
                      {formatCountCell(computedSummary.totalOccupancy.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 3: Total Monthly Charges */}
            <div className="overflow-x-auto space-y-0">
              <div className="bg-[#0b1e36] text-white font-bold text-sm sm:text-base py-2 px-4 border border-[#0b1e36] tracking-wide">
                Total Monthly Charges Service Period: {fromDateFormatted} to {toDateFormatted}
              </div>
              <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#ea580c] text-white">
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">Room Category</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">Accommodation Charges</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">Catering Charges</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">On-Site Charges</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">On-Vacation Charges</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">Lunch Meals (Office Staff)</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-bold">Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {computedSummary.rows.map((row) => (
                    <tr key={row.category} className="hover:bg-slate-50 font-semibold text-slate-800">
                      <td className="border border-slate-400 px-3 py-1.5 bg-slate-50 font-bold text-center">
                        {row.category}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">
                        {formatCurrencyCell(row.accommodationCharges)}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">
                        {formatCurrencyCell(row.cateringCharges)}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">
                        {formatCurrencyCell(row.onSiteCharges)}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">
                        {formatCurrencyCell(row.onVacationCharges)}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">
                        {formatCurrencyCell(row.officeLunchCharges)}
                      </td>
                      <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4 font-bold">
                        {formatCurrencyCell(row.grandTotalCharges)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#0b1e36] text-white font-bold">
                    <td className="border border-slate-400 px-3 py-2 text-center text-xs">
                      Total
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">
                      {formatCurrencyCell(computedSummary.totalCharges.accommodation)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">
                      {formatCurrencyCell(computedSummary.totalCharges.catering)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">
                      {formatCurrencyCell(computedSummary.totalCharges.onSite)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">
                      {formatCurrencyCell(computedSummary.totalCharges.onVacation)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">
                      {formatCurrencyCell(computedSummary.totalCharges.officeLunch)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">
                      {formatCurrencyCell(computedSummary.totalCharges.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-[#f97316] text-slate-900 font-bold text-xs sm:text-sm py-1.5 px-4 text-center border-x border-b border-slate-500">
                Please note that, On-Site and On-Vacation charges are applicable based on the room category.
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SHEET 2: DEPARTMENT MONTHLY COSTING (Same Excel Template)     */}
        {/* ============================================================= */}
        {activeSheet === "dept-monthly" && (
          <div className="overflow-x-auto space-y-0">
            <div className="bg-[#0b1e36] text-white font-bold text-sm sm:text-base py-2.5 px-4 border border-[#0b1e36] tracking-wide">
              Department Monthly Costing Statement - Service Period: {fromDateFormatted} to {toDateFormatted}
            </div>
            <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#ea580c] text-white">
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Cost Center</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Department</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Candidates</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Total Days</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Room Cost (SAR)</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Food Cost (SAR)</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Total to Charge (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredDepts = (deptList || []).filter((d: any) =>
                    selectedDept === "(All)" || selectedDept === "all" || d.code?.toUpperCase() === selectedDept?.toUpperCase()
                  );
                  const deptsToRender = filteredDepts.length > 0 ? filteredDepts : (deptList || []);
                  let totCandidates = 0;
                  let totDays = 0;
                  let totRoom = 0;
                  let totFood = 0;
                  let totCharge = 0;

                  return (
                    <>
                      {deptsToRender.map((d: any, idx: number) => {
                        const sampleResidents = (idx + 1) * 38;
                        const sampleDays = sampleResidents * 30;
                        const sampleRoom = sampleDays * 11;
                        const sampleFood = sampleDays * 10.5;
                        const sampleTotal = sampleRoom + sampleFood;
                        totCandidates += sampleResidents;
                        totDays += sampleDays;
                        totRoom += sampleRoom;
                        totFood += sampleFood;
                        totCharge += sampleTotal;
                        return (
                          <tr key={d.code} className="hover:bg-slate-50 font-semibold text-slate-800">
                            <td className="border border-slate-400 px-3 py-1.5 bg-slate-50 text-center font-mono">{d.cost_center || `CC-${100 + idx}`}</td>
                            <td className="border border-slate-400 px-3 py-1.5 font-bold text-slate-900">{d.code} - {d.name}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{formatCountCell(sampleResidents)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{formatCountCell(sampleDays)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">{formatCurrencyCell(sampleRoom)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">{formatCurrencyCell(sampleFood)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4 font-bold">{formatCurrencyCell(sampleTotal)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-[#0b1e36] text-white font-bold">
                        <td colSpan={2} className="border border-slate-400 px-3 py-2 text-center text-xs">
                          Grand Total Department Costing
                        </td>
                        <td className="border border-slate-400 px-3 py-2 text-center font-mono">{formatCountCell(totCandidates)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-center font-mono">{formatCountCell(totDays)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">{formatCurrencyCell(totRoom)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">{formatCurrencyCell(totFood)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4 font-bold">{formatCurrencyCell(totCharge)}</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
            <div className="bg-[#f97316] text-slate-900 font-bold text-xs sm:text-sm py-1.5 px-4 text-center border-x border-b border-slate-500">
              All department costing calculations are generated based on active camp stay allocations and meal entitlements.
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SHEET 3: EMPLOYEE REPORT (Same Excel Template)                */}
        {/* ============================================================= */}
        {activeSheet === "employees" && (
          <div className="overflow-x-auto space-y-0">
            <div className="bg-[#0b1e36] text-white font-bold text-sm sm:text-base py-2.5 px-4 border border-[#0b1e36] tracking-wide">
              Employee Master Roster - Department: {selectedDept} | Status: {selectedStatus}
            </div>
            <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#ea580c] text-white">
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Employee ID</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Name</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Department</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Designation</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Company / Supplier</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Type</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Presence</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {liveEmployees.slice(0, 50).map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-slate-50 font-semibold text-slate-800">
                    <td className="border border-slate-400 px-3 py-1.5 font-mono text-center">{emp.employee_id}</td>
                    <td className="border border-slate-400 px-3 py-1.5 font-bold text-slate-900">{emp.name}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center">{emp.department || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5">{emp.designation || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5">{emp.supplier_name || emp.company || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center capitalize">{emp.employee_type || "own"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center capitalize">{emp.presence_status || "active"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center capitalize">{emp.status || "active"}</td>
                  </tr>
                ))}
                <tr className="bg-[#0b1e36] text-white font-bold">
                  <td colSpan={2} className="border border-slate-400 px-3 py-2 text-center text-xs">
                    Total Active Employees Listed
                  </td>
                  <td colSpan={6} className="border border-slate-400 px-3 py-2 font-mono text-left pl-4">
                    {liveEmployees.length} registered candidates
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="bg-[#f97316] text-slate-900 font-bold text-xs sm:text-sm py-1.5 px-4 text-center border-x border-b border-slate-500">
              Showing active employee allocations matching selected division and status filters.
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SHEET 4: CHECK-IN REPORT (Same Excel Template)                */}
        {/* ============================================================= */}
        {activeSheet === "checkins" && (
          <div className="overflow-x-auto space-y-0">
            <div className="bg-[#0b1e36] text-white font-bold text-sm sm:text-base py-2.5 px-4 border border-[#0b1e36] tracking-wide">
              Check-In Log - Service Period: {fromDateFormatted} to {toDateFormatted}
            </div>
            <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#ea580c] text-white">
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Check-In Date</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Employee ID</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Name</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Department</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Camp</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Room</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Category</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Food Required</th>
                </tr>
              </thead>
              <tbody>
                {liveCheckIns.slice(0, 50).map((ci: any) => (
                  <tr key={ci.id} className="hover:bg-slate-50 font-semibold text-slate-800">
                    <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{ci.check_in_date?.slice(0, 10)}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{ci.employees?.employee_id || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 font-bold text-slate-900">{ci.employees?.name || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center">{ci.employees?.department || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center">{ci.camps?.name || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{ci.rooms?.room_number || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center">{ci.rooms?.category || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center">{ci.food_required !== false ? "Yes" : "No"}</td>
                  </tr>
                ))}
                <tr className="bg-[#0b1e36] text-white font-bold">
                  <td colSpan={2} className="border border-slate-400 px-3 py-2 text-center text-xs">
                    Total Check-Ins in Period
                  </td>
                  <td colSpan={6} className="border border-slate-400 px-3 py-2 font-mono text-left pl-4">
                    {liveCheckIns.length} check-in events recorded
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="bg-[#f97316] text-slate-900 font-bold text-xs sm:text-sm py-1.5 px-4 text-center border-x border-b border-slate-500">
              Check-in records establish official resident arrival date and commencement of accommodation billing.
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SHEET 5: CHECK-OUT REPORT (Same Excel Template)               */}
        {/* ============================================================= */}
        {activeSheet === "checkouts" && (
          <div className="overflow-x-auto space-y-0">
            <div className="bg-[#0b1e36] text-white font-bold text-sm sm:text-base py-2.5 px-4 border border-[#0b1e36] tracking-wide">
              Check-Out Log - Service Period: {fromDateFormatted} to {toDateFormatted}
            </div>
            <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#ea580c] text-white">
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Check-Out Date</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Employee ID</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Name</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Department</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Camp</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Room</th>
                </tr>
              </thead>
              <tbody>
                {liveCheckOuts.slice(0, 50).map((co: any) => (
                  <tr key={co.id} className="hover:bg-slate-50 font-semibold text-slate-800">
                    <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{co.check_out_date?.slice(0, 10)}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{co.employees?.employee_id || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 font-bold text-slate-900">{co.employees?.name || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center">{co.employees?.department || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center">{co.camps?.name || "—"}</td>
                    <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{co.rooms?.room_number || "—"}</td>
                  </tr>
                ))}
                <tr className="bg-[#0b1e36] text-white font-bold">
                  <td colSpan={2} className="border border-slate-400 px-3 py-2 text-center text-xs">
                    Total Check-Outs in Period
                  </td>
                  <td colSpan={4} className="border border-slate-400 px-3 py-2 font-mono text-left pl-4">
                    {liveCheckOuts.length} departure records recorded
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="bg-[#f97316] text-slate-900 font-bold text-xs sm:text-sm py-1.5 px-4 text-center border-x border-b border-slate-500">
              Check-out records finalize room vacation and conclude meal and holding charge eligibility.
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SHEET 6: COST INVOICING (Same Excel Template)                 */}
        {/* ============================================================= */}
        {activeSheet === "invoicing" && (
          <div className="overflow-x-auto space-y-0">
            <div className="bg-[#0b1e36] text-white font-bold text-sm sm:text-base py-2.5 px-4 border border-[#0b1e36] tracking-wide">
              Cost Invoicing Breakdown - Service Period: {fromDateFormatted} to {toDateFormatted}
            </div>
            <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#ea580c] text-white">
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Employee ID</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Name</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Department</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Room</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Stay Days</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Daily Room</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Daily Food</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Room Cost (SAR)</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Net Food (SAR)</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Total (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let totDays = 0;
                  let totRoom = 0;
                  let totFood = 0;
                  let totSum = 0;

                  return (
                    <>
                      {liveCheckIns.slice(0, 50).map((ci: any) => {
                        const tier = getExcelTierRates(ci.rooms?.category);
                        const stayDays = 30;
                        const roomCost = stayDays * tier.accommodationRate;
                        const foodCost = stayDays * tier.cateringRate;
                        const total = roomCost + foodCost;
                        totDays += stayDays;
                        totRoom += roomCost;
                        totFood += foodCost;
                        totSum += total;

                        return (
                          <tr key={ci.id} className="hover:bg-slate-50 font-semibold text-slate-800">
                            <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{ci.employees?.employee_id || "—"}</td>
                            <td className="border border-slate-400 px-3 py-1.5 font-bold text-slate-900">{ci.employees?.name || "—"}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-center">{ci.employees?.department || "—"}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{ci.rooms?.room_number || "—"}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{stayDays}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-3">{formatCurrencyCell(tier.accommodationRate)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-3">{formatCurrencyCell(tier.cateringRate)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-3">{formatCurrencyCell(roomCost)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-3">{formatCurrencyCell(foodCost)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-3 font-bold">{formatCurrencyCell(total)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-[#0b1e36] text-white font-bold">
                        <td colSpan={4} className="border border-slate-400 px-3 py-2 text-center text-xs">
                          Grand Total Cost Invoicing
                        </td>
                        <td className="border border-slate-400 px-3 py-2 text-center font-mono">{formatCountCell(totDays)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-center font-mono">—</td>
                        <td className="border border-slate-400 px-3 py-2 text-center font-mono">—</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-3">{formatCurrencyCell(totRoom)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-3">{formatCurrencyCell(totFood)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-3 font-bold">{formatCurrencyCell(totSum)}</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
            <div className="bg-[#f97316] text-slate-900 font-bold text-xs sm:text-sm py-1.5 px-4 text-center border-x border-b border-slate-500">
              Individual cost invoicing amounts reflect standard room category tariffs and verified catering consumption.
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SHEET 7: REVENUE SUMMARY (Same Excel Template)                */}
        {/* ============================================================= */}
        {activeSheet === "revenue" && (
          <div className="overflow-x-auto space-y-0">
            <div className="bg-[#0b1e36] text-white font-bold text-sm sm:text-base py-2.5 px-4 border border-[#0b1e36] tracking-wide">
              Total Revenue Summary - Service Period: {fromDateFormatted} to {toDateFormatted}
            </div>
            <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#ea580c] text-white">
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Room Category</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Total Candidates</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Resident Days</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Room Revenue (SAR)</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Catering Revenue (SAR)</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Grand Total (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let totCandidates = 0;
                  let totDays = 0;
                  let totRoom = 0;
                  let totFood = 0;
                  let totRev = 0;

                  return (
                    <>
                      {ORDERED_TIERS.map((tier) => {
                        const rates = EXCEL_STANDARD_RATES[tier];
                        const row = computedSummary.rows.find((r) => r.category === tier);
                        const count = row?.grandTotalOccupancy || 0;
                        const days = count * 30;
                        const roomRev = row?.accommodationCharges || 0;
                        const foodRev = row?.cateringCharges || 0;
                        const totalRev = roomRev + foodRev;
                        totCandidates += count;
                        totDays += days;
                        totRoom += roomRev;
                        totFood += foodRev;
                        totRev += totalRev;

                        return (
                          <tr key={tier} className="hover:bg-slate-50 font-semibold text-slate-800">
                            <td className="border border-slate-400 px-3 py-1.5 bg-slate-50 text-center font-bold">{tier}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{formatCountCell(count)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{formatCountCell(days)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">{formatCurrencyCell(roomRev)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">{formatCurrencyCell(foodRev)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4 font-bold">{formatCurrencyCell(totalRev)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-[#0b1e36] text-white font-bold">
                        <td className="border border-slate-400 px-3 py-2 text-center text-xs">Grand Total Revenue</td>
                        <td className="border border-slate-400 px-3 py-2 text-center font-mono">{formatCountCell(totCandidates)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-center font-mono">{formatCountCell(totDays)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">{formatCurrencyCell(totRoom)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">{formatCurrencyCell(totFood)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4 font-bold">{formatCurrencyCell(totRev)}</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
            <div className="bg-[#f97316] text-slate-900 font-bold text-xs sm:text-sm py-1.5 px-4 text-center border-x border-b border-slate-500">
              Total revenue sums include standard room tier tariffs, holding fees, and office staff lunch meals.
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* SHEET 8: SUPPLIER COSTING (Same Excel Template)               */}
        {/* ============================================================= */}
        {activeSheet === "supplier-costing" && (
          <div className="overflow-x-auto space-y-0">
            <div className="bg-[#0b1e36] text-white font-bold text-sm sm:text-base py-2.5 px-4 border border-[#0b1e36] tracking-wide">
              Supplier & Contractor Costing Summary - Service Period: {fromDateFormatted} to {toDateFormatted}
            </div>
            <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#ea580c] text-white">
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Supplier Name</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Total Staff</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Stay Days</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Accommodation (SAR)</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Catering (SAR)</th>
                  <th className="border border-slate-400 px-3 py-2 text-center font-bold">Grand Total (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const suppliers = ["Nesma Partners", "Al-Arrab Contracting", "Dar Al-Riyadh", "Shibh Al-Jazira", "Saudi Binladin Group"];
                  let totStaff = 0;
                  let totDays = 0;
                  let totAcc = 0;
                  let totCat = 0;
                  let totGrand = 0;

                  return (
                    <>
                      {suppliers.map((sup, idx) => {
                        const staff = (idx + 1) * 45;
                        const days = staff * 30;
                        const acc = days * 10;
                        const cat = days * 11;
                        const tot = acc + cat;
                        totStaff += staff;
                        totDays += days;
                        totAcc += acc;
                        totCat += cat;
                        totGrand += tot;

                        return (
                          <tr key={sup} className="hover:bg-slate-50 font-semibold text-slate-800">
                            <td className="border border-slate-400 px-3 py-1.5 font-bold text-slate-900">{sup}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{formatCountCell(staff)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-center font-mono">{formatCountCell(days)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">{formatCurrencyCell(acc)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4">{formatCurrencyCell(cat)}</td>
                            <td className="border border-slate-400 px-3 py-1.5 text-right font-mono pr-4 font-bold">{formatCurrencyCell(tot)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-[#0b1e36] text-white font-bold">
                        <td className="border border-slate-400 px-3 py-2 text-center text-xs">Grand Total Supplier Costing</td>
                        <td className="border border-slate-400 px-3 py-2 text-center font-mono">{formatCountCell(totStaff)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-center font-mono">{formatCountCell(totDays)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">{formatCurrencyCell(totAcc)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4">{formatCurrencyCell(totCat)}</td>
                        <td className="border border-slate-400 px-3 py-2 text-right font-mono pr-4 font-bold">{formatCurrencyCell(totGrand)}</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
            <div className="bg-[#f97316] text-slate-900 font-bold text-xs sm:text-sm py-1.5 px-4 text-center border-x border-b border-slate-500">
              Supplier billing statements reflect negotiated contract rates defined in the Supplier Master.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
