import axios from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import { SupplierHotel, SupplierId } from '../types';
import { filterByCity } from '../core/selection';

const SUPPLIER_PATHS: Record<SupplierId, string> = {
  'Supplier A': '/supplierA/hotels',
  'Supplier B': '/supplierB/hotels',
};

/**
 * Fetch hotels for a city from a single supplier endpoint.
 * Logs start (Requirement 7.1). Throws on failure so Temporal retry policy applies
 * (Requirement 5.1); the workflow decides how to degrade.
 */
export async function fetchSupplierHotels(
  supplier: SupplierId,
  city: string,
): Promise<SupplierHotel[]> {
  logger.info({ supplier, city }, 'supplier activity started');
  const url = `${config.supplierBaseUrl}${SUPPLIER_PATHS[supplier]}`;

  const response = await axios.get<SupplierHotel[]>(url, {
    timeout: config.supplierTimeoutMs,
  });

  const hotels = filterByCity(response.data, city);
  logger.info({ supplier, city, count: hotels.length }, 'supplier activity completed');
  return hotels;
}

/**
 * Check whether a supplier endpoint is reachable within the health timeout.
 * Requirement 6.2.
 */
export async function checkSupplierHealth(supplier: SupplierId): Promise<boolean> {
  const url = `${config.supplierBaseUrl}${SUPPLIER_PATHS[supplier]}`;
  try {
    const response = await axios.get(url, { timeout: config.healthTimeoutMs });
    return response.status >= 200 && response.status < 300;
  } catch (err) {
    logger.warn({ supplier, err: (err as Error).message }, 'supplier health check failed');
    return false;
  }
}
