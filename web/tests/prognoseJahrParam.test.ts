import { describe, it, expect } from 'vitest';
import {
  initialYearFromParams,
  defaultForecastQuotePercent,
  effectiveForecastQuotePercent,
} from '@/lib/prognoseJahrParam';

function params(values: Record<string, string>) {
  return {
    get: (key: string) => (key in values ? values[key] : null),
  };
}

describe('initialYearFromParams', () => {
  it('returns currentYear when prognoseJahr is absent', () => {
    expect(initialYearFromParams(params({}), 2026)).toBe(2026);
  });

  it('returns the URL year when it is a valid future year within bound', () => {
    expect(initialYearFromParams(params({ prognoseJahr: '2027' }), 2026)).toBe(2027);
  });

  it('clamps to currentYear when the URL year is beyond currentYear + 1', () => {
    expect(initialYearFromParams(params({ prognoseJahr: '2028' }), 2026)).toBe(2026);
  });

  it('rejects a past or current year in the param rather than using it as-is', () => {
    expect(initialYearFromParams(params({ prognoseJahr: '2026' }), 2026)).toBe(2026);
    expect(initialYearFromParams(params({ prognoseJahr: '2020' }), 2026)).toBe(2026);
  });

  it('returns currentYear for a non-numeric param', () => {
    expect(initialYearFromParams(params({ prognoseJahr: 'abc' }), 2026)).toBe(2026);
  });
});

describe('defaultForecastQuotePercent', () => {
  it('returns 0 for null', () => {
    expect(defaultForecastQuotePercent(null)).toBe(0);
  });

  it('rounds a representative non-null value to a percent', () => {
    expect(defaultForecastQuotePercent(0.04297)).toBe(4);
    expect(defaultForecastQuotePercent(0.0451)).toBe(5);
  });
});

describe('effectiveForecastQuotePercent', () => {
  it('returns the shared quote when its year matches the queried year', () => {
    expect(effectiveForecastQuotePercent(params({ prognoseJahr: '2027', prognoseQuote: '30' }), 2026, 2027, 5)).toBe(30);
  });

  it('falls back to the default when the URL year does not match the queried year', () => {
    expect(effectiveForecastQuotePercent(params({ prognoseJahr: '2027', prognoseQuote: '30' }), 2026, 2028, 5)).toBe(5);
  });

  it('falls back to the default when the queried year is not itself future, even with matching params', () => {
    expect(effectiveForecastQuotePercent(params({ prognoseJahr: '2026', prognoseQuote: '30' }), 2026, 2026, 5)).toBe(5);
  });

  it('falls back to the default when prognoseQuote is present but prognoseJahr is absent', () => {
    expect(effectiveForecastQuotePercent(params({ prognoseQuote: '30' }), 2026, 2027, 5)).toBe(5);
  });

  it('clamps an out-of-range quote to [0, 100]', () => {
    expect(effectiveForecastQuotePercent(params({ prognoseJahr: '2027', prognoseQuote: '150' }), 2026, 2027, 5)).toBe(100);
    expect(effectiveForecastQuotePercent(params({ prognoseJahr: '2027', prognoseQuote: '-10' }), 2026, 2027, 5)).toBe(0);
  });
});
