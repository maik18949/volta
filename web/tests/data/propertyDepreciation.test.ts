import { describe, it, expect } from 'vitest';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import {
  buildAfaCardModel,
  buildSwitchPreview,
  depreciationAmountOverride,
  propertyAfaBasis,
} from '@/lib/data/propertyDepreciation';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    purchase_price_unit: 300_000,
    purchase_price_parking: 0,
    land_transfer_tax: 0,
    notary_costs: 0,
    land_registry_costs: 0,
    agent_fee: 0,
    appraisal_costs: 0,
    building_value: 300_000,
    renovation_afa_eligible: 0,
    depreciation_rate: 0.03,
    depreciation_method: 'degressiv_5a',
    degressive_switch_year: null,
    economic_transfer_date: '2026-01-01',
    marginal_tax_rate: 0.42,
    ...overrides,
  } as unknown as PropertyRow;
}

describe('propertyAfaBasis', () => {
  it('ist Gebäudewert + anteilige Nebenkosten + Renovierung', () => {
    expect(propertyAfaBasis(makeProperty())).toBe(300_000);
    expect(propertyAfaBasis(makeProperty({ building_value: 240_000, notary_costs: 5_000 }))).toBeCloseTo(240_000 + 5_000 * 0.8, 6);
  });
});

describe('depreciationAmountOverride', () => {
  it('lineare Objekte liefern undefined (bisheriger Rechenweg bleibt aktiv)', () => {
    expect(depreciationAmountOverride(makeProperty({ depreciation_method: 'linear' }), 300_000, 2027)).toBeUndefined();
  });

  it('degressive Objekte liefern den Plan-Betrag, vor dem Erwerbsjahr 0', () => {
    const property = makeProperty();
    expect(depreciationAmountOverride(property, 300_000, 2027)).toBeCloseTo(14_250, 6);
    expect(depreciationAmountOverride(property, 300_000, 2025)).toBe(0);
  });
});

describe('buildAfaCardModel', () => {
  it('degressiv, Wechsel noch weit weg (heute 2026)', () => {
    const model = buildAfaCardModel(makeProperty(), makeDate(2026, 6, 15));
    expect(model).toMatchObject({ method: 'degressiv_5a', year: 2026, amount: 15_000, bookValueEnd: 285_000, phase: 'degressiv' });
    expect(model.taxSaving).toBeCloseTo(6_300, 6);
    expect(model.switch).toMatchObject({ state: 'weit', optimalYear: 2040, switchYear: null });
    expect(model.outlook.endYear).toBeNull();
    expect(model.outlook.amountIn5Years).toBeCloseTo(300_000 * 0.95 ** 5 * 0.05, 6);
  });

  it('Zustände fällig, überfällig, vorgemerkt, aktiv', () => {
    expect(buildAfaCardModel(makeProperty(), makeDate(2039, 3, 1)).switch?.state).toBe('faellig');
    const overdue = buildAfaCardModel(makeProperty(), makeDate(2045, 3, 1));
    expect(overdue.switch?.state).toBe('ueberfaellig');
    expect(overdue.switch!.lostAmountThisYear).toBeGreaterThan(0);
    const planned = makeProperty({ degressive_switch_year: 2040 });
    expect(buildAfaCardModel(planned, makeDate(2030, 3, 1)).switch).toMatchObject({ state: 'vorgemerkt', switchYear: 2040 });
    const active = buildAfaCardModel(planned, makeDate(2041, 3, 1));
    expect(active.switch?.state).toBe('aktiv');
    expect(active.phase).toBe('linear_nach_wechsel');
    expect(active.outlook.endYear).toBe(2059);
  });

  it('linear: Restwert vorhanden, kein Wechsel-Thema', () => {
    const model = buildAfaCardModel(makeProperty({ depreciation_method: 'linear' }), makeDate(2026, 6, 15));
    expect(model).toMatchObject({ method: 'linear', amount: 9_000, bookValueEnd: 291_000, switch: null });
    expect(model.outlook.endYear).toBe(2059);
  });

  it('vor dem Erwerbsjahr: keine AfA, voller Restwert, keine Phase', () => {
    const model = buildAfaCardModel(makeProperty(), makeDate(2025, 6, 15));
    expect(model).toMatchObject({ amount: 0, bookValueEnd: 300_000, phase: null });
  });
});

describe('buildSwitchPreview', () => {
  it('vergleicht Wechseljahr, +5 und +10 Jahre mit und ohne Wechsel', () => {
    const preview = buildSwitchPreview(makeProperty(), 2040);
    expect(preview.rows.map((row) => row.year)).toEqual([2040, 2045, 2050]);
    expect(preview.rows[0].withoutSwitch).toBeCloseTo(7_315, 0);
    expect(preview.rows[0].withSwitch).toBeCloseTo(7_567, 0);
    expect(preview.rows[0].taxEffect).toBeCloseTo(106, 0);
    expect(preview.endYearWithout).toBeNull();
    expect(preview.endYearWith).toBe(2059);
  });
});
