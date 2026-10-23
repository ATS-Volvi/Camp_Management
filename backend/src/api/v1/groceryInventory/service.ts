import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import GroceryInventoryDatabase from './database';

class GroceryInventoryService {
    static async getIngredients(filters: any, next: NextFunction) {
        try {
            return await GroceryInventoryDatabase.getIngredients(filters);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getPriceHistory(ingredientId: string | undefined, next: NextFunction) {
        try {
            return await GroceryInventoryDatabase.getPriceHistory(ingredientId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async addPriceEntry(entry: any, next: NextFunction) {
        try {
            await GroceryInventoryDatabase.addPriceEntryTransaction(entry);
            return { message: 'Price recorded and updated' };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getConsumptionLogs(filters: any, next: NextFunction) {
        try {
            return await GroceryInventoryDatabase.getConsumptionLogs(filters);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getStockSummary(campId: string | undefined, next: NextFunction) {
        try {
            return await GroceryInventoryDatabase.getStockSummary(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default GroceryInventoryService;
