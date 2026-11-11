import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Filter, Calendar, RefreshCw, CheckCircle2, SlidersHorizontal } from "lucide-react";
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
import { resolveRoomTypeTier } from "@/lib/excelRates";
import { useDepartments } from "@/hooks/useDepartments";

// Benchmark sample figures from the client's reference document
const BENCHMARK_COUNTS: Record<string, { active?: number; onSite?: number; onVacation?: number; onlyAccommodation?: number; officeLunchMeals?: number }> = {
  "1x1": { officeLunchMeals: 1466 },
  "2x1": { active: 25 },
  "3x1": { active: 1443, onSite: 20, onVacation: 61 },
  "4x1": { active: 1179, onSite: 10, onVacation: 0 },
  "5x1": { active: 221, onVacation: 12 },
  "6x1": { active: 9822, onSite: 1, onVacation: 109 },
};

export function ExpertiseLogo() {
  return (
    <div className="flex items-center select-none" aria-label="Expertise Logo">
      <svg className="h-10 w-auto" viewBox="0 0 220 54" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 'ex' in deep navy */}
        <text x="0" y="42" fill="#0c2340" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="42" letterSpacing="-1">
          ex
        </text>
        {/* Stylized 'p' with orange accents */}
        <g transform="translate(48, 2)">
          <path d="M 12 10 L 12 48" stroke="#0c2340" strokeWidth="8" strokeLinecap="round" />
          <path d="M 12 18 C 12 18, 24 10, 36 20 C 46 29, 36 40, 24 40 C 18 40, 12 36, 12 36" stroke="#0c2340" strokeWidth="8" strokeLinecap="round" fill="none" />
          {/* Orange swoosh/highlight */}
          <path d="M 2 24 Q 18 8 36 18" stroke="#ea580c" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="34" cy="18" r="4" fill="#ea580c" />
        </g>
        {/* 'ertise' in deep navy */}
        <text x="96" y="42" fill="#0c2340" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="42" letterSpacing="-1">
          ertise
        </text>
      </svg>
    </div>
  );
}

export default function ExpertiseOccupancyStatementTab() {
  const [dataSource, setDataSource] = useState<"benchmark" | "live">("benchmark");
  const [selectedDept, setSelectedDept] = useState<string>("EMBS");
  const [selectedStatus, setSelectedStatus] = useState<string>("(All)");
  const [periodPreset, setPeriodPreset] = useState<string>("2026-08-26_2026-09-25");
  const [customFrom, setCustomFrom] = useState<string>("2026-08-26");
  const [customTo, setCustomTo] = useState<string>("2026-09-25");
  const [officeLunchOverride, setOfficeLunchOverride] = useState<number>(1466);

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

  // Query live check-ins for the active date range if in 'live' mode
  const { data: liveData, isLoading: isLiveLoading } = useQuery({
    queryKey: ["expertise-statement-live", fromIso, toIso, selectedDept],
    enabled: dataSource === "live",
    queryFn: async () => {
      let query = supabase
        .from("check_ins")
        .select(
          `id, employee_id, room_id, camp_id, check_in_date, food_required,
           employees(id, employee_id, name, department, presence_status),
           rooms(id, room_number, category, max_capacity)`
        )
        .lte("check_in_date", toIso + "T23:59:59");

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate tier counts depending on mode (benchmark sample vs live database)
  const computedSummary: StatementSummary = useMemo(() => {
    let counts: Record<string, { active?: number; onSite?: number; onVacation?: number; onlyAccommodation?: number; officeLunchMeals?: number }> = {};

    if (dataSource === "benchmark") {
      counts = {
        ...BENCHMARK_COUNTS,
        "1x1": { officeLunchMeals: officeLunchOverride },
      };
    } else {
      // Live database aggregation
      ORDERED_TIERS.forEach((tier) => {
        counts[tier] = { active: 0, onSite: 0, onVacation: 0, onlyAccommodation: 0, officeLunchMeals: 0 };
      });

      (liveData || []).forEach((ci: any) => {
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

      // Include office lunch meals for 1x1 tier
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
    liveData,
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
    a.download = `Expertise_Occupancy_Summary_${computedSummary.department}_${fromDateFormatted}_to_${toDateFormatted}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Top Configuration Toolbar (Hidden during print) */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
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
              <RefreshCw size={14} className={`mr-1 ${isLiveLoading ? "animate-spin" : ""}`} />
              Live Database View
            </Button>
          </div>

          {/* Period selector */}
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

          {/* Office Lunch Meals quick input */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300">
            <span className="text-xs font-semibold text-slate-600">Office Lunch Meals:</span>
            <Input
              type="number"
              value={officeLunchOverride}
              onChange={(e) => setOfficeLunchOverride(Number(e.target.value) || 0)}
              className="w-20 h-8 text-xs bg-white font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadCsv}
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Download size={14} className="mr-1.5" /> Export Excel (.csv)
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

      {/* Main Statement Canvas (Replicating exact document layout) */}
      <div className="bg-white border border-slate-300 shadow-sm p-6 sm:p-8 space-y-7 max-w-[1100px] mx-auto print:border-none print:shadow-none print:p-0">
        
        {/* Top Header Filter & Logo Section */}
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

        {/* ------------------------------------------------------------- */}
        {/* TABLE 1: OCCUPANCY BREAKDOWN PIVOT TABLE                       */}
        {/* ------------------------------------------------------------- */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-500 text-xs sm:text-sm">
            <thead>
              {/* Header Row 1 */}
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
              {/* Header Row 2 */}
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
              {/* Footer Total */}
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

        {/* ------------------------------------------------------------- */}
        {/* TABLE 2: TOTAL OCCUPANCY SUMMARY REPORT                       */}
        {/* ------------------------------------------------------------- */}
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
              {/* Footer Total */}
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

        {/* ------------------------------------------------------------- */}
        {/* TABLE 3: TOTAL MONTHLY CHARGES                                */}
        {/* ------------------------------------------------------------- */}
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
              {/* Footer Total */}
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

          {/* Footnote Bar (Exact wording from screenshot) */}
          <div className="bg-[#f97316] text-slate-900 font-bold text-xs sm:text-sm py-1.5 px-4 text-center border-x border-b border-slate-500">
            Please note that, On-Site and On-Vacation charges are applicable based on the room category.
          </div>
        </div>

      </div>
    </div>
  );
}

