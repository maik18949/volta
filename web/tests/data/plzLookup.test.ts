import { describe, it, expect } from 'vitest';
import { lookupState } from '@/lib/data/plzLookup';
import { PLZ_RANGES, AMBIGUOUS_PLZ } from '@/lib/data/plzToState';
import { STATE_NAMES } from '@/lib/data/landTransferTaxRates';

describe('lookupState', () => {
  it.each([
    ['01099', 'Sachsen'],
    ['80331', 'Bayern'],
    ['20095', 'Hamburg'],
    ['28195', 'Bremen'],
    ['10115', 'Berlin'],
    ['50667', 'Nordrhein-Westfalen'],
    ['60311', 'Hessen'],
    ['70173', 'Baden-Württemberg'],
    ['30159', 'Niedersachsen'],
    ['55116', 'Rheinland-Pfalz'],
    ['66111', 'Saarland'],
    ['24103', 'Schleswig-Holstein'],
    ['19053', 'Mecklenburg-Vorpommern'],
    ['39104', 'Sachsen-Anhalt'],
    ['99084', 'Thüringen'],
    ['14467', 'Brandenburg'],
  ])('%s -> %s', (plz, state) => {
    expect(lookupState(plz)).toEqual({ kind: 'unique', state });
  });

  it.each([
    ['65326', ['Hessen', 'Rheinland-Pfalz']],
    ['88147', ['Baden-Württemberg', 'Bayern']],
    ['21039', ['Hamburg', 'Schleswig-Holstein']],
  ])('%s is ambiguous', (plz, states) => {
    expect(lookupState(plz)).toEqual({ kind: 'ambiguous', states });
  });

  it.each(['00000', '99999', '1234', '123456', 'abcde', ''])('"%s" is unknown', (plz) => {
    expect(lookupState(plz)).toEqual({ kind: 'unknown' });
  });

  it('ignores surrounding whitespace', () => {
    expect(lookupState(' 01099 ')).toEqual({ kind: 'unique', state: 'Sachsen' });
  });
});

describe('generated table integrity', () => {
  it('only uses canonical Bundesland names and covers all 16', () => {
    const states = Object.keys(PLZ_RANGES);
    for (const state of states) expect(STATE_NAMES).toContain(state);
    expect([...states].sort()).toEqual([...STATE_NAMES].sort());
  });

  it('has well-formed ranges and no PLZ in two states', () => {
    const seen = new Set<number>();
    for (const ranges of Object.values(PLZ_RANGES)) {
      for (const [from, to] of ranges) {
        expect(from).toBeGreaterThanOrEqual(1000);
        expect(to).toBeLessThanOrEqual(99999);
        expect(from).toBeLessThanOrEqual(to);
        for (let plz = from; plz <= to; plz++) {
          expect(seen.has(plz)).toBe(false);
          seen.add(plz);
        }
      }
    }
    expect(seen.size + Object.keys(AMBIGUOUS_PLZ).length).toBe(8256);
    expect(Object.keys(AMBIGUOUS_PLZ)).toHaveLength(26);
  });

  it('keeps ambiguous PLZ out of the ranges', () => {
    for (const plz of Object.keys(AMBIGUOUS_PLZ)) {
      expect(lookupState(plz).kind).toBe('ambiguous');
    }
  });
});
