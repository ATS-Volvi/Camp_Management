import express from 'express';
import AdminController from './controller';
import { requireAuth, requireSuperAdmin } from '../../../../middleware/auth';

const router = express.Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get('/users', AdminController.getAllUsers);
router.post('/users', AdminController.createUser);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.patch('/users/:id/role', AdminController.updateUserRole);
router.post('/users/:id/reset-password', AdminController.resetUserPassword);
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;
