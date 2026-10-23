import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import RoomChangesDatabase from './database';

class RoomChangesService {
    static async approveRoomChange(id: string, data: any, next: NextFunction) {
        try {
            await RoomChangesDatabase.approveRoomChangeTransaction(id, data);
            return { success: true, message: 'Room change completed successfully' };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async rejectRoomChange(id: string, data: any, next: NextFunction) {
        try {
            const res = await RoomChangesDatabase.rejectRoomChange(id, data);
            if (!res) {
                return next(createError({ status: 404, message: 'Request not found or not in pending status' }));
            }
            return { success: true, data: res };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default RoomChangesService;
