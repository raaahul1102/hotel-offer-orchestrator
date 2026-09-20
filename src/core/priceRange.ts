/**
 * Effective, resolved price bounds after validation and default handling.
 */
export interface PriceRange {
  min: number;
  max: number;
}

export class PriceRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PriceRangeError';
  }
}

/** Upper sentinel used when no maxPrice bound is supplied (treated as unbounded). */
export const UNBOUNDED_MAX = Number.MAX_SAFE_INTEGER;

/**
 * Parse and validate raw minPrice/maxPrice query values into an effective range.
 * Requirements 3.6, 3.7, 3.8, 3.9.
 *
 * @throws PriceRangeError with a descriptive message on invalid input (maps to HTTP 400).
 */
export function resolvePriceRange(
  rawMin: string | undefined,
  rawMax: string | undefined,
): PriceRange {
  const min = parseBound(rawMin, 'minPrice');
  const max = parseBound(rawMax, 'maxPrice');

  const effectiveMin = min ?? 0;
  const effectiveMax = max ?? UNBOUNDED_MAX;

  if (effectiveMin > effectiveMax) {
    throw new PriceRangeError('minPrice must not exceed maxPrice');
  }

  return { min: effectiveMin, max: effectiveMax };
}

function parseBound(raw: string | undefined, field: string): number | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new PriceRangeError(`Invalid ${field}: must be a non-negative number`);
  }
  return value;
}
