import express from 'express';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { authMiddleware, AuthRequest } from './middleware/auth.js';
import { db } from './db/db.js';

import adminRoutes from './routes/adminRoutes.js';

export function createExpressApp() {
  const app = express();

  app.disable('x-powered-by');

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/admin', adminRoutes);

  // Return 404 Not Found for any direct browser visits to /admin
  app.get('/admin', (_req, res) => {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>404 Not Found</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #09090b; color: #a1a1aa;">
          <h1 style="color: #ef4444;">404 Not Found</h1>
          <p>The requested URL /admin was not found on this server.</p>
        </body>
      </html>
    `);
  });

  // Calls history
  app.get('/api/calls/history', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const logs = await db.getUserCallLogs(req.user!.id);
      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch call history' });
    }
  });

  // Media Upload endpoint
  app.post('/api/upload', authMiddleware, (req: AuthRequest, res) => {
    try {
      const { fileDataUrl, fileName, fileSize } = req.body;
      if (!fileDataUrl) {
        return res.status(400).json({ error: 'fileDataUrl is required' });
      }
      res.json({
        fileUrl: fileDataUrl,
        fileName: fileName || 'file',
        fileSize: fileSize || 0,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'File upload failed' });
    }
  });

  return app;
}
