import Database from '../../../../config/dbConn';

class MenuDishesDatabase {
    static async getDishIngredients(dishId: string) {
        const pool = Database.getPool();
        const query = `
            SELECT mdi.*, json_build_object(
                'name', i.name, 
                'unit', i.unit, 
                'unit_cost', i.unit_cost, 
                'category', i.category
            ) as ingredients
            FROM menu_dish_ingredients mdi
            LEFT JOIN ingredients i ON mdi.ingredient_id = i.id
            WHERE mdi.dish_id = $1
        `;
        const { rows } = await pool.query(query, [dishId]);
        return rows;
    }

    static async deleteDishIngredients(dishId: string) {
        const pool = Database.getPool();
        await pool.query('DELETE FROM menu_dish_ingredients WHERE dish_id = $1', [dishId]);
        return true;
    }
}

export default MenuDishesDatabase;
