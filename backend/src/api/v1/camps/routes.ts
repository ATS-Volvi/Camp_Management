import express from 'express';
import CampsController from './controller';

const router = express.Router();

router.get('/', CampsController.getAllCamps);
router.get('/:id', CampsController.getCampById);
router.get('/:id/buildings', CampsController.getBuildings);
router.get('/:id/rooms', CampsController.getRooms);
router.get('/:id/inmates', CampsController.getInmates);
router.post('/', CampsController.createCamp);
router.post('/:id/buildings', CampsController.createBuilding);
router.post('/:id/rooms', CampsController.createRoom);

export default router;
