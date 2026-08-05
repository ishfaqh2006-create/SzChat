import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/db.js';

export const searchMessages = async (req: AuthRequest, res: Response) => {
  try {
    const chatId = req.query.chatId as string;
    const query = req.query.q as string;
    if (!chatId || !query) return res.json({ messages: [] });

    const messages = await db.searchMessages(chatId, query, req.user!.id);
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed' });
  }
};

export const editMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const message = await db.editMessage(req.params.id, req.user!.id, content);
    res.json({ message });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteForMe = async (req: AuthRequest, res: Response) => {
  try {
    await db.deleteMessageForMe(req.params.id, req.user!.id);
    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteForEveryone = async (req: AuthRequest, res: Response) => {
  try {
    const message = await db.deleteMessageForEveryone(req.params.id, req.user!.id);
    res.json({ message });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
