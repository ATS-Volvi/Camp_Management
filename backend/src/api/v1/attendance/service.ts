import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import AttendanceDatabase from './database';

class AttendanceService {
    static async getOccupants(campIds: string[], next: NextFunction) {
        try {
            const rows = await AttendanceDatabase.getOccupants(campIds);
            return rows.map(r => ({
                ...r,
                employee_id: r.emp_id_str,
                daily_rate: Number(r.daily_rate || 0)
            }));
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getAttendanceRange(campIds: string[], start: string, end: string, next: NextFunction) {
        try {
            return await AttendanceDatabase.getAttendanceRange(campIds, start, end);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getRoomOccupants(roomId: string, campId: string, next: NextFunction) {
        try {
            const rows = await AttendanceDatabase.getRoomOccupants(roomId, campId);
            return rows.map(r => ({
                ...r,
                employee_id: r.emp_id_str,
                daily_rate: Number(r.daily_rate || 0)
            }));
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getRoomHistory(roomId: string, campId: string, next: NextFunction) {
        try {
            const rows = await AttendanceDatabase.getRoomHistory(roomId, campId);
            return rows.map(r => ({
                ...r,
                days: Math.max(1, Math.ceil((new Date(r.check_out_date).getTime() - new Date(r.check_in_date || r.check_out_date).getTime()) / (1000 * 60 * 60 * 24)))
            }));
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getCheckInReports(from: string, campId: string | undefined, next: NextFunction) {
        try {
            return await AttendanceDatabase.getCheckInReports(from, campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getCheckOutReports(from: string, campId: string | undefined, next: NextFunction) {
        try {
            return await AttendanceDatabase.getCheckOutReports(from, campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default AttendanceService;
