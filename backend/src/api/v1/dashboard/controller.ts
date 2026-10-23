import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import DashboardService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class DashboardController {
    static async getRecentTickets(req: Request, res: Response, next: NextFunction) {
        const result = await DashboardService.getRecentTickets(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getCheckIns(req: Request, res: Response, next: NextFunction) {
        const result = await DashboardService.getCheckIns(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getCheckOuts(req: Request, res: Response, next: NextFunction) {
        const result = await DashboardService.getCheckOuts(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getSystemAlerts(req: Request, res: Response, next: NextFunction) {
        const result = await DashboardService.getSystemAlerts(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getDrilldown(req: Request, res: Response, next: NextFunction) {
        const result = await DashboardService.getDrilldown(req.params.type, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default DashboardController;
