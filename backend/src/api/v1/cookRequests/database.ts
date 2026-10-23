import Database from '../../../../config/dbConn';

class CookRequestsDatabase {
    static async getCookRequests(filters: any) {
        const pool = Database.getPool();
        const { camp_id, status } = filters;
        let query = `
            SELECT r.*, json_build_object('name', c.name) as camps
            FROM cook_requests r
            LEFT JOIN camps c ON r.camp_id = c.id
        `;
        const values: any[] = [];
        const conditions: string[] = [];

        if (camp_id) {
            values.push(camp_id);
            conditions.push(`r.camp_id = $${values.length}`);
        }
        if (status) {
            values.push(status);
            conditions.push(`r.status = $${values.length}`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(' AND ');
        }

        query += ` ORDER BY r.created_at DESC LIMIT 100`;
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async getCookRequestItems(requestId: string) {
        const pool = Database.getPool();
        const query = `
            SELECT ri.*, json_build_object('name', i.name, 'unit', i.unit, 'category', i.category, 'unit_cost', i.unit_cost) as ingredients
            FROM cook_request_items ri
            LEFT JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE ri.request_id = $1
        `;
        const { rows } = await pool.query(query, [requestId]);
        return rows;
    }

    static async createCookRequestTransaction(data: any) {
        const { request, items } = data;
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const reqKeys = Object.keys(request);
            const reqParams = reqKeys.map((_, i) => `$${i + 1}`).join(',');
            const { rows } = await client.query(
                `INSERT INTO cook_requests (${reqKeys.join(',')}) VALUES (${reqParams}) RETURNING *`,
                Object.values(request)
            );
            const newReq = rows[0];

            if (items && items.length > 0) {
                for (const item of items) {
                    const itemData = { ...item, request_id: newReq.id };
                    const itemKeys = Object.keys(itemData);
                    const itemParams = itemKeys.map((_, i) => `$${i + 1}`).join(',');
                    await client.query(
                        `INSERT INTO cook_request_items (${itemKeys.join(',')}) VALUES (${itemParams})`,
                        Object.values(itemData)
                    );
                }
            }

            await client.query('COMMIT');
            return newReq;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async issueCookRequestTransaction(data: any) {
        const { requestId, campId, items, issuedBy } = data;
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const item of items) {
                await client.query(
                    `UPDATE cook_request_items SET issued_qty = $1 WHERE id = $2`,
                    [item.issued_qty, item.id]
                );

                const stockRes = await client.query(
                    `SELECT id, stock_out FROM catering_stock WHERE camp_id = $1 AND ingredient_id = $2`,
                    [campId, item.ingredient_id]
                );
                if (stockRes.rows.length > 0) {
                    const existing = stockRes.rows[0];
                    await client.query(
                        `UPDATE catering_stock SET stock_out = $1 WHERE id = $2`,
                        [(existing.stock_out || 0) + item.issued_qty, existing.id]
                    );
                }
            }

            const { rows: allItems } = await client.query(
                `SELECT approved_qty, issued_qty, required_qty FROM cook_request_items WHERE request_id = $1`,
                [requestId]
            );

            const allFullyIssued = allItems.every(i => (i.issued_qty || 0) >= (i.approved_qty || i.required_qty || 0));
            const newStatus = allFullyIssued ? 'completed' : 'partially_issued';

            await client.query(
                `UPDATE cook_requests SET status = $1, issued_by = $2, issued_at = NOW() WHERE id = $3`,
                [newStatus, issuedBy, requestId]
            );

            const shortItems: any[] = [];
            for (const item of items) {
                const stockRes = await client.query(
                    `SELECT s.*, i.unit_cost FROM catering_stock s 
                     LEFT JOIN ingredients i ON s.ingredient_id = i.id 
                     WHERE s.camp_id = $1 AND s.ingredient_id = $2`,
                    [campId, item.ingredient_id]
                );
                if (stockRes.rows.length > 0) {
                    const stock = stockRes.rows[0];
                    const balance = (stock.stock_in || 0) - (stock.stock_out || 0);
                    if (balance <= (stock.min_level || 0)) {
                        const required = (stock.min_level || 5) * 2 - balance;
                        shortItems.push({
                            ingredient_id: item.ingredient_id,
                            required_qty: required,
                            ordered_qty: required,
                            unit_cost: stock.unit_cost || 0,
                            total_cost: required * (stock.unit_cost || 0)
                        });
                    }
                }
            }

            if (shortItems.length > 0) {
                const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
                const totalAmount = shortItems.reduce((s, i) => s + i.total_cost, 0);
                const poRes = await client.query(
                    `INSERT INTO purchase_orders (camp_id, po_number, status, total_amount, created_by, notes) 
                     VALUES ($1, $2, 'draft', $3, $4, 'Auto-generated due to low stock after cook request issuance') RETURNING id`,
                    [campId, poNumber, totalAmount, issuedBy]
                );
                const poId = poRes.rows[0].id;

                for (const poItem of shortItems) {
                    const poItemData = { ...poItem, po_id: poId };
                    const keys = Object.keys(poItemData);
                    const params = keys.map((_, i) => `$${i + 1}`).join(',');
                    await client.query(`INSERT INTO purchase_order_items (${keys.join(',')}) VALUES (${params})`, Object.values(poItemData));
                }
            }

            await client.query('COMMIT');
            return { status: newStatus, shortItemsCount: shortItems.length };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

export default CookRequestsDatabase;
