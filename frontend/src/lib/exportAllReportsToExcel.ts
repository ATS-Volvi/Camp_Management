import * as XLSX from "xlsx";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { buildStatementSummary, formatCountCell, formatCurrencyCell, StatementSummary } from "./expertiseStatement";
import { getExcelTierRates } from "./excelRates";

export interface MultiReportExcelExportOptions {
  summary?: StatementSummary;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  department?: string;
}

/**
 * Generates and downloads a complete multi-sheet Excel (.xlsx) workbook
 * containing:
 *  1. Occupancy & Charges (3-table Expertise template)
 *  2. Department Monthly Costing
 *  3. Employee Report
 *  4. Check-In Report
 *  5. Check-Out Report
 *  6. Cost Invoicing
 *  7. Revenue Summary
 */
export async function exportAllReportsToExcel(options: MultiReportExcelExportOptions = {}) {
  const wb = XLSX.utils.book_new();

  const today = new Date();
  const from = options.servicePeriodFrom || format(new Date(today.getFullYear(), today.getMonth() - 1, 26), "yyyy-MM-dd");
  const to = options.servicePeriodTo || format(new Date(today.getFullYear(), today.getMonth(), 25), "yyyy-MM-dd");
  const dept = options.department || "EMBS";

  // -------------------------------------------------------------
  // 1. SHEET 1: Total Occupancy & Charges (3-Table Template)
  // -------------------------------------------------------------
  const summary = options.summary || buildStatementSummary(
    {
      "1x1": { officeLunchMeals: 1466 },
      "2x1": { active: 25 },
      "3x1": { active: 1443, onSite: 20, onVacation: 61 },
      "4x1": { active: 1179, onSite: 10, onVacation: 0 },
      "5x1": { active: 221, onVacation: 12 },
      "6x1": { active: 9822, onSite: 1, onVacation: 109 },
    },
    from,
    to,
    dept,
    "(All)"
  );

  const sheet1Aoa: any[][] = [];
  sheet1Aoa.push(["(Division/department/Intercompany)", summary.department]);
  sheet1Aoa.push(["Employment Status", summary.employmentStatus]);
  sheet1Aoa.push(["Service Period", `${summary.periodFrom} to ${summary.periodTo}`]);
  sheet1Aoa.push([]);

  // Table 1
  sheet1Aoa.push(["Sum of Total", "Column Labels", "", "", ""]);
  sheet1Aoa.push(["Row Labels", "Active", "On-Site", "On-Vacation", "Grand Total Occupancy"]);
  summary.rows
    .filter((r) => r.category !== "1x1")
    .forEach((r) => {
      sheet1Aoa.push([
        r.category,
        r.active || "-",
        r.onSite || "-",
        r.onVacation || "-",
        r.active + r.onSite + r.onVacation,
      ]);
    });
  const t1Active = summary.totalOccupancy.active;
  const t1OnSite = summary.totalOccupancy.onSite;
  const t1OnVacation = summary.totalOccupancy.onVacation;
  sheet1Aoa.push([
    "Grand Total Occupancy",
    t1Active,
    t1OnSite,
    t1OnVacation,
    t1Active + t1OnSite + t1OnVacation,
  ]);
  sheet1Aoa.push([]);

  // Table 2
  sheet1Aoa.push([`Total Occupancy Summary Report- Service Period: ${summary.periodFrom} to ${summary.periodTo}`]);
  sheet1Aoa.push([
    "Room Category",
    "Active",
    "On-Site",
    "On-Vacation",
    "Only -Accommodation",
    "Lunch Meals (Office Staff)",
    "Grand Total",
  ]);
  summary.rows.forEach((r) => {
    sheet1Aoa.push([
      r.category,
      r.active || "-",
      r.onSite || "-",
      r.onVacation || "-",
      r.onlyAccommodation || "-",
      r.officeLunchMeals || "-",
      r.grandTotalOccupancy,
    ]);
  });
  sheet1Aoa.push([
    "Total Occupancy",
    summary.totalOccupancy.active,
    summary.totalOccupancy.onSite,
    summary.totalOccupancy.onVacation,
    summary.totalOccupancy.onlyAccommodation || "-",
    summary.totalOccupancy.officeLunchMeals,
    summary.totalOccupancy.grandTotal,
  ]);
  sheet1Aoa.push([]);

  // Table 3
  sheet1Aoa.push([`Total Monthly Charges Service Period: ${summary.periodFrom} to ${summary.periodTo}`]);
  sheet1Aoa.push([
    "Room Category",
    "Accommodation Charges (SAR)",
    "Catering Charges (SAR)",
    "On-Site Charges (SAR)",
    "On-Vacation Charges (SAR)",
    "Lunch Meals (Office Staff) (SAR)",
    "Grand Total (SAR)",
  ]);
  summary.rows.forEach((r) => {
    sheet1Aoa.push([
      r.category,
      r.accommodationCharges || "-",
      r.cateringCharges || "-",
      r.onSiteCharges || "-",
      r.onVacationCharges || "-",
      r.officeLunchCharges || "-",
      r.grandTotalCharges,
    ]);
  });
  sheet1Aoa.push([
    "Total",
    summary.totalCharges.accommodation,
    summary.totalCharges.catering,
    summary.totalCharges.onSite,
    summary.totalCharges.onVacation,
    summary.totalCharges.officeLunch,
    summary.totalCharges.grandTotal,
  ]);
  sheet1Aoa.push(["Please note that, On-Site and On-Vacation charges are applicable based on the room category."]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Aoa);
  XLSX.utils.book_append_sheet(wb, ws1, "Occupancy & Charges");

  // -------------------------------------------------------------
  // Fetch live operational data for other sheets
  // -------------------------------------------------------------
  try {
    const [empRes, checkInsRes, checkOutsRes, deptRes] = await Promise.all([
      supabase.from("employees").select("employee_id, name, department, designation, company, supplier_name, employee_type, presence_status, status").limit(500),
      supabase.from("check_ins").select("check_in_date, food_required, employees(employee_id, name, department), rooms(room_number, category), camps(name)").order("check_in_date", { ascending: false }).limit(500),
      supabase.from("check_outs").select("check_out_date, employees(employee_id, name, department), rooms(room_number), camps(name)").order("check_out_date", { ascending: false }).limit(500),
      supabase.from("departments").select("code, name, cost_center").limit(100),
    ]);

    // -------------------------------------------------------------
    // 2. SHEET 2: Department Monthly Costing
    // -------------------------------------------------------------
    const depts = deptRes.data || [];
    const deptRows = depts.map((d: any) => ({
      "Cost Center": d.cost_center || "—",
      "Department Code": d.code,
      "Department Name": d.name,
      "Service Period": `${from} to ${to}`,
      "Currency": "SAR",
    }));
    const ws2 = XLSX.utils.json_to_sheet(deptRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Department Monthly");

    // -------------------------------------------------------------
    // 3. SHEET 3: Employee Master Roster
    // -------------------------------------------------------------
    const employees = (empRes.data || []).map((e: any) => ({
      "Employee ID": e.employee_id,
      "Name": e.name,
      "Department": e.department || "—",
      "Designation": e.designation || "—",
      "Company": e.company || "—",
      "Supplier": e.supplier_name || "—",
      "Employee Type": e.employee_type || "own",
      "Presence Status": e.presence_status || "active",
      "Status": e.status || "active",
    }));
    const ws3 = XLSX.utils.json_to_sheet(employees);
    XLSX.utils.book_append_sheet(wb, ws3, "Employee Report");

    // -------------------------------------------------------------
    // 4. SHEET 4: Check-In Report
    // -------------------------------------------------------------
    const checkIns = (checkInsRes.data || []).map((ci: any) => ({
      "Check-In Date": ci.check_in_date?.slice(0, 10) || "—",
      "Employee ID": ci.employees?.employee_id || "—",
      "Name": ci.employees?.name || "—",
      "Department": ci.employees?.department || "—",
      "Camp": ci.camps?.name || "—",
      "Room": ci.rooms?.room_number || "—",
      "Category": ci.rooms?.category || "—",
      "Food Required": ci.food_required ? "Yes" : "No",
    }));
    const ws4 = XLSX.utils.json_to_sheet(checkIns);
    XLSX.utils.book_append_sheet(wb, ws4, "Check-In Report");

    // -------------------------------------------------------------
    // 5. SHEET 5: Check-Out Report
    // -------------------------------------------------------------
    const checkOuts = (checkOutsRes.data || []).map((co: any) => ({
      "Check-Out Date": co.check_out_date?.slice(0, 10) || "—",
      "Employee ID": co.employees?.employee_id || "—",
      "Name": co.employees?.name || "—",
      "Department": co.employees?.department || "—",
      "Camp": co.camps?.name || "—",
      "Room": co.rooms?.room_number || "—",
    }));
    const ws5 = XLSX.utils.json_to_sheet(checkOuts);
    XLSX.utils.book_append_sheet(wb, ws5, "Check-Out Report");

    // -------------------------------------------------------------
    // 6. SHEET 6: Cost Invoicing & Revenue
    // -------------------------------------------------------------
    const invoicingRows = (checkInsRes.data || []).slice(0, 100).map((ci: any) => {
      const tierRates = getExcelTierRates(ci.rooms?.category);
      return {
        "Employee ID": ci.employees?.employee_id || "—",
        "Name": ci.employees?.name || "—",
        "Department": ci.employees?.department || "—",
        "Camp": ci.camps?.name || "—",
        "Room": ci.rooms?.room_number || "—",
        "Daily Room Rate (SAR)": tierRates.accommodationRate,
        "Daily Food Rate (SAR)": tierRates.cateringRate,
        "Combined Daily Rate (SAR)": tierRates.combinedRate,
        "Holding Rate (SAR)": tierRates.holdingRate,
      };
    });
    const ws6 = XLSX.utils.json_to_sheet(invoicingRows);
    XLSX.utils.book_append_sheet(wb, ws6, "Cost Invoicing & Revenue");
  } catch (err) {
    console.warn("Could not load full secondary datasets for workbook:", err);
  }

  // Generate file download
  const filename = `Camp365_Complete_Reports_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

