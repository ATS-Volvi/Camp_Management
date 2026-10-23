import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import MenuDishesService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class MenuDishesController {
    static async getDishIngredients(req: Request, res: Response, next: NextFunction) {
        const result = await MenuDishesService.getDishIngredients(req.params.id, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async deleteDishIngredients(req: Request, res: Response, next: NextFunction) {
        const result = await MenuDishesService.deleteDishIngredients(req.params.id, next);
        if (result) {
            res.status(StatusCodes.NO_CONTENT).send();
        }
    }
}

export default MenuDishesController;
