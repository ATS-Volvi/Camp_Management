import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import AttendanceService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class AttendanceController {
    static async getOccupants(req: Request, res: Response, next: NextFunction) {
        const campIds = (req.query.camp_ids as string)?.split(',') || [];
        const result = await AttendanceService.getOccupants(campIds, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getAttendanceRange(req: Request, res: Response, next: NextFunction) {
        const campIds = (req.query.camp_ids as string)?.split(',') || [];
        const result = await AttendanceService.getAttendanceRange(campIds, req.query.start as string, req.query.end as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getRoomOccupants(req: Request, res: Response, next: NextFunction) {
        const result = await AttendanceService.getRoomOccupants(req.params.roomId, req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getRoomHistory(req: Request, res: Response, next: NextFunction) {
        const result = await AttendanceService.getRoomHistory(req.params.roomId, req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getCheckInReports(req: Request, res: Response, next: NextFunction) {
        const result = await AttendanceService.getCheckInReports(req.query.from as string, req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getCheckOutReports(req: Request, res: Response, next: NextFunction) {
        const result = await AttendanceService.getCheckOutReports(req.query.from as string, req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default AttendanceController;
