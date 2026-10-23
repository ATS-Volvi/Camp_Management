import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import PermissionsDatabase from './database';

class PermissionsService {
    static async getUserRoles(userId: string, next: NextFunction) {
        try {
            return await PermissionsDatabase.getUserRoles(userId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getRolePermissions(roles: string[], next: NextFunction) {
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return [];
        }
        try {
            return await PermissionsDatabase.getRolePermissions(roles);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default PermissionsService;
