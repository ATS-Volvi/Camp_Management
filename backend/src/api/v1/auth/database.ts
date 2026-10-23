import Database from '../../../../config/dbConn';

class AuthDatabase {
    static async getUserByEmail(email: string) {
        const pool = Database.getPool();
        const result = await pool.query(
            'SELECT id, email, password_hash FROM public.app_users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }

    static async createUser(email: string, passwordHash: string) {
        const pool = Database.getPool();
        const result = await pool.query(
            'INSERT INTO public.app_users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, passwordHash]
        );
        return result.rows[0];
    }

    static async updatePassword(userId: string, passwordHash: string) {
        const pool = Database.getPool();
        await pool.query('UPDATE public.app_users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
        return true;
    }
}

export default AuthDatabase;
