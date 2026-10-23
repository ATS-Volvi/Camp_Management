import express from 'express';
import DataController from './controller';

const router = express.Router();

router.get('/:table', DataController.getData);
router.get('/:table/:id', DataController.getDataById);
router.post('/rpc/:fn', DataController.callRpc);
router.post('/:table', DataController.createData);
router.put('/:table/:id', DataController.updateData);
router.delete('/:table/:id', DataController.deleteData);

export default router;
