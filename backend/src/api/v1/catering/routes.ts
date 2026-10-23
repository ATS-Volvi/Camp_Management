import express from 'express';
import CateringController from './controller';

const router = express.Router();

router.get('/ingredients', CateringController.getIngredients);
router.post('/ingredients', CateringController.saveIngredient);
router.get('/meal-menu-templates', CateringController.getMealMenuTemplates);
router.get('/grocery-requests', CateringController.getGroceryRequests);
router.post('/grocery-requests', CateringController.createGroceryRequest);
router.get('/catering-grn', CateringController.getCateringGRNs);
router.post('/catering-grn', CateringController.createCateringGRN);
router.get('/catering-issues', CateringController.getCateringIssues);
router.post('/catering-issues', CateringController.createCateringIssue);
router.get('/camp-occupancy/:campId', CateringController.getCampOccupancy);
router.get('/cost-summary', CateringController.getCostSummary);
router.get('/weekly-menu-config', CateringController.getWeeklyMenuConfig);
router.post('/weekly-menu-config', CateringController.saveWeeklyMenuConfig);
router.delete('/weekly-menu-config/:id', CateringController.deleteWeeklyMenuConfig);
router.delete('/weekly-menu-config', CateringController.deleteWeeklyMenuConfigByDay);

export default router;
