import { pool } from '../lib/db.js';

async function checkSchema() {
    const client = await pool.connect();
    try {
        const r = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'assets' 
            ORDER BY ordinal_position
        `);
        if (r.rows.length === 0) {
            console.log('assets table does not exist');
        } else {
            console.log('assets table columns:', JSON.stringify(r.rows, null, 2));
        }

        const r2 = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'item_assignments' 
            ORDER BY ordinal_position
        `);
        console.log('item_assignments columns:', JSON.stringify(r2.rows, null, 2));
    } finally {
        client.release();
        process.exit();
    }
}
checkSchema();
