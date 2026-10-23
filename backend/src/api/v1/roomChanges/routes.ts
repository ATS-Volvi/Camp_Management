import express from 'express';
import RoomChangesController from './controller';

const router = express.Router();

router.post('/:id/approve', RoomChangesController.approveRoomChange);
router.post('/:id/reject', RoomChangesController.rejectRoomChange);

export default router;
