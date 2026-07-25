import { describe, it, expect } from 'vitest';
import { makeDate } from '@/lib/calculations/dateHelpers';
import {
  makeWizardDefaultValues,
  requiresStatusOnboarding,
  canProceedFromStep,
  canFinish,
  totalSteps,
  mapToPropertyInsert,
  mapToStatusEntryInsert,
  type WizardFormValues,
} from '@/lib/wizard/wizardLogic';

const today = makeDate(2026, 7, 25);

function makeValues(overrides: Partial<WizardFormValues> = {}): WizardFormValues {
  return { ...makeWizardDefaultValues(today), ...overrides };
}

describe('makeWizardDefaultValues', () => {
  it('defaults dates to today and depreciationRate to the DB default of 2%', () => {
    const values = makeWizardDefaultValues(today);
    expect(values.economicTransferDate).toBe('2026-07-25');
    expect(values.purchaseDate).toBe('2026-07-25');
    expect(values.loanStartDate).toBe('2026-07-25');
    expect(values.depreciationRate).toBe(0.02);
    expect(values.parkingType).toBe('nicht_vorhanden');
    expect(values.fixedInterestPeriodYears).toBe(10);
  });
});

describe('requiresStatusOnboarding', () => {
  it('is true when economicTransferDate is in the past', () => {
    expect(requiresStatusOnboarding(makeValues({ economicTransferDate: '2026-06-01' }), today)).toBe(true);
  });

  it('is true when economicTransferDate is the current month', () => {
    expect(requiresStatusOnboarding(makeValues({ economicTransferDate: '2026-07-01' }), today)).toBe(true);
  });

  it('is false when economicTransferDate is a future month', () => {
    expect(requiresStatusOnboarding(makeValues({ economicTransferDate: '2026-08-01' }), today)).toBe(false);
  });
});

describe('totalSteps', () => {
  it('is 7 without status onboarding, 8 with it', () => {
    expect(totalSteps(makeValues({ economicTransferDate: '2026-08-01' }), today)).toBe(7);
    expect(totalSteps(makeValues({ economicTransferDate: '2026-06-01' }), today)).toBe(8);
  });
});

describe('canProceedFromStep', () => {
  it('blocks step 1 until name, address, city are filled', () => {
    expect(canProceedFromStep(1, makeValues())).toBe(false);
    expect(canProceedFromStep(1, makeValues({ name: 'ETW', address: 'Str. 1', city: 'Dresden' }))).toBe(true);
  });

  it('blocks step 3 until purchasePriceUnit > 0', () => {
    expect(canProceedFromStep(3, makeValues())).toBe(false);
    expect(canProceedFromStep(3, makeValues({ purchasePriceUnit: 1 }))).toBe(true);
  });

  it('does not block other steps', () => {
    expect(canProceedFromStep(2, makeValues())).toBe(true);
    expect(canProceedFromStep(5, makeValues())).toBe(true);
  });
});

describe('canFinish', () => {
  const completeValues = makeValues({
    name: 'ETW Dresden Neustadt',
    address: 'Dresdner Str. 12',
    city: 'Dresden',
    purchasePriceUnit: 263_600,
    coldRentMonthly: 950,
    loanAmount: 230_000,
    interestRate: 0.043,
    amortizationRate: 0.01,
    buildingValue: 228_000,
    landValue: 50_600,
  });

  it('is true once every required field from spec-property-setup.md is set', () => {
    expect(canFinish(completeValues)).toBe(true);
  });

  it('is false when any single required field is missing', () => {
    expect(canFinish({ ...completeValues, coldRentMonthly: 0 })).toBe(false);
    expect(canFinish({ ...completeValues, buildingValue: 0 })).toBe(false);
    expect(canFinish({ ...completeValues, loanAmount: 0 })).toBe(false);
    expect(canFinish({ ...completeValues, name: '' })).toBe(false);
  });
});

describe('mapToPropertyInsert', () => {
  it('maps camelCase wizard fields to snake_case DB columns and omits user_id', () => {
    const values = makeValues({ name: 'ETW', address: 'Str. 1', city: 'Dresden', purchasePriceUnit: 100_000 });
    const insert = mapToPropertyInsert(values);
    expect(insert.name).toBe('ETW');
    expect(insert.purchase_price_unit).toBe(100_000);
    expect(insert).not.toHaveProperty('user_id');
  });

  it('zeroes out parking fields when parkingType is nicht_vorhanden, even if stale values remain in the form', () => {
    const values = makeValues({
      parkingType: 'nicht_vorhanden',
      purchasePriceParking: 15_000,
      parkingRentMonthly: 48,
      hoaFeeParkingTotalMonthly: 20,
    });
    const insert = mapToPropertyInsert(values);
    expect(insert.purchase_price_parking).toBe(0);
    expect(insert.parking_rent_monthly).toBe(0);
    expect(insert.hoa_fee_parking_total_monthly).toBe(0);
  });

  it('keeps parking fields when parkingType is set', () => {
    const values = makeValues({ parkingType: 'tiefgarage', purchasePriceParking: 15_000, parkingRentMonthly: 48 });
    const insert = mapToPropertyInsert(values);
    expect(insert.purchase_price_parking).toBe(15_000);
    expect(insert.parking_rent_monthly).toBe(48);
  });

  it('falls back to the calculated monthly mortgage when the user left it at 0', () => {
    const values = makeValues({ loanAmount: 230_000, interestRate: 0.043, amortizationRate: 0.01, monthlyMortgage: 0 });
    const insert = mapToPropertyInsert(values);
    // (0.043 + 0.01) / 12 * 230_000 = 1_015.83...
    expect(insert.monthly_mortgage).toBeCloseTo(1015.83, 1);
  });

  it('keeps a manually-entered monthly mortgage instead of overwriting it with the calculated value', () => {
    const values = makeValues({ loanAmount: 230_000, interestRate: 0.043, amortizationRate: 0.01, monthlyMortgage: 1_242.85 });
    const insert = mapToPropertyInsert(values);
    expect(insert.monthly_mortgage).toBe(1_242.85);
  });

  it('converts NaN/null optional numeric fields to null', () => {
    const values = makeValues({ yearBuilt: NaN, usableAreaSqm: null, rooms: NaN });
    const insert = mapToPropertyInsert(values);
    expect(insert.year_built).toBeNull();
    expect(insert.usable_area_sqm).toBeNull();
    expect(insert.rooms).toBeNull();
  });

  it('guards non-nullable numeric fields against NaN (falls back to 0)', () => {
    const values = makeValues({ notaryCosts: NaN, landTransferTax: NaN });
    const insert = mapToPropertyInsert(values);
    expect(insert.notary_costs).toBe(0);
    expect(insert.land_transfer_tax).toBe(0);
  });
});

describe('mapToStatusEntryInsert', () => {
  it('returns null when the transfer date is in the future (no onboarding step)', () => {
    expect(mapToStatusEntryInsert(makeValues({ economicTransferDate: '2026-08-01' }), today)).toBeNull();
  });

  it('maps the first status entry when the transfer date is in the past', () => {
    const values = makeValues({
      economicTransferDate: '2026-06-01',
      firstStatusDate: '2026-06-01',
      firstStatus: 'vermietet',
    });
    expect(mapToStatusEntryInsert(values, today)).toEqual({
      date: '2026-06-01',
      status: 'vermietet',
      income_actual_monthly: null,
      notes: '',
    });
  });

  it('includes income_actual_monthly only when status is mietgarantie', () => {
    const mietgarantie = makeValues({ economicTransferDate: '2026-06-01', firstStatus: 'mietgarantie', firstStatusIncome: 500 });
    expect(mapToStatusEntryInsert(mietgarantie, today)?.income_actual_monthly).toBe(500);

    const vermietet = makeValues({ economicTransferDate: '2026-06-01', firstStatus: 'vermietet', firstStatusIncome: 500 });
    expect(mapToStatusEntryInsert(vermietet, today)?.income_actual_monthly).toBeNull();
  });
});
