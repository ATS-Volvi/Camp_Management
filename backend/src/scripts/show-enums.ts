import { pool } from '../lib/db.js';

async function run() {
  const res = await pool.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    ORDER BY t.typname, e.enumsortorder;
  `);
  console.log('Enums in DB:');
  const enums: Record<string, string[]> = {};
  for (const r of res.rows) {
    if (!enums[r.typname]) enums[r.typname] = [];
    enums[r.typname].push(r.enumlabel);
  }
  for (const [name, vals] of Object.entries(enums)) {
    console.log(`${name}: [${vals.join(', ')}]`);
  }
  process.exit(0);
}
run();
