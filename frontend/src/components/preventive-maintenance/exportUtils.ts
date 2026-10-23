import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ReportRow {
  machine_code: string;
  machine_name: string;
  maintenance_date: string;
  scheduled_due_date: string;
  status: string;
  performed_by: string;
  issues: string;
  action_taken: string;
  remarks: string;
  next_due_date: string;
}

export const REPORT_HEADERS = [
  "Machine ID", "Machine Name", "Maint. Date", "Scheduled Due",
  "Status", "Performed By", "Issues", "Action Taken", "Remarks", "Next Due"
];

export function exportReportPDF(rows: ReportRow[], title: string, subtitle?: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(title, 40, 40);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 40, 58);
  }
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 72);

  autoTable(doc, {
    startY: 86,
    head: [REPORT_HEADERS],
    body: rows.map(r => [
      r.machine_code, r.machine_name, r.maintenance_date, r.scheduled_due_date,
      r.status, r.performed_by, r.issues, r.action_taken, r.remarks, r.next_due_date
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const v = String(data.cell.raw ?? "").toLowerCase();
        if (v === "overdue") data.cell.styles.textColor = [220, 38, 38];
        else if (v === "completed") data.cell.styles.textColor = [16, 163, 74];
        else if (v === "pending" || v === "in_progress") data.cell.styles.textColor = [202, 138, 4];
      }
    },
  });

  doc.save(`${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
}

export function exportReportExcel(rows: ReportRow[], title: string) {
  const data = rows.map(r => ({
    "Machine ID": r.machine_code,
    "Machine Name": r.machine_name,
    "Maintenance Date": r.maintenance_date,
    "Scheduled Due Date": r.scheduled_due_date,
    "Status": r.status,
    "Performed By": r.performed_by,
    "Issues Identified": r.issues,
    "Action Taken": r.action_taken,
    "Remarks": r.remarks,
    "Next Due Date": r.next_due_date,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}_${Date.now()}.xlsx`);
}
