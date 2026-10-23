import express from 'express';
import GroceryInventoryController from './controller';

const router = express.Router();

router.get('/ingredients', GroceryInventoryController.getIngredients);
router.get('/price-history', GroceryInventoryController.getPriceHistory);
router.post('/price-history', GroceryInventoryController.addPriceEntry);
router.get('/consumption', GroceryInventoryController.getConsumptionLogs);
router.get('/stock-summary', GroceryInventoryController.getStockSummary);

export default router;
