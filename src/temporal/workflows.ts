import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from './activities';
import { HotelOffer, SupplierHotel, SupplierId } from '../types';
import { selectBestOffers } from '../core/selection';

// Per-attempt timeout of 5s with up to 2 additional retries (Requirement 5.1).
const { fetchSupplierHotels } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 seconds',
  retry: {
    maximumAttempts: 3, // initial + 2 retries
    initialInterval: '500 milliseconds',
    backoffCoefficient: 2,
  },
});

export interface OrchestrateResult {
  offers: HotelOffer[];
  /** Suppliers that failed after retries; used to detect total failure. */
  failedSuppliers: SupplierId[];
}

/**
 * Orchestrate the supplier comparison:
 *   - Call Supplier A and Supplier B in parallel (Requirement 1.2)
 *   - Degrade gracefully if one supplier fails (Requirements 1.12, 5.2)
 *   - Deduplicate by name and select cheapest, A wins ties (Requirements 1.4-1.7)
 * The API layer maps an all-failed result to HTTP 502 (Requirement 5.3).
 */
export async function orchestrateHotelOffers(city: string): Promise<OrchestrateResult> {
  const suppliers: SupplierId[] = ['Supplier A', 'Supplier B'];

  const settled = await Promise.allSettled(
    suppliers.map((supplier) => fetchSupplierHotels(supplier, city)),
  );

  const batches: { supplier: SupplierId; hotels: SupplierHotel[] }[] = [];
  const failedSuppliers: SupplierId[] = [];

  settled.forEach((result, index) => {
    const supplier = suppliers[index];
    if (result.status === 'fulfilled') {
      batches.push({ supplier, hotels: result.value });
    } else {
      failedSuppliers.push(supplier);
      log.error('supplier failed after retries', {
        supplier,
        reason: String(result.reason),
      });
    }
  });

  // Supplier A is passed first so it wins price ties (Requirement 1.6).
  const offers = selectBestOffers(batches);
  log.info('workflow completed', { city, count: offers.length, failedSuppliers });

  return { offers, failedSuppliers };
}
