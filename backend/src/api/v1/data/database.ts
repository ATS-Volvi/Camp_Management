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
        const { rows } = await pool.query(
            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
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
        const keys = Object.keys(params);
        if (keys.length === 0) {
            const { rows } = await pool.query(`SELECT public.${fnName}() AS result`);
            return rows[0]?.result;
        }
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => params[k]);
        const { rows } = await pool.query(
            `SELECT public.${fnName}(${placeholders}) AS result`,
            values
        );
        return rows[0]?.result;
    }
}

export default DataDatabase;
