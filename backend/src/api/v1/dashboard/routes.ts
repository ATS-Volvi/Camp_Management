import express from 'express';
import DashboardController from './controller';

const router = express.Router();

router.get('/recent-tickets', DashboardController.getRecentTickets);
router.get('/check-ins', DashboardController.getCheckIns);
router.get('/check-outs', DashboardController.getCheckOuts);
router.get('/alerts', DashboardController.getSystemAlerts);
router.get('/drilldown/:type', DashboardController.getDrilldown);

export default router;
