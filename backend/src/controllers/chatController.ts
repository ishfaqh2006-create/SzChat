import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/db.js';

export const getUserChats = async (req: AuthRequest, res: Response) => {
  try {
    const chats = await db.getUserChats(req.user!.id);
    res.json({ chats });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user chats' });
  }
};

export const createDirectChat = async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });

    const chat = await db.getOrCreateDirectChat(req.user!.id, targetUserId);
    res.json({ chat });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const createGroupChat = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, memberIds } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required' });

    const chat = await db.createGroupChat(req.user!.id, name, description, memberIds || []);
    res.json({ chat });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getChatDetails = async (req: AuthRequest, res: Response) => {
  try {
    const chat = await db.getChatForUser(req.params.id, req.user!.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ chat });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch chat details' });
  }
};

export const getChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const before = req.query.before as string | undefined;
    const messages = await db.getChatMessages(req.params.id, req.user!.id, limit, before);
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const markRead = async (req: AuthRequest, res: Response) => {
  try {
    await db.markChatAsRead(req.params.id, req.user!.id);
    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark chat as read' });
  }
};

export const pinChat = async (req: AuthRequest, res: Response) => {
  try {
    const { pinned } = req.body;
    await db.updateChatMember(req.params.id, req.user!.id, { pinned: !!pinned });
    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const archiveChat = async (req: AuthRequest, res: Response) => {
  try {
    const { archived } = req.body;
    await db.updateChatMember(req.params.id, req.user!.id, { archived: !!archived });
    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const setWallpaper = async (req: AuthRequest, res: Response) => {
  try {
    const { wallpaper } = req.body;
    await db.updateChatMember(req.params.id, req.user!.id, { wallpaper });
    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;
    const chat = await db.addMemberToGroup(req.params.id, userId, req.user!.id);
    res.json({ chat });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const chat = await db.removeMemberFromGroup(req.params.id, req.params.userId, req.user!.id);
    res.json({ chat });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const leaveGroup = async (req: AuthRequest, res: Response) => {
  try {
    const chat = await db.removeMemberFromGroup(req.params.id, req.user!.id, req.user!.id);
    res.json({ chat });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const setDisappearingTimer = async (req: AuthRequest, res: Response) => {
  try {
    const { timerSeconds } = req.body;
    const chat = await db.updateDisappearingTimer(req.params.id, parseInt(timerSeconds, 10) || 0);
    res.json({ chat });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
