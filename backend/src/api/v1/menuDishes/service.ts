import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import MenuDishesDatabase from './database';

class MenuDishesService {
    static async getDishIngredients(dishId: string, next: NextFunction) {
        try {
            return await MenuDishesDatabase.getDishIngredients(dishId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async deleteDishIngredients(dishId: string, next: NextFunction) {
        try {
            return await MenuDishesDatabase.deleteDishIngredients(dishId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default MenuDishesService;
