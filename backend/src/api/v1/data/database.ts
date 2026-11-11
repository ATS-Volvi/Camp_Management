import Database from '../../../../config/dbConn';

class DataDatabase {
    static async getData(query: string, values: any[]) {
        const pool = Database.getPool();
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async createData(table: string, keys: string[], values: any[]) {
        const pool = Database.getPool();
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        let onConflict = '';
        if (table === 'camp_meal_rates') {
            const updateCols = keys.filter(k => k !== 'camp_id' && k !== 'id');
            const setClauses = updateCols.map(k => `${k} = EXCLUDED.${k}`).concat('updated_at = now()');
            onConflict = ` ON CONFLICT (camp_id) DO UPDATE SET ${setClauses.join(', ')}`;
        }
        const { rows } = await pool.query(
            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})${onConflict} RETURNING *`,
            values
        );
        return rows[0];
    }

    static async updateData(table: string, id: string, keys: string[], values: any[]) {
        const pool = Database.getPool();
        const setString = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
        const { rows } = await pool.query(
            `UPDATE ${table} SET ${setString} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        return rows[0];
    }

    static async deleteData(table: string, id: string) {
        const pool = Database.getPool();
        await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        return true;
    }

    static async callRpc(fnName: string, params: Record<string, any> = {}) {
        const pool = Database.getPool();

        if (fnName === 'delete_employees') {
            const pIds = params.p_ids || [];
            if (!pIds.length) return 0;
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await client.query('DELETE FROM checkout_reports WHERE employee_id = ANY($1::uuid[])', [pIds]).catch(() => {});
                await client.query('UPDATE visitors SET host_employee_id = NULL WHERE host_employee_id = ANY($1::uuid[])', [pIds]).catch(() => {});
                await client.query('DELETE FROM food_cancellation_requests WHERE employee_id = ANY($1::uuid[])', [pIds]).catch(() => {});
                await client.query('DELETE FROM employee_status_log WHERE employee_id = ANY($1::uuid[])', [pIds]).catch(() => {});
                await client.query('DELETE FROM employee_shift_assignments WHERE employee_id = ANY($1::uuid[])', [pIds]).catch(() => {});
                await client.query('DELETE FROM room_allocation_overrides WHERE employee_id = ANY($1::uuid[])', [pIds]).catch(() => {});
                await client.query('DELETE FROM transfer_requests WHERE employee_id = ANY($1::uuid[])', [pIds]).catch(() => {});
                await client.query('DELETE FROM room_transfers WHERE employee_id = ANY($1::uuid[])', [pIds]).catch(() => {});
                const delRes = await client.query('DELETE FROM employees WHERE id = ANY($1::uuid[])', [pIds]);
                await client.query('COMMIT');
                return delRes.rowCount || 0;
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }

        const keys = Object.keys(params);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => params[k]);

        try {
            const query = placeholders ? `SELECT * FROM public.${fnName}(${placeholders})` : `SELECT * FROM public.${fnName}()`;
            const { rows, fields } = await pool.query(query, values);

            // Table / SETOF returning functions (like get_kitchen_meal_count)
            if (rows.length > 1 || (rows.length === 1 && fields && fields.length > 1)) {
                return rows;
            }
            if (rows.length === 1) {
                const colName = fields[0]?.name;
                return colName === fnName ? rows[0][colName] : rows;
            }
            return rows;
        } catch (err) {
            const fallbackQuery = placeholders ? `SELECT public.${fnName}(${placeholders}) AS result` : `SELECT public.${fnName}() AS result`;
            const { rows } = await pool.query(fallbackQuery, values);
            return rows[0]?.result;
        }
    }
}

export default DataDatabase;
