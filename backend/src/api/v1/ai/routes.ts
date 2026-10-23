import express from 'express';
import AIController from './controller';

const router = express.Router();

router.post('/chat', AIController.chat);
router.post('/anomaly', AIController.anomaly);
router.post('/parse-invoice', AIController.parseInvoice);
router.post('/food-safety-insights', AIController.foodSafetyInsights);
router.post('/ai-dish-ingredients', AIController.getDishIngredients);

export default router;
