import express from 'express';
import CampTransfersController from './controller';

const router = express.Router();

router.post('/:id/approve', CampTransfersController.approveTransfer);
router.post('/:id/reject', CampTransfersController.rejectTransfer);
router.post('/:id/report', CampTransfersController.reportTransfer);

export default router;
