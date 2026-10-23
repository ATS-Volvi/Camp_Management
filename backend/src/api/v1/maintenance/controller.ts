import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import MaintenanceService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class MaintenanceController {
    static async assignTicket(req: Request, res: Response, next: NextFunction) {
        const result = await MaintenanceService.assignTicket(req.params.id, req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default MaintenanceController;
