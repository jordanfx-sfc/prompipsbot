import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import app from './server/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  // --- SERVE VITE IN DEV / DIST IN PROD ---
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PROMPIPS BOT] Standalone server listening on http://0.0.0.0:${PORT}`);
  });
}

// Start standalone server when executed directly (local dev or fullstack container)
startServer().catch((err) => {
  console.error('[PROMPIPS BOT] Server failed to start:', err);
});
