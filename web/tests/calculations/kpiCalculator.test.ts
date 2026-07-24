import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import {
  grossYield,
  netYield,
  capRate,
  cashOnCashReturn,
  dscrNOI,
  mietmultiplikator,
  breakEvenRentMonthly,
  ltvRatio,
} from '@/lib/calculations/kpiCalculator';

describe('kpiCalculator', () => {
  it('grossYield', () => {
    const result = grossYield(f.coldRentYearly, f.parkingRentYearly, f.purchasePrice);
    expect(result).toBeCloseTo(0.04297, 4);
  });

  it('grossYield: zero purchase price returns null', () => {
    expect(grossYield(11_400, 576, 0)).toBeNull();
  });

  it('netYield', () => {
    const result = netYield(f.netOperatingIncomeYearly, f.totalInvestment);
    expect(result).toBeCloseTo(0.03114, 4);
  });

  it('netYield: zero investment returns null', () => {
    expect(netYield(9_303, 0)).toBeNull();
  });

  it('capRate', () => {
    const result = capRate(f.netOperatingIncomeYearly, f.purchasePrice);
    expect(result).toBeCloseTo(0.03339, 4);
  });

  it('cashOnCashReturn', () => {
    const result = cashOnCashReturn(f.cashflowAfterDebtYearly, f.equityUsed);
    expect(result).toBeCloseTo(-0.08163, 4);
  });

  it('cashOnCashReturn: zero equity returns null', () => {
    expect(cashOnCashReturn(-5_000, 0)).toBeNull();
  });

  it('dscrNOI', () => {
    const result = dscrNOI(f.netOperatingIncomeYearly, f.debtServiceAnnual);
    expect(result).toBeCloseTo(0.6238, 3);
  });

  it('dscrNOI: zero debt service returns null', () => {
    expect(dscrNOI(9_000, 0)).toBeNull();
  });

  it('mietmultiplikator', () => {
    const result = mietmultiplikator(f.purchasePrice, f.coldRentYearly, f.parkingRentYearly);
    expect(result).toBeCloseTo(23.26, 1);
  });

  it('mietmultiplikator: zero rent returns null', () => {
    expect(mietmultiplikator(278_600, 0, 0)).toBeNull();
  });

  it('breakEvenRentMonthly', () => {
    const result = breakEvenRentMonthly(f.operatingCostsNonRecoverableMonthly, f.monthlyMortgage);
    expect(result).toBeCloseTo(1_435.61, 1);
  });

  it('ltvRatio', () => {
    expect(ltvRatio(200_000, 300_000)).toBeCloseTo(0.6667, 3);
  });

  it('ltvRatio: zero investment returns null', () => {
    expect(ltvRatio(200_000, 0)).toBeNull();
  });
});
