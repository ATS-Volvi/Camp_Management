import express from 'express';
import DataController from './controller';

const router = express.Router();

router.get('/:table', DataController.getData);
router.get('/:table/:id', DataController.getDataById);
router.post('/rpc/:fn', DataController.callRpc);
// Same as GET /:table, with filters in the body for filter sets too long for a URL.
router.post('/:table/query', DataController.queryData);
router.post('/:table', DataController.createData);
router.put('/:table/:id', DataController.updateData);
router.delete('/:table/:id', DataController.deleteData);

export default router;
