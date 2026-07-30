import { describe, it, expect } from 'vitest';
import { computePortfolioTotals } from '@/lib/data/properties';
import type { PropertyWithSummary } from '@/lib/data/properties';
import type { PropertySummary } from '@/lib/data/propertySummary';

/**
 * computePortfolioTotals only reads `.summary` off each item, so the `.property` half can be a
 * meaningless stub — no real PropertyRow shape is needed for these tests.
 */
function makeItem(overrides: Partial<PropertySummary> = {}): PropertyWithSummary {
  const summary: PropertySummary = {
    totalInvestment: 0,
    totalPurchasePrice: 0,
    purchasePricePerSqm: 0,
    remainingDebtNow: 0,
    netYield: null,
    netOperatingIncomeYearly: 0,
    currentStatus: 'vermietet',
    cashflowAfterTaxMonthly: 0,
    incomeActualMonthly: 0,
    cashflowBeforeTaxMonthly: 0,
    taxEffectMonthly: 0,
    taxEffectYearly: 0,
    ...overrides,
  };
  return { property: {} as PropertyWithSummary['property'], summary, coverPhotoUrl: null };
}

describe('computePortfolioTotals', () => {
  it('returns all-zero/null totals for an empty portfolio (no division by zero)', () => {
    const totals = computePortfolioTotals([]);
    expect(totals).toEqual({
      count: 0,
      cashflowMonthly: 0,
      totalInvestment: 0,
      averageNetYield: null,
      remainingDebt: 0,
    });
  });

  it('computes averageNetYield as a true weighted average (Σ NOI / Σ totalInvestment), not a mean of per-property yields', () => {
    const items = [
      makeItem({ totalInvestment: 100_000, netOperatingIncomeYearly: 4_000 }), // netYield 0.04
      makeItem({ totalInvestment: 300_000, netOperatingIncomeYearly: 9_000 }), // netYield 0.03
    ];

    const totals = computePortfolioTotals(items);

    // Weighted: (4_000 + 9_000) / (100_000 + 300_000) = 13_000 / 400_000 = 0.0325
    // A naive mean of the two yields (0.04, 0.03) would wrongly give 0.035.
    expect(totals.averageNetYield).toBeCloseTo(0.0325, 10);
    expect(totals.totalInvestment).toBe(400_000);
    expect(totals.count).toBe(2);
  });

  it('sums cashflowMonthly and remainingDebt (plain sums, not weighted/averaged)', () => {
    const items = [
      makeItem({ cashflowAfterTaxMonthly: -500, remainingDebtNow: 80_000 }),
      makeItem({ cashflowAfterTaxMonthly: 200, remainingDebtNow: 120_000 }),
    ];

    const totals = computePortfolioTotals(items);

    // Plain sums: -500 + 200 = -300 and 80_000 + 120_000 = 200_000.
    // An (incorrect) average would give -150 and 100_000 instead.
    expect(totals.cashflowMonthly).toBe(-300);
    expect(totals.remainingDebt).toBe(200_000);
  });
});
