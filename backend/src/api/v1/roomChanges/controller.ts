import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import RoomChangesService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class RoomChangesController {
    static async approveRoomChange(req: Request, res: Response, next: NextFunction) {
        const result = await RoomChangesService.approveRoomChange(req.params.id, req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async rejectRoomChange(req: Request, res: Response, next: NextFunction) {
        const result = await RoomChangesService.rejectRoomChange(req.params.id, req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default RoomChangesController;
