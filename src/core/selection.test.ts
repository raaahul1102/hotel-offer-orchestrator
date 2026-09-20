import { selectBestOffers, filterByCity, filterByPrice, normalizeName } from './selection';
import { SupplierHotel } from '../types';

const A: SupplierHotel[] = [
  { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
  { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 },
  { hotelId: 'a3', name: 'Taj', price: 8200, city: 'delhi', commissionPct: 15 },
  { hotelId: 'a4', name: 'Oberoi Grand', price: 12000, city: 'delhi', commissionPct: 18 },
];

const B: SupplierHotel[] = [
  { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
  { hotelId: 'b2', name: 'Radison', price: 6100, city: 'delhi', commissionPct: 11 },
  { hotelId: 'b3', name: 'Taj', price: 8200, city: 'delhi', commissionPct: 12 },
  { hotelId: 'b4', name: 'Leela Palace', price: 15000, city: 'delhi', commissionPct: 22 },
];

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('  Holtin ')).toBe('holtin');
  });
});

describe('filterByCity', () => {
  it('matches case-insensitively', () => {
    const hotels: SupplierHotel[] = [
      ...A,
      { hotelId: 'x', name: 'Seaside', price: 100, city: 'Mumbai', commissionPct: 5 },
    ];
    expect(filterByCity(hotels, 'DELHI')).toHaveLength(4);
    expect(filterByCity(hotels, 'mumbai')).toHaveLength(1);
  });
});

describe('selectBestOffers', () => {
  const offers = selectBestOffers([
    { supplier: 'Supplier A', hotels: A },
    { supplier: 'Supplier B', hotels: B },
  ]);

  it('picks the cheaper supplier per name', () => {
    const holtin = offers.find((o) => o.name === 'Holtin')!;
    expect(holtin.price).toBe(5340);
    expect(holtin.supplier).toBe('Supplier B');

    const radison = offers.find((o) => o.name === 'Radison')!;
    expect(radison.price).toBe(5900);
    expect(radison.supplier).toBe('Supplier A');
  });

  it('breaks price ties in favor of Supplier A (Requirement 1.6)', () => {
    const taj = offers.find((o) => o.name === 'Taj')!;
    expect(taj.supplier).toBe('Supplier A');
  });

  it('keeps hotels present in only one supplier (Requirement 1.7)', () => {
    expect(offers.find((o) => o.name === 'Oberoi Grand')?.supplier).toBe('Supplier A');
    expect(offers.find((o) => o.name === 'Leela Palace')?.supplier).toBe('Supplier B');
  });

  it('deduplicates by name', () => {
    const names = offers.map((o) => o.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('returns offers sorted by ascending price (Requirement 2.5)', () => {
    const prices = offers.map((o) => o.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('handles a single responsive supplier (degraded mode)', () => {
    const only = selectBestOffers([{ supplier: 'Supplier A', hotels: A }]);
    expect(only.find((o) => o.name === 'Holtin')?.price).toBe(6000);
  });

  it('returns empty when no supplier data', () => {
    expect(selectBestOffers([])).toEqual([]);
  });
});

describe('filterByPrice', () => {
  const offers = selectBestOffers([
    { supplier: 'Supplier A', hotels: A },
    { supplier: 'Supplier B', hotels: B },
  ]);

  it('includes inclusive bounds', () => {
    const filtered = filterByPrice(offers, 5900, 8200);
    const names = filtered.map((o) => o.name).sort();
    expect(names).toEqual(['Radison', 'Taj']);
  });
});
