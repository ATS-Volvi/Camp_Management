import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import ActivitiesDatabase from './database';

class ActivitiesService {
    static async getAllFeeds(next: NextFunction) {
        try {
            return await ActivitiesDatabase.getAllFeeds();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default ActivitiesService;
