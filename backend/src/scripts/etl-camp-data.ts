// ETL: camp master workbooks (one row per bed) → camps, blocks, rooms, employees, active stays.
// Usage: npm run etl:camp -w backend -- [--dir <folder>] [--as-of YYYY-MM-DD] [--commit] [--allow-db <name>]
// Dry run by default: everything runs in one transaction and is rolled back unless --commit is given.
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { pool } from '../lib/db.js';
import { buildModel, CampInput, Model, Row, text } from './etl-camp-transform';

const ROOT = path.resolve(__dirname, '../../..');
const arg = (name: string, fallback = ''): string => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const DIR = path.resolve(arg('--dir', path.join(ROOT, '../OneDrive_2026-11-05/Camp - Real Data')));
const AS_OF = arg('--as-of', '2026-10-26');
if (!/^\d{4}-\d{2}-\d{2}$/.test(AS_OF)) throw new Error(`--as-of must be YYYY-MM-DD, got "${AS_OF}"`);
const COMMIT = process.argv.includes('--commit');
const VENDOR_SHEET = 'Active Vendor Manpower List ';
// Catering per day by room type (SAR), from the occupancy summary for 26-Aug-2026 to 25-Sep-2026. Room rates live in room_categories (migration 0014).
const CATERING: Record<string, number> = { '1x1': 13, '2x1': 13, '3x1': 11, '4x1': 10, '5x1': 10, '6x1': 10 };

function extract() {
  const files = fs.readdirSync(DIR).filter(f => /^camp-?0\d.*\.xlsx$/i.test(f)).sort();
  if (!files.length) throw new Error(`No CAMP-0N workbooks in ${DIR}`);
  const inputs: CampInput[] = [];
  const vendorBySap = new Map<string, string>();
  for (const f of files) {
    const camp = `CAMP-0${f.match(/camp-?0(\d)/i)![1]}`;
    const wb = XLSX.readFile(path.join(DIR, f), { sheets: ['MASTER', VENDOR_SHEET] }); // HR sheets (40 MB+) are never parsed
    const sheetRows = (name: string) => XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true });
    if (!wb.Sheets.MASTER) throw new Error(`${f} has no MASTER sheet`);
    inputs.push({ camp, rows: sheetRows('MASTER') });
    if (wb.Sheets[VENDOR_SHEET]) {
      for (const r of sheetRows(VENDOR_SHEET).slice(1)) {
        const sap = text(r[2]), supplier = text(r[5]).replace(/^\d+\s+/, '');
        if (sap && supplier) vendorBySap.set(sap, supplier);
      }
    }
    console.log(`Extracted ${f} → ${camp}`);
  }
  return { inputs, vendorBySap };
}

async function load(m: Model) {
  const client = await pool.connect();
  const q = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows;
  try {
    const [{ db, host }] = await q(`SELECT current_database() db, inet_server_addr()::text host`);
    console.log(`Target database: ${db} (${host}) — ${COMMIT ? 'COMMIT' : 'dry run, will roll back'}`);
    if (db === 'neondb' && arg('--allow-db') !== db) throw new Error('Refusing to load into "neondb" (production). Pass --allow-db neondb to override.');
    const [pre] = await q(`SELECT
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='room_categories' AND column_name='holding_charge') holding,
      EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='room_category' AND e.enumlabel='6x1') types,
      NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='rooms_camp_id_room_number_unique') roomkey`);
    if (!pre.holding || !pre.types || !pre.roomkey) throw new Error(`Schema not ready (${JSON.stringify(pre)}): apply drizzle migrations 0003 and 0014 first`);

    await q('BEGIN');
    const json = (x: unknown) => JSON.stringify(x);

    // 1. Camps: reuse a camp already named or coded CAMP-0N (keeps its code/location), else create one.
    await q(`INSERT INTO camps (name, location, camp_code)
      SELECT code, 'TBD', code FROM unnest($1::text[]) code
      WHERE NOT EXISTS (SELECT 1 FROM camps c WHERE upper(c.name) = code OR c.camp_code = code)`, [m.camps]);
    const campRows = await q(`SELECT DISTINCT ON (code) code, c.id FROM unnest($1::text[]) code
      JOIN camps c ON upper(c.name) = code OR c.camp_code = code ORDER BY code, (c.camp_code = code) DESC, c.created_at`, [m.camps]);
    const campId = new Map<string, string>(campRows.map(r => [r.code, r.id]));
    const campIds = [...campId.values()];

    // 2. Standard room rates per camp from the Room Configuration Master (existing per-camp rates are kept).
    await q(`INSERT INTO camp_room_rates (camp_id, room_category, daily_rate)
      SELECT c, rc.category_key, rc.daily_rate FROM unnest($1::uuid[]) c CROSS JOIN room_categories rc WHERE rc.code ~ '^RT[1-6]X1$'
      ON CONFLICT (camp_id, room_category) DO NOTHING`, [campIds]);

    // 3. Blocks (buildings have no unique key: match by camp + name).
    const blocks = m.buildings.map(b => ({ camp_id: campId.get(b.camp), name: b.name, floors: b.floors }));
    await q(`INSERT INTO buildings (camp_id, name, floors)
      SELECT x.camp_id, x.name, x.floors FROM json_to_recordset($1) x(camp_id uuid, name text, floors int)
      WHERE NOT EXISTS (SELECT 1 FROM buildings b WHERE b.camp_id = x.camp_id AND upper(b.name) = x.name)`, [json(blocks)]);
    await q(`UPDATE buildings b SET floors = GREATEST(b.floors, x.floors)
      FROM json_to_recordset($1) x(camp_id uuid, name text, floors int) WHERE b.camp_id = x.camp_id AND upper(b.name) = x.name`, [json(blocks)]);
    const blockRows = await q(`SELECT DISTINCT ON (camp_id, upper(name)) id, camp_id, upper(name) AS name FROM buildings
      WHERE camp_id = ANY($1) ORDER BY camp_id, upper(name), created_at`, [campIds]);
    const blockId = new Map<string, string>(blockRows.map(r => [`${r.camp_id}|${r.name}`, r.id]));

    // 4. Rooms: capacity = bed rows in the master; never below current occupancy.
    const rooms = m.rooms.map(r => {
      const camp_id = campId.get(r.camp)!;
      return { camp_id, building_id: blockId.get(`${camp_id}|${r.block}`), room_number: r.room, floor: r.floor, category: r.category, max_capacity: r.capacity, daily_food_rate: CATERING[r.category] };
    });
    const roomRows = await q(`INSERT INTO rooms (camp_id, building_id, room_number, floor, category, max_capacity, daily_rate, daily_food_rate)
      SELECT x.camp_id, x.building_id, x.room_number, x.floor, x.category::room_category, x.max_capacity,
             COALESCE((SELECT rc.daily_rate FROM room_categories rc WHERE rc.category_key = x.category LIMIT 1), 0), x.daily_food_rate
      FROM json_to_recordset($1) x(camp_id uuid, building_id uuid, room_number text, floor int, category text, max_capacity int, daily_food_rate numeric)
      ON CONFLICT (camp_id, building_id, room_number) DO UPDATE SET floor = EXCLUDED.floor, category = EXCLUDED.category,
        max_capacity = GREATEST(EXCLUDED.max_capacity, rooms.current_occupancy), daily_rate = EXCLUDED.daily_rate, daily_food_rate = EXCLUDED.daily_food_rate
      RETURNING id, camp_id, building_id, room_number`, [json(rooms)]);
    const roomId = new Map<string, string>(roomRows.map(r => [`${r.building_id}|${r.room_number}`, r.id]));

    // 5. Masters used by employee forms and filters.
    await q(`INSERT INTO departments (name, code) SELECT n, upper(n) FROM unnest($1::text[]) n ON CONFLICT DO NOTHING`, [m.departments]);
    await q(`INSERT INTO designations (name) SELECT n FROM unnest($1::text[]) n ON CONFLICT DO NOTHING`, [m.designations]);

    // 6. Employees (SAP ID = employee_id).
    const emps = m.employees.map(e => {
      const camp_id = campId.get(e.camp)!;
      return { ...e, camp_id, room_id: roomId.get(`${blockId.get(`${camp_id}|${e.block}`)}|${e.room}`) };
    });
    await q(`INSERT INTO employees (employee_id, name, nationality, iqama_number, phone, designation, department, project, employee_type, supplier_name, presence_status, status, camp_id, room_id)
      SELECT x.employee_id, x.name, x.nationality, x.iqama_number, x.phone, x.designation, x.department, x.project, x.employee_type, x.supplier_name,
             x.presence_status::presence_status, 'active', x.camp_id, x.room_id
      FROM json_to_recordset($1) x(employee_id text, name text, nationality text, iqama_number text, phone text, designation text, department text,
             project text, employee_type text, supplier_name text, presence_status text, camp_id uuid, room_id uuid)
      ON CONFLICT (employee_id) DO UPDATE SET name = EXCLUDED.name, nationality = COALESCE(EXCLUDED.nationality, employees.nationality),
        iqama_number = COALESCE(EXCLUDED.iqama_number, employees.iqama_number), phone = COALESCE(EXCLUDED.phone, employees.phone),
        designation = EXCLUDED.designation, department = EXCLUDED.department, project = EXCLUDED.project, employee_type = EXCLUDED.employee_type,
        supplier_name = COALESCE(EXCLUDED.supplier_name, employees.supplier_name), presence_status = EXCLUDED.presence_status,
        status = 'active', camp_id = EXCLUDED.camp_id, room_id = EXCLUDED.room_id`, [json(emps)]);

    // 7. Active stays, only for residents without one (re-runs never duplicate or move anyone). Noon UTC keeps the calendar date in any timezone.
    const stays = json(emps.map(e => ({ employee_id: e.employee_id, room_id: e.room_id, camp_id: e.camp_id, check_in: e.check_in, iqama: e.iqama_number,
      food_required: e.food_required, presence: e.presence_status, leave_start: e.leave_start, leave_reason: e.leave_reason })));
    const STAYS = `json_to_recordset($1) x(employee_id text, room_id uuid, camp_id uuid, check_in date, iqama text, food_required bool, presence text, leave_start date, leave_reason text)
      JOIN employees e ON e.employee_id = x.employee_id`;
    const ACTIVE = `SELECT DISTINCT ON (ci.employee_id) ci.employee_id, ci.room_id FROM check_ins ci
      WHERE NOT EXISTS (SELECT 1 FROM check_outs co WHERE co.employee_id = ci.employee_id AND co.check_out_date >= ci.check_in_date)
      ORDER BY ci.employee_id, ci.check_in_date DESC`;
    const inserted = await q(`INSERT INTO check_ins (employee_id, room_id, camp_id, check_in_date, iqama_number, food_required)
      SELECT e.id, x.room_id, x.camp_id, (x.check_in + time '12:00') AT TIME ZONE 'UTC', x.iqama, x.food_required FROM ${STAYS}
      WHERE NOT EXISTS (SELECT 1 FROM (${ACTIVE}) a WHERE a.employee_id = e.id)
      RETURNING employee_id`, [stays]);
    const newIds = inserted.map(r => r.employee_id);

    // 8. Status history for new stays, as the app records it: 'active' from check-in, closed the day before a leave starts.
    await q(`INSERT INTO employee_status_log (employee_id, from_status, to_status, effective_from, effective_to, reason)
      SELECT e.id, NULL, 'active', x.check_in, CASE WHEN x.leave_start IS NOT NULL THEN GREATEST(x.leave_start - 1, x.check_in) END, 'Check-in (ETL)'
      FROM ${STAYS} WHERE e.id = ANY($2)`, [stays, newIds]);
    await q(`INSERT INTO employee_status_log (employee_id, from_status, to_status, effective_from, reason)
      SELECT e.id, 'active', x.presence::presence_status, x.leave_start, x.leave_reason
      FROM ${STAYS} WHERE e.id = ANY($2) AND x.leave_start IS NOT NULL`, [stays, newIds]);

    // Residents already staying in a different room keep that stay; report them.
    const elsewhere = await q(`SELECT x.employee_id, e.name FROM ${STAYS} JOIN (${ACTIVE}) a ON a.employee_id = e.id WHERE a.room_id <> x.room_id`, [stays]);
    for (const r of elsewhere) {
      const e = m.employees.find(x => x.employee_id === r.employee_id)!;
      m.rejects.push({ camp: e.camp, row: e.row, sap: e.employee_id, name: r.name, issue: 'Already checked in to another room; existing stay kept' });
    }

    // 9. Recompute occupancy for the loaded camps from active stays.
    await q(`UPDATE rooms r SET current_occupancy = LEAST(s.n, r.max_capacity),
        status = (CASE WHEN s.n = 0 THEN 'vacant' WHEN s.n >= r.max_capacity THEN 'occupied' ELSE 'partially_occupied' END)::room_status
      FROM (SELECT r2.id, count(a.employee_id)::int n FROM rooms r2 LEFT JOIN (${ACTIVE}) a ON a.room_id = r2.id WHERE r2.camp_id = ANY($1) GROUP BY r2.id) s
      WHERE s.id = r.id AND r.status <> 'under_maintenance'`, [campIds]);

    // Reconcile DB against the transformed model.
    const counts = await q(`SELECT c.id, count(DISTINCT b.id)::int blocks, count(r.id)::int rooms, COALESCE(sum(r.max_capacity), 0)::int beds, COALESCE(sum(r.current_occupancy), 0)::int occupied
      FROM camps c LEFT JOIN rooms r ON r.camp_id = c.id LEFT JOIN buildings b ON b.id = r.building_id WHERE c.id = ANY($1) GROUP BY c.id`, [campIds]);
    const skipped = new Set(elsewhere.map(r => r.employee_id));
    const recon: Row[] = [['Camp', 'Check', 'Source (transformed)', 'Database', 'OK']];
    let ok = true;
    for (const camp of m.camps) {
      const d = counts.find(r => r.id === campId.get(camp))!;
      const src = {
        blocks: m.buildings.filter(b => b.camp === camp).length,
        rooms: m.rooms.filter(r => r.camp === camp).length,
        beds: m.rooms.filter(r => r.camp === camp).reduce((a, r) => a + r.capacity, 0),
        occupied: m.employees.filter(e => e.camp === camp && !skipped.has(e.employee_id)).length,
      };
      for (const k of Object.keys(src) as (keyof typeof src)[]) {
        const pass = src[k] === d[k];
        ok &&= pass;
        recon.push([camp, k, src[k], d[k], pass ? 'yes' : 'NO']);
      }
    }
    console.table(recon.slice(1).map(([camp, check, source, database, pass]) => ({ camp, check, source, database, pass })));
    console.log(`New stays: ${newIds.length}, residents kept in another room: ${elsewhere.length}, rejects: ${m.rejects.length}`);
    if (!ok) throw Object.assign(new Error('Reconciliation mismatch — rolled back'), { recon });
    await q(COMMIT ? 'COMMIT' : 'ROLLBACK');
    console.log(COMMIT ? 'Committed.' : 'Dry run complete — rolled back. Re-run with --commit to load.');
    return recon;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

function writeReport(m: Model, recon: Row[]) {
  const out = path.join(ROOT, 'etl-output', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(out, { recursive: true });
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(m.appMaster)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(m.rejects), 'Rejects');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(recon), 'Reconciliation');
  const file = path.join(out, 'App Master (generated).xlsx');
  XLSX.writeFile(wb, file);
  console.log(`Report: ${file}`);
}

(async () => {
  const { inputs, vendorBySap } = extract();
  const m = buildModel(inputs, vendorBySap, AS_OF);
  console.log(`Transformed: ${m.camps.length} camps, ${m.buildings.length} blocks, ${m.rooms.length} rooms, ${m.employees.length} residents, ${m.rejects.length} rejects`);
  let recon: Row[] = [];
  try {
    recon = await load(m);
  } catch (e: any) {
    recon = e.recon ?? [['Error', e.message]];
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    writeReport(m, recon);
    await pool.end();
  }
})();
