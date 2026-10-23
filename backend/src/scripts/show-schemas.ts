import { pool } from '../lib/db.js';

async function run() {
  const tables = ['camps', 'rooms', 'employees', 'check_ins', 'check_outs', 'maintenance_tickets', 'audit_logs', 'camp_utilities', 'violations'];
  for (const t of tables) {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [t]);
    console.log('=== ' + t + ' ===');
    console.log(res.rows.map((r: any) => `${r.column_name} (${r.data_type})`).join(', '));
  }
  process.exit(0);
}
run();
