import express from 'express';
import FoodCancellationController from './controller';

const router = express.Router();

router.get('/requests', FoodCancellationController.getRequests);
router.post('/requests', FoodCancellationController.submitCancellation);
router.put('/requests/:id/approve', FoodCancellationController.approveCancellation);
router.put('/requests/:id/reject', FoodCancellationController.rejectCancellation);
router.get('/kitchen-count/:campId', FoodCancellationController.getKitchenMealCount);
router.get('/settings/:campId', FoodCancellationController.getSettings);
router.post('/settings', FoodCancellationController.upsertSettings);

export default router;
