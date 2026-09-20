import { Router, Request, Response, NextFunction } from 'express';
import { RedisCache } from '../../cache/redisCache';
import { runOrchestration } from '../../temporal/client';
import { resolvePriceRange, PriceRangeError, UNBOUNDED_MAX } from '../../core/priceRange';
import { logger } from '../../logger';

/**
 * GET /api/hotels?city=&minPrice=&maxPrice=
 * Requirements 1, 2, 3, 5.
 */
export function createHotelsRouter(cache: RedisCache): Router {
  const router = Router();

  router.get('/api/hotels', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cityRaw = req.query.city;
      const city = typeof cityRaw === 'string' ? cityRaw : '';

      // Requirement 1.10: missing/blank city -> 400.
      if (city.trim() === '') {
        return res
          .status(400)
          .json({ error: 'Query parameter "city" is required and must not be blank.' });
      }

      // Requirements 3.6-3.9: validate and resolve price bounds.
      let range: { min: number; max: number };
      try {
        range = resolvePriceRange(
          typeof req.query.minPrice === 'string' ? req.query.minPrice : undefined,
          typeof req.query.maxPrice === 'string' ? req.query.maxPrice : undefined,
        );
      } catch (err) {
        if (err instanceof PriceRangeError) {
          return res.status(400).json({ error: err.message });
        }
        throw err;
      }

      // Requirement 3.3: (re)generate the cache when the city isn't cached.
      if (!(await cache.has(city))) {
        const result = await runOrchestration(city);

        // Requirement 5.3: all suppliers failed -> 502.
        if (result.offers.length === 0 && result.failedSuppliers.length === 2) {
          return res
            .status(502)
            .json({ error: 'All suppliers are currently unavailable. Please try again later.' });
        }

        await cache.storeOffers(city, result.offers);
      }

      // Requirement 3.4 / 3: filtering happens inside Redis.
      const offers = await cache.getFilteredOffers(city, range.min, range.max);
      logger.info(
        { city, min: range.min, max: range.max === UNBOUNDED_MAX ? null : range.max, count: offers.length },
        'hotels response',
      );
      return res.status(200).json(offers);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
