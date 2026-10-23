import express from 'express';
import MaintenanceController from './controller';

const router = express.Router();

router.post('/tickets/:id/assign', MaintenanceController.assignTicket);

export default router;
