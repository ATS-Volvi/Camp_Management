import { pool } from '../lib/db.js';

async function checkData() {
    try {
        const res = await pool.query('SELECT count(*) FROM employees');
        console.log(`Employee count: ${res.rows[0].count}`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkData();
