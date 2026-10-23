import { pool } from '../lib/db.js';
async function test() {
    try {
        const dish = await pool.query("SELECT id, name FROM menu_dishes WHERE name ILIKE '%Bread & Cheese%'");
        console.log('Dish:', dish.rows[0]);
        if (dish.rows[0]) {
            const ings = await pool.query("SELECT count(*) FROM menu_dish_ingredients WHERE dish_id = $1", [dish.rows[0].id]);
            console.log('Ingredient count for dish:', ings.rows[0].count);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
