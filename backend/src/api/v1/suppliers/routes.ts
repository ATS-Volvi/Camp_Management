import express from 'express';
import SuppliersController from './controller';

const router = express.Router();

router.get('/', SuppliersController.getAllSuppliers);
router.get('/:id', SuppliersController.getSupplierById);
router.post('/', SuppliersController.createSupplier);
router.put('/:id', SuppliersController.updateSupplier);
router.delete('/:id', SuppliersController.deleteSupplier);

export default router;
