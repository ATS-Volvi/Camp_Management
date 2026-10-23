import express from 'express';
import PurchaseOrdersController from './controller';

const router = express.Router();

router.get('/', PurchaseOrdersController.getPurchaseOrders);
router.get('/items', PurchaseOrdersController.getPurchaseOrderItems);
router.post('/receive', PurchaseOrdersController.receivePurchaseOrder);

export default router;
