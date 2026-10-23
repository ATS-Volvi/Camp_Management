import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { variables } from '../config/envLoader';
import Database from '../config/dbConn';

const JWT_SECRET = variables.JWT_SECRET || 'change_this_secret_in_production';

export interface AuthRequest extends Request {
    userId?: string;
    userEmail?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
        req.userId = payload.sub;
        req.userEmail = payload.email;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

export async function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const pool = Database.getPool();
        if (!pool) {
            console.error('Database pool not initialized');
            return res.status(500).json({ error: 'Internal server error' });
        }
        const result = await pool.query(
            'SELECT role FROM public.user_roles WHERE user_id = $1 AND role = $2',
            [req.userId, 'super_admin']
        );
        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Forbidden: Super Admin required' });
        }
        next();
    } catch (err) {
        console.error('SuperAdmin check error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

