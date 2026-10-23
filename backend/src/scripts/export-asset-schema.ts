import { pool } from '../lib/db.js';
import fs from 'fs';

async function exportSchema() {
    const client = await pool.connect();
    try {
        const r = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('assets', 'item_assignments', 'maintenance_tickets')
            ORDER BY table_name, ordinal_position
        `);
        fs.writeFileSync('asset_schema_export.json', JSON.stringify(r.rows, null, 2));
        console.log('Schema exported to asset_schema_export.json');
    } finally {
        client.release();
        process.exit();
    }
}
exportSchema();
