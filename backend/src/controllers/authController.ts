import { Response } from 'express';
import { AuthRequest, generateToken } from '../middleware/auth.js';
import { db } from '../db/db.js';

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { username, displayName, password } = req.body;
    if (!username || !displayName || !password) {
      return res.status(400).json({ error: 'Username, display name, and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const user = await db.createUser(username, displayName, password);
    const token = generateToken({ id: user.id, username: user.username, displayName: user.displayName });

    res.json({ token, user });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.authenticateUser(username, password);
    const token = generateToken({ id: user.id, username: user.username, displayName: user.displayName });

    res.json({ token, user });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid credentials' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.getUserById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, avatarUrl, statusMessage } = req.body;
    const updated = await db.updateUser(req.user!.id, { displayName, avatarUrl, statusMessage });
    res.json({ user: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
