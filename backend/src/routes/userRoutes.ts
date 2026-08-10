import { Router } from 'express';
import { searchUsers, getVapidPublicKey, subscribePush, sendTestNotification } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/search', authMiddleware, searchUsers);
router.get('/push/vapid-key', authMiddleware, getVapidPublicKey);
router.post('/push/subscribe', authMiddleware, subscribePush);
router.post('/push/test', authMiddleware, sendTestNotification);

export default router;
