import Database from '../../../../config/dbConn';

class PurchaseOrdersDatabase {
    static async getPurchaseOrders(filters: any) {
        const pool = Database.getPool();
        const { camp_id } = filters;
        let query = `
            SELECT po.*, json_build_object('name', c.name) as camps
            FROM purchase_orders po
            LEFT JOIN camps c ON po.camp_id = c.id
        `;
        const values: any[] = [];
        if (camp_id) {
            values.push(camp_id);
            query += ` WHERE po.camp_id = $${values.length}`;
        }
        query += ` ORDER BY po.created_at DESC LIMIT 100`;
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async getPurchaseOrderItems(poId: string) {
        const pool = Database.getPool();
        const query = `
            SELECT pi.*, json_build_object('name', i.name, 'unit', i.unit, 'category', i.category) as ingredients
            FROM purchase_order_items pi
            LEFT JOIN ingredients i ON pi.ingredient_id = i.id
            WHERE pi.po_id = $1
        `;
        const { rows } = await pool.query(query, [poId]);
        return rows;
    }

    static async receivePurchaseOrderTransaction(data: any) {
        const { poId, campId, items } = data;
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const item of items) {
                await client.query(
                    `UPDATE purchase_order_items SET received_qty = $1 WHERE id = $2`,
                    [item.received_qty, item.id]
                );

                const stockRes = await client.query(
                    `SELECT id, stock_in FROM catering_stock WHERE camp_id = $1 AND ingredient_id = $2`,
                    [campId, item.ingredient_id]
                );

                if (stockRes.rows.length > 0) {
                    const existing = stockRes.rows[0];
                    await client.query(
                        `UPDATE catering_stock SET stock_in = $1 WHERE id = $2`,
                        [(existing.stock_in || 0) + item.received_qty, existing.id]
                    );
                } else {
                    await client.query(
                        `INSERT INTO catering_stock (camp_id, ingredient_id, stock_in, min_level) 
                         VALUES ($1, $2, $3, 5)`,
                        [campId, item.ingredient_id, item.received_qty]
                    );
                }
            }

            await client.query(`UPDATE purchase_orders SET status = 'received' WHERE id = $1`, [poId]);

            await client.query('COMMIT');
            return true;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

export default PurchaseOrdersDatabase;
