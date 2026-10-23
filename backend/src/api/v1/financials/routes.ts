import express from 'express';
import FinancialsController from './controller';

const router = express.Router();

router.get('/room-income', FinancialsController.getRoomIncome);

export default router;
