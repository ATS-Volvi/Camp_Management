import Database from '../../../../config/dbConn';

class EmployeesDatabase {
    static async getAllEmployees(filters: any = {}) {
        const pool = Database.getPool();
        let query = 'SELECT * FROM employees';
        const values: any[] = [];
        const where: string[] = [];

        if (filters.employee_type) {
            values.push(filters.employee_type);
            where.push(`employee_type = $${values.length}`);
        }

        if (where.length > 0) {
            query += ' WHERE ' + where.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async getEmployeeById(id: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
        return rows[0];
    }

    static async createEmployee(emp: any) {
        const pool = Database.getPool();
        const keys = Object.keys(emp).filter(k => emp[k] !== undefined);
        const values = keys.map(k => emp[k]);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const { rows } = await pool.query(
            `INSERT INTO employees (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            values
        );
        return rows[0];
    }

    static async updateEmployee(id: string, updates: any) {
        const pool = Database.getPool();
        const keys = Object.keys(updates).filter(k => updates[k] !== undefined);
        const setString = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = [id, ...keys.map(k => updates[k])];

        const { rows } = await pool.query(
            `UPDATE employees SET ${setString}, updated_at = NOW() WHERE id = $1 RETURNING *`,
            values
        );
        return rows[0];
    }

    static async changePresenceStatus(employeeId: string, newStatus: string, reason?: string, changedBy?: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            `SELECT public.change_presence_status($1, $2::public.presence_status, $3, $4) AS log_id`,
            [employeeId, newStatus, reason || null, changedBy || null]
        );
        return rows[0]?.log_id;
    }

    static async createStaffLoginTransaction(data: any) {
        const { userId, email, passwordHash, appRole, employeeId, fullName } = data;
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                'INSERT INTO public.app_users (id, email, password_hash) VALUES ($1, $2, $3)',
                [userId, email, passwordHash]
            );

            await client.query(
                'INSERT INTO auth.users (id, email) VALUES ($1, $2)',
                [userId, email]
            );

            await client.query(
                'INSERT INTO public.profiles (user_id, email, full_name, display_name) VALUES ($1, $2, $3, $3)',
                [userId, email, fullName]
            );

            await client.query(
                'INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2)',
                [userId, appRole]
            );

            await client.query(
                'UPDATE employees SET user_id = $1, email = $2 WHERE id = $3',
                [userId, email, employeeId]
            );

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

export default EmployeesDatabase;
