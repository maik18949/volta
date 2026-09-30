import { describe, it, expect } from 'vitest';
import {
  GERMAN_STATES,
  STATE_NAMES,
  isStateName,
  landTransferTaxRatePercent,
  suggestLandTransferTax,
  normalizeState,
} from '@/lib/data/landTransferTaxRates';

// Intentionally duplicated from the data module: this test pins the agreed rates — do not import the table here.
const EXPECTED_RATES: Array<[string, number]> = [
  ['Baden-Württemberg', 5],
  ['Bayern', 3.5],
  ['Berlin', 6],
  ['Brandenburg', 6.5],
  ['Bremen', 5.5],
  ['Hamburg', 5.5],
  ['Hessen', 6],
  ['Mecklenburg-Vorpommern', 6],
  ['Niedersachsen', 5],
  ['Nordrhein-Westfalen', 6.5],
  ['Rheinland-Pfalz', 5],
  ['Saarland', 6.5],
  ['Sachsen', 5.5],
  ['Sachsen-Anhalt', 5],
  ['Schleswig-Holstein', 6.5],
  ['Thüringen', 5],
];

describe('GERMAN_STATES', () => {
  it('lists exactly the 16 Bundesländer with the agreed rates', () => {
    expect(GERMAN_STATES).toHaveLength(16);
    expect(GERMAN_STATES.map((s) => [s.name, s.ratePercent])).toEqual(EXPECTED_RATES);
  });
});

describe('isStateName', () => {
  it('accepts canonical names only', () => {
    expect(isStateName('Sachsen')).toBe(true);
    expect(isStateName('sachsen')).toBe(false);
    expect(isStateName('NRW')).toBe(false);
  });
});

describe('landTransferTaxRatePercent', () => {
  it.each(EXPECTED_RATES)('%s -> %s %%', (state, rate) => {
    expect(landTransferTaxRatePercent(state)).toBe(rate);
  });

  it('returns null for empty or unknown state', () => {
    expect(landTransferTaxRatePercent('')).toBeNull();
    expect(landTransferTaxRatePercent('NRW')).toBeNull();
  });
});

describe('suggestLandTransferTax', () => {
  it('multiplies rate and purchase price', () => {
    expect(suggestLandTransferTax('Sachsen', 175000)).toBe(9625);
  });

  it('rounds to cents', () => {
    expect(suggestLandTransferTax('Bayern', 250001)).toBe(8750.04);
  });

  it('returns 0 for a purchase price of 0', () => {
    expect(suggestLandTransferTax('Sachsen', 0)).toBe(0);
  });

  it('returns null without a known state', () => {
    expect(suggestLandTransferTax('', 175000)).toBeNull();
    expect(suggestLandTransferTax('NRW', 175000)).toBeNull();
  });
});

describe('normalizeState', () => {
  it('returns the canonical name for spelling variants', () => {
    expect(normalizeState('sachsen')).toBe('Sachsen');
    expect(normalizeState('  Sachsen ')).toBe('Sachsen');
    expect(normalizeState('THÜRINGEN')).toBe('Thüringen');
    expect(normalizeState('Thueringen')).toBe('Thüringen');
    expect(normalizeState('sachsen-anhalt')).toBe('Sachsen-Anhalt');
    // decomposed umlaut (u + combining diaeresis)
    expect(normalizeState('Thu\u0308ringen')).toBe('Thüringen');
  });

  it('returns an empty string for unrecognized text', () => {
    expect(normalizeState('NRW')).toBe('');
    expect(normalizeState('')).toBe('');
  });

  it('knows every canonical name', () => {
    for (const name of STATE_NAMES) expect(normalizeState(name)).toBe(name);
  });
});
