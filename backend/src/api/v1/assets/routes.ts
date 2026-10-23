import express from 'express';
import AssetsController from './controller';

const router = express.Router();

router.get('/', AssetsController.getAllAssets);

export default router;
