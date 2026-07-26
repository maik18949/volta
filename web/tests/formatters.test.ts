import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, formatDate, formatNumber } from '@/lib/formatters';

describe('formatters', () => {
  it('formatCurrency formats EUR with de-DE grouping', () => {
    expect(formatCurrency(1242.85)).toBe('1.242,85 €');
  });

  it('formatCurrency handles negative values', () => {
    expect(formatCurrency(-485.61)).toBe('-485,61 €');
  });

  it('formatPercent converts a decimal fraction to a percent string', () => {
    expect(formatPercent(0.04297)).toBe('4,3 %');
  });

  it('formatDate formats as de-DE short date', () => {
    expect(formatDate(new Date(Date.UTC(2026, 1, 1)))).toBe('01.02.2026');
  });

  it('formatNumber formats with a comma decimal separator', () => {
    expect(formatNumber(22.5, 1)).toBe('22,5');
  });

  it('formatNumber respects the requested fraction digits', () => {
    expect(formatNumber(1.25, 2)).toBe('1,25');
  });
});
