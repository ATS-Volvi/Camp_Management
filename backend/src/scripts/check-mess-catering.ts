import { pool } from '../lib/db.js';

async function run() {
  const camps = await pool.query("SELECT id, name FROM camps ORDER BY name");
  console.log('Camps:');
  for (const c of camps.rows) {
    const rooms = await pool.query('SELECT count(*), sum(current_occupancy) as occ, sum(max_capacity) as cap FROM rooms WHERE camp_id = $1', [c.id]);
    const emps = await pool.query('SELECT count(*) FROM employees WHERE camp_id = $1', [c.id]);
    console.log(` - ${c.name} (${c.id}): ${rooms.rows[0].count} rooms, ${rooms.rows[0].occ || 0}/${rooms.rows[0].cap || 0} occ, ${emps.rows[0].count} emps`);
  }
  const issues = await pool.query('SELECT count(*) FROM catering_issues');
  console.log('catering_issues count:', issues.rows[0].count);
  const greq = await pool.query('SELECT count(*), status FROM grocery_requests GROUP BY status');
  console.log('grocery_requests by status:', greq.rows);
  process.exit(0);
}
run();
