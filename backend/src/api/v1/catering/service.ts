import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import CateringDatabase from './database';

class CateringService {
    static async getIngredients(next: NextFunction) {
        try {
            return await CateringDatabase.getIngredients();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async saveIngredient(item: any, next: NextFunction) {
        try {
            return await CateringDatabase.saveIngredient(item);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getMealMenuTemplates(mealType: string | undefined, next: NextFunction) {
        try {
            return await CateringDatabase.getMealMenuTemplates(mealType);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getGroceryRequests(campId: string | undefined, next: NextFunction) {
        try {
            return await CateringDatabase.getGroceryRequests(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createGroceryRequest(data: any, next: NextFunction) {
        try {
            return await CateringDatabase.createGroceryRequestTransaction(data);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getCateringGRNs(campId: string | undefined, next: NextFunction) {
        try {
            return await CateringDatabase.getCateringGRNs(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createCateringGRN(data: any, next: NextFunction) {
        try {
            return await CateringDatabase.createCateringGRNTransaction(data);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getCateringIssues(campId: string | undefined, next: NextFunction) {
        try {
            return await CateringDatabase.getCateringIssues(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createCateringIssue(data: any, next: NextFunction) {
        try {
            return await CateringDatabase.createCateringIssueTransaction(data);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getCampOccupancy(campId: string, next: NextFunction) {
        try {
            return await CateringDatabase.getCampOccupancy(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getCostSummary(campId: string | undefined, next: NextFunction) {
        try {
            return await CateringDatabase.getCostSummary(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getWeeklyMenuConfig(campId: string | undefined, isActive: string | undefined, next: NextFunction) {
        try {
            const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
            return await CateringDatabase.getWeeklyMenuConfig(campId, activeBool);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async saveWeeklyMenuConfig(item: any, next: NextFunction) {
        try {
            return await CateringDatabase.saveWeeklyMenuConfig(item);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async deleteWeeklyMenuConfig(id: string, next: NextFunction) {
        try {
            return await CateringDatabase.deleteWeeklyMenuConfig(id);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async deleteWeeklyMenuConfigByDay(campId: string, dayOfWeek: string, next: NextFunction) {
        try {
            return await CateringDatabase.deleteWeeklyMenuConfigByDay(campId, dayOfWeek);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default CateringService;
