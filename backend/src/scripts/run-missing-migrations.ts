import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMissingMigrations() {
    const migrationsDir = path.join(__dirname, '../../../database/migrations');
    const files = [
        '20260427120000_create_violations.sql',
        '20260427120100_create_room_change_requests.sql',
        '20260427120200_create_camp_transfer_requests.sql'
    ];

    const client = await pool.connect();
    try {
        for (const file of files) {
            console.log(`Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
            console.log(` - Success: ${file}`);
        }
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

runMissingMigrations();
