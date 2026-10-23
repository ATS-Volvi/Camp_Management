import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import FoodSafetyService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class FoodSafetyController {
    static async getMessFacilities(req: Request, res: Response, next: NextFunction) {
        const result = await FoodSafetyService.getMessFacilities(req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getAuditTemplates(req: Request, res: Response, next: NextFunction) {
        const result = await FoodSafetyService.getAuditTemplates(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async createAuditTemplate(req: Request, res: Response, next: NextFunction) {
        const result = await FoodSafetyService.createAuditTemplate(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async createAudit(req: Request, res: Response, next: NextFunction) {
        const result = await FoodSafetyService.createAudit(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async completeAudit(req: Request, res: Response, next: NextFunction) {
        const result = await FoodSafetyService.completeAudit(req.params.id, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getAudits(req: Request, res: Response, next: NextFunction) {
        const result = await FoodSafetyService.getAudits(req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default FoodSafetyController;
