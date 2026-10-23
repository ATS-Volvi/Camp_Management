import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import MaintenanceDatabase from './database';

class MaintenanceService {
    static async assignTicket(id: string, data: any, next: NextFunction) {
        try {
            await MaintenanceDatabase.assignTicketTransaction(id, data);
            return { success: true };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default MaintenanceService;
