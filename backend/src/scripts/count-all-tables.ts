import { pool } from '../lib/db.js';

async function countAll() {
    const client = await pool.connect();
    try {
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('Row counts:');
        for (const row of tablesRes.rows) {
            const t = row.table_name;
            try {
                const countRes = await client.query(`SELECT count(*) FROM "${t}"`);
                const cnt = parseInt(countRes.rows[0].count, 10);
                if (cnt > 0) {
                    console.log(` ✓ ${t}: ${cnt}`);
                } else {
                    console.log(`   ${t}: 0`);
                }
            } catch (err: any) {
                console.log(` ! ${t}: error (${err.message})`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
countAll();
