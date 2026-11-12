import { pool } from '../lib/db.js';
import fs from 'fs';
import path from 'path';

async function runLockerMigration() {
    const client = await pool.connect();
    try {
        console.log('Running locker migration on Neon DB...');
        const sqlPath = path.resolve(__dirname, '../../../database/migrations/20260507000000_create_camp_lockers.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sql);
        console.log('✓ Successfully created camp_lockers and inmate_locker_assignments tables!');

        // Pre-seed sample lockers for rooms that have occupancy so user can immediately test
        console.log('Checking if default room lockers should be generated...');
        const { rows: existingCount } = await client.query('SELECT count(*)::int AS count FROM camp_lockers');
        if (existingCount[0].count === 0) {
            console.log('Generating default room lockers based on room capacity...');
            const { rows: sampleRooms } = await client.query('SELECT id, camp_id, building_id, room_number, max_capacity FROM rooms LIMIT 50');
            for (const r of sampleRooms) {
                const cap = Math.min(Math.max(r.max_capacity || 4, 1), 6);
                for (let i = 1; i <= cap; i++) {
                    const lckNum = `LCK-${r.room_number}-${i}`;
                    await client.query(`
                        INSERT INTO camp_lockers (camp_id, building_id, room_id, locker_number, key_number, status, condition)
                        VALUES ($1, $2, $3, $4, $5, 'available', 'good')
                        ON CONFLICT (camp_id, locker_number) DO NOTHING
                    `, [r.camp_id, r.building_id, r.id, lckNum, `K-${r.room_number}-${i}`]);
                }
            }
            const { rows: newCount } = await client.query('SELECT count(*)::int AS count FROM camp_lockers');
            console.log(`✓ Generated ${newCount[0].count} ready-to-assign lockers across active rooms!`);
        } else {
            console.log(`Lockers already exist (${existingCount[0].count} lockers).`);
        }
    } catch (err) {
        console.error('Locker migration error:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

runLockerMigration();

