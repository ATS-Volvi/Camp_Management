import { RESIDENT_STATUSES } from "./accommodationAbsence";

export const TOTAL_INMATE_CATEGORIES = ["1x1", "2x1", "3x1", "4x1", "5x1", "6x1", "guest"];

export interface InmateSummaryRow {
  room_category?: string;
  room_id?: string;
  camp_id?: string;
  block_id?: string;
  department?: string;
  nationality?: string;
  status?: string;
}

export interface InmateSummaryRoom {
  id: string;
  camp_id: string;
  building_id: string | null;
  category: string;
  max_capacity: number;
}

export function filterTotalInmates(rows: InmateSummaryRow[], filters: { camp: string; block: string; dept: string; nationality: string }) {
  return rows.filter(r => (filters.camp === "all" || r.camp_id === filters.camp)
    && (filters.block === "all" || r.block_id === filters.block)
    && (filters.dept === "all" || (r.department || "Unassigned") === filters.dept)
    && (filters.nationality === "all" || (r.nationality || "Unassigned") === filters.nationality));
}

/** Room inventory is location-scoped; demographic filters never invent vacant beds. */
export function totalInmatesMatrix(rows: InmateSummaryRow[], rooms: InmateSummaryRoom[] = [], allResidents: InmateSummaryRow[] = rows) {
  const statuses = [...RESIDENT_STATUSES] as string[];
  const cats = [...TOTAL_INMATE_CATEGORIES];
  rows.forEach(r => { const c = r.room_category || "—"; if (!cats.includes(c)) cats.push(c); });
  rooms.forEach(r => { if (!cats.includes(r.category)) cats.push(r.category); });
  const occupiedByRoom = new Map<string, number>();
  allResidents.forEach(r => { if (r.room_id) occupiedByRoom.set(r.room_id, (occupiedByRoom.get(r.room_id) || 0) + 1); });
  const table = cats.map(category => {
    const counts = Object.fromEntries(statuses.map(s => [s, rows.filter(r => (r.room_category || "—") === category && r.status === s).length]));
    const categoryRooms = rooms.filter(r => r.category === category);
    const unoccupied = categoryRooms.reduce((n, r) => n + Math.max(0, r.max_capacity - (occupiedByRoom.get(r.id) || 0)), 0);
    return { category, counts, availableRooms: categoryRooms.length, unoccupied, total: rows.filter(r => (r.room_category || "—") === category).length };
  });
  const grand = { counts: Object.fromEntries(statuses.map(s => [s, table.reduce((n, r) => n + r.counts[s], 0)])),
    availableRooms: rooms.length, unoccupied: table.reduce((n, r) => n + r.unoccupied, 0), total: rows.length };
  return { statuses, table, grand };
}

export function departmentInmatesMatrix(rows: InmateSummaryRow[]) {
  const statuses = [...RESIDENT_STATUSES] as string[];
  const categories = [...TOTAL_INMATE_CATEGORIES];
  rows.forEach(r => { const category = r.room_category || "—"; if (!categories.includes(category)) categories.push(category); });
  const departments = [...new Set(rows.map(r => r.department || "Unassigned"))].sort();
  const table = departments.map(department => {
    const residents = rows.filter(r => (r.department || "Unassigned") === department);
    return { department, counts: Object.fromEntries(statuses.map(s => [s, residents.filter(r => r.status === s).length])),
      categoryCounts: Object.fromEntries(categories.map(c => [c, residents.filter(r => (r.room_category || "—") === c).length])), total: residents.length };
  });
  return { statuses, categories, table, grand: { counts: Object.fromEntries(statuses.map(s => [s, rows.filter(r => r.status === s).length])),
    categoryCounts: Object.fromEntries(categories.map(c => [c, rows.filter(r => (r.room_category || "—") === c).length])), total: rows.length } };
}
