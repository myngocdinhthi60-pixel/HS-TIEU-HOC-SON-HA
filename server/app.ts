import cookieParser from 'cookie-parser';
import express from 'express';
import { createApiRouter } from './routes';
import { loadStore } from './store';

export async function createExpressApp() {
  await loadStore();
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '6mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use('/api', createApiRouter());

  // Ensure unexpected API errors always return structured JSON instead of Express HTML 500 pages
  app.use(
    '/api',
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[API Error]', err);
      const message = err instanceof Error ? err.message : 'Lỗi máy chủ nội bộ.';
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      }
    },
  );

  return app;
}
