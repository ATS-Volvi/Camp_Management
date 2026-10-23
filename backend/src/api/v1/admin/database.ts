import Database from '../../../../config/dbConn';

class AdminDatabase {
    static async getAllUsers() {
        const pool = Database.getPool();
        const query = `
            SELECT u.id, u.email, u.created_at, p.full_name, p.display_name, p.is_disabled,
                   (SELECT json_agg(role) FROM public.user_roles WHERE user_id = u.id) as roles
            FROM public.app_users u
            LEFT JOIN public.profiles p ON u.id = p.user_id
            ORDER BY u.created_at DESC
        `;
        const { rows } = await pool.query(query);
        return rows;
    }

    static async createUserTransaction(data: any) {
        const { email, full_name, role, passwordHash } = data;
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const userRes = await client.query(
                'INSERT INTO public.app_users (email, password_hash) VALUES ($1, $2) RETURNING id',
                [email, passwordHash]
            );
            const userId = userRes.rows[0].id;

            await client.query(
                'INSERT INTO auth.users (id, email) VALUES ($1, $2)',
                [userId, email]
            );

            await client.query(
                'INSERT INTO public.profiles (user_id, email, full_name, display_name) VALUES ($1, $2, $3, $3)',
                [userId, email, full_name]
            );

            await client.query(
                'INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2)',
                [userId, role]
            );

            await client.query('COMMIT');
            return userId;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async updateUserStatus(userId: string, isDisabled: boolean) {
        const pool = Database.getPool();
        await pool.query(
            'UPDATE public.profiles SET is_disabled = $1 WHERE user_id = $2',
            [isDisabled, userId]
        );
        return true;
    }

    static async updateUserRole(userId: string, newRole: string) {
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM public.user_roles WHERE user_id = $1', [userId]);
            await client.query('INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2)', [userId, newRole]);
            await client.query('COMMIT');
            return true;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async updatePassword(userId: string, passwordHash: string) {
        const pool = Database.getPool();
        await pool.query('UPDATE public.app_users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
        return true;
    }

    static async getAuditLogs() {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            'SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT 500'
        );
        return rows;
    }
}

export default AdminDatabase;
