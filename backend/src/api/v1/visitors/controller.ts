import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import VisitorsService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class VisitorsController {
    static async getAllVisitors(req: Request, res: Response, next: NextFunction) {
        const result = await VisitorsService.getAllVisitors(req.query, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getVisitorStats(req: Request, res: Response, next: NextFunction) {
        const result = await VisitorsService.getVisitorStats(req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async createVisitor(req: Request, res: Response, next: NextFunction) {
        const result = await VisitorsService.createVisitor(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async checkOutVisitor(req: Request, res: Response, next: NextFunction) {
        const result = await VisitorsService.checkOutVisitor(req.params.id, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default VisitorsController;
