import { HotelOffer, SupplierHotel, SupplierId } from '../types';

/**
 * Normalize a hotel name for deduplication: lowercase + trimmed (Requirement 1.11).
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Filter supplier hotels to a single city using case-insensitive, trimmed matching.
 */
export function filterByCity(hotels: SupplierHotel[], city: string): SupplierHotel[] {
  const target = normalizeName(city);
  return hotels.filter((h) => normalizeName(h.city) === target);
}

interface SupplierBatch {
  supplier: SupplierId;
  hotels: SupplierHotel[];
}

/**
 * Deduplicate offers across suppliers by normalized name and select the best
 * (cheapest) offer per name. On a price tie, the first-listed supplier wins,
 * so Supplier A is passed first to satisfy Requirement 1.6.
 *
 * Requirements 1.4, 1.5, 1.6, 1.7 and 2.5 (ascending price order).
 */
export function selectBestOffers(batches: SupplierBatch[]): HotelOffer[] {
  const bestByName = new Map<string, HotelOffer>();

  for (const batch of batches) {
    for (const hotel of batch.hotels) {
      const key = normalizeName(hotel.name);
      const candidate: HotelOffer = {
        name: hotel.name,
        price: hotel.price,
        supplier: batch.supplier,
        commissionPct: hotel.commissionPct,
      };

      const existing = bestByName.get(key);
      // Strictly-lower price replaces; equal price keeps the earlier supplier (A).
      if (!existing || candidate.price < existing.price) {
        bestByName.set(key, candidate);
      }
    }
  }

  return Array.from(bestByName.values()).sort((a, b) => a.price - b.price);
}

/**
 * Apply an in-memory price-range filter. Used for tests and as a fallback;
 * the request path filters inside Redis (see cache.ts).
 * Requirement 3.4.
 */
export function filterByPrice(
  offers: HotelOffer[],
  minPrice: number,
  maxPrice: number,
): HotelOffer[] {
  return offers.filter((o) => o.price >= minPrice && o.price <= maxPrice);
}
