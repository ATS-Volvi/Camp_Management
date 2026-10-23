import { pool } from '../lib/db.js';
async function test() {
    try {
        const res = await pool.query('SELECT count(*) FROM menu_dishes');
        console.log('Menu dishes count:', res.rows[0].count);
        const res2 = await pool.query('SELECT count(*) FROM ingredients');
        console.log('Ingredients count:', res2.rows[0].count);
        const res3 = await pool.query('SELECT count(*) FROM menu_dish_ingredients');
        console.log('Ingredient Mappings count:', res3.rows[0].count);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
