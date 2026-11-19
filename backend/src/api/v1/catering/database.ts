import Database from '../../../../config/dbConn';

class CateringDatabase {
    static async getIngredients() {
        const pool = Database.getPool();
        const { rows } = await pool.query('SELECT * FROM ingredients ORDER BY category, name');
        return rows;
    }

    static async saveIngredient(item: any) {
        const pool = Database.getPool();
        if (item.id) {
            const { id, ...rest } = item;
            const setString = Object.keys(rest).map((k, i) => `${k} = $${i + 2}`).join(', ');
            const { rows } = await pool.query(
                `UPDATE ingredients SET ${setString} WHERE id = $1 RETURNING *`,
                [id, ...Object.values(rest)]
            );
            return rows[0];
        } else {
            const keys = Object.keys(item);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
            const { rows } = await pool.query(
                `INSERT INTO ingredients (${keys.join(',')}) VALUES (${placeholders}) RETURNING *`,
                Object.values(item)
            );
            return rows[0];
        }
    }

    static async getMealMenuTemplates(mealType: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT m.*,
                   COALESCE(
                       json_agg(
                           json_build_object('name', i.name, 'unit', i.unit, 'unit_cost', i.unit_cost, 'category', i.category)
                       ) FILTER (WHERE i.id IS NOT NULL), '[]'
                   ) as ingredients
            FROM meal_menu_templates m
            LEFT JOIN menu_dish_ingredients mdi ON m.id = mdi.dish_id
            LEFT JOIN ingredients i ON mdi.ingredient_id = i.id
            WHERE m.is_active = true
        `;
        const values: any[] = [];
        if (mealType) {
            values.push(mealType);
            query += ` AND m.meal_type = $${values.length}`;
        }
        query += ` GROUP BY m.id ORDER BY m.meal_type`;

        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async getGroceryRequests(campId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT r.*, json_build_object('name', c.name) as camps
            FROM grocery_requests r
            LEFT JOIN camps c ON r.camp_id = c.id
        `;
        const values: any[] = [];
        if (campId) {
            values.push(campId);
            query += ` WHERE r.camp_id = $${values.length}`;
        }
        query += ` ORDER BY r.created_at DESC LIMIT 50`;
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async createGroceryRequestTransaction(data: any) {
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { request, items } = data;

            const reqKeys = Object.keys(request);
            const reqParams = reqKeys.map((_, i) => `$${i + 1}`).join(',');
            const result = await client.query(
                `INSERT INTO grocery_requests (${reqKeys.join(',')}) VALUES (${reqParams}) RETURNING *`,
                Object.values(request)
            );
            const newReqId = result.rows[0].id;

            if (items && items.length > 0) {
                for (const item of items) {
                    const itemKeys = ['request_id', ...Object.keys(item)];
                    const itemVals = [newReqId, ...Object.values(item)];
                    const itemParams = itemKeys.map((_, i) => `$${i + 1}`).join(',');
                    await client.query(`INSERT INTO grocery_request_items (${itemKeys.join(',')}) VALUES (${itemParams})`, itemVals);
                }
            }

            await client.query('COMMIT');
            return result.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getCateringGRNs(campId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT g.*, json_build_object('name', c.name) as camps
            FROM catering_grn g
            LEFT JOIN camps c ON g.camp_id = c.id
        `;
        const values: any[] = [];
        if (campId) {
            values.push(campId);
            query += ` WHERE g.camp_id = $${values.length}`;
        }
        query += ` ORDER BY g.grn_date DESC LIMIT 50`;
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async createCateringGRNTransaction(data: any) {
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { grn, items } = data;

            const grnKeys = Object.keys(grn);
            const grnParams = grnKeys.map((_, i) => `$${i + 1}`).join(',');
            const result = await client.query(
                `INSERT INTO catering_grn (${grnKeys.join(',')}) VALUES (${grnParams}) RETURNING *`,
                Object.values(grn)
            );
            const newGrnId = result.rows[0].id;

            if (items && items.length > 0) {
                for (const item of items) {
                    const itemKeys = ['grn_id', ...Object.keys(item)];
                    const itemVals = [newGrnId, ...Object.values(item)];
                    const itemParams = itemKeys.map((_, i) => `$${i + 1}`).join(',');
                    await client.query(`INSERT INTO catering_grn_items (${itemKeys.join(',')}) VALUES (${itemParams})`, itemVals);

                    const stockCheck = await client.query(
                        `SELECT id, stock_in FROM catering_stock WHERE camp_id = $1 AND ingredient_id = $2`,
                        [grn.camp_id, item.ingredient_id]
                    );
                    if (stockCheck.rows.length > 0) {
                        const existing = stockCheck.rows[0];
                        await client.query(
                            `UPDATE catering_stock SET stock_in = $1 WHERE id = $2`,
                            [(existing.stock_in || 0) + item.quantity, existing.id]
                        );
                    } else {
                        await client.query(
                            `INSERT INTO catering_stock (camp_id, ingredient_id, stock_in, min_level) VALUES ($1, $2, $3, $4)`,
                            [grn.camp_id, item.ingredient_id, item.quantity, 5]
                        );
                    }
                }
            }

            await client.query('COMMIT');
            return result.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getCateringIssues(campId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT i.*, json_build_object('name', c.name) as camps
            FROM catering_issues i
            LEFT JOIN camps c ON i.camp_id = c.id
        `;
        const values: any[] = [];
        if (campId) {
            values.push(campId);
            query += ` WHERE i.camp_id = $${values.length}`;
        }
        query += ` ORDER BY i.issue_date DESC LIMIT 50`;
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async createCateringIssueTransaction(data: any) {
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { issue, items } = data;

            const issueKeys = Object.keys(issue);
            const issueParams = issueKeys.map((_, i) => `$${i + 1}`).join(',');
            const result = await client.query(
                `INSERT INTO catering_issues (${issueKeys.join(',')}) VALUES (${issueParams}) RETURNING *`,
                Object.values(issue)
            );
            const newIssueId = result.rows[0].id;

            if (items && items.length > 0) {
                for (const item of items) {
                    const itemKeys = ['issue_id', ...Object.keys(item)];
                    const itemVals = [newIssueId, ...Object.values(item)];
                    const itemParams = itemKeys.map((_, i) => `$${i + 1}`).join(',');
                    await client.query(`INSERT INTO catering_issue_items (${itemKeys.join(',')}) VALUES (${itemParams})`, itemVals);

                    const stockCheck = await client.query(
                        `SELECT id, stock_out FROM catering_stock WHERE camp_id = $1 AND ingredient_id = $2`,
                        [issue.camp_id, item.ingredient_id]
                    );
                    if (stockCheck.rows.length > 0) {
                        const existing = stockCheck.rows[0];
                        await client.query(
                            `UPDATE catering_stock SET stock_out = $1 WHERE id = $2`,
                            [(existing.stock_out || 0) + item.issued_qty, existing.id]
                        );
                    }
                }
            }

            if (issue.request_id) {
                await client.query(`UPDATE grocery_requests SET status = 'issued' WHERE id = $1`, [issue.request_id]);
            }

            await client.query('COMMIT');
            return result.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getCampOccupancy(campId: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            'SELECT COALESCE(SUM(current_occupancy), 0) as occupancy FROM rooms WHERE camp_id = $1',
            [campId]
        );
        return { occupancy: parseInt(rows[0].occupancy) };
    }

    static async getCostSummary(campId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT i.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'issued_qty', ci.issued_qty, 
                               'unit_cost', ci.unit_cost, 
                               'ingredients', json_build_object('name', ing.name, 'category', ing.category)
                           )
                       ) FILTER (WHERE ci.id IS NOT NULL), '[]'
                   ) as catering_issue_items
            FROM catering_issues i
            LEFT JOIN catering_issue_items ci ON i.id = ci.issue_id
            LEFT JOIN ingredients ing ON ci.ingredient_id = ing.id
        `;
        const values: any[] = [];
        if (campId) {
            values.push(campId);
            query += ` WHERE i.camp_id = $${values.length}`;
        }
        query += ` GROUP BY i.id ORDER BY i.issue_date DESC LIMIT 100`;
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async getWeeklyMenuConfig(campId: string | undefined, isActive: boolean | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT w.*, 
                   json_build_object('id', m.id, 'name', m.name, 'description', m.description, 'meal_type', m.meal_type) as menu_dishes
            FROM weekly_menu_config w
            LEFT JOIN meal_menu_templates m ON w.menu_dish_id = m.id
        `;
        const values: any[] = [];
        const where: string[] = [];
        if (campId) {
            values.push(campId);
            where.push(`w.camp_id = $${values.length}`);
        }
        if (isActive !== undefined) {
            values.push(isActive);
            where.push(`w.is_active = $${values.length}`);
        }
        if (where.length > 0) {
            query += ' WHERE ' + where.join(' AND ');
        }
        query += ` ORDER BY w.day_of_week, w.meal_type, w.sort_order`;
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async saveWeeklyMenuConfig(item: any) {
        const pool = Database.getPool();
        if (item.id) {
            const { id, ...rest } = item;
            const setString = Object.keys(rest).map((k, i) => `${k} = $${i + 2}`).join(', ');
            const { rows } = await pool.query(
                `UPDATE weekly_menu_config SET ${setString} WHERE id = $1 RETURNING *`,
                [id, ...Object.values(rest)]
            );
            return rows[0];
        } else {
            const keys = Object.keys(item);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
            const { rows } = await pool.query(
                `INSERT INTO weekly_menu_config (${keys.join(',')}) VALUES (${placeholders}) RETURNING *`,
                Object.values(item)
            );
            return rows[0];
        }
    }

    static async deleteWeeklyMenuConfig(id: string) {
        const pool = Database.getPool();
        await pool.query('DELETE FROM weekly_menu_config WHERE id = $1', [id]);
        return true;
    }

    static async deleteWeeklyMenuConfigByDay(campId: string, dayOfWeek: string) {
        const pool = Database.getPool();
        await pool.query('DELETE FROM weekly_menu_config WHERE camp_id = $1 AND day_of_week = $2', [campId, dayOfWeek]);
        return true;
    }
}

export default CateringDatabase;
