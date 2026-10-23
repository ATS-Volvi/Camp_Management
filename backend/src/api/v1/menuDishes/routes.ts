import express from 'express';
import MenuDishesController from './controller';

const router = express.Router();

router.get('/:id/ingredients', MenuDishesController.getDishIngredients);
router.delete('/:id/ingredients', MenuDishesController.deleteDishIngredients);

export default router;
