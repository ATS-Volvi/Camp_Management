import express from 'express';
import PermissionsController from './controller';

const router = express.Router();

router.get('/user-roles/:userId', PermissionsController.getUserRoles);
router.post('/role-permissions', PermissionsController.getRolePermissions);

export default router;
