import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { endOfMonth, format, parseISO } from "date-fns";

export interface DepartmentCostRow {
  id: string;
  emp_code: string;
  name: string;
  department: string;
  supplier: string;
  project: string;
  camp: string;
  room: string;
  stayDays: number;
  dailyFood: number;
  mealsCancelled: number;
  roomRevenue: number;
  foodRevenue: number;
  total: number;
  foodFull?: number;
  breakfastCost?: number;
  lunchCost?: number;
  dinnerCost?: number;
  ramadanCost?: number;
  stayFrom?: string;
  stayTo?: string;
  leaveDays?: number;
  leaves?: { from: string; to: string }[];
}

/** Full food value before cancellations; falls back to days x daily rate. */
export const rowFoodFull = (r: DepartmentCostRow) => r.foodFull ?? r.stayDays * r.dailyFood;
const meal = (r: DepartmentCostRow, k: "breakfastCost" | "lunchCost" | "dinnerCost" | "ramadanCost") => r[k] ?? (k === "ramadanCost" ? 0 : r.foodRevenue / 3);

export function groupDepartmentStatements(rows: DepartmentCostRow[], costCenterMap?: Record<string, string>) {
  const grouped = new Map<string, DepartmentCostRow[]>();
  rows.forEach(row => grouped.set(row.department, [...(grouped.get(row.department) || []), row]));
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dept, list]) => ({
    dept,
    list,
    costCenter: costCenterMap?.[dept] ?? "—",
    residents: new Set(list.map(row => row.emp_code)).size,
    days: list.reduce((sum, row) => sum + row.stayDays, 0),
    room: list.reduce((sum, row) => sum + row.roomRevenue, 0),
    food: list.reduce((sum, row) => sum + row.foodRevenue, 0),
    credit: list.reduce((sum, row) => sum + rowFoodFull(row) - row.foodRevenue, 0),
    breakfast: list.reduce((sum, row) => sum + meal(row, "breakfastCost"), 0),
    lunch: list.reduce((sum, row) => sum + meal(row, "lunchCost"), 0),
    dinner: list.reduce((sum, row) => sum + meal(row, "dinnerCost"), 0),
    ramadan: list.reduce((sum, row) => sum + meal(row, "ramadanCost"), 0),
    total: list.reduce((sum, row) => sum + row.total, 0),
  }));
}

export type DepartmentStatement = ReturnType<typeof groupDepartmentStatements>[number];
export const statementAmount = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const statementFilename = (dept: string, month: string) => `department-costing-${dept.replace(/[^a-z0-9_-]/gi, "-")}-${month}`;

export interface StatementLabels { title: string; chargeTo: string; codeLabel: string; footer: string }
const DEPT_LABELS: StatementLabels = { title: "Department Monthly Costing Statement", chargeTo: "Charge to", codeLabel: "Cost Center", footer: "Department" };

export function buildDepartmentStatementPdf(group: DepartmentStatement, month: string, labels: StatementLabels = DEPT_LABELS) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const start = parseISO(`${month}-01`);
  const period = `${format(start, "dd MMM yyyy")} - ${format(endOfMonth(start), "dd MMM yyyy")}`;
  doc.setFontSize(20);
  doc.text("Camp-365", 14, 17);
  doc.setFontSize(14);
  doc.text(labels.title, 14, 26);
  doc.setFontSize(10);
  doc.text(`${labels.chargeTo}: ${group.dept} | ${labels.codeLabel}: ${group.costCenter} | Billing month: ${format(start, "MMMM yyyy")}`, 14, 35);
  doc.text(`Period: ${period} | Currency: SAR | Prepared: ${format(new Date(), "dd MMM yyyy")}`, 14, 42);
  doc.text(`Residents: ${group.residents} | Resident-days: ${group.days}`, 14, 49);
  autoTable(doc, {
    startY: 53,
    head: [["Total Candidates", "Total Food Value", "Total Room Cost", "Grand Total"]],
    body: [[String(group.residents), `SAR ${statementAmount(group.food)}`, `SAR ${statementAmount(group.room)}`, `SAR ${statementAmount(group.total)}`]],
    theme: "grid",
    styles: { fontSize: 11, cellPadding: 3, halign: "center", fontStyle: "bold" },
    headStyles: { fontSize: 9, fontStyle: "normal" },
    margin: { left: 14, right: 14 },
  });
  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY ?? 70) + 6,
    head: [["Employee / ID", "Supplier / Project", "Camp / Room", "Days", "Room cost", "Breakfast", "Lunch", "Dinner", "Ramadan", "Net food", "Total (SAR)"]],
    body: group.list.map(row => [
      `${row.name}\n${row.emp_code}${row.stayFrom ? `\nFrom: ${row.stayFrom} To: ${row.stayTo}` : ""}`, `${row.supplier}\n${row.project}`, `${row.camp}\n${row.room}`,
      row.stayDays, statementAmount(row.roomRevenue),
      statementAmount(meal(row, "breakfastCost")), statementAmount(meal(row, "lunchCost")),
      statementAmount(meal(row, "dinnerCost")), statementAmount(meal(row, "ramadanCost")),
      statementAmount(row.foodRevenue), statementAmount(row.total),
    ]),
    foot: [["TOTAL TO CHARGE", "", "", group.days, statementAmount(group.room), statementAmount(group.breakfast), statementAmount(group.lunch), statementAmount(group.dinner), statementAmount(group.ramadan), statementAmount(group.food), statementAmount(group.total)]],
    showFoot: "lastPage",
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    columnStyles: Object.fromEntries([3, 4, 5, 6, 7, 8, 9, 10].map(i => [i, { halign: "right" as const }])),
    margin: { top: 15, bottom: 23, left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.text("Room costs remain payable for the stay. Net food costs reflect recorded approved meal cancellations.", 14, 195);
      doc.text(`${labels.footer}: ${group.dept} | ${month} | Page ${doc.getNumberOfPages()}`, 14, 201);
    },
  });
  const leaveLines = group.list.flatMap(r => (r.leaves || []).map(l => `${r.name} (${r.emp_code}) from: ${l.from} to: ${l.to}`));
  if (leaveLines.length) {
    let y = ((doc as any).lastAutoTable?.finalY ?? 100) + 8;
    doc.setFontSize(9);
    doc.text("Leave days (food auto-deducted, room charged at holding rate):", 14, y);
    doc.setFontSize(8);
    for (const line of leaveLines) {
      y += 5;
      if (y > 188) { doc.addPage(); y = 20; }
      doc.text(line, 14, y);
    }
  }
  return doc;
}

export function downloadStatementBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}