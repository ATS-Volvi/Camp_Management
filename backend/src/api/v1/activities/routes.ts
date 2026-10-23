import express from 'express';
import ActivitiesController from './controller';

const router = express.Router();

router.get('/all-feeds', ActivitiesController.getAllFeeds);

export default router;
