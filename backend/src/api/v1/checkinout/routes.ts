import express from 'express';
import CheckInOutController from './controller';

const router = express.Router();

router.get('/recent-check-ins', CheckInOutController.getRecentCheckIns);
router.get('/recent-check-outs', CheckInOutController.getRecentCheckOuts);
router.post('/perform-check-in', CheckInOutController.performCheckIn);
router.post('/perform-check-out', CheckInOutController.performCheckOut);

export default router;
