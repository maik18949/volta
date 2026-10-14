import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import {
  depreciationYearly,
  depreciationProratedInAcquisitionYear,
} from '@/lib/calculations/depreciationCalculator';
import {
  degressiveEligibilityWarning,
  depreciationEndYear,
  depreciationForYear,
  depreciationSchedule,
  isValidSwitchYear,
  optimalSwitchYear,
  parseDepreciationMethod,
  switchState,
  type DepreciationPlanInput,
} from '@/lib/calculations/depreciationSchedule';

function plan(overrides: Partial<DepreciationPlanInput> = {}): DepreciationPlanInput {
  return {
    basis: 300_000,
    method: 'degressiv_5a',
    linearRate: 0.03,
    economicTransferDate: makeDate(2026, 1, 1),
    switchYear: null,
    ...overrides,
  };
}

describe('depreciationSchedule: linear', () => {
  it('Basis × Satz pro Jahr, letztes Jahr nur der Rest, danach 0', () => {
    const input = plan({ method: 'linear' });
    expect(depreciationForYear(input, 2026)).toMatchObject({ amount: 9_000, bookValueEnd: 291_000, phase: 'linear' });
    expect(depreciationForYear(input, 2058)!.amount).toBeCloseTo(9_000, 6);
    expect(depreciationForYear(input, 2059)!.amount).toBeCloseTo(3_000, 6);
    expect(depreciationForYear(input, 2059)!.bookValueEnd).toBe(0);
    expect(depreciationForYear(input, 2060)!.amount).toBe(0);
  });

  it('entspricht der bisherigen Berechnung (Erwerbsjahr anteilig, danach voller Jahresbetrag)', () => {
    const input = plan({
      method: 'linear',
      basis: f.afaBasis,
      linearRate: f.depreciationRate,
      economicTransferDate: f.economicTransferDate,
    });
    expect(depreciationForYear(input, 2026)!.amount).toBeCloseTo(
      depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, f.economicTransferDate),
      6
    );
    expect(depreciationForYear(input, 2030)!.amount).toBeCloseTo(depreciationYearly(f.afaBasis, f.depreciationRate), 6);
  });
});

describe('depreciationSchedule: degressiv', () => {
  it('5 % vom Restwert, Erwerb im Januar', () => {
    const input = plan();
    expect(depreciationForYear(input, 2026)).toMatchObject({ amount: 15_000, bookValueEnd: 285_000, phase: 'degressiv' });
    expect(depreciationForYear(input, 2027)).toMatchObject({ amount: 14_250, bookValueEnd: 270_750 });
    expect(depreciationForYear(input, 2028)).toMatchObject({ amount: 13_537.5, bookValueEnd: 257_212.5 });
  });

  it('Erwerb im März: Erwerbsjahr 10/12, danach 5 % vom Rest', () => {
    const input = plan({ economicTransferDate: makeDate(2026, 3, 1) });
    expect(depreciationForYear(input, 2026)!.amount).toBeCloseTo(12_500, 6);
    expect(depreciationForYear(input, 2026)!.bookValueEnd).toBeCloseTo(287_500, 6);
    expect(depreciationForYear(input, 2027)!.amount).toBeCloseTo(14_375, 6);
  });

  it('ohne Wechsel wird der Restwert nie vollständig abgeschrieben', () => {
    expect(depreciationEndYear(plan())).toBeNull();
    expect(depreciationForYear(plan(), 2060)!.bookValueEnd).toBeGreaterThan(0);
  });

  it('vor dem Erwerbsjahr gibt es keine AfA', () => {
    expect(depreciationForYear(plan(), 2025)).toBeNull();
  });

  it('Basis 0 ergibt überall 0', () => {
    const input = plan({ basis: 0 });
    expect(depreciationForYear(input, 2026)).toMatchObject({ amount: 0, bookValueEnd: 0 });
    expect(depreciationForYear(input, 2040)!.amount).toBe(0);
  });
});

describe('depreciationSchedule: Wechsel zu linear', () => {
  const input = plan({ switchYear: 2040 });

  it('bis zum Vorjahr degressiv, ab dem Wechseljahr konstanter Betrag Restwert ÷ Restnutzungsdauer', () => {
    expect(depreciationForYear(input, 2039)!.phase).toBe('degressiv');
    const restwert = 300_000 * 0.95 ** 14;
    const expected = restwert / (100 / 3 - 14);
    const first = depreciationForYear(input, 2040)!;
    expect(first.phase).toBe('linear_nach_wechsel');
    expect(first.amount).toBeCloseTo(expected, 6);
    expect(first.amount).toBeCloseTo(7_567, 0);
    expect(depreciationForYear(input, 2050)!.amount).toBeCloseTo(expected, 6);
  });

  it('Restwert ist 2059 vollständig abgeschrieben, danach 0', () => {
    expect(depreciationEndYear(input)).toBe(2059);
    expect(depreciationForYear(input, 2059)!.bookValueEnd).toBe(0);
    expect(depreciationForYear(input, 2060)!.amount).toBe(0);
  });

  it('ein Wechseljahr im Erwerbsjahr wirkt wie das Folgejahr', () => {
    const a = depreciationSchedule(plan({ switchYear: 2026 }), 2035);
    const b = depreciationSchedule(plan({ switchYear: 2027 }), 2035);
    expect(a).toEqual(b);
  });
});

describe('optimalSwitchYear', () => {
  it('3 %: 2040 bei Erwerb im Januar und im März 2026', () => {
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 1, 1), linearRate: 0.03 })).toBe(2040);
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 3, 1), linearRate: 0.03 })).toBe(2040);
  });

  it('Erwerb im Dezember: ein Jahr später (kaum Zeit im Erwerbsjahr vergangen)', () => {
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 12, 1), linearRate: 0.03 })).toBe(2041);
  });

  it('2 % und 2,5 %: längere Nutzungsdauer verschiebt den Wechsel', () => {
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 1, 1), linearRate: 0.02 })).toBe(2057);
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 1, 1), linearRate: 0.025 })).toBe(2047);
  });

  it('Satz 0 oder negativ: keine Empfehlung', () => {
    expect(optimalSwitchYear({ economicTransferDate: makeDate(2026, 1, 1), linearRate: 0 })).toBeNull();
  });

  it('der lineare Betrag ist im optimalen Jahr tatsächlich höher als der degressive, ein Jahr früher nicht', () => {
    const optimal = optimalSwitchYear({ economicTransferDate: makeDate(2026, 1, 1), linearRate: 0.03 })!;
    const linearAmount = (year: number) => depreciationForYear(plan({ switchYear: year }), year)!.amount;
    const degressiveAmount = (year: number) => depreciationForYear(plan(), year)!.amount;
    expect(linearAmount(optimal)).toBeGreaterThan(degressiveAmount(optimal));
    expect(linearAmount(optimal - 1)).toBeLessThan(degressiveAmount(optimal - 1));
  });
});

describe('isValidSwitchYear', () => {
  const transfer = makeDate(2026, 3, 1);
  it('muss eine ganze Zahl nach dem Erwerbsjahr sein, höchstens 60 Jahre danach', () => {
    expect(isValidSwitchYear(2027, transfer)).toBe(true);
    expect(isValidSwitchYear(2086, transfer)).toBe(true);
    expect(isValidSwitchYear(2026, transfer)).toBe(false);
    expect(isValidSwitchYear(2087, transfer)).toBe(false);
    expect(isValidSwitchYear(2040.5, transfer)).toBe(false);
    expect(isValidSwitchYear(Number.NaN, transfer)).toBe(false);
  });
});

describe('switchState', () => {
  it('ohne Plan: weit → fällig (Jahr −1 und Jahr) → überfällig', () => {
    expect(switchState({ currentYear: 2026, switchYear: null, optimalYear: 2040 })).toBe('weit');
    expect(switchState({ currentYear: 2038, switchYear: null, optimalYear: 2040 })).toBe('weit');
    expect(switchState({ currentYear: 2039, switchYear: null, optimalYear: 2040 })).toBe('faellig');
    expect(switchState({ currentYear: 2040, switchYear: null, optimalYear: 2040 })).toBe('faellig');
    expect(switchState({ currentYear: 2041, switchYear: null, optimalYear: 2040 })).toBe('ueberfaellig');
  });

  it('mit Plan: vorgemerkt bis zum Vorjahr, ab dem Wechseljahr aktiv', () => {
    expect(switchState({ currentYear: 2039, switchYear: 2040, optimalYear: 2040 })).toBe('vorgemerkt');
    expect(switchState({ currentYear: 2040, switchYear: 2040, optimalYear: 2040 })).toBe('aktiv');
    expect(switchState({ currentYear: 2045, switchYear: 2040, optimalYear: 2040 })).toBe('aktiv');
  });
});

describe('degressiveEligibilityWarning', () => {
  const ok = { yearBuilt: 2026, purchaseDate: makeDate(2026, 2, 10), economicTransferDate: makeDate(2026, 3, 1) };

  it('keine Warnung bei Neubau im Fertigstellungsjahr und Kaufvertrag im Zeitfenster', () => {
    expect(degressiveEligibilityWarning(ok)).toBeNull();
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: null })).toBeNull();
  });

  it('Baujahr vor 2023', () => {
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: 2015 })).toMatch(/nach 2022 fertiggestellt/);
  });

  it('Anschaffung nach dem Fertigstellungsjahr', () => {
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: 2024 })).toMatch(/Ende des Fertigstellungsjahres/);
  });

  it('Kaufvertrag außerhalb des Zeitfensters 1.10.2023 bis 30.9.2029', () => {
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: 2023, purchaseDate: makeDate(2023, 9, 30), economicTransferDate: makeDate(2023, 10, 1) })).toMatch(/Kaufvertrag/);
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: 2029, purchaseDate: makeDate(2029, 10, 1), economicTransferDate: makeDate(2029, 11, 1) })).toMatch(/Kaufvertrag/);
    expect(degressiveEligibilityWarning({ ...ok, yearBuilt: 2029, purchaseDate: makeDate(2029, 9, 30), economicTransferDate: makeDate(2029, 11, 1) })).toBeNull();
  });
});

describe('parseDepreciationMethod', () => {
  it('unbekannte oder fehlende Werte gelten als linear', () => {
    expect(parseDepreciationMethod('degressiv_5a')).toBe('degressiv_5a');
    expect(parseDepreciationMethod('linear')).toBe('linear');
    expect(parseDepreciationMethod('')).toBe('linear');
    expect(parseDepreciationMethod(undefined as unknown as string)).toBe('linear');
  });
});
