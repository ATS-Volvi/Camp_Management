import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import CheckInOutDatabase from './database';

class CheckInOutService {
    static async getRecentCheckIns(next: NextFunction) {
        try {
            return await CheckInOutDatabase.getRecentCheckIns();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getRecentCheckOuts(next: NextFunction) {
        try {
            return await CheckInOutDatabase.getRecentCheckOuts();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async performCheckIn(data: any, next: NextFunction) {
        try {
            return await CheckInOutDatabase.performCheckIn(data);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async performCheckOut(data: any, next: NextFunction) {
        try {
            return await CheckInOutDatabase.performCheckOut(data);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default CheckInOutService;
