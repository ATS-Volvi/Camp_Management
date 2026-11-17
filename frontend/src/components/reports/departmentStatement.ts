import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { endOfMonth, format, parseISO } from "date-fns";
import { reportPeriodEnd } from "@/lib/stayBilling";
import { emptyMealDeductions, type MealDeductions } from "@/lib/mealCosting";
import { matchesLunchDepartment, summarizeDepartmentLunch, type DepartmentLunch } from "@/lib/departmentLunch";
import { RESIDENT_STATUSES, residentStatus } from "@/lib/accommodationAbsence";
import { TOTAL_INMATE_CATEGORIES } from "@/lib/totalInmates";

export interface DepartmentCostRow {
  id: string;
  employeeId?: string;
  emp_code: string;
  name: string;
  department: string;
  subDepartment?: string;
  supplier: string;
  project: string;
  camp: string;
  campId?: string;
  block?: string;
  blockId?: string;
  room: string;
  category?: string;
  presenceStatus?: string;
  statusPeriods?: { status: string; from: string; to: string | null }[];
  stayDays: number;
  dailyFood: number;
  mealsCancelled: number;
  roomRevenue: number;
  foodRevenue: number;
  total: number;
  foodFull?: number;
  foodDeductions?: MealDeductions;
  leaveFoodDeductions?: MealDeductions;
  breakfastCost?: number;
  lunchCost?: number;
  dinnerCost?: number;
  ramadanCost?: number;
  stayFrom?: string;
  stayTo?: string;
  leaveDays?: number;
  leaves?: { from: string; to: string }[];
  normalRoomCost?: number;
  holdingCost?: number;
  lockerCost?: number;
  hasRateChange?: boolean;
  rateBreakdownLabel?: string;
  rateSegments?: any[];
  absences?: { temporary_out_date: string; expected_return_date: string | null; actual_return_date: string | null; reason: string; ended_by_checkout: boolean; absence_status?: string }[];
}

/** Full food value before cancellations; falls back to days x daily rate. */
export const rowFoodFull = (r: DepartmentCostRow) => r.foodFull ?? r.stayDays * r.dailyFood;
const meal = (r: DepartmentCostRow, k: "breakfastCost" | "lunchCost" | "dinnerCost" | "ramadanCost") => r[k] ?? (k === "ramadanCost" ? 0 : r.foodRevenue / 3);

export function sumFoodDeductions(rows: DepartmentCostRow[], leaveOnly = false): MealDeductions {
  return rows.reduce((sum, row) => {
    const value = leaveOnly ? row.leaveFoodDeductions : row.foodDeductions;
    if (value) for (const key of Object.keys(sum) as (keyof MealDeductions)[]) sum[key] += value[key];
    else if (!leaveOnly) sum.total += rowFoodFull(row) - row.foodRevenue;
    return sum;
  }, emptyMealDeductions());
}

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
    deductions: sumFoodDeductions(list),
    breakfast: list.reduce((sum, row) => sum + meal(row, "breakfastCost"), 0),
    lunch: list.reduce((sum, row) => sum + meal(row, "lunchCost"), 0),
    dinner: list.reduce((sum, row) => sum + meal(row, "dinnerCost"), 0),
    ramadan: list.reduce((sum, row) => sum + meal(row, "ramadanCost"), 0),
    total: list.reduce((sum, row) => sum + row.total, 0),
  }));
}

export type DepartmentStatement = ReturnType<typeof groupDepartmentStatements>[number];
export function addDepartmentLunchStatements(groups: DepartmentStatement[], departments: {id:string;name:string;code:string;cost_center:string|null}[], requests: DepartmentLunch[], from: string, to: string) {
  const masters = new Map(departments.map(d => [d.id, d]));
  requests.forEach(r => { if (!masters.has(r.department_id) && r.departments) masters.set(r.department_id, {id:r.department_id,...r.departments}); });
  // Merge verified aliases before adding lunch once to the department subtotal.
  const groupedRows = groups.flatMap(g => g.list.map(row => {
    const master = [...masters.values()].find(d => matchesLunchDepartment(row.department, d));
    const label = master ? groups.find(g => matchesLunchDepartment(g.dept, master))?.dept : undefined;
    return label ? {...row,department:label} : row;
  }));
  const costCenters = Object.fromEntries(groups.map(g => [g.dept,g.costCenter]));
  const result = groupDepartmentStatements(groupedRows,costCenters).map(g => ({ ...g, departmentLunch: {quantity:0,cost:0,daily:[]} as ReturnType<typeof summarizeDepartmentLunch> }));
  for (const d of masters.values()) {
    const lunch = summarizeDepartmentLunch(requests,from,to,d.id);
    const group = result.find(g => matchesLunchDepartment(g.dept, d));
    if (group) {group.departmentLunch=lunch;group.total+=lunch.cost;}
    else if(lunch.quantity) result.push({dept:d.code,list:[],costCenter:d.cost_center || "—",residents:0,days:0,room:0,food:0,credit:0,deductions:emptyMealDeductions(),breakfast:0,lunch:0,dinner:0,ramadan:0,total:lunch.cost,departmentLunch:lunch});
  }
  return result.sort((a,b)=>a.dept.localeCompare(b.dept));
}
export const statementAmount = (n: any) => (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const statementFilename = (dept: string, month: string) => `department-costing-${dept.replace(/[^a-z0-9_-]/gi, "-")}-${month}`;

export function filterDepartmentCostRows(rows: DepartmentCostRow[], filters: { camp: string; block: string }) {
  return rows.filter(row => (filters.camp === "all" || (row.campId || row.camp) === filters.camp)
    && (filters.block === "all" || (row.blockId || row.block || "—") === filters.block));
}

/** One person is counted once, in their latest room, using their status at the report end. */
export function departmentCategoryStatusMatrix(rows: DepartmentCostRow[], asOfDate: string) {
  const categories = [...TOTAL_INMATE_CATEGORIES];
  rows.forEach(row => { const category = row.category || "—"; if (!categories.includes(category)) categories.push(category); });
  const latestByEmployee = new Map<string, DepartmentCostRow>();
  rows.forEach(row => latestByEmployee.set(row.employeeId || row.emp_code || row.id, row));
  const today = format(new Date(), "yyyy-MM-dd");
  const residents = [...latestByEmployee.values()].map(row => {
    const absences = (row.absences || []).filter(a => a.temporary_out_date <= asOfDate
      && (!a.actual_return_date || asOfDate < a.actual_return_date))
      .sort((a, b) => a.temporary_out_date.localeCompare(b.temporary_out_date));
    const periods = (row.statusPeriods || []).filter(p => p.from <= asOfDate && (!p.to || asOfDate <= p.to))
      .sort((a, b) => a.from.localeCompare(b.from));
    const absence = absences[absences.length - 1];
    const period = periods[periods.length - 1];
    const presence = period?.status ?? (asOfDate >= today ? row.presenceStatus : null);
    return { category: row.category || "—", status: residentStatus(absence ? { absence_status: absence.absence_status || "away" } : null, presence) };
  });
  const table = categories.map(category => {
    const categoryResidents = residents.filter(r => r.category === category);
    return { category, counts: Object.fromEntries(RESIDENT_STATUSES.map(status => [status, categoryResidents.filter(r => r.status === status).length])), total: categoryResidents.length };
  });
  return { categories, statuses: [...RESIDENT_STATUSES], table,
    grand: { counts: Object.fromEntries(RESIDENT_STATUSES.map(status => [status, residents.filter(r => r.status === status).length])), total: residents.length } };
}

export interface StatementLabels { title: string; chargeTo: string; codeLabel: string; footer: string }
const PDF_BRAND_BLUE: [number, number, number] = [28, 35, 84];
const DEPT_LABELS: StatementLabels = { title: "Department Monthly Costing Statement", chargeTo: "Charge to", codeLabel: "Cost Center", footer: "Department" };

/** Approved food cancellation shown at the bottom of a statement. */
export interface StatementCancellation { name: string; emp_code: string; from: string; to: string; meals: string; reason: string }

export interface StatementPeriod { fromDate: string; toDate: string; logoDataUrl?: string }

function drawExpertiseLogo(doc: jsPDF, logoDataUrl?: string) {
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 14, 8, 34, 12);
      return;
    } catch { /* Use the vector EC mark if an image cannot be decoded. */ }
  }
  doc.setFillColor(230, 240, 247);
  doc.roundedRect(14, 8, 12, 12, 1, 1, "F");
  doc.setTextColor(77, 113, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("EC", 20, 15.5, { align: "center" });
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text("Expertise Contracting Co.", 30, 16);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
}

export function buildDepartmentStatementPdf(group: DepartmentStatement, month: string, labels: StatementLabels = DEPT_LABELS, cancellations: StatementCancellation[] = [], selectedPeriod?: StatementPeriod) {
  const lunch = (group as DepartmentStatement & { departmentLunch?: ReturnType<typeof summarizeDepartmentLunch> }).departmentLunch;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const start = parseISO(selectedPeriod?.fromDate ?? `${month}-01`);
  const requestedEnd = selectedPeriod?.toDate ?? format(endOfMonth(start), "yyyy-MM-dd");
  const end = parseISO(reportPeriodEnd(requestedEnd));
  const period = `${format(start, "dd MMM yyyy")} - ${format(end, "dd MMM yyyy")}`;
  const statementPeriod = selectedPeriod ? `${selectedPeriod.fromDate}_to_${selectedPeriod.toDate}` : month;
  drawExpertiseLogo(doc, selectedPeriod?.logoDataUrl);
  doc.setFontSize(9);
  doc.text("Camp-365", 283, 16, { align: "right" });
  doc.setFontSize(14);
  doc.text(labels.title, 14, 29);
  const metadata = `${labels.chargeTo}: ${group.dept} | ${labels.codeLabel}: ${group.costCenter} | Period: ${period} | Residents: ${group.residents} | Resident-days: ${group.days}`;
  doc.setFontSize(9);
  const metadataWidth = doc.getTextWidth(metadata);
  if (metadataWidth > 269) doc.setFontSize(9 * 269 / metadataWidth);
  doc.text(metadata, 14, 36);
  doc.setFontSize(8);
  doc.text(`Currency: SAR | Prepared: ${format(new Date(), "dd MMM yyyy")}`, 283, 22, { align: "right" });
  autoTable(doc, {
    startY: 40,
    head: [["Total Candidates", "Inmate Food Value", "Total Room Cost", "Monthly Department Lunch", "Grand Total"]],
    body: [[String(group.residents), `SAR ${statementAmount(group.food)}`, `SAR ${statementAmount(group.room)}`, `SAR ${statementAmount(lunch?.cost || 0)}`, `SAR ${statementAmount(group.total)}`]],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2, halign: "center", fontStyle: "bold" },
    headStyles: { fontSize: 9, fontStyle: "normal", fillColor: PDF_BRAND_BLUE, textColor: 255 },
    margin: { left: 14, right: 14 },
  });
  {
    const c = (k: string) => group.list.reduce((t, r: any) => t + (Number(r[k]) || 0), 0);
    const items: [string, number, number][] = [["Breakfast", c("breakfastCount"), group.breakfast], ["Lunch", c("lunchCount"), group.lunch], ["Dinner", c("dinnerCount"), group.dinner]];
    if (group.ramadan) items.push(["Ramadan (days)", c("ramadanCount"), group.ramadan]);
    items.push(["Office Lunch (department)", lunch?.quantity || 0, lunch?.cost || 0]);
    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY ?? 70) + 4,
      head: [["Food Charges", ...items.map(([label]) => label === "Office Lunch (department)" ? "Office Lunch" : label), "Total"]],
      body: [
        ["Count", ...items.map(([, count]) => String(Math.round(count * 10) / 10)), ""],
        ["Amount (SAR)", ...items.map(([, , amount]) => statementAmount(amount)), statementAmount(items.reduce((sum, item) => sum + item[2], 0))],
      ],
      theme: "grid", styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 },
      footStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255, fontStyle: "bold" },
      columnStyles: Object.fromEntries(items.map((_, index) => [index + 1, { halign: "right" as const }]).concat([[items.length + 1, { halign: "right" as const }]])), margin: { left: 14, right: 14 },
    });
  }
  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY ?? 70) + 4,
    head: [["Total Food Deductions", "BF count / SAR", "Lunch count / SAR", "Dinner count / SAR", "Ramadan day-equiv. / SAR", "Total (SAR)"]],
    body: [["Leave + approved cancellations", ...(["breakfast", "lunch", "dinner", "ramadan"] as const).map(k => `${group.deductions[`${k}Count`]} / ${statementAmount(group.deductions[k])}`), statementAmount(group.deductions.total)]],
    theme: "grid", styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 },
  });
  const matrix = departmentCategoryStatusMatrix(group.list, format(end, "yyyy-MM-dd"));
  const matrixTitleY = ((doc as any).lastAutoTable?.finalY ?? 70) + 5;
  doc.setFontSize(10);
  doc.text("Room Category / Status — Inmate Counts", 14, matrixTitleY);
  autoTable(doc, {
    startY: matrixTitleY + 3,
    pageBreak: "avoid",
    showFoot: "lastPage",
    head: [["Room Category", ...matrix.statuses, "Total"]],
    body: matrix.table.map(row => [row.category === "guest" ? "Guest" : row.category, ...matrix.statuses.map(status => row.counts[status]), row.total]),
    foot: [["Grand Total", ...matrix.statuses.map(status => matrix.grand.counts[status]), matrix.grand.total]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.5, halign: "center" },
    headStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 },
    footStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255, fontStyle: "bold" },
    margin: { left: 14, right: 14, bottom: 23 },
  });
  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY ?? 70) + 7,
    head: [["Employee / ID", "Supplier / Project", "Camp / Block / Room / Category", "Days", "Room cost", "Breakfast", "Lunch", "Dinner", "Ramadan", "Net food", "Total (SAR)"]],
    body: group.list.map(row => [
      `${row.name}\n${row.emp_code}${row.stayFrom ? `\nFrom: ${row.stayFrom} To: ${row.stayTo}` : ""}`, `${row.supplier}\n${row.project}`, `${row.camp}\n${row.block ? `${row.block} / ` : ""}${row.room}${row.category ? `\n${row.category}` : ""}`,
      row.stayDays, `${statementAmount(row.roomRevenue)}${row.holdingCost ? `\nNormal: ${statementAmount(row.normalRoomCost || 0)}\nHolding: ${statementAmount(row.holdingCost)}` : ""}`,
      statementAmount(meal(row, "breakfastCost")), statementAmount(meal(row, "lunchCost")),
      statementAmount(meal(row, "dinnerCost")), statementAmount(meal(row, "ramadanCost")),
      statementAmount(row.foodRevenue), `${statementAmount(row.total)}${row.lockerCost ? `\nLocker: ${statementAmount(row.lockerCost)}` : ""}`,
    ]),
    foot: [["INMATE SUBTOTAL", "", "", group.days, statementAmount(group.room), statementAmount(group.breakfast), statementAmount(group.lunch), statementAmount(group.dinner), statementAmount(group.ramadan), statementAmount(group.food), statementAmount(group.total - (lunch?.cost || 0))]],
    showFoot: "lastPage",
    rowPageBreak: "avoid",
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 }, footStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 },
    columnStyles: Object.fromEntries([3, 4, 5, 6, 7, 8, 9, 10].map(i => [i, { halign: "right" as const }])),
    margin: { top: 15, bottom: 23, left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.text("Room costs remain payable for the stay. Net food costs reflect recorded approved meal cancellations.", 14, 195);
      doc.text(`${labels.footer}: ${group.dept} | ${statementPeriod} | Page ${doc.getNumberOfPages()}`, 14, 201);
    },
  });
  const leaveRows = group.list.filter(r => (r.leaveDays || 0) > 0);
  const absenceRows = group.list.flatMap(r => (r.absences || []).map(a => [r.emp_code, r.name, r.camp, r.room, a.temporary_out_date, a.expected_return_date || "-", a.ended_by_checkout ? "Permanent checkout" : a.actual_return_date || "Room retained", a.reason, statementAmount(r.normalRoomCost || 0), statementAmount(r.holdingCost || 0)]));
  if (absenceRows.length) autoTable(doc, { startY: ((doc as any).lastAutoTable?.finalY ?? 100) + 8,
    head: [["Employee ID", "Name", "Camp", "Room", "Temporary Out", "Expected Return", "Actual Return / Status", "Reason", "Normal Room", "Holding"]], body: absenceRows,
    styles: { fontSize: 7 }, headStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 } });
  if (leaveRows.length) {
    let y = ((doc as any).lastAutoTable?.finalY ?? 100) + 8;
    if (y > 165) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.text("Leave days (food auto-deducted, room charged at holding rate):", 14, y);
    const totals = sumFoodDeductions(leaveRows, true);
    autoTable(doc, {
      startY: y + 4,
      head: [["Employee / ID", "Camp / Room", "Leave dates (From - To)", "Leave days", "BF count / SAR", "Lunch count / SAR", "Dinner count / SAR", "Ramadan day-equiv. / SAR", "Deducted (SAR)"]],
      body: leaveRows.map(r => {
        const d = r.leaveFoodDeductions || emptyMealDeductions();
        return [`${r.name}\n${r.emp_code}`, `${r.camp}\n${r.room}`, (r.leaves || []).map(l => `${l.from} - ${l.to}`).join("\n"), r.leaveDays || 0, ...(["breakfast", "lunch", "dinner", "ramadan"] as const).map(k => `${d[`${k}Count`]} / ${statementAmount(d[k])}`), statementAmount(d.total)];
      }),
      foot: [["TOTAL AUTO-DEDUCTED", "", "", leaveRows.reduce((s, r) => s + (r.leaveDays || 0), 0), ...(["breakfast", "lunch", "dinner", "ramadan"] as const).map(k => `${totals[`${k}Count`]} / ${statementAmount(totals[k])}`), statementAmount(totals.total)]],
      showFoot: "lastPage", theme: "grid", styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 }, footStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 },
      margin: { top: 15, bottom: 23, left: 14, right: 14 },
    });
  }
  if (cancellations.length) {
    let y = ((doc as any).lastAutoTable?.finalY ?? 100) + 8;
    if (y > 170) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.text("Food Cancellation Details (approved requests credited in this statement):", 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Employee", "From", "To", "Meals", "Reason"]],
      body: cancellations.map(c => [`${c.name} (${c.emp_code})`, c.from, c.to, c.meals, c.reason]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 }, footStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 },
      margin: { top: 15, bottom: 23, left: 14, right: 14 },
    });
  }
  if (lunch) autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY ?? 100) + 8,
    head: [["Approved Department Lunch Date", "Lunch Count", "Cost (SAR)"]],
    body: lunch.daily.map(d => [d.date, d.quantity, statementAmount(d.cost)]),
    foot: [["MONTHLY DEPARTMENT LUNCH", lunch.quantity, statementAmount(lunch.cost)], ["GRAND TOTAL TO CHARGE", "", statementAmount(group.total)]],
    showFoot: "lastPage", theme: "grid", styles: { fontSize: 9 },
    headStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 }, footStyles: { fillColor: PDF_BRAND_BLUE, textColor: 255 },
  });
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