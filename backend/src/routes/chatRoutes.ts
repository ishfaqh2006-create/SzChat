import { Router } from 'express';
import {
  getUserChats,
  createDirectChat,
  createGroupChat,
  getChatDetails,
  getChatMessages,
  markRead,
  pinChat,
  archiveChat,
  setWallpaper,
  addMember,
  removeMember,
  leaveGroup,
  setDisappearingTimer,
} from '../controllers/chatController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, getUserChats);
router.post('/direct', authMiddleware, createDirectChat);
router.post('/group', authMiddleware, createGroupChat);
router.get('/:id', authMiddleware, getChatDetails);
router.get('/:id/messages', authMiddleware, getChatMessages);
router.post('/:id/read', authMiddleware, markRead);
router.post('/:id/pin', authMiddleware, pinChat);
router.post('/:id/archive', authMiddleware, archiveChat);
router.post('/:id/wallpaper', authMiddleware, setWallpaper);
router.post('/:id/disappearing', authMiddleware, setDisappearingTimer);
router.post('/:id/members', authMiddleware, addMember);
router.delete('/:id/members/:userId', authMiddleware, removeMember);
router.post('/:id/leave', authMiddleware, leaveGroup);

export default router;
