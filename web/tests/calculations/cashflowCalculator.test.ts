import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
import {
  ownerBorneRecoverableWEForMonth,
  cashflowBeforeTax,
  cashflowAfterTax,
} from '@/lib/calculations/cashflowCalculator';

describe('cashflowCalculator', () => {
  const today = makeDate(2026, 12, 1);

  it('ownerBorneRecoverableWEForMonth: vermietet all month is zero', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'vermietet', incomeActualMonthly: null }];
    const result = ownerBorneRecoverableWEForMonth(makeDate(2026, 6, 1), history, today, f.hoaFeeRecoverableMonthly, f.propertyTaxAnnual);
    expect(result).toBeCloseTo(0, 2);
  });

  it('ownerBorneRecoverableWEForMonth: leerstand all month is full recoverable + Grundsteuer', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'leerstand', incomeActualMonthly: null }];
    const result = ownerBorneRecoverableWEForMonth(makeDate(2026, 6, 1), history, today, f.hoaFeeRecoverableMonthly, f.propertyTaxAnnual);
    expect(result).toBeCloseTo(f.operatingCostsRecoverableMonthly, 1);
  });

  it('ownerBorneRecoverableWEForMonth: mietgarantie all month is full recoverable + Grundsteuer', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'mietgarantie', incomeActualMonthly: 999 }];
    const result = ownerBorneRecoverableWEForMonth(makeDate(2026, 6, 1), history, today, f.hoaFeeRecoverableMonthly, f.propertyTaxAnnual);
    expect(result).toBeCloseTo(f.operatingCostsRecoverableMonthly, 1);
  });

  it('cashflowBeforeTax: vermietet, no parking', () => {
    // 950 - 1242.85 - 192.76 = -485.61
    const result = cashflowBeforeTax({
      incomeActualMonthly: 950,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: 0,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsThisMonth: 0,
    });
    expect(result).toBeCloseTo(-485.61, 1);
  });

  it('cashflowBeforeTax: leerstand, no parking', () => {
    // 0 - 1242.85 - 192.76 - 309.08 = -1744.69
    const result = cashflowBeforeTax({
      incomeActualMonthly: 0,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: f.operatingCostsRecoverableMonthly,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsThisMonth: 0,
    });
    expect(result).toBeCloseTo(-1744.69, 1);
  });

  it('cashflowBeforeTax: with an extraordinary cost', () => {
    const result = cashflowBeforeTax({
      incomeActualMonthly: 950,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: 0,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsThisMonth: 500,
    });
    expect(result).toBeCloseTo(-985.61, 1);
  });

  it('cashflowBeforeTax: parking costs are always owner-borne (vermietet unit, occupied parking)', () => {
    const result = cashflowBeforeTax({
      incomeActualMonthly: 950 + 48,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: 0,
      hoaFeeParkingNonRecoverableMonthly: 20,
      hoaFeeParkingMaintenanceReserveMonthly: 5,
      hoaFeeParkingRecoverableMonthly: 10,
      propertyTaxParkingMonthly: 3,
      extraordinaryCostsThisMonth: 0,
    });
    // -485.61 (base, now with parking rent 48 added to income) - 20 - 5 - 10 - 3
    expect(result).toBeCloseTo(950 + 48 - f.monthlyMortgage - f.operatingCostsNonRecoverableMonthly - 38, 1);
  });

  it('cashflowAfterTax adds the monthly tax effect', () => {
    const result = cashflowAfterTax(-485.61, f.taxEffectMonthly);
    expect(result).toBeCloseTo(-136.51, 1);
  });
});
