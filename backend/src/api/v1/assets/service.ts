import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import AssetsDatabase from './database';

class AssetsService {
    static async getAllAssets(campId: string | undefined, next: NextFunction) {
        try {
            return await AssetsDatabase.getAllAssets(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default AssetsService;
