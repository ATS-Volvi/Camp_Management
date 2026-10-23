import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import GroceryInventoryService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class GroceryInventoryController {
    static async getIngredients(req: Request, res: Response, next: NextFunction) {
        const result = await GroceryInventoryService.getIngredients(req.query, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getPriceHistory(req: Request, res: Response, next: NextFunction) {
        const result = await GroceryInventoryService.getPriceHistory(req.query.ingredient_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async addPriceEntry(req: Request, res: Response, next: NextFunction) {
        const result = await GroceryInventoryService.addPriceEntry(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async getConsumptionLogs(req: Request, res: Response, next: NextFunction) {
        const result = await GroceryInventoryService.getConsumptionLogs(req.query, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getStockSummary(req: Request, res: Response, next: NextFunction) {
        const result = await GroceryInventoryService.getStockSummary(req.query.camp_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default GroceryInventoryController;
