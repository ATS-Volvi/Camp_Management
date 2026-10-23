import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const migrationPath = path.join(__dirname, '../../../database/migrations/20260428120600_asset_maintenance_link.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const client = await pool.connect();
    try {
        await client.query(sql);
        console.log('Asset maintenance link migration executed successfully!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

runMigration();
