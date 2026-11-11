import { EXCEL_STANDARD_RATES, resolveRoomTypeTier } from "./excelRates";

export interface OccupancyCounts {
  active: number;
  onSite: number;
  onVacation: number;
  onlyAccommodation: number;
  officeLunchMeals: number;
}

export interface StatementTierRow {
  category: "1x1" | "2x1" | "3x1" | "4x1" | "5x1" | "6x1";
  label: string;
  // Occupancy counts
  active: number;
  onSite: number;
  onVacation: number;
  onlyAccommodation: number;
  officeLunchMeals: number;
  grandTotalOccupancy: number;

  // Charges (SAR)
  accommodationCharges: number;
  cateringCharges: number;
  onSiteCharges: number;
  onVacationCharges: number;
  officeLunchCharges: number;
  grandTotalCharges: number;
}

export interface StatementSummary {
  periodFrom: string;
  periodTo: string;
  department: string;
  employmentStatus: string;
  rows: StatementTierRow[];
  totalOccupancy: {
    active: number;
    onSite: number;
    onVacation: number;
    onlyAccommodation: number;
    officeLunchMeals: number;
    grandTotal: number;
  };
  totalCharges: {
    accommodation: number;
    catering: number;
    onSite: number;
    onVacation: number;
    officeLunch: number;
    grandTotal: number;
  };
}

export const ORDERED_TIERS: Array<"1x1" | "2x1" | "3x1" | "4x1" | "5x1" | "6x1"> = [
  "1x1",
  "2x1",
  "3x1",
  "4x1",
  "5x1",
  "6x1",
];

export function calculateTierCharges(
  tier: "1x1" | "2x1" | "3x1" | "4x1" | "5x1" | "6x1",
  counts: OccupancyCounts
): StatementTierRow {
  const rates = EXCEL_STANDARD_RATES[tier] || EXCEL_STANDARD_RATES["4x1"];

  const active = counts.active || 0;
  const onSite = counts.onSite || 0;
  const onVacation = counts.onVacation || 0;
  const onlyAccommodation = counts.onlyAccommodation || 0;
  const officeLunchMeals = counts.officeLunchMeals || 0;

  const grandTotalOccupancy =
    active + onSite + onVacation + onlyAccommodation + officeLunchMeals;

  // Rates:
  // Accommodation charges apply to Active and Only-Accommodation
  const accommodationCharges = (active + onlyAccommodation) * rates.accommodationRate;
  // Catering charges apply only to Active (not Only-Accommodation, On-Site or On-Vacation)
  const cateringCharges = active * rates.cateringRate;
  // On-Site charges apply at holdingRate
  const onSiteCharges = onSite * rates.holdingRate;
  // On-Vacation charges apply at holdingRate
  const onVacationCharges = onVacation * rates.holdingRate;
  // Office lunch meals are billed at the lunchRate (5.20 for 1x1 tier)
  const officeLunchCharges = officeLunchMeals * rates.lunchRate;

  const grandTotalCharges =
    accommodationCharges +
    cateringCharges +
    onSiteCharges +
    onVacationCharges +
    officeLunchCharges;

  return {
    category: tier,
    label: rates.label,
    active,
    onSite,
    onVacation,
    onlyAccommodation,
    officeLunchMeals,
    grandTotalOccupancy,
    accommodationCharges,
    cateringCharges,
    onSiteCharges,
    onVacationCharges,
    officeLunchCharges,
    grandTotalCharges,
  };
}

export function buildStatementSummary(
  tierCounts: Record<string, Partial<OccupancyCounts>>,
  periodFrom: string,
  periodTo: string,
  department = "EMBS",
  employmentStatus = "(All)"
): StatementSummary {
  const rows: StatementTierRow[] = ORDERED_TIERS.map((tier) => {
    const counts: OccupancyCounts = {
      active: tierCounts[tier]?.active || 0,
      onSite: tierCounts[tier]?.onSite || 0,
      onVacation: tierCounts[tier]?.onVacation || 0,
      onlyAccommodation: tierCounts[tier]?.onlyAccommodation || 0,
      officeLunchMeals: tierCounts[tier]?.officeLunchMeals || 0,
    };
    return calculateTierCharges(tier, counts);
  });

  const totalOccupancy = rows.reduce(
    (acc, r) => ({
      active: acc.active + r.active,
      onSite: acc.onSite + r.onSite,
      onVacation: acc.onVacation + r.onVacation,
      onlyAccommodation: acc.onlyAccommodation + r.onlyAccommodation,
      officeLunchMeals: acc.officeLunchMeals + r.officeLunchMeals,
      grandTotal: acc.grandTotal + r.grandTotalOccupancy,
    }),
    { active: 0, onSite: 0, onVacation: 0, onlyAccommodation: 0, officeLunchMeals: 0, grandTotal: 0 }
  );

  const totalCharges = rows.reduce(
    (acc, r) => ({
      accommodation: acc.accommodation + r.accommodationCharges,
      catering: acc.catering + r.cateringCharges,
      onSite: acc.onSite + r.onSiteCharges,
      onVacation: acc.onVacation + r.onVacationCharges,
      officeLunch: acc.officeLunch + r.officeLunchCharges,
      grandTotal: acc.grandTotal + r.grandTotalCharges,
    }),
    { accommodation: 0, catering: 0, onSite: 0, onVacation: 0, officeLunch: 0, grandTotal: 0 }
  );

  return {
    periodFrom,
    periodTo,
    department,
    employmentStatus,
    rows,
    totalOccupancy,
    totalCharges,
  };
}

/** Format currency numbers with commas and 2 decimals, or "-" if 0 */
export function formatCurrencyCell(val: number, showZeroDash = true): string {
  if (!val || val === 0) return showZeroDash ? "-" : "0.00";
  return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format integer count with commas, or "-" if 0 */
export function formatCountCell(val: number, showZeroDash = true): string {
  if (!val || val === 0) return showZeroDash ? "-" : "0";
  return val.toLocaleString("en-US");
}

/** Build CSV string matching the three tables */
export function buildExpertiseStatementCsv(summary: StatementSummary): string {
  const lines: string[] = [];

  // Metadata headers
  lines.push(`"(Division/department/Intercompany)","${summary.department}"`);
  lines.push(`"Employment Status","${summary.employmentStatus}"`);
  lines.push("");

  // Table 1
  lines.push('"Sum of Total","Column Labels"');
  lines.push('"Row Labels","Active","On-Site","On-Vacation","Grand Total Occupancy"');
  // Exclude 1x1 from table 1 as shown in spreadsheet
  summary.rows
    .filter((r) => r.category !== "1x1")
    .forEach((r) => {
      lines.push(
        `"${r.category}","${formatCountCell(r.active)}","${formatCountCell(r.onSite)}","${formatCountCell(r.onVacation)}","${formatCountCell(r.active + r.onSite + r.onVacation)}"`
      );
    });
  const t1Active = summary.totalOccupancy.active;
  const t1OnSite = summary.totalOccupancy.onSite;
  const t1OnVacation = summary.totalOccupancy.onVacation;
  const t1Grand = t1Active + t1OnSite + t1OnVacation;
  lines.push(
    `"Grand Total Occupancy","${formatCountCell(t1Active)}","${formatCountCell(t1OnSite)}","${formatCountCell(t1OnVacation)}","${formatCountCell(t1Grand)}"`
  );
  lines.push("");

  // Table 2
  lines.push(
    `"Total Occupancy Summary Report- Service Period: ${summary.periodFrom} to ${summary.periodTo}"`
  );
  lines.push(
    '"Room Category","Active","On-Site","On-Vacation","Only -Accommodation","Lunch Meals (Office Staff)","Grand Total"'
  );
  summary.rows.forEach((r) => {
    lines.push(
      `"${r.category}","${formatCountCell(r.active)}","${formatCountCell(r.onSite)}","${formatCountCell(r.onVacation)}","${formatCountCell(r.onlyAccommodation)}","${formatCountCell(r.officeLunchMeals)}","${formatCountCell(r.grandTotalOccupancy)}"`
    );
  });
  lines.push(
    `"Total Occupancy","${formatCountCell(summary.totalOccupancy.active)}","${formatCountCell(summary.totalOccupancy.onSite)}","${formatCountCell(summary.totalOccupancy.onVacation)}","${formatCountCell(summary.totalOccupancy.onlyAccommodation)}","${formatCountCell(summary.totalOccupancy.officeLunchMeals)}","${formatCountCell(summary.totalOccupancy.grandTotal)}"`
  );
  lines.push("");

  // Table 3
  lines.push(
    `"Total Monthly Charges Service Period: ${summary.periodFrom} to ${summary.periodTo}"`
  );
  lines.push(
    '"Room Category","Accommodation Charges","Catering Charges","On-Site Charges","On-Vacation Charges","Lunch Meals (Office Staff)","Grand Total"'
  );
  summary.rows.forEach((r) => {
    lines.push(
      `"${r.category}","${formatCurrencyCell(r.accommodationCharges)}","${formatCurrencyCell(r.cateringCharges)}","${formatCurrencyCell(r.onSiteCharges)}","${formatCurrencyCell(r.onVacationCharges)}","${formatCurrencyCell(r.officeLunchCharges)}","${formatCurrencyCell(r.grandTotalCharges)}"`
    );
  });
  lines.push(
    `"Total","${formatCurrencyCell(summary.totalCharges.accommodation)}","${formatCurrencyCell(summary.totalCharges.catering)}","${formatCurrencyCell(summary.totalCharges.onSite)}","${formatCurrencyCell(summary.totalCharges.onVacation)}","${formatCurrencyCell(summary.totalCharges.officeLunch)}","${formatCurrencyCell(summary.totalCharges.grandTotal)}"`
  );
  lines.push(
    '"Please note that, On-Site and On-Vacation charges are applicable based on the room category."'
  );

  return lines.join("\r\n");
}

