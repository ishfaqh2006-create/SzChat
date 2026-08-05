import express from 'express';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { authMiddleware, AuthRequest } from './middleware/auth.js';
import { db } from './db/db.js';

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/messages', messageRoutes);

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
