import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import CheckInOutService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class CheckInOutController {
    static async getRecentCheckIns(req: Request, res: Response, next: NextFunction) {
        const result = await CheckInOutService.getRecentCheckIns(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getRecentCheckOuts(req: Request, res: Response, next: NextFunction) {
        const result = await CheckInOutService.getRecentCheckOuts(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async performCheckIn(req: Request, res: Response, next: NextFunction) {
        const result = await CheckInOutService.performCheckIn(req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async performCheckOut(req: Request, res: Response, next: NextFunction) {
        const result = await CheckInOutService.performCheckOut(req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default CheckInOutController;
