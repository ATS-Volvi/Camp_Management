// Self-check for the camp ETL transform. Run: npm run etl:check -w backend
import assert from 'node:assert/strict';
import { buildModel, excelDate, normCategory, normFloor, normPhone, normRoom, Row } from './etl-camp-transform';

assert.equal(excelDate(45362), '2024-03-11');
assert.equal(excelDate('46317'), '2026-10-22');
assert.equal(excelDate('#N/A'), null);
assert.equal(normCategory('6X1'), '6x1');
assert.equal(normCategory('6x1 small'), '6x1');
assert.equal(normCategory('6 X 1'), '6x1');
assert.equal(normCategory(''), null);
assert.equal(normRoom('B - 222'), 'B-222');
assert.deepEqual(['G', 'F', 'S', 'E'].map(normFloor), [1, 2, 3, null]);
assert.equal(normPhone('539576162'), '0539576162');
assert.equal(normPhone('0597682181'), '0597682181');

const H = ['SL', 'CAMP NO.', 'Room No.', 'Block No.', 'Floor', 'Category', ' Status', 'Locations', 'SAP ID', 'Iqama Number ', 'Mobile Number',
  'Personnel Name', 'Nationality', 'Position Description', 'Division', 'Asper SAP Department', 'Employee Group', 'Check-in ', 'Departure date'];
const bed = (room: string, floor: string, cat: string, status: string, sap: string, name: string, checkIn: Row[number], dep: Row[number] = null, extra: Partial<Record<number, string>> = {}): Row => {
  const r: Row = [1, 'CAMP-04', room, `${room.split('-')[0]} BLOCK`, floor, cat, status, null, sap, '2558294969', '539576162', name, 'INDIAN', 'Helper', 'PMTA', 'PMTA', 'Expat/ Permanent', checkIn, dep];
  Object.entries(extra).forEach(([i, v]) => (r[Number(i)] = v));
  return r;
};
const camp04: Row[] = [
  [null, null, null, null, null, null, 'Expertise ID'], // banner rows above the header, as in Camp-04
  [null, null, null, null, null, null, null, ' New ARIVAL'],
  H,
  bed('A-02', 'G', '6x1', 'Active', '11015361', 'Sujan B K', 45738),
  bed('A-02', 'G', '6X1', 'On-Vacation', '13001866', 'Roshan', 46106, 46000), // departure before check-in → clamped
  bed('A-02', 'G', '', 'NBTC BOOKED', '', '', null, null, { 16: 'NBTC BOOKED' }), // placeholder → vacant bed
  bed('A-03', 'E', '3x1', 'On-site', '11009837', 'Dup Older', 45000, 46300, { 7: 'YANBU' }),
  bed('A-03', 'F', '3x1', 'No food', '', '', null),
  bed('A-03', 'F', '6x1 small', '', '22222222', 'Future', 47000), // future check-in → as-of
  bed('A-04', 'G', '6x1', 'Active', 'EL4407292', 'Meng Jin', 46000), // passport number as ID → resident
];
const camp01: Row[] = [H.map(h => (h === ' Status' ? 'Employment Status' : h === 'Block No.' ? 'Block Number' : h)),
  bed('A-04', 'G', '3x1', 'On-vacation', '11009837', 'Dup Newer', 45362, 46317)].map(r => r.map(c => (c === 'CAMP-04' ? 'CAMP-01' : c)));

const m = buildModel([{ camp: 'CAMP-04', rows: camp04 }, { camp: 'CAMP-01', rows: camp01 }], new Map([['11015361', 'Mubarak Al Buainain Cont']]), '2026-10-26');
const room = (k: string) => m.rooms.find(r => `${r.camp} ${r.room}` === k)!;
assert.deepEqual(room('CAMP-04 A-02'), { camp: 'CAMP-04', block: 'A BLOCK', room: 'A-02', floor: 1, category: '6x1', capacity: 3 }, 'capacity = bed rows, placeholder bed kept');
assert.deepEqual([room('CAMP-04 A-03').floor, room('CAMP-04 A-03').category], [2, '3x1'], 'majority floor/category; E ignored');
assert.equal(m.employees.length, 5, 'placeholders skipped, duplicate SAP collapsed');
const emp = (sap: string) => m.employees.find(e => e.employee_id === sap)!;
assert.equal(emp('11009837').camp, 'CAMP-01', 'duplicate SAP keeps latest check-in');
assert.equal(emp('11009837').leave_start, '2026-10-22');
assert.equal(emp('13001866').leave_start, '2026-03-25', 'leave start clamped to check-in');
assert.equal(emp('22222222').check_in, '2026-10-26', 'future check-in → as-of');
assert.equal(emp('22222222').food_required, true);
assert.equal(emp('11015361').supplier_name, 'Mubarak Al Buainain Cont');
assert.equal(emp('11015361').nationality, 'India');
assert.deepEqual(m.buildings.map(b => [b.camp, b.name, b.floors]).sort(), [['CAMP-01', 'A BLOCK', 1], ['CAMP-04', 'A BLOCK', 2]]);
const issues = m.rejects.map(r => r.issue).join('\n');
for (const re of [/Placeholder "NBTC BOOKED"/, /Duplicate SAP ID; kept CAMP-01 A-04/, /Future check-in/, /before check-in/, /Unknown floor "E"/, /6x1 small/])
  assert.match(issues, re);
assert.equal(m.appMaster['Camp Master'].length, 1 + 8, 'one Camp Master row per bed');
console.log(`etl-camp-transform check passed (${m.rejects.length} rejects logged)`);
