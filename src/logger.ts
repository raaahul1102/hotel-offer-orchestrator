import pino from 'pino';

/**
 * Shared structured logger (Requirement 7).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'hotel-offer-orchestrator' },
});
