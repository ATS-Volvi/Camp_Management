import express from 'express';
import AuthController from './controller';

const router = express.Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.signup);
router.get('/me', AuthController.getMe);
router.post('/logout', AuthController.logout);
router.post('/change-password', AuthController.changePassword);

export default router;
