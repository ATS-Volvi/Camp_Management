import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import CampsService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class CampsController {
    static async getAllCamps(req: Request, res: Response, next: NextFunction) {
        const result = await CampsService.getAllCamps(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getCampById(req: Request, res: Response, next: NextFunction) {
        const result = await CampsService.getCampById(req.params.id, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getBuildings(req: Request, res: Response, next: NextFunction) {
        const result = await CampsService.getBuildings(req.params.id, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getRooms(req: Request, res: Response, next: NextFunction) {
        const result = await CampsService.getRooms(req.params.id, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async createCamp(req: Request, res: Response, next: NextFunction) {
        const result = await CampsService.createCamp(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async createBuilding(req: Request, res: Response, next: NextFunction) {
        const result = await CampsService.createBuilding(req.params.id, req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async createRoom(req: Request, res: Response, next: NextFunction) {
        const result = await CampsService.createRoom(req.params.id, req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async getInmates(req: Request, res: Response, next: NextFunction) {
        const result = await CampsService.getInmates(req.params.id, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default CampsController;
