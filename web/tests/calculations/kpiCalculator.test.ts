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
  actualVacancyRate,
  benchmarkColor,
  hoaNonRecoverableMonthly,
  scalePosition,
  benchmarkThreshold,
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

  it('hoaNonRecoverableMonthly', () => {
    const result = hoaNonRecoverableMonthly(f.hoaFeeTotalMonthly, f.hoaFeeRecoverableMonthly, f.maintenanceReserveMonthly);
    expect(result).toBeCloseTo(f.hoaFeeTotalMonthly - f.hoaFeeRecoverableMonthly - f.maintenanceReserveMonthly, 2);
  });

  it('ltvRatio', () => {
    expect(ltvRatio(200_000, 300_000)).toBeCloseTo(0.6667, 3);
  });

  it('ltvRatio: zero investment returns null', () => {
    expect(ltvRatio(200_000, 0)).toBeNull();
  });

  it('actualVacancyRate', () => {
    expect(actualVacancyRate(28, 90)).toBeCloseTo(28 / 90, 4);
  });

  it('actualVacancyRate: zero ownership days returns null', () => {
    expect(actualVacancyRate(0, 0)).toBeNull();
  });

  it('benchmarkColor: grossYield thresholds (higher is better)', () => {
    expect(benchmarkColor('grossYield', 0.06)).toBe('green');
    expect(benchmarkColor('grossYield', 0.04)).toBe('orange');
    expect(benchmarkColor('grossYield', 0.02)).toBe('red');
  });

  it('benchmarkColor: eigenkapitalrendite thresholds (higher is better)', () => {
    expect(benchmarkColor('eigenkapitalrendite', 0.1)).toBe('green');
    expect(benchmarkColor('eigenkapitalrendite', 0.06)).toBe('orange');
    expect(benchmarkColor('eigenkapitalrendite', 0.02)).toBe('red');
  });

  it('benchmarkColor: ltv thresholds (lower is better)', () => {
    expect(benchmarkColor('ltv', 0.65)).toBe('green');
    expect(benchmarkColor('ltv', 0.75)).toBe('orange');
    expect(benchmarkColor('ltv', 0.85)).toBe('red');
  });

  it('benchmarkColor: dscr thresholds', () => {
    expect(benchmarkColor('dscr', 1.3)).toBe('green');
    expect(benchmarkColor('dscr', 1.1)).toBe('orange');
    expect(benchmarkColor('dscr', 0.9)).toBe('red');
  });

  it('benchmarkColor: kaufpreisfaktor thresholds (lower is better)', () => {
    expect(benchmarkColor('kaufpreisfaktor', 18)).toBe('green');
    expect(benchmarkColor('kaufpreisfaktor', 22)).toBe('orange');
    expect(benchmarkColor('kaufpreisfaktor', 30)).toBe('red');
  });

  it('benchmarkColor: null value returns null (no chip)', () => {
    expect(benchmarkColor('netYield', null)).toBeNull();
  });

  it('benchmarkColor: ltv exact boundaries', () => {
    expect(benchmarkColor('ltv', 0.7)).toBe('green');
    expect(benchmarkColor('ltv', 0.8)).toBe('orange');
  });

  it('benchmarkColor: dscr exact boundaries', () => {
    expect(benchmarkColor('dscr', 1.25)).toBe('green');
    expect(benchmarkColor('dscr', 1.0)).toBe('orange');
  });

  it('benchmarkColor: kaufpreisfaktor exact boundaries', () => {
    expect(benchmarkColor('kaufpreisfaktor', 20)).toBe('green');
    expect(benchmarkColor('kaufpreisfaktor', 25)).toBe('orange');
  });

  it('benchmarkColor: cashOnCash thresholds', () => {
    expect(benchmarkColor('cashOnCash', 0.07)).toBe('green');
    expect(benchmarkColor('cashOnCash', 0.04)).toBe('orange');
    expect(benchmarkColor('cashOnCash', 0.01)).toBe('red');
  });

  it('benchmarkColor: actualVacancyRate thresholds', () => {
    expect(benchmarkColor('actualVacancyRate', 0.02)).toBe('green');
    expect(benchmarkColor('actualVacancyRate', 0.05)).toBe('orange');
    expect(benchmarkColor('actualVacancyRate', 0.1)).toBe('red');
  });

  it('scalePosition: grossYield (higherIsBetter, domain 0–0.10) — midpoint value sits at 0.5', () => {
    expect(scalePosition('grossYield', 0.05)).toBeCloseTo(0.5, 4);
  });

  it('scalePosition: grossYield — value at domainMin sits at 0, value above domainMax clamps to 1', () => {
    expect(scalePosition('grossYield', 0)).toBeCloseTo(0, 4);
    expect(scalePosition('grossYield', 0.5)).toBe(1);
  });

  it('scalePosition: grossYield — negative value (below domainMin) clamps to 0', () => {
    expect(scalePosition('grossYield', -0.05)).toBe(0);
  });

  it('scalePosition: ltv (lowerIsBetter, domain 0–1.10) — low (good) value sits near 1, high (bad) value sits near 0', () => {
    expect(scalePosition('ltv', 0)).toBeCloseTo(1, 4);
    expect(scalePosition('ltv', 1.1)).toBeCloseTo(0, 4);
  });

  it('scalePosition: ltv — value above domainMax clamps to 0, not negative', () => {
    expect(scalePosition('ltv', 2)).toBe(0);
  });

  it('scalePosition: kaufpreisfaktor (lowerIsBetter, domain 10–35) — low value sits at 1, high value sits at 0', () => {
    expect(scalePosition('kaufpreisfaktor', 10)).toBeCloseTo(1, 4);
    expect(scalePosition('kaufpreisfaktor', 35)).toBeCloseTo(0, 4);
    expect(scalePosition('kaufpreisfaktor', 5)).toBe(1); // below domainMin clamps to the "good" end
  });

  it('benchmarkThreshold: exposes direction/green/orange/domain for a KPI', () => {
    const t = benchmarkThreshold('dscr');
    expect(t).toEqual({ direction: 'higherIsBetter', green: 1.25, orange: 1.0, domainMin: 0, domainMax: 2.0 });
  });
});
