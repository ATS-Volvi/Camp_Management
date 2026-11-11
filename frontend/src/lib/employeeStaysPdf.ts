import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type EmployeeStay } from "./employeeStays";
import { billingToday } from "./stayBilling";
import { getRoomCategoryLabel } from "@/constants/roomCategories";

export const stayDate = (value: string | null) => value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
export const readable = (value: string) => value.replace(/_/g, " ");

export function buildEmployeeStaysPdf(rows: EmployeeStay[], checkoutOnly = false, filters = "All camps") {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const title = checkoutOnly ? "Checkout Report" : "Employee Stays Report";
  doc.setFontSize(18); doc.text(`Camp-365 | ${title}`, 12, 16);
  doc.setFontSize(9); doc.text(doc.splitTextToSize(`${filters} | Generated ${stayDate(billingToday())} | ${rows.length} stays`, 270), 12, 23);
  autoTable(doc, { startY: 34, theme: "grid", margin: 12,
    head: [["Stay #", "Employee ID / Name", "Department / Designation", "Supplier / Project", "Camp / Room / Type", "Check-in", "Checkout", "Days stayed", "Reason for exit", "Status", "Food requests"]],
    body: rows.map((r, index) => [index + 1, `${r.employee?.employee_id ?? "Unknown"}\n${r.employee?.name ?? "Unknown employee"}`,
      `${r.employee?.department ?? "-"}\n${r.employee?.designation ?? "-"}`,
      `${r.employee?.supplier_name ?? "-"}\n${r.employee?.project ?? "-"}`,
      `${r.camp}\n${r.room} / ${getRoomCategoryLabel(r.category)}`, stayDate(r.arrival).replace("—", "Not recorded"),
      r.departure ? stayDate(r.departure) : r.status === "In camp" ? "In camp" : "Not recorded", r.days ?? "Unknown", r.checkout?.clearance_notes ?? "-", r.status, r.requests.length ]),
    styles: { fontSize: 8, cellPadding: 2.5 }, headStyles: { fillColor: [173, 211, 245], textColor: [24, 49, 79] },
  });
  // Separate request detail tables retain every date, meal and status without crowding stay rows.
  const withDetails = rows.filter(r => r.requests.length || (checkoutOnly && r.checkout));
  for (const r of withDetails) {
    let y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 34) + 12;
    if (y > 165) { doc.addPage(); y = 16; }
    doc.setFontSize(10);
    const heading = `${r.employee?.employee_id ?? "Unknown"} - ${r.employee?.name ?? "Unknown employee"} | ${r.camp}, Room ${r.room} | ${stayDate(r.arrival)} to ${r.departure ? stayDate(r.departure) : r.status}`;
    const lines = doc.splitTextToSize(heading, 270);
    doc.text(lines, 12, y);
    const body = r.requests.length ? r.requests.map(q => [q.id, stayDate(q.from_date), stayDate(q.to_date), q.food_cancellation_request_meals.map(m => readable(m.meal_type)).join(", ") || "Not recorded", readable(q.reason), readable(q.status), `${readable(q.source)}${q.camp_id ? "" : " (unlinked camp)"}`, q.remarks ?? "-"])
      : [["No food cancellation requests for this stay", "", "", "", "", "", "", ""]];
    autoTable(doc, { startY: y + lines.length * 5 + 2, margin: 12, theme: "grid", head: [["Request ID", "From", "To", "Meals", "Reason", "Status", "Source", "Remarks"]], body,
      styles: { fontSize: 7.5, cellPadding: 2 }, headStyles: { fillColor: [173, 211, 245], textColor: [24, 49, 79] } });
    if (checkoutOnly && r.checkout) {
      autoTable(doc, { startY: ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 34) + 3, margin: 12, theme: "plain",
        body: [["Assets returned", r.checkout.assets_returned === null ? "Not recorded" : r.checkout.assets_returned ? "Yes" : "No", "Damage remarks", r.checkout.damage_remarks ?? "-"], ["Clearance notes", r.checkout.clearance_notes ?? "-", "Days stayed", r.days ?? "Unknown"]], styles: { fontSize: 8 } });
    }
  }
  const count = doc.getNumberOfPages();
  for (let p = 1; p <= count; p++) { doc.setPage(p); doc.setFontSize(8); doc.text("Days include arrival and exclude checkout; ongoing stays counted through today.", 12, 202); doc.text(`${p} / ${count}`, 276, 202); }
  return doc;
}

export function downloadEmployeeStaysPdf(rows: EmployeeStay[], checkoutOnly = false, filters = "All camps") {
  const doc = buildEmployeeStaysPdf(rows, checkoutOnly, filters);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url;
  link.download = `${checkoutOnly ? "checkout" : "employee-stays"}-${billingToday()}.pdf`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}