/**
 * Shared domain types for the Hotel Offer Orchestrator.
 */

/** Canonical supplier identifiers used in the public response (Requirement 2.2). */
export type SupplierId = 'Supplier A' | 'Supplier B';

/**
 * A raw hotel record as returned by a mock supplier endpoint.
 * Requirement 4.3.
 */
export interface SupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

/**
 * A deduplicated, best-priced hotel offer returned to the client.
 * Requirement 2.1.
 */
export interface HotelOffer {
  name: string;
  price: number;
  supplier: SupplierId;
  commissionPct: number;
}

/** Result of calling a single supplier activity. */
export interface SupplierResult {
  supplier: SupplierId;
  ok: boolean;
  hotels: SupplierHotel[];
  error?: string;
}

/** Health status for a single supplier. */
export interface SupplierHealth {
  supplier: SupplierId;
  reachable: boolean;
}
