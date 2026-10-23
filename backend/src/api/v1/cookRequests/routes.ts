import express from 'express';
import CookRequestsController from './controller';

const router = express.Router();

router.get('/', CookRequestsController.getCookRequests);
router.get('/items', CookRequestsController.getCookRequestItems);
router.post('/', CookRequestsController.createCookRequest);
router.post('/issue', CookRequestsController.issueCookRequest);

export default router;
