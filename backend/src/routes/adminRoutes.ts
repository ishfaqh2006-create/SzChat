import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { db, prisma } from '../db/db.js';

import { CONFIG } from '../config/index.js';

const router = Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || CONFIG.JWT_SECRET;

// 1. Direct Master Password Login reserved exclusively for Account Ishfaq
router.post('/login', authMiddleware, (req: AuthRequest, res: Response) => {
  const username = (req.user?.username || '').toLowerCase();
  if (username !== 'ishfaq') {
    return res.status(403).json({ error: 'Access denied: Only Master Owner account (Ishfaq) can access Admin Panel.' });
  }

  const { masterPassword } = req.body;
  if (!masterPassword || masterPassword.trim() !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Incorrect Master Admin Password.' });
  }

  res.json({ status: 'ok', token: ADMIN_SECRET });
});

// Middleware to enforce Master Password Token
const superAdminMiddleware = (req: AuthRequest, res: Response, next: any) => {
  const adminKey = req.headers['x-admin-secret-key'];
  if (!adminKey || adminKey !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Access denied: Invalid Admin Security Credential' });
  }
  next();
};

// 1. System Statistics
router.get('/stats', authMiddleware, superAdminMiddleware, async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    const chatCount = await prisma.chat.count();
    const messageCount = await prisma.message.count();
    const callCount = await prisma.call.count();

    res.json({
      stats: {
        users: userCount,
        chats: chatCount,
        messages: messageCount,
        calls: callCount,
        dbStatus: 'Healthy (PostgreSQL + Prisma)',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

interface UserVisibilityConfig {
  mode: string;
  allowedUserIds: string[];
}

const userVisibilityMap: Record<string, UserVisibilityConfig> = {};

// 2. User Directory & Visibility Modes
router.get('/users', authMiddleware, superAdminMiddleware, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    const formatted = users.map((u) => ({
      ...u,
      visibilityMode: userVisibilityMap[u.id]?.mode || 'EVERYONE',
      allowedUserIds: userVisibilityMap[u.id]?.allowedUserIds || [],
    }));

    res.json({ users: formatted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update per-user visibility mode & custom allowed users list
router.post('/users/:userId/visibility', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { visibilityMode, allowedUserIds } = req.body;
    
    userVisibilityMap[userId] = {
      mode: visibilityMode || 'EVERYONE',
      allowedUserIds: Array.isArray(allowedUserIds) ? allowedUserIds : [],
    };

    res.json({
      status: 'ok',
      userId,
      visibilityMode: userVisibilityMap[userId].mode,
      allowedUserIds: userVisibilityMap[userId].allowedUserIds,
      message: `Visibility mode updated to ${visibilityMode}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user visibility' });
  }
});

// 3. Trigger Manual Database Quota Cleanup
router.post('/cleanup', authMiddleware, superAdminMiddleware, async (_req, res) => {
  try {
    await db.runDatabaseQuotaCleanup();
    res.json({ status: 'ok', message: 'Database quota cleanup executed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

export default router;
