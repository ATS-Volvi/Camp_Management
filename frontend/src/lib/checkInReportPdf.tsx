import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { endOfMonth, format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getRoomCategoryLabel } from "@/constants/roomCategories";

export type CheckInPeriod = "range" | "daily" | "monthly";
export function checkInPeriodBounds(mode: CheckInPeriod, day: string, month: string, from: string, to: string) {
  if (mode === "daily") return { from: day, to: day };
  if (mode === "monthly") return { from: `${month}-01`, to: format(endOfMonth(parseISO(`${month}-01`)), "yyyy-MM-dd") };
  return { from, to };
}

export const CHECK_IN_REPORT_SELECT = "*, employees(name, employee_id, employee_type, supplier_name, designation, company, project, department, phone), rooms(room_number, category), camps(name)";

export interface CheckInReportRecord {
  id: string;
  employee_id: string;
  check_in_date: string;
  project?: string | null;
  food_required?: boolean | null;
  employees: { name: string; employee_id: string; employee_type: string; supplier_name?: string | null; designation?: string | null; company?: string | null; project?: string | null; department?: string | null; phone?: string | null } | null;
  rooms: { room_number: string; category: string } | null;
  camps: { name: string } | null;
}

export function latestSuccessfulCheckIns(records: CheckInReportRecord[], employeeIds: string[]) {
  const ids = new Set(employeeIds);
  const latest = new Map<string, CheckInReportRecord>();
  [...records].sort((a, b) => b.check_in_date.localeCompare(a.check_in_date)).forEach(row => {
    if (ids.has(row.employee_id) && !latest.has(row.employee_id)) latest.set(row.employee_id, row);
  });
  return [...latest.values()];
}

export function buildCheckInPdf(records: CheckInReportRecord[], period: string, filters: string[] = []) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(20);
  doc.text("Camp-365", 14, 17);
  doc.setFontSize(14);
  doc.text("Check-In Details Report", 14, 26);
  doc.setFontSize(10);
  doc.text(`Period: ${period} | Check-ins: ${records.length} | Prepared: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 35);
  const filterLines = doc.splitTextToSize(filters.length ? filters.join(" | ") : "All camps and personnel", 268);
  doc.text(filterLines, 14, 42);
  autoTable(doc, {
    startY: 46 + filterLines.length * 5,
    head: [["Check-in date / time", "Employee / ID", "Type / Supplier", "Designation / Department", "Company / Project", "Camp / Room", "Contact", "Food"]],
    body: records.map(row => [
      `${format(parseISO(row.check_in_date), "dd MMM yyyy")}\n${format(parseISO(row.check_in_date), "HH:mm")}`,
      `${row.employees?.name || "—"}\n${row.employees?.employee_id || "—"}`,
      `${row.employees?.employee_type || "—"}\n${row.employees?.supplier_name || "—"}`,
      `${row.employees?.designation || "—"}\n${row.employees?.department || "—"}`,
      `${row.employees?.company || "—"}\n${row.project || row.employees?.project || "—"}`,
      `${row.camps?.name || "—"}\n${row.rooms?.room_number || "—"} · ${getRoomCategoryLabel(row.rooms?.category || "")}`,
      row.employees?.phone || "—", row.food_required === false ? "Not required" : "Required",
    ]),
    rowPageBreak: "avoid",
    theme: "grid", styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
    margin: { left: 14, right: 14, top: 16, bottom: 18 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.text(`Camp-365 | Recorded check-ins | Page ${doc.getNumberOfPages()}`, 14, 202);
    },
  });
  return doc;
}

export function downloadCheckInPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function prepareCheckInReceipt(employeeIds: string[], campId: string) {
  if (!employeeIds.length) return;
  try {
    // One latest saved row per successful employee, independent of RPC return shape.
    const records = await Promise.all(employeeIds.map(async id => {
      const { data, error } = await supabase.from("check_ins").select(CHECK_IN_REPORT_SELECT)
        .eq("employee_id", id).eq("camp_id", campId).order("check_in_date", { ascending: false }).limit(1);
      if (error) throw error;
      return data?.[0] as unknown as CheckInReportRecord | undefined;
    }));
    const rows = latestSuccessfulCheckIns(records.filter((row): row is CheckInReportRecord => Boolean(row)), employeeIds);
    if (rows.length !== employeeIds.length) throw new Error("Saved check-in details are unavailable");
    const blob = buildCheckInPdf(rows, "Successful check-in confirmation").output("blob");
    const filename = `check-in-confirmation-${format(new Date(), "yyyy-MM-dd-HHmmss")}.pdf`;
    toast({ title: "Check-in PDF ready", description: `${rows.length} confirmed check-in${rows.length === 1 ? "" : "s"}.`, duration: 120000,
      action: <ToastAction altText="Download check-in PDF" onClick={() => downloadCheckInPdf(blob, filename)}>Download PDF</ToastAction>,
    });
  } catch {
    toast({ title: "Check-in saved; PDF unavailable", description: "You can download the check-in report from Reports.", variant: "destructive" });
  }
}