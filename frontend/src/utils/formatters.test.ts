import { describe, it, expect } from 'vitest';
import { formatSmartCurrency } from './formatters';

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
