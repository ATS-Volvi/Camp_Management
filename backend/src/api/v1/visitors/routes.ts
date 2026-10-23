import express from 'express';
import VisitorsController from './controller';

const router = express.Router();

router.get('/', VisitorsController.getAllVisitors);
router.get('/stats', VisitorsController.getVisitorStats);
router.post('/', VisitorsController.createVisitor);
router.put('/:id/checkout', VisitorsController.checkOutVisitor);

export default router;
