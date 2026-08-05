import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/db.js';

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const users = await db.searchUsers(query, req.user!.id);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed' });
  }
};
