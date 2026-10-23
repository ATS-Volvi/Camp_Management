import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import bcrypt from 'bcrypt';
import AdminDatabase from './database';

const SALT_ROUNDS = 10;

class AdminService {
    static async getAllUsers(next: NextFunction) {
        try {
            return await AdminDatabase.getAllUsers();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createUser(data: any, next: NextFunction) {
        const { email, full_name, role, password } = data;
        try {
            const tempPassword = password || Math.random().toString(36).slice(-10);
            const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

            const userId = await AdminDatabase.createUserTransaction({
                email,
                full_name,
                role,
                passwordHash
            });

            return { message: 'User created', userId, temp_password: tempPassword };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async updateUserStatus(userId: string, isDisabled: boolean, next: NextFunction) {
        try {
            await AdminDatabase.updateUserStatus(userId, isDisabled);
            return { message: 'Status updated' };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async updateUserRole(userId: string, newRole: string, next: NextFunction) {
        try {
            await AdminDatabase.updateUserRole(userId, newRole);
            return { message: 'Role updated' };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async resetUserPassword(userId: string, next: NextFunction) {
        try {
            const tempPassword = Math.random().toString(36).slice(-10);
            const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
            await AdminDatabase.updatePassword(userId, passwordHash);
            return { message: 'Password reset', temp_password: tempPassword };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getAuditLogs(next: NextFunction) {
        try {
            return await AdminDatabase.getAuditLogs();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default AdminService;
