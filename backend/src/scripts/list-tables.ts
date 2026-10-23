import { pool } from '../lib/db.js';

async function listTables() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('Tables in database:');
        res.rows.forEach(row => console.log(` - ${row.table_name}`));
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
listTables();
