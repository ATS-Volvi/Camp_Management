import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import CampTransfersService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class CampTransfersController {
    static async approveTransfer(req: Request, res: Response, next: NextFunction) {
        const result = await CampTransfersService.approveTransfer(req.params.id, req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async rejectTransfer(req: Request, res: Response, next: NextFunction) {
        const result = await CampTransfersService.rejectTransfer(req.params.id, req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async reportTransfer(req: Request, res: Response, next: NextFunction) {
        const result = await CampTransfersService.reportTransfer(req.params.id, req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default CampTransfersController;
