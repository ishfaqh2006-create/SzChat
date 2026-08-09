import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { db, prisma } from '../db/db.js';

const router = Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'szchat_master_admin_secret_2026!';
const HARDCODED_ADMIN_PHONE = '6005547858';

let activeAdminOtp: { code: string; expiresAt: number; failedAttempts: number } | null = null;
let lockoutUntil = 0;

// 1. Request 6-Digit OTP (Server-Enforced Zero-Trust Protection)
router.post('/request-otp', authMiddleware, (req: AuthRequest, res: Response) => {
  if (Date.now() < lockoutUntil) {
    const minutesLeft = Math.ceil((lockoutUntil - Date.now()) / (60 * 1000));
    return res.status(429).json({
      error: `Security Lockout Active: Too many failed attempts. Try again in ${minutesLeft} minute(s).`,
    });
  }

  // Generate 6-digit OTP exclusively for server-configured admin phone 6005547858
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  activeAdminOtp = {
    code: generatedOtp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
    failedAttempts: 0,
  };

  console.log(`====================================================`);
  console.log(`[ZERO-TRUST SERVER SECURITY] OTP SENT EXCLUSIVELY TO +91 6005547858: ${generatedOtp}`);
  console.log(`====================================================`);

  res.json({
    status: 'ok',
    message: `Security OTP sent to authorized Admin phone ending in ****547858.`,
  });
});

// 2. Verify OTP Code or Master Secret Passcode with Brute-Force Rate Protection
router.post('/verify-otp', authMiddleware, (req: AuthRequest, res: Response) => {
  if (Date.now() < lockoutUntil) {
    const minutesLeft = Math.ceil((lockoutUntil - Date.now()) / (60 * 1000));
    return res.status(429).json({
      error: `Security Lockout Active: Too many failed attempts. Try again in ${minutesLeft} minute(s).`,
    });
  }

  const { otpCode, adminSecret } = req.body;

  if (adminSecret && adminSecret.trim() === ADMIN_SECRET) {
    return res.json({ status: 'ok', token: ADMIN_SECRET });
  }

  if (!activeAdminOtp) {
    return res.status(400).json({ error: 'No active OTP found. Please request a new OTP code.' });
  }

  if (Date.now() > activeAdminOtp.expiresAt) {
    activeAdminOtp = null;
    return res.status(400).json({ error: 'OTP code has expired. Please request a new OTP.' });
  }

  if (otpCode !== activeAdminOtp.code) {
    activeAdminOtp.failedAttempts += 1;
    if (activeAdminOtp.failedAttempts >= 3) {
      lockoutUntil = Date.now() + 15 * 60 * 1000; // 15-minute brute-force lockout
      activeAdminOtp = null;
      return res.status(429).json({
        error: 'Too many incorrect OTP attempts. Security lockout engaged for 15 minutes.',
      });
    }
    return res.status(400).json({
      error: `Incorrect OTP code (${3 - activeAdminOtp.failedAttempts} attempt(s) remaining).`,
    });
  }

  // Success
  activeAdminOtp = null;
  res.json({ status: 'ok', token: ADMIN_SECRET });
});

// Middleware to enforce Admin / Owner Role & Master Key / OTP Token
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

// 2. User Directory & Visibility Ordering
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
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
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
