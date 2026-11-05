// Pure transform for the camp master workbooks (one row per bed). No I/O: the CLI in etl-camp-data.ts extracts and loads.
export type Cell = string | number | boolean | null | undefined;
export type Row = Cell[];
export type Presence = 'active' | 'on_site' | 'vacation';

const ALIASES = {
  room: ['room no.'], block: ['block number', 'block no.'], floor: ['floor'],
  category: ['room category', 'category'], status: ['employment status', 'status'], site: ['locations'],
  sap: ['sap id'], iqama: ['iqama /pp number', 'iqama number'], mobile: ['mobile number'], name: ['personnel name'],
  nationality: ['nationality'], position: ['position description'], division: ['division'],
  department: ['as per sap department', 'asper sap department'], group: ['employee group'],
  checkIn: ['check-in'], departure: ['departure date'],
} as const;
type Field = keyof typeof ALIASES;

export const text = (v: Cell) => String(v ?? '').replace(/\s+/g, ' ').trim();
const lower = (v: Cell) => text(v).toLowerCase();

/** Header row = first row naming both "SAP ID" and "Room No." (CAMP-04 has two banner rows above it). */
export function findHeader(rows: Row[]): { index: number; col: Record<Field, number> } {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const keys = (rows[i] || []).map(lower);
    if (!keys.includes('sap id') || !keys.includes('room no.')) continue;
    const col = {} as Record<Field, number>;
    for (const f of Object.keys(ALIASES) as Field[]) {
      col[f] = keys.findIndex(k => (ALIASES[f] as readonly string[]).includes(k));
      if (col[f] < 0) throw new Error(`Header "${ALIASES[f][0]}" not found in row ${i + 1}`);
    }
    return { index: i, col };
  }
  throw new Error('No header row with "SAP ID" and "Room No." in the first 10 rows');
}

export const normBlock = (v: Cell) => text(v).toUpperCase();
export const normRoom = (v: Cell) => text(v).toUpperCase().replace(/\s*-\s*/g, '-');
export const normFloor = (v: Cell): number | null => ({ G: 1, F: 2, S: 3 } as Record<string, number>)[text(v).toUpperCase()] ?? null;
export const normCategory = (v: Cell): string | null => {
  const m = lower(v).replace(/\s+/g, '').match(/^([1-6])x1(small)?$/);
  return m ? `${m[1]}x1` : null;
};
/** Excel serial (days since 1899-12-30) or ISO text → YYYY-MM-DD. */
export function excelDate(v: Cell): string | null {
  const s = text(v);
  if (/^\d+(\.\d+)?$/.test(s)) return new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000).toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}
export const digits = (v: Cell) => text(v).replace(/\D/g, '') || null;
export function normPhone(v: Cell): string | null {
  const d = (digits(v) || '').replace(/^966/, '').replace(/^0+/, '');
  return !d ? null : /^5\d{8}$/.test(d) ? `0${d}` : d;
}
const NATIONALITY: Record<string, string> = {
  indian: 'India', nepalese: 'Nepal', bangladeshi: 'Bangladesh', pakistan: 'Pakistan', pakistani: 'Pakistan',
  kenyan: 'Kenya', kenya: 'Kenya', ghanaian: 'Ghana', philippine: 'Philippines', filipino: 'Philippines',
  'sri lankan': 'Sri Lanka', 'south african': 'South Africa', sudanese: 'Sudan', egyptian: 'Egypt', saudi: 'Saudi Arabia',
};
export const normNationality = (v: Cell) => {
  const k = lower(v);
  return !k ? null : NATIONALITY[k] ?? k.replace(/\b\w/g, c => c.toUpperCase());
};
export function normStatus(v: Cell): { presence: Presence; food: boolean } | null {
  const k = lower(v).replace(/\s+/g, '');
  if (k === '' || k === 'active') return { presence: 'active', food: true };
  if (k === 'nofood') return { presence: 'active', food: false };
  if (k === 'on-site' || k === 'onsite') return { presence: 'on_site', food: true };
  if (k === 'on-vacation' || k === 'onvacation') return { presence: 'vacation', food: true };
  return null;
}
export const employeeType = (group: Cell) => (/supplier|contractor|etm-rental/i.test(text(group)) ? 'supplier' : 'own');

/** Most frequent value (first seen wins ties). */
function majority<T>(values: T[]): T | null {
  const n = new Map<T, number>();
  values.forEach(v => n.set(v, (n.get(v) || 0) + 1));
  let best: T | null = null, max = 0;
  n.forEach((c, v) => { if (c > max) { best = v; max = c; } });
  return best;
}

export interface Reject { camp: string; row: number; sap: string; name: string; issue: string }
export interface Room { camp: string; block: string; room: string; floor: number; category: string; capacity: number }
export interface Employee {
  employee_id: string; name: string; nationality: string | null; iqama_number: string | null; phone: string | null;
  designation: string | null; department: string | null; project: string | null; employee_group: string | null; employee_type: string; supplier_name: string | null;
  presence_status: Presence; food_required: boolean; camp: string; block: string; room: string; check_in: string;
  leave_start: string | null; leave_reason: string | null; row: number;
}
export interface CampInput { camp: string; rows: Row[] }

export function buildModel(inputs: CampInput[], vendorBySap: Map<string, string>, asOf: string) {
  const rejects: Reject[] = [];
  const bedRows = new Map<string, { camp: string; block: string; room: string; floors: number[]; cats: string[]; rawFloors: string[]; small: boolean; n: number }>();
  const candidates: Employee[] = [];
  const campMaster: Row[] = [['LOCATIONS', 'CAMP NO.', 'Room No.', 'Block No.', 'Category', 'Floor']];

  for (const { camp, rows } of inputs) {
    const { index, col } = findHeader(rows);
    for (let i = index + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const room = normRoom(r[col.room]), block = normBlock(r[col.block]);
      if (!room) continue;
      const rowNo = i + 1, sap = text(r[col.sap]), name = text(r[col.name]);
      const reject = (issue: string) => rejects.push({ camp, row: rowNo, sap, name, issue });
      if (!block) { reject('No block number; row skipped'); continue; }

      const key = `${camp}|${block}|${room}`;
      const bed = bedRows.get(key) || { camp, block, room, floors: [], cats: [], rawFloors: [], small: false, n: 0 };
      bed.n++;
      const floor = normFloor(r[col.floor]), cat = normCategory(r[col.category]);
      if (floor) bed.floors.push(floor); else if (text(r[col.floor])) reject(`Unknown floor "${text(r[col.floor])}"; room floor taken from its other beds`);
      if (cat) bed.cats.push(cat);
      bed.rawFloors.push(text(r[col.floor]).toUpperCase());
      if (/small/i.test(text(r[col.category]))) bed.small = true;
      bedRows.set(key, bed);
      campMaster.push([text(r[col.site]) || null, camp, room, block, cat ?? (text(r[col.category]) || null), text(r[col.floor]).toUpperCase() || null]);

      if (!/^[A-Z0-9]{5,}$/i.test(sap) || !/\d/.test(sap)) { // SAP number, or passport number for visitors (e.g. EL4407292)
        const label = name || text(r[col.status]) || text(r[col.group]);
        if (label) reject(`Placeholder "${label}" (no SAP ID); bed loaded as vacant`);
        continue;
      }
      const status = normStatus(r[col.status]);
      if (!status) reject(`Unknown status "${text(r[col.status])}"; loaded as active`);
      const { presence, food } = status ?? { presence: 'active' as Presence, food: true };
      let checkIn = excelDate(r[col.checkIn]);
      if (!checkIn) { reject(`Missing check-in; using ${asOf}`); checkIn = asOf; }
      else if (checkIn > asOf) { reject(`Future check-in ${checkIn}; using ${asOf}`); checkIn = asOf; }
      let leaveStart: string | null = null;
      if (presence !== 'active') {
        const dep = excelDate(r[col.departure]);
        leaveStart = dep ?? asOf;
        if (leaveStart < checkIn) { reject(`Departure ${leaveStart} before check-in ${checkIn}; leave starts at check-in`); leaveStart = checkIn; }
      }
      const site = text(r[col.site]);
      candidates.push({
        employee_id: sap, name: name || sap, nationality: normNationality(r[col.nationality]),
        iqama_number: digits(r[col.iqama]), phone: normPhone(r[col.mobile]),
        designation: text(r[col.position]) || null, department: text(r[col.department]) || null, project: text(r[col.division]) || null,
        employee_group: text(r[col.group]) || null, employee_type: employeeType(r[col.group]), supplier_name: vendorBySap.get(sap) ?? null,
        presence_status: presence, food_required: food, camp, block, room, check_in: checkIn, leave_start: leaveStart,
        leave_reason: presence === 'vacation' ? 'ETL: On-vacation' : presence === 'on_site' ? `ETL: On-site${site ? `: ${site}` : ''}` : null,
        row: rowNo,
      });
      if (!name) reject('Resident without a name; SAP ID used as name');
    }
  }

  // Same SAP ID in two camps/rooms: keep the most recent check-in.
  const bySap = new Map<string, Employee>();
  for (const e of candidates) {
    const prev = bySap.get(e.employee_id);
    const [keep, drop] = !prev || e.check_in > prev.check_in ? [e, prev] : [prev, e];
    bySap.set(e.employee_id, keep);
    if (drop) rejects.push({ camp: drop.camp, row: drop.row, sap: drop.employee_id, name: drop.name, issue: `Duplicate SAP ID; kept ${keep.camp} ${keep.room} (check-in ${keep.check_in})` });
  }
  const employees = [...bySap.values()];

  // Canonical spelling for free-text masters ("HELPER" vs "Helper"): most frequent wins.
  for (const f of ['designation', 'department', 'project'] as const) {
    const spellings = new Map<string, string[]>();
    for (const e of employees) {
      if (!e[f]) continue;
      const k = e[f]!.toLowerCase();
      if (!spellings.has(k)) spellings.set(k, []);
      spellings.get(k)!.push(e[f]!);
    }
    for (const e of employees) if (e[f]) e[f] = majority(spellings.get(e[f]!.toLowerCase())!);
  }

  const rooms: Room[] = [];
  for (const b of bedRows.values()) {
    const note = (issue: string) => rejects.push({ camp: b.camp, row: 0, sap: '', name: `${b.block} ${b.room}`, issue });
    let category = majority(b.cats);
    if (!category) { category = `${Math.min(b.n, 6)}x1`; note(`No room category; using ${category} from ${b.n} bed rows`); }
    if (new Set(b.cats).size > 1) note(`Conflicting categories ${[...new Set(b.cats)].join('/')}; using ${category}`);
    if (b.small) note('Category "6x1 small" loaded as 6x1');
    let floor = majority(b.floors);
    if (!floor) { floor = 1; note('No floor; using ground (1)'); }
    if (new Set(b.rawFloors.filter(Boolean)).size > 1) note(`Conflicting floors ${[...new Set(b.rawFloors.filter(Boolean))].join('/')}; using ${floor}`);
    const prefix = b.block.split(' ')[0];
    if (!b.room.startsWith(prefix) || !/^[-\d]/.test(b.room.slice(prefix.length))) note(`Room number does not match block prefix "${prefix}"`);
    rooms.push({ camp: b.camp, block: b.block, room: b.room, floor, category, capacity: b.n });
  }

  const buildings = new Map<string, { camp: string; name: string; floors: number }>();
  rooms.forEach(r => {
    const k = `${r.camp}|${r.block}`;
    buildings.set(k, { camp: r.camp, name: r.block, floors: Math.max(buildings.get(k)?.floors ?? 1, r.floor) });
  });
  const distinct = (xs: (string | null)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();

  return {
    camps: distinct(inputs.map(i => i.camp)),
    buildings: [...buildings.values()],
    rooms,
    employees,
    departments: distinct(employees.map(e => e.department)),
    designations: distinct(employees.map(e => e.designation)),
    rejects,
    appMaster: {
      'Employee Master': [
        ['Personnel Name', 'Nationality', 'Iqama /PP Number ', 'SAP ID', 'Mobile Number', 'Position Description', 'Employee Group', 'AS Per SAP Department'],
        ...employees.map(e => [e.name, e.nationality, e.iqama_number, e.employee_id, e.phone, e.designation, e.employee_group, e.department]),
      ] as Row[],
      'Project Master': [['Project Name', null, 'Division'], ...distinct(employees.map(e => e.project)).map(d => [null, null, d])] as Row[],
      'Camp Master': campMaster,
    },
  };
}
export type Model = ReturnType<typeof buildModel>;
