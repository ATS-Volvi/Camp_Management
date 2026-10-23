import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import FinancialsService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class FinancialsController {
    static async getRoomIncome(req: Request, res: Response, next: NextFunction) {
        const result = await FinancialsService.getRoomIncome(req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default FinancialsController;
