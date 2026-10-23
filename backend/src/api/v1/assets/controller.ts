import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import AssetsService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class AssetsController {
    static async getAllAssets(req: Request, res: Response, next: NextFunction) {
        const result = await AssetsService.getAllAssets(req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default AssetsController;
