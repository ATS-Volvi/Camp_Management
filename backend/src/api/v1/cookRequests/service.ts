import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import CookRequestsDatabase from './database';

class CookRequestsService {
    static async getCookRequests(filters: any, next: NextFunction) {
        try {
            return await CookRequestsDatabase.getCookRequests(filters);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getCookRequestItems(requestId: string, next: NextFunction) {
        try {
            return await CookRequestsDatabase.getCookRequestItems(requestId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createCookRequest(data: any, next: NextFunction) {
        try {
            return await CookRequestsDatabase.createCookRequestTransaction(data);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async issueCookRequest(data: any, next: NextFunction) {
        try {
            const result = await CookRequestsDatabase.issueCookRequestTransaction(data);
            return { status: result.status, shortItems: result.shortItemsCount };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default CookRequestsService;
