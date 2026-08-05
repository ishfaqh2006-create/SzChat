import { Router } from 'express';
import {
  searchMessages,
  editMessage,
  deleteForMe,
  deleteForEveryone,
} from '../controllers/messageController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/search', authMiddleware, searchMessages);
router.put('/:id', authMiddleware, editMessage);
router.post('/:id/delete-me', authMiddleware, deleteForMe);
router.post('/:id/delete-everyone', authMiddleware, deleteForEveryone);

export default router;
