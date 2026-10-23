import express from 'express';
import FoodSafetyController from './controller';

const router = express.Router();

router.get('/mess-facilities', FoodSafetyController.getMessFacilities);
router.get('/templates', FoodSafetyController.getAuditTemplates);
router.post('/templates', FoodSafetyController.createAuditTemplate);
router.post('/audits', FoodSafetyController.createAudit);
router.post('/audits/:id/complete', FoodSafetyController.completeAudit);
router.get('/audits', FoodSafetyController.getAudits);

export default router;
