import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import { interestForCalendarYear } from '@/lib/calculations/amortizationCalculator';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
import { annualTaxableIncome, taxEffectYearly, taxEffectMonthly } from '@/lib/calculations/taxCalculator';
import { annualTaxableIncomeBreakdown } from '@/lib/calculations/taxCalculator';
import { taxLineItemsForScenario, blendTaxLineItems, type TaxScenarioInput } from '@/lib/calculations/taxCalculator';

const baseInput = {
  economicTransferDate: f.economicTransferDate,
  loanStartDate: f.loanStartDate,
  loanAmount: f.loanAmount,
  interestRate: f.interestRate,
  monthlyMortgage: f.monthlyMortgage,
  afaBasis: f.afaBasis,
  depreciationRate: f.depreciationRate,
  hoaUnitNonRecoverableMonthly: 125.0,
  hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
  hoaParkingNonRecoverableMonthly: 0,
  hoaParkingRecoverableMonthly: 0,
  propertyTaxUnitMonthly: f.propertyTaxMonthly,
  propertyTaxParkingMonthly: 0,
  propertyManagementMonthly: f.propertyManagementMonthly,
  propertyInsuranceMonthly: 0,
  otherCostsMonthly: 0,
  coldRentMonthly: f.coldRentMonthly,
  parkingRentMonthly: f.parkingRentMonthly,
  otherIncomeMonthly: 0,
};

describe('taxCalculator.annualTaxableIncome', () => {
  it('all vermietet, acquisition year (2026)', () => {
    const history: StatusEntry[] = [{ date: f.economicTransferDate, status: 'vermietet', incomeActualMonthly: null }];
    const result = annualTaxableIncome({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
    });
    expect(result).toBeCloseTo(-9100.44, 0);
  });

  it('propertyInsuranceMonthly is deducted (regression: was silently missing)', () => {
    const history: StatusEntry[] = [{ date: f.economicTransferDate, status: 'vermietet', incomeActualMonthly: null }];
    const withoutInsurance = annualTaxableIncome({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
      propertyInsuranceMonthly: 0,
    });
    const withInsurance = annualTaxableIncome({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
      propertyInsuranceMonthly: 20,
    });
    // 11 ownership months (Feb-Dec 2026) × -20/month insurance deduction.
    expect(withInsurance - withoutInsurance).toBeCloseTo(-20 * 11, 2);
  });

  it('all leerstand, acquisition year (2026)', () => {
    const history: StatusEntry[] = [{ date: f.economicTransferDate, status: 'leerstand', incomeActualMonthly: null }];
    const result = annualTaxableIncome({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
    });
    expect(result).toBeCloseTo(-23478.36, 0);
  });

  it('mixed: leerstand Feb, vermietet Mar-Dec (2026)', () => {
    const history: StatusEntry[] = [
      { date: f.economicTransferDate, status: 'leerstand', incomeActualMonthly: null },
      { date: makeDate(2026, 3, 1), status: 'vermietet', incomeActualMonthly: null },
    ];
    const result = annualTaxableIncome({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
    });
    expect(result).toBeCloseTo(-10407.52, 0);
  });

  it('full year, no acquisition-year proration (2027)', () => {
    const history: StatusEntry[] = [{ date: makeDate(2027, 1, 1), status: 'vermietet', incomeActualMonthly: null }];
    const interest2027 = interestForCalendarYear(2027, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
    const afa2027 = f.afaBasis * f.depreciationRate;
    const income2027 = (f.coldRentMonthly + f.parkingRentMonthly) * 12;
    const expected = income2027 - interest2027 - afa2027 - (125.0 + f.propertyManagementMonthly) * 12;

    const result = annualTaxableIncome({
      ...baseInput,
      year: 2027,
      statusHistory: history,
      today: makeDate(2027, 12, 31),
    });
    expect(result).toBeCloseTo(expected, 0);
  });
});

describe('taxCalculator.taxEffectYearly / taxEffectMonthly', () => {
  it('negative taxable income produces a positive (refund) effect', () => {
    expect(taxEffectYearly(-9100.44, 0.42)).toBeGreaterThan(0);
  });

  it('taxEffectYearly value', () => {
    expect(taxEffectYearly(-9100.44, 0.42)).toBeCloseTo(3822.18, 1);
  });

  it('taxEffectMonthly divides by ownership months, not always 12', () => {
    const yearly = taxEffectYearly(-9100.44, 0.42);
    expect(taxEffectMonthly(yearly, 11)).toBeCloseTo(yearly / 11, 2);
  });
});

describe('taxCalculator.annualTaxableIncomeBreakdown', () => {
  it('taxableIncome matches annualTaxableIncome for the same input when extraordinaryCostsDeductibleYearly is 0', () => {
    const history: StatusEntry[] = [{ date: f.economicTransferDate, status: 'vermietet', incomeActualMonthly: null }];
    const breakdown = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
    });
    expect(breakdown.taxableIncome).toBeCloseTo(-9100.44, 0);
  });

  it('a deductible extraordinary cost reduces taxableIncome by exactly its amount', () => {
    const history: StatusEntry[] = [{ date: f.economicTransferDate, status: 'vermietet', incomeActualMonthly: null }];
    const without = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
    });
    const withCost = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
      extraordinaryCostsDeductibleYearly: 800,
    });
    expect(without.taxableIncome - withCost.taxableIncome).toBeCloseTo(800, 2);
    expect(withCost.extraordinaryCostsDeductible).toBe(800);
  });

  it('line items sum to taxableIncome (mixed leerstand/vermietet year)', () => {
    const history: StatusEntry[] = [
      { date: f.economicTransferDate, status: 'leerstand', incomeActualMonthly: null },
      { date: makeDate(2026, 3, 1), status: 'vermietet', incomeActualMonthly: null },
    ];
    const breakdown = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
    });
    const recomputed =
      breakdown.income -
      breakdown.interest -
      breakdown.depreciation -
      breakdown.hoaNonRecoverableWE -
      breakdown.insuranceWE -
      breakdown.managementWE -
      breakdown.otherCostsWE -
      breakdown.hoaRecoverableWE -
      breakdown.propertyTaxWE -
      breakdown.hoaNonRecoverableTE -
      breakdown.hoaRecoverableTE -
      breakdown.propertyTaxTE -
      breakdown.extraordinaryCostsDeductible;
    expect(recomputed).toBeCloseTo(breakdown.taxableIncome, 6);
    expect(breakdown.taxableIncome).toBeCloseTo(-10407.52, 0);
  });

  it('annualTaxableIncomeBreakdown: includes otherIncomeMonthly for fully vermietet months', () => {
    // Full calendar year (2027), no acquisition-year proration — 12 ownership months.
    const history: StatusEntry[] = [{ date: makeDate(2027, 1, 1), status: 'vermietet', incomeActualMonthly: null }];
    const input = {
      ...baseInput,
      year: 2027,
      statusHistory: history,
      today: makeDate(2027, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
      otherIncomeMonthly: 75,
    };
    const before = annualTaxableIncomeBreakdown({ ...input, otherIncomeMonthly: 0 });
    const after = annualTaxableIncomeBreakdown(input);
    expect(after.income).toBeCloseTo(before.income + 75 * 12, 2);
  });

  it('a year entirely before ownership returns all-zero line items', () => {
    const breakdown = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2024,
      statusHistory: [],
      today: makeDate(2024, 12, 31),
      extraordinaryCostsDeductibleYearly: 500,
    });
    expect(breakdown.taxableIncome).toBe(0);
    expect(breakdown.income).toBe(0);
    expect(breakdown.extraordinaryCostsDeductible).toBe(0);
  });

  it('without leerstandQuoteOverride, behaves exactly as before (regression guard)', () => {
    const input = {
      year: 2026,
      statusHistory: [{ date: makeDate(2026, 1, 1), status: 'vermietet' as const, incomeActualMonthly: null }],
      economicTransferDate: makeDate(2023, 1, 1),
      loanStartDate: makeDate(2020, 1, 1),
      loanAmount: 200000,
      interestRate: 0.03,
      monthlyMortgage: 900,
      afaBasis: 160000,
      depreciationRate: 0.02,
      hoaUnitNonRecoverableMonthly: 100,
      hoaUnitRecoverableMonthly: 80,
      hoaParkingNonRecoverableMonthly: 0,
      hoaParkingRecoverableMonthly: 0,
      propertyTaxUnitMonthly: 30,
      propertyTaxParkingMonthly: 0,
      propertyManagementMonthly: 20,
      propertyInsuranceMonthly: 0,
      otherCostsMonthly: 0,
      coldRentMonthly: 800,
      parkingRentMonthly: 0,
      otherIncomeMonthly: 0,
      today: makeDate(2026, 9, 12),
      extraordinaryCostsDeductibleYearly: 0,
    };
    const withoutOverride = annualTaxableIncomeBreakdown(input);
    const withUndefinedOverride = annualTaxableIncomeBreakdown({ ...input, leerstandQuoteOverride: undefined });
    expect(withUndefinedOverride).toEqual(withoutOverride);
  });

  it('leerstandQuoteOverride blends only months from the given month onward, leaves earlier months as real Ist', () => {
    const input = {
      year: 2026,
      statusHistory: [{ date: makeDate(2026, 1, 1), status: 'vermietet' as const, incomeActualMonthly: null }],
      economicTransferDate: makeDate(2023, 1, 1),
      loanStartDate: makeDate(2020, 1, 1),
      loanAmount: 200000,
      interestRate: 0.03,
      monthlyMortgage: 900,
      afaBasis: 160000,
      depreciationRate: 0.02,
      hoaUnitNonRecoverableMonthly: 100,
      hoaUnitRecoverableMonthly: 80,
      hoaParkingNonRecoverableMonthly: 0,
      hoaParkingRecoverableMonthly: 0,
      propertyTaxUnitMonthly: 30,
      propertyTaxParkingMonthly: 0,
      propertyManagementMonthly: 20,
      propertyInsuranceMonthly: 0,
      otherCostsMonthly: 0,
      coldRentMonthly: 800,
      parkingRentMonthly: 0,
      otherIncomeMonthly: 0,
      today: makeDate(2026, 9, 12),
      extraordinaryCostsDeductibleYearly: 0,
    };
    const naive = annualTaxableIncomeBreakdown(input);
    const overridden = annualTaxableIncomeBreakdown({
      ...input,
      leerstandQuoteOverride: { fromMonth: makeDate(2026, 9, 1), quote: 1 }, // volle Leerstand-Annahme ab September
    });
    // Ab September (4 Monate: Sep-Dez) fällt die Miete komplett weg -> weniger Einnahmen als naiv (weiterhin vermietet).
    expect(overridden.income).toBeLessThan(naive.income);
    expect(overridden.income).toBeCloseTo(naive.income - 800 * 4, 2);
    // Zinsen/AfA sind vom Override unberührt.
    expect(overridden.interest).toBe(naive.interest);
    expect(overridden.depreciation).toBe(naive.depreciation);
  });

  it('disbursements: excludes non-deductible-tranche interest from taxableIncome', () => {
    const disbursements = [
      { date: makeDate(2025, 10, 1), amount: 2_734.45, deductible: false },
      { date: makeDate(2026, 1, 20), amount: 278_665.55, deductible: true },
    ];
    const withoutDisbursements = annualTaxableIncomeBreakdown({
      year: 2026,
      statusHistory: [{ date: makeDate(2026, 1, 1), status: 'vermietet', incomeActualMonthly: null }],
      stellplatzStatusHistory: [],
      economicTransferDate: makeDate(2026, 1, 1),
      loanStartDate: makeDate(2025, 12, 1),
      loanAmount: 281_400,
      interestRate: 0.043,
      monthlyMortgage: 1_242.85,
      afaBasis: 0,
      depreciationRate: 0.02,
      hoaUnitNonRecoverableMonthly: 0,
      hoaUnitRecoverableMonthly: 0,
      hoaParkingNonRecoverableMonthly: 0,
      hoaParkingRecoverableMonthly: 0,
      propertyTaxUnitMonthly: 0,
      propertyTaxParkingMonthly: 0,
      propertyManagementMonthly: 0,
      propertyInsuranceMonthly: 0,
      otherCostsMonthly: 0,
      coldRentMonthly: 999,
      parkingRentMonthly: 0,
      otherIncomeMonthly: 0,
      today: makeDate(2026, 9, 16),
      extraordinaryCostsDeductibleYearly: 0,
    });
    const withDisbursements = annualTaxableIncomeBreakdown({
      year: 2026,
      statusHistory: [{ date: makeDate(2026, 1, 1), status: 'vermietet', incomeActualMonthly: null }],
      stellplatzStatusHistory: [],
      economicTransferDate: makeDate(2026, 1, 1),
      loanStartDate: makeDate(2025, 12, 1),
      loanAmount: 281_400,
      interestRate: 0.043,
      monthlyMortgage: 1_242.85,
      afaBasis: 0,
      depreciationRate: 0.02,
      hoaUnitNonRecoverableMonthly: 0,
      hoaUnitRecoverableMonthly: 0,
      hoaParkingNonRecoverableMonthly: 0,
      hoaParkingRecoverableMonthly: 0,
      propertyTaxUnitMonthly: 0,
      propertyTaxParkingMonthly: 0,
      propertyManagementMonthly: 0,
      propertyInsuranceMonthly: 0,
      otherCostsMonthly: 0,
      coldRentMonthly: 999,
      parkingRentMonthly: 0,
      otherIncomeMonthly: 0,
      today: makeDate(2026, 9, 16),
      extraordinaryCostsDeductibleYearly: 0,
      disbursements,
    });
    // less interest deducted -> HIGHER taxableIncome (less of a loss)
    expect(withDisbursements.taxableIncome).toBeGreaterThan(withoutDisbursements.taxableIncome);
    expect(withDisbursements.interest).toBeLessThan(withoutDisbursements.interest);
  });
});

describe('taxCalculator.taxLineItemsForScenario', () => {
  const scenarioBaseInput: Omit<TaxScenarioInput, 'scenario' | 'year'> = {
    coldRentMonthly: f.coldRentMonthly,
    parkingRentMonthly: f.parkingRentMonthly,
    loanStartDate: f.loanStartDate,
    loanAmount: f.loanAmount,
    interestRate: f.interestRate,
    monthlyMortgage: f.monthlyMortgage,
    afaBasis: f.afaBasis,
    depreciationRate: f.depreciationRate,
    hoaUnitNonRecoverableMonthly: 125.0,
    hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
    hoaParkingNonRecoverableMonthly: 0,
    hoaParkingRecoverableMonthly: 0,
    propertyTaxUnitMonthly: f.propertyTaxMonthly,
    propertyTaxParkingMonthly: 0,
    propertyManagementMonthly: f.propertyManagementMonthly,
    propertyInsuranceMonthly: 0,
    otherCostsMonthly: 0,
  };

  it('vollvermietung scenario for 2027 matches the full-year annualTaxableIncomeBreakdown (all vermietet)', () => {
    const scenarioResult = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung', year: 2027 });
    const breakdownResult = annualTaxableIncomeBreakdown({
      ...baseInput,
      year: 2027,
      statusHistory: [{ date: makeDate(2027, 1, 1), status: 'vermietet', incomeActualMonthly: null }],
      today: makeDate(2027, 12, 31),
      extraordinaryCostsDeductibleYearly: 0,
    });
    expect(scenarioResult.taxableIncome).toBeCloseTo(breakdownResult.taxableIncome, 0);
    expect(scenarioResult.hoaRecoverableWE).toBe(0);
    expect(scenarioResult.propertyTaxWE).toBe(0);
  });

  it('leerstand scenario: zero income, full owner-borne recoverable WE costs for all 12 months', () => {
    const result = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand', year: 2027 });
    expect(result.income).toBe(0);
    expect(result.hoaRecoverableWE).toBeCloseTo(f.hoaFeeRecoverableMonthly * 12, 2);
    expect(result.propertyTaxWE).toBeCloseTo(f.propertyTaxMonthly * 12, 2);
  });

  it('AfA is never prorated (no acquisition-year discount in a scenario forecast)', () => {
    const result = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung', year: 2030 });
    expect(result.depreciation).toBeCloseTo(f.afaBasis * f.depreciationRate, 2);
  });
});

describe('taxCalculator.blendTaxLineItems', () => {
  const scenarioBaseInput: Omit<TaxScenarioInput, 'scenario' | 'year'> = {
    coldRentMonthly: 800,
    parkingRentMonthly: 0,
    loanStartDate: makeDate(2020, 1, 1),
    loanAmount: 200000,
    interestRate: 0.03,
    monthlyMortgage: 900,
    afaBasis: 160000,
    depreciationRate: 0.02,
    hoaUnitNonRecoverableMonthly: 100,
    hoaUnitRecoverableMonthly: 80,
    hoaParkingNonRecoverableMonthly: 0,
    hoaParkingRecoverableMonthly: 0,
    propertyTaxUnitMonthly: 30,
    propertyTaxParkingMonthly: 0,
    propertyManagementMonthly: 20,
    propertyInsuranceMonthly: 0,
    otherCostsMonthly: 0,
  };

  it('quote 0 equals the pure vollvermietung scenario', () => {
    const voll = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung', year: 2027 });
    const leer = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand', year: 2027 });
    const blended = blendTaxLineItems(voll, leer, 0);
    expect(blended.taxableIncome).toBeCloseTo(voll.taxableIncome, 6);
    expect(blended.income).toBeCloseTo(voll.income, 6);
  });

  it('quote 1 equals the pure leerstand scenario', () => {
    const voll = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung', year: 2027 });
    const leer = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand', year: 2027 });
    const blended = blendTaxLineItems(voll, leer, 1);
    expect(blended.taxableIncome).toBeCloseTo(leer.taxableIncome, 6);
    expect(blended.hoaRecoverableWE).toBeCloseTo(leer.hoaRecoverableWE, 6);
    expect(blended.propertyTaxWE).toBeCloseTo(leer.propertyTaxWE, 6);
  });

  it('quote 0.2 linearly interpolates income and leerstand-only cost lines, leaves scenario-invariant lines untouched', () => {
    const voll = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'vollvermietung', year: 2027 });
    const leer = taxLineItemsForScenario({ ...scenarioBaseInput, scenario: 'leerstand', year: 2027 });
    const blended = blendTaxLineItems(voll, leer, 0.2);
    expect(blended.income).toBeCloseTo(voll.income * 0.8, 6);
    expect(blended.hoaRecoverableWE).toBeCloseTo(leer.hoaRecoverableWE * 0.2, 6);
    expect(blended.propertyTaxWE).toBeCloseTo(leer.propertyTaxWE * 0.2, 6);
    expect(blended.interest).toBe(voll.interest);
    expect(blended.depreciation).toBe(voll.depreciation);
    expect(blended.hoaNonRecoverableWE).toBe(voll.hoaNonRecoverableWE);
    expect(blended.taxableIncome).toBeCloseTo(voll.taxableIncome * 0.8 + leer.taxableIncome * 0.2, 6);
  });
});
