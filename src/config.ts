/**
 * Centralized configuration sourced from environment variables with documented defaults.
 */
export const config = {
  /** Host port the API listens on (Requirement 8.3). Railway injects PORT. */
  port: parseInt(process.env.PORT ?? '3000', 10),

  /** Base URL the worker uses to reach the in-service mock supplier endpoints. */
  supplierBaseUrl: process.env.SUPPLIER_BASE_URL ?? 'http://localhost:3000',

  redis: {
    /**
     * Full connection URL (e.g. redis://:pass@host:6379). Railway provides this.
     * When set, it takes precedence over host/port.
     */
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    /** Deduplicated-list cache TTL in seconds (Requirement 3.1). */
    cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS ?? '300', 10),
  },

  temporal: {
    address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE ?? 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE ?? 'hotel-orchestrator',
  },

  /** Per-attempt supplier timeout in ms (Requirement 5.1). */
  supplierTimeoutMs: parseInt(process.env.SUPPLIER_TIMEOUT_MS ?? '5000', 10),

  /** Supplier reachability timeout for the health check in ms (Requirement 6.2). */
  healthTimeoutMs: parseInt(process.env.HEALTH_TIMEOUT_MS ?? '2000', 10),
} as const;
