import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { variables } from '../../../../config/envLoader';
import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import AuthDatabase from './database';

const JWT_SECRET = variables.JWT_SECRET || 'change_this_secret_in_production';
const SALT_ROUNDS = 10;

class AuthService {
    static async login(data: any, next: NextFunction) {
        const { email, password } = data;
        try {
            const user = await AuthDatabase.getUserByEmail(email);
            if (!user) {
                return next(createError({ status: 401, message: 'Invalid credentials' }));
            }

            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                return next(createError({ status: 401, message: 'Invalid credentials' }));
            }

            const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            return { access_token: token, user: { id: user.id, email: user.email } };
        } catch (err: any) {
            console.error('Login error:', err);
            return next(createError({ status: 500, message: 'Server error' }));
        }
    }

    static async signup(data: any, next: NextFunction) {
        const { email, password } = data;
        try {
            const existing = await AuthDatabase.getUserByEmail(email);
            if (existing) {
                return next(createError({ status: 409, message: 'User already exists' }));
            }

            const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
            const user = await AuthDatabase.createUser(email, password_hash);

            const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            return { access_token: token, user: { id: user.id, email: user.email } };
        } catch (err: any) {
            console.error('Register error:', err);
            return next(createError({ status: 500, message: 'Server error' }));
        }
    }

    static async getMe(authHeader: string | undefined, next: NextFunction) {
        if (!authHeader?.startsWith('Bearer ')) {
            return next(createError({ status: 401, message: 'Unauthorized' }));
        }
        try {
            const token = authHeader.slice(7);
            const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
            return { user: { id: payload.sub, email: payload.email } };
        } catch {
            return next(createError({ status: 401, message: 'Invalid token' }));
        }
    }

    static async changePassword(data: any, next: NextFunction) {
        const { userId, newPassword } = data;
        try {
            const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
            await AuthDatabase.updatePassword(userId, password_hash);
            return { message: 'Password updated' };
        } catch (err: any) {
            return next(createError({ status: 500, message: 'Server error' }));
        }
    }
}

export default AuthService;
