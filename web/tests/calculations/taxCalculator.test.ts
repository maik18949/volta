import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import { interestForCalendarYear } from '@/lib/calculations/amortizationCalculator';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
import { annualTaxableIncome, taxEffectYearly, taxEffectMonthly } from '@/lib/calculations/taxCalculator';

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
