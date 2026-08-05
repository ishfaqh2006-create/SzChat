import { Router } from 'express';
import { searchUsers } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/search', authMiddleware, searchUsers);

export default router;
