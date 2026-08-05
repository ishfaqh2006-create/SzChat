import { createServer } from 'http';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './backend/src/app.js';
import { initSocketHandler } from './backend/src/sockets/socketHandler.js';
import { CONFIG } from './backend/src/config/index.js';

const app = createExpressApp();
const httpServer = createServer(app);

// Initialize Socket.IO Handler
initSocketHandler(httpServer);

// Vite Middleware for SPA Frontend
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = typeof CONFIG.PORT === 'number' ? CONFIG.PORT : parseInt(CONFIG.PORT || '3000', 10);

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`SzChat production full-stack server running on http://0.0.0.0:${port}`);
  });
}

start();
