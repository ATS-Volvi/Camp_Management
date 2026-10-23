import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import CateringService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class CateringController {
    static async getIngredients(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.getIngredients(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async saveIngredient(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.saveIngredient(req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getMealMenuTemplates(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.getMealMenuTemplates(req.query.meal_type as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getGroceryRequests(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.getGroceryRequests(req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async createGroceryRequest(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.createGroceryRequest(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async getCateringGRNs(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.getCateringGRNs(req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async createCateringGRN(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.createCateringGRN(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async getCateringIssues(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.getCateringIssues(req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async createCateringIssue(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.createCateringIssue(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async getCampOccupancy(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.getCampOccupancy(req.params.campId, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getCostSummary(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.getCostSummary(req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getWeeklyMenuConfig(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.getWeeklyMenuConfig(req.query.camp_id as string, req.query.is_active as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async saveWeeklyMenuConfig(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.saveWeeklyMenuConfig(req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async deleteWeeklyMenuConfig(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.deleteWeeklyMenuConfig(req.params.id, next);
        if (result) {
            res.status(StatusCodes.NO_CONTENT).send();
        }
    }

    static async deleteWeeklyMenuConfigByDay(req: Request, res: Response, next: NextFunction) {
        const result = await CateringService.deleteWeeklyMenuConfigByDay(req.query.camp_id as string, req.query.day_of_week as string, next);
        if (result) {
            res.status(StatusCodes.NO_CONTENT).send();
        }
    }
}

export default CateringController;
