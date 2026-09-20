import express, { Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import { logger } from '../logger';
import { RedisCache } from '../cache/redisCache';
import { suppliersRouter } from './routes/suppliers';
import { healthRouter } from './routes/health';
import { createHotelsRouter } from './routes/hotels';

/**
 * Assemble the Express application. Accepts a RedisCache so tests can inject
 * a fake or a redis-mock instance.
 */
export function createApp(cache: RedisCache): express.Express {
  const app = express();
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  // Mock supplier endpoints (Requirement 4).
  app.use(suppliersRouter);
  // Health check (Requirement 6).
  app.use(healthRouter);
  // Public hotels API (Requirements 1, 2, 3, 5).
  app.use(createHotelsRouter(cache));

  // 404 for unknown routes.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler (Requirements 7.3, 7.4).
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err: err.message, path: req.path }, 'unhandled request error');
    res.status(500).json({ error: 'InternalServerError', message: 'An unexpected error occurred.' });
  });

  return app;
}
