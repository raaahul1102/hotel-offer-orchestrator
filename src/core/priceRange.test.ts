import { resolvePriceRange, PriceRangeError, UNBOUNDED_MAX } from './priceRange';

describe('resolvePriceRange', () => {
  it('defaults min to 0 and max to unbounded when absent', () => {
    expect(resolvePriceRange(undefined, undefined)).toEqual({ min: 0, max: UNBOUNDED_MAX });
  });

  it('parses both bounds', () => {
    expect(resolvePriceRange('100', '500')).toEqual({ min: 100, max: 500 });
  });

  it('treats only-min as lower bound with unbounded max (Requirement 3.8)', () => {
    expect(resolvePriceRange('1000', undefined)).toEqual({ min: 1000, max: UNBOUNDED_MAX });
  });

  it('treats only-max as upper bound with min 0 (Requirement 3.9)', () => {
    expect(resolvePriceRange(undefined, '1000')).toEqual({ min: 0, max: 1000 });
  });

  it('rejects min > max (Requirement 3.6)', () => {
    expect(() => resolvePriceRange('500', '100')).toThrow(PriceRangeError);
  });

  it('rejects non-numeric values (Requirement 3.7)', () => {
    expect(() => resolvePriceRange('abc', undefined)).toThrow(PriceRangeError);
  });

  it('rejects negative values (Requirement 3.7)', () => {
    expect(() => resolvePriceRange('-5', undefined)).toThrow(PriceRangeError);
  });
});
