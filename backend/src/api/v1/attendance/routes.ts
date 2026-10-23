import express from 'express';
import AttendanceController from './controller';

const router = express.Router();

router.get('/occupants', AttendanceController.getOccupants);
router.get('/range', AttendanceController.getAttendanceRange);
router.get('/room-occupants/:roomId', AttendanceController.getRoomOccupants);
router.get('/room-history/:roomId', AttendanceController.getRoomHistory);
router.get('/reports/check-ins', AttendanceController.getCheckInReports);
router.get('/reports/check-outs', AttendanceController.getCheckOutReports);

export default router;
