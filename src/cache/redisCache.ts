import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../logger';
import { HotelOffer } from '../types';
import { normalizeName } from '../core/selection';
import { UNBOUNDED_MAX } from '../core/priceRange';

/**
 * Redis-backed cache for deduplicated offers with price filtering performed
 * inside Redis via a per-city sorted set scored by price (Requirement 3).
 *
 * Data model per city:
 *   - ZSET  hotels:z:<city>   member = hotel name, score = price
 *   - HASH  hotels:h:<city>   field  = hotel name, value = JSON(HotelOffer)
 * Both keys share the same TTL so filtering + hydration stay consistent.
 */
export class RedisCache {
  private readonly client: Redis;

  constructor(client?: Redis) {
    if (client) {
      this.client = client;
    } else if (config.redis.url) {
      // Railway (and most managed Redis) provide a single connection URL.
      this.client = new Redis(config.redis.url, {
        lazyConnect: false,
        maxRetriesPerRequest: 2,
      });
    } else {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        lazyConnect: false,
        maxRetriesPerRequest: 2,
      });
    }
  }

  private zKey(city: string): string {
    return `hotels:z:${normalizeName(city)}`;
  }

  private hKey(city: string): string {
    return `hotels:h:${normalizeName(city)}`;
  }

  /** Persist the deduplicated list keyed by city with a TTL (Requirement 3.1). */
  async storeOffers(city: string, offers: HotelOffer[]): Promise<void> {
    const zKey = this.zKey(city);
    const hKey = this.hKey(city);
    const ttl = config.redis.cacheTtlSeconds;

    const pipeline = this.client.multi();
    pipeline.del(zKey, hKey);

    if (offers.length > 0) {
      const zArgs: (string | number)[] = [];
      const hArgs: string[] = [];
      for (const offer of offers) {
        zArgs.push(offer.price, offer.name);
        hArgs.push(offer.name, JSON.stringify(offer));
      }
      pipeline.zadd(zKey, ...zArgs);
      pipeline.hset(hKey, ...hArgs);
      pipeline.expire(zKey, ttl);
      pipeline.expire(hKey, ttl);
    }

    await pipeline.exec();
    logger.info({ city: normalizeName(city), count: offers.length, ttl }, 'cache stored');
  }

  /** True when a deduplicated list exists in the cache for the city. */
  async has(city: string): Promise<boolean> {
    const exists = await this.client.exists(this.hKey(city));
    return exists === 1;
  }

  /**
   * Return offers for the city within [min, max], filtered inside Redis via
   * ZRANGEBYSCORE, then hydrated from the hash. Results stay price-ascending
   * (Requirements 3.4, 2.5).
   */
  async getFilteredOffers(city: string, min: number, max: number): Promise<HotelOffer[]> {
    const redisMax = max === UNBOUNDED_MAX ? '+inf' : max;
    const names = await this.client.zrangebyscore(this.zKey(city), min, redisMax);
    if (names.length === 0) {
      return [];
    }
    const raw = await this.client.hmget(this.hKey(city), ...names);
    return raw
      .filter((v): v is string => v !== null)
      .map((v) => JSON.parse(v) as HotelOffer);
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}
