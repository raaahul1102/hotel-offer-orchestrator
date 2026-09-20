import { createApp } from './app';
import { RedisCache } from '../cache/redisCache';
import { config } from '../config';
import { logger } from '../logger';

/**
 * API server entry point.
 */
function main(): void {
  const cache = new RedisCache();
  const app = createApp(cache);

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'API server listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close();
    await cache.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main();
