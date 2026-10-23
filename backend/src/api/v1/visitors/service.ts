import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import VisitorsDatabase from './database';

class VisitorsService {
    static async getAllVisitors(filters: any, next: NextFunction) {
        try {
            return await VisitorsDatabase.getAllVisitors(filters);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getVisitorStats(campId: string | undefined, next: NextFunction) {
        try {
            return await VisitorsDatabase.getVisitorStats(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createVisitor(data: any, next: NextFunction) {
        try {
            return await VisitorsDatabase.createVisitor(data);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async checkOutVisitor(id: string, next: NextFunction) {
        try {
            return await VisitorsDatabase.checkOutVisitor(id);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default VisitorsService;
