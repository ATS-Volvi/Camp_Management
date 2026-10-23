import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrationAndSeed() {
    const migrationPath = path.join(__dirname, '../../../database/migrations/20260428120400_maintenance_enhancements.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);

        // Seed some external vendors
        const vendors = [
            { name: 'FastFix Plumbing', category: 'Plumbing', contact_person: 'Bob Builder', phone: '555-0101', email: 'bob@fastfix.com' },
            { name: 'ElectroPro Services', category: 'Electrical', contact_person: 'Sparky Mike', phone: '555-0102', email: 'mike@electropro.com' },
            { name: 'CoolAir HVAC', category: 'HVAC', contact_person: 'Chilly Willy', phone: '555-0103', email: 'willy@coolair.com' }
        ];

        for (const v of vendors) {
            await client.query(
                `INSERT INTO external_vendors (name, category, contact_person, phone, email) 
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT DO NOTHING`,
                [v.name, v.category, v.contact_person, v.phone, v.email]
            );
        }

        await client.query('COMMIT');
        console.log('Migration for maintenance enhancements and vendor seeding executed successfully!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

runMigrationAndSeed();
