import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import FinancialsDatabase from './database';

class FinancialsService {
    static async getRoomIncome(campId: string | undefined, next: NextFunction) {
        try {
            return await FinancialsDatabase.getRoomIncome(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default FinancialsService;
