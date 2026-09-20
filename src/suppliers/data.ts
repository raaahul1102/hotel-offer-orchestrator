import { SupplierHotel } from '../types';

/**
 * Static mock supplier datasets. Values are deterministic (Requirement 4.5) and
 * include overlapping hotel names between A and B for the same city so the
 * cheapest-price selection is meaningful (Requirement 4.4).
 *
 * Overlaps for city "delhi":
 *   - "Holtin"  : A=6000, B=5340  -> B is cheaper
 *   - "Radison" : A=5900, B=6100  -> A is cheaper
 *   - "Taj"     : A=8200, B=8200  -> tie, A wins (Requirement 1.6)
 * Unique:
 *   - A only: "Oberoi Grand"
 *   - B only: "Leela Palace"
 */
export const SUPPLIER_A_HOTELS: SupplierHotel[] = [
  { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
  { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 },
  { hotelId: 'a3', name: 'Taj', price: 8200, city: 'delhi', commissionPct: 15 },
  { hotelId: 'a4', name: 'Oberoi Grand', price: 12000, city: 'delhi', commissionPct: 18 },
  { hotelId: 'a5', name: 'Seaside Inn', price: 4300, city: 'mumbai', commissionPct: 9 },
];

export const SUPPLIER_B_HOTELS: SupplierHotel[] = [
  { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
  { hotelId: 'b2', name: 'Radison', price: 6100, city: 'delhi', commissionPct: 11 },
  { hotelId: 'b3', name: 'Taj', price: 8200, city: 'delhi', commissionPct: 12 },
  { hotelId: 'b4', name: 'Leela Palace', price: 15000, city: 'delhi', commissionPct: 22 },
  { hotelId: 'b5', name: 'Seaside Inn', price: 4100, city: 'mumbai', commissionPct: 8 },
];
