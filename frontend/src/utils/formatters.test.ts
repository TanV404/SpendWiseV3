import { describe, it, expect } from 'vitest';
import {
  formatSmartCurrency,
  parseTransactionDate,
  isCurrentMonthAndYear,
  isCurrentYear,
  matchesDateFilter,
} from './formatters';

describe('formatSmartCurrency', () => {
  it('formats regular amounts accurately with exact decimal currency', () => {
    const result = formatSmartCurrency(124.5);
    expect(result.display).toBe('$124.50');
    expect(result.exact).toBe('$124.50');
    expect(result.className).toContain('text-2xl');
  });

  it('formats zero correctly', () => {
    const result = formatSmartCurrency(0);
    expect(result.display).toBe('$0.00');
    expect(result.exact).toBe('$0.00');
  });

  it('formats negative amounts properly', () => {
    const result = formatSmartCurrency(-45.99);
    expect(result.display).toBe('-$45.99');
    expect(result.exact).toBe('-$45.99');
  });

  it('abbreviates hundred thousands with k and preserves exact in tooltip', () => {
    const result = formatSmartCurrency(450000);
    expect(result.display).toBe('$450.0k');
    expect(result.exact).toBe('$450,000.00');
  });

  it('abbreviates millions with M and preserves exact in tooltip', () => {
    const result = formatSmartCurrency(1250000);
    expect(result.display).toBe('$1.3M');
    expect(result.exact).toBe('$1,250,000.00');
  });

  it('handles null and undefined gracefully', () => {
    const resNull = formatSmartCurrency(null);
    expect(resNull.display).toBe('$0.00');
    const resUndef = formatSmartCurrency(undefined);
    expect(resUndef.display).toBe('$0.00');
  });
});

describe('Date parsing and filtering helpers', () => {
  it('correctly parses various transaction date formats', () => {
    const d1 = parseTransactionDate('2026-08-16');
    expect(d1?.getFullYear()).toBe(2026);
    expect(d1?.getMonth()).toBe(7); // August is index 7
    expect(d1?.getDate()).toBe(16);

    const d2 = parseTransactionDate('May 15 2024');
    expect(d2?.getFullYear()).toBe(2024);
    expect(d2?.getMonth()).toBe(4); // May is index 4

    expect(parseTransactionDate('')).toBeNull();
    expect(parseTransactionDate(null)).toBeNull();
    expect(parseTransactionDate(undefined)).toBeNull();
  });

  it('correctly determines current month and year', () => {
    const refDate = new Date(2026, 7, 16); // August 16, 2026
    expect(isCurrentMonthAndYear('2026-08-01', refDate)).toBe(true);
    expect(isCurrentMonthAndYear('Aug 10 2026', refDate)).toBe(true);
    // Same month, different year -> false
    expect(isCurrentMonthAndYear('Aug 10 2024', refDate)).toBe(false);
    // Different month, same year -> false
    expect(isCurrentMonthAndYear('May 10 2026', refDate)).toBe(false);
  });

  it('correctly determines current year', () => {
    const refDate = new Date(2026, 7, 16);
    expect(isCurrentYear('2026-01-15', refDate)).toBe(true);
    expect(isCurrentYear('Dec 31 2026', refDate)).toBe(true);
    expect(isCurrentYear('May 15 2024', refDate)).toBe(false);
  });

  it('filters transactions using matchesDateFilter correctly', () => {
    const refDate = new Date(2026, 7, 16); // August 16, 2026

    // ALL
    expect(matchesDateFilter('May 15 2024', 'ALL', undefined, undefined, refDate)).toBe(true);

    // THIS_MONTH
    expect(matchesDateFilter('Aug 05 2026', 'THIS_MONTH', undefined, undefined, refDate)).toBe(true);
    expect(matchesDateFilter('Jul 05 2026', 'THIS_MONTH', undefined, undefined, refDate)).toBe(false);

    // LAST_MONTH
    expect(matchesDateFilter('Jul 25 2026', 'LAST_MONTH', undefined, undefined, refDate)).toBe(true);
    expect(matchesDateFilter('Aug 01 2026', 'LAST_MONTH', undefined, undefined, refDate)).toBe(false);

    // THIS_YEAR
    expect(matchesDateFilter('Jan 10 2026', 'THIS_YEAR', undefined, undefined, refDate)).toBe(true);
    expect(matchesDateFilter('Dec 20 2024', 'THIS_YEAR', undefined, undefined, refDate)).toBe(false);

    // CUSTOM
    expect(matchesDateFilter('2026-05-15', 'CUSTOM', '2026-05-01', '2026-05-31', refDate)).toBe(true);
    expect(matchesDateFilter('2026-06-01', 'CUSTOM', '2026-05-01', '2026-05-31', refDate)).toBe(false);
  });
});
