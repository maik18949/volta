// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { OverviewKpiBar } from '@/components/property/overview/OverviewKpiBar';
import { scalePosition } from '@/lib/calculations/kpiCalculator';
import type { PropertySummary } from '@/lib/data/propertySummary';
import type { OverviewMetrics } from '@/lib/data/propertyOverview';

afterEach(cleanup);

function makeSummary(overrides: Partial<PropertySummary> = {}): PropertySummary {
  return {
    totalInvestment: 0,
    totalPurchasePrice: 0,
    purchasePricePerSqm: 0,
    remainingDebtNow: 0,
    netYield: null,
    netOperatingIncomeYearly: 0,
    currentStatus: 'vermietet',
    cashflowAfterTaxMonthly: 0,
    incomeActualMonthly: 0,
    incomeWohnungMonthly: 0,
    incomeStellplatzMonthly: 0,
    cashflowBeforeTaxMonthly: 0,
    taxEffectMonthly: 0,
    taxEffectYearly: 0,
    runningCostsBreakdown: [],
    ...overrides,
  };
}

function makeOverview(overrides: Partial<OverviewMetrics> = {}): OverviewMetrics {
  return {
    grossYield: null,
    cashOnCash: null,
    eigenkapitalrendite: null,
    kaufpreisfaktor: null,
    dscr: null,
    ltv: null,
    actualVacancyRate: null,
    cashflowBeforeTaxYear: 0,
    eigenkapitalrenditeNumerator: 0,
    leerstandDaysSinceTransfer: 0,
    ownershipDaysSinceTransfer: 0,
    leerstandDaysThisYear: 0,
    ownershipDaysThisYear: 0,
    actualVacancyRateYear: null,
    breakEvenRentMonthly: 0,
    equityUsed: 0,
    currentMarketValue: null,
    valueGain: null,
    valueGainPercent: null,
    ...overrides,
  };
}

/** Reads the `left` percentage of a KpiScale marker (its only inline-styled child) inside a container. */
function markerLeftPercent(container: HTMLElement): number {
  const marker = container.querySelector('[style]') as HTMLElement;
  return Number(marker.style.left.replace('%', ''));
}

describe('OverviewKpiBar — KPI scale positions', () => {
  it('places the Nettorendite marker at scalePosition(netYield), not a hardcoded/mismatched value', () => {
    // netYield domain [0, 0.08] -> 0.033 is not the midpoint, so this also catches an
    // accidental swap with a different KPI's domain (which would land at a different %).
    const netYield = 0.033;
    const { container } = render(<OverviewKpiBar summary={makeSummary({ netYield })} overview={makeOverview()} />);
    const scales = container.querySelectorAll('.rounded-\\[14px\\] > div');
    const netYieldTile = scales[1] as HTMLElement; // CF | Nettorendite | Cash-on-Cash | DSCR
    expect(markerLeftPercent(netYieldTile)).toBeCloseTo(scalePosition('netYield', netYield) * 100, 5);
  });

  it('places the Cash-on-Cash marker at scalePosition(cashOnCash), including a negative value clamped correctly', () => {
    const cashOnCash = -0.291;
    const { container } = render(<OverviewKpiBar summary={makeSummary()} overview={makeOverview({ cashOnCash })} />);
    const scales = container.querySelectorAll('.rounded-\\[14px\\] > div');
    const cocTile = scales[2] as HTMLElement;
    expect(markerLeftPercent(cocTile)).toBeCloseTo(scalePosition('cashOnCash', cashOnCash) * 100, 5);
  });

  it('places the DSCR marker at scalePosition(dscr) — a KPI using a plain-number domain, not a percent', () => {
    const dscr = 0.65;
    const { container } = render(<OverviewKpiBar summary={makeSummary()} overview={makeOverview({ dscr })} />);
    const scales = container.querySelectorAll('.rounded-\\[14px\\] > div');
    const dscrTile = scales[3] as HTMLElement;
    expect(markerLeftPercent(dscrTile)).toBeCloseTo(scalePosition('dscr', dscr) * 100, 5);
  });
});
