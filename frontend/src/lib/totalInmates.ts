import { RESIDENT_STATUSES } from "./accommodationAbsence";

export const TOTAL_INMATE_CATEGORIES = ["1x1", "2x1", "3x1", "4x1", "5x1", "6x1", "guest"];

/** Rows = room categories, columns = resident statuses + Total, last row = grand total. */
export function totalInmatesMatrix(rows: { room_category?: string; status?: string }[]) {
  const statuses = [...RESIDENT_STATUSES] as string[];
  const cats = [...TOTAL_INMATE_CATEGORIES];
  rows.forEach(r => { const c = r.room_category || "—"; if (!cats.includes(c)) cats.push(c); });
  const table = cats.map(category => {
    const counts = Object.fromEntries(statuses.map(s => [s, rows.filter(r => (r.room_category || "—") === category && r.status === s).length]));
    return { category, counts, total: rows.filter(r => (r.room_category || "—") === category).length };
  });
  const grand = { counts: Object.fromEntries(statuses.map(s => [s, table.reduce((n, r) => n + r.counts[s], 0)])), total: rows.length };
  return { statuses, table, grand };
}
