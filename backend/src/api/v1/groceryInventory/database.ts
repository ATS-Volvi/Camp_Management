import Database from '../../../../config/dbConn';

class GroceryInventoryDatabase {
    static async getIngredients(filters: any) {
        const pool = Database.getPool();
        const { search, category } = filters;
        let query = 'SELECT * FROM ingredients WHERE is_active = true';
        const values: any[] = [];
        if (category) {
            values.push(category);
            query += ` AND category = $${values.length}`;
        }
        if (search) {
            values.push(`%${search}%`);
            query += ` AND name ILIKE $${values.length}`;
        }
        query += ' ORDER BY category, name';
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async getPriceHistory(ingredientId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT ph.*, json_build_object('name', i.name, 'unit', i.unit, 'category', i.category) as ingredients
            FROM ingredient_price_history ph
            LEFT JOIN ingredients i ON ph.ingredient_id = i.id
        `;
        const values: any[] = [];
        if (ingredientId) {
            values.push(ingredientId);
            query += ` WHERE ph.ingredient_id = $1`;
        }
        query += ` ORDER BY ph.effective_date DESC LIMIT 200`;
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async addPriceEntryTransaction(entry: any) {
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const keys = Object.keys(entry);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
            await client.query(`INSERT INTO ingredient_price_history (${keys.join(',')}) VALUES (${placeholders})`, Object.values(entry));

            await client.query(`UPDATE ingredients SET unit_cost = $1 WHERE id = $2`, [entry.price, entry.ingredient_id]);

            await client.query('COMMIT');
            return true;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getConsumptionLogs(filters: any) {
        const pool = Database.getPool();
        const { camp_id, date } = filters;
        let query = `
            SELECT l.*, json_build_object('name', i.name, 'unit', i.unit, 'category', i.category) as ingredients,
                   json_build_object('name', c.name) as camps
            FROM catering_consumption_logs l
            LEFT JOIN ingredients i ON l.ingredient_id = i.id
            LEFT JOIN camps c ON l.camp_id = c.id
        `;
        const values: any[] = [];
        const conditions: string[] = [];
        if (camp_id) {
            values.push(camp_id);
            conditions.push(`l.camp_id = $${values.length}`);
        }
        if (date) {
            values.push(date);
            conditions.push(`l.consumption_date = $${values.length}`);
        }
        if (conditions.length > 0) query += ` WHERE ` + conditions.join(' AND ');
        query += ` ORDER BY l.consumption_date DESC LIMIT 200`;
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async getStockSummary(campId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT s.*, json_build_object('name', i.name, 'unit', i.unit, 'category', i.category, 'unit_cost', i.unit_cost, 'reorder_level', i.reorder_level) as ingredients
            FROM catering_stock s
            LEFT JOIN ingredients i ON s.ingredient_id = i.id
        `;
        const values: any[] = [];
        if (campId) {
            values.push(campId);
            query += ` WHERE s.camp_id = $1`;
        }
        query += ` ORDER BY s.updated_at DESC`;
        const { rows } = await pool.query(query, values);
        return rows;
    }
}

export default GroceryInventoryDatabase;
