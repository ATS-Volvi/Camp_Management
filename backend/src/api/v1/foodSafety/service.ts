import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import FoodSafetyDatabase from './database';

class FoodSafetyService {
    static async getMessFacilities(campId: string | undefined, next: NextFunction) {
        try {
            return await FoodSafetyDatabase.getMessFacilities(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getAuditTemplates(next: NextFunction) {
        try {
            return await FoodSafetyDatabase.getAuditTemplates();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createAuditTemplate(data: any, next: NextFunction) {
        try {
            return await FoodSafetyDatabase.createAuditTemplateTransaction(data);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createAudit(data: any, next: NextFunction) {
        try {
            return await FoodSafetyDatabase.createAuditTransaction(data);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async completeAudit(auditId: string, next: NextFunction) {
        try {
            return await FoodSafetyDatabase.completeAuditTransaction(auditId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getAudits(campId: string | undefined, next: NextFunction) {
        try {
            return await FoodSafetyDatabase.getAudits(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default FoodSafetyService;
