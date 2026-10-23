import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import CampTransfersDatabase from './database';

class CampTransfersService {
    static async approveTransfer(id: string, data: any, next: NextFunction) {
        const { approvedBy } = data;
        try {
            const res = await CampTransfersDatabase.approveTransfer(id, approvedBy);
            if (!res) {
                return next(createError({ status: 404, message: 'Request not found or not in pending status' }));
            }
            return { success: true, data: res };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async rejectTransfer(id: string, data: any, next: NextFunction) {
        const { rejectedBy, rejectionReason } = data;
        try {
            const res = await CampTransfersDatabase.rejectTransfer(id, rejectedBy, rejectionReason);
            if (!res) {
                return next(createError({ status: 404, message: 'Request not found or not in pending status' }));
            }
            return { success: true, data: res };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async reportTransfer(id: string, data: any, next: NextFunction) {
        const { newRoomId } = data;
        if (!newRoomId) {
            return next(createError({ status: 400, message: 'New room ID is required' }));
        }
        try {
            await CampTransfersDatabase.reportTransferTransaction(id, newRoomId);
            return { success: true, message: 'Transfer completed successfully' };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default CampTransfersService;
