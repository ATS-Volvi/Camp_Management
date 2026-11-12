import { pool } from '../lib/db.js';
import fs from 'fs';
import path from 'path';

async function runAutoLockerCheckinMigration() {
    const client = await pool.connect();
    try {
        console.log('Updating perform_check_in RPC with automatic locker allocation in Neon DB...');
        const sqlPath = path.resolve(__dirname, '../../../database/migrations/20260507010000_auto_assign_lockers_on_checkin.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sql);
        console.log('✓ Successfully updated perform_check_in function with automatic locker allocation!');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

runAutoLockerCheckinMigration();
