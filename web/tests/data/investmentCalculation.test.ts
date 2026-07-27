import { describe, it, expect } from 'vitest';
import { computeInvestmentKPIs, ZERO_SENSITIVITY, type InvestmentCalculatorValues } from '@/lib/data/investmentCalculation';

function makeValues(overrides: Partial<InvestmentCalculatorValues> = {}): InvestmentCalculatorValues {
  return {
    name: 'Test ETW',
    purchasePriceUnit: 250_000,
    purchasePriceParking: 13_600,
    landTransferTax: 15_027,
    notaryCosts: 3_500,
    landRegistryCosts: 1_200,
    agentFee: 0,
    appraisalCosts: 0,
    renovationModernizationCosts: 0,
    renovationAfaEligible: 0,
    coldRentMonthly: 950,
    parkingRentMonthly: 0,
    otherIncomeMonthly: 0,
    vacancyRateAssumption: 0.03,
    loanAmount: 230_000,
    interestRate: 0.043,
    amortizationRate: 0.01,
    monthlyMortgage: 1_015,
    loanStartDate: '2026-01-01',
    hoaFeeTotalMonthly: 0,
    hoaFeeRecoverableMonthly: 0,
    hoaFeeMaintenanceReserveMonthly: 0,
    propertyManagementAnnual: 0,
    propertyInsuranceAnnual: 0,
    otherCostsMonthly: 0,
    buildingValue: 0,
    depreciationRate: 0.02,
    marginalTaxRate: 0,
    ...overrides,
  };
}

describe('computeInvestmentKPIs — stage unlocking', () => {
  it('hasBaseData is true once name, purchase price and rent are set', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    expect(kpis.hasBaseData).toBe(true);
  });

  it('hasBaseData is false when name is empty', () => {
    const kpis = computeInvestmentKPIs(makeValues({ name: '' }), ZERO_SENSITIVITY);
    expect(kpis.hasBaseData).toBe(false);
  });

  it('hasFinancingData is false without a loan', () => {
    const kpis = computeInvestmentKPIs(makeValues({ loanAmount: 0 }), ZERO_SENSITIVITY);
    expect(kpis.hasFinancingData).toBe(false);
  });

  it('hasFinancingData is true with loan, interest and amortization set', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    expect(kpis.hasFinancingData).toBe(true);
  });

  it('hasCostData requires financing data plus at least one cost field', () => {
    const withoutCosts = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    expect(withoutCosts.hasCostData).toBe(false);

    const withCosts = computeInvestmentKPIs(makeValues({ hoaFeeTotalMonthly: 180 }), ZERO_SENSITIVITY);
    expect(withCosts.hasCostData).toBe(true);
  });

  it('hasTaxData requires cost data plus marginal tax rate and building value', () => {
    const withCosts = computeInvestmentKPIs(makeValues({ hoaFeeTotalMonthly: 180 }), ZERO_SENSITIVITY);
    expect(withCosts.hasTaxData).toBe(false);

    const withTax = computeInvestmentKPIs(
      makeValues({ hoaFeeTotalMonthly: 180, buildingValue: 180_000, marginalTaxRate: 0.42 }),
      ZERO_SENSITIVITY
    );
    expect(withTax.hasTaxData).toBe(true);
  });
});

describe('computeInvestmentKPIs — KPI values', () => {
  it('grossYield = (coldRent + parkingRent) * 12 / purchasePrice', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    const purchasePrice = 250_000 + 13_600;
    expect(kpis.grossYield).toBeCloseTo((950 * 12) / purchasePrice, 4);
  });

  it('ltvRatio = loanAmount / totalInvestment', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    expect(kpis.ltvRatio).toBeCloseTo(kpis.loanAmount / kpis.totalInvestment, 4);
  });

  it('cashOnCashReturn is null until cost data is present', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    expect(kpis.cashOnCashReturn).toBeNull();
  });

  it('mietmultiplikator = purchasePrice / (coldRent + parkingRent) yearly', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    const purchasePrice = 250_000 + 13_600;
    expect(kpis.mietmultiplikator).toBeCloseTo(purchasePrice / (950 * 12), 4);
  });

  it('dscrNOI = netOperatingIncomeYearly / debtServiceAnnual', () => {
    const kpis = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    // Base fixture has zero HOA/management/insurance/other costs, so effective
    // gross income (after vacancy) is the entire NOI.
    const netOperatingIncomeYearly = 950 * 12 * (1 - 0.03);
    const debtServiceAnnual = 1_015 * 12;
    expect(kpis.dscrNOI).toBeCloseTo(netOperatingIncomeYearly / debtServiceAnnual, 4);
  });

  it('breakEvenRentMonthly = non-recoverable operating costs + monthlyMortgage', () => {
    const kpis = computeInvestmentKPIs(makeValues({ hoaFeeTotalMonthly: 180 }), ZERO_SENSITIVITY);
    // hoaFeeRecoverableMonthly and hoaFeeMaintenanceReserveMonthly are both 0, so the
    // entire hoaFeeTotalMonthly is non-recoverable; management/insurance/other are 0.
    expect(kpis.breakEvenRentMonthly).toBeCloseTo(180 + 1_015, 2);
  });

  it('dscrNOI, ltvRatio and breakEvenRentMonthly are all null without financing data', () => {
    const kpis = computeInvestmentKPIs(makeValues({ loanAmount: 0 }), ZERO_SENSITIVITY);
    expect(kpis.dscrNOI).toBeNull();
    expect(kpis.ltvRatio).toBeNull();
    expect(kpis.breakEvenRentMonthly).toBeNull();
  });

  it('cashflowAfterTaxMonthly equals cashflowAfterDebtMonthly when marginalTaxRate is 0', () => {
    const kpis = computeInvestmentKPIs(
      makeValues({ hoaFeeTotalMonthly: 180, buildingValue: 180_000, marginalTaxRate: 0 }),
      ZERO_SENSITIVITY
    );
    expect(kpis.cashflowAfterTaxMonthly).toBeCloseTo(kpis.cashflowAfterDebtMonthly, 2);
  });
});

describe('computeInvestmentKPIs — sensitivity', () => {
  it('rentDelta shifts effectiveColdRentMonthly and increases cashflow', () => {
    const base = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    const bumped = computeInvestmentKPIs(makeValues(), { ...ZERO_SENSITIVITY, rentDelta: 100 });
    expect(bumped.effectiveColdRentMonthly).toBeCloseTo(base.effectiveColdRentMonthly + 100, 2);
    expect(bumped.cashflowAfterDebtMonthly).toBeGreaterThan(base.cashflowAfterDebtMonthly);
  });

  it('rentDelta never pushes effective rent below zero', () => {
    const kpis = computeInvestmentKPIs(makeValues({ coldRentMonthly: 50 }), { ...ZERO_SENSITIVITY, rentDelta: -500 });
    expect(kpis.effectiveColdRentMonthly).toBe(0);
  });

  it('rateDelta recalculates the effective monthly mortgage', () => {
    const base = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    const bumped = computeInvestmentKPIs(makeValues(), { ...ZERO_SENSITIVITY, rateDelta: 0.01 });
    expect(bumped.effectiveInterestRate).toBeCloseTo(base.effectiveInterestRate + 0.01, 4);
    expect(bumped.monthlyMortgage).toBeGreaterThan(base.monthlyMortgage);
  });

  it('priceDelta shifts effectivePurchasePriceUnit by the delta amount', () => {
    const base = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    const bumped = computeInvestmentKPIs(makeValues(), { ...ZERO_SENSITIVITY, priceDelta: -20_000 });
    expect(bumped.effectivePurchasePriceUnit).toBeCloseTo(base.effectivePurchasePriceUnit - 20_000, 2);
  });

  it('priceDelta never pushes effectivePurchasePriceUnit below 1', () => {
    const kpis = computeInvestmentKPIs(makeValues(), { ...ZERO_SENSITIVITY, priceDelta: -1_000_000 });
    expect(kpis.effectivePurchasePriceUnit).toBe(1);
  });

  it('vacancyDelta shifts effectiveVacancyRate by the delta amount', () => {
    const base = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    const bumped = computeInvestmentKPIs(makeValues(), { ...ZERO_SENSITIVITY, vacancyDelta: 0.05 });
    expect(bumped.effectiveVacancyRate).toBeCloseTo(base.effectiveVacancyRate + 0.05, 4);
  });

  it('vacancyDelta clamps effectiveVacancyRate to [0, 1] at extremes', () => {
    const low = computeInvestmentKPIs(makeValues(), { ...ZERO_SENSITIVITY, vacancyDelta: -1 });
    const high = computeInvestmentKPIs(makeValues(), { ...ZERO_SENSITIVITY, vacancyDelta: 1 });
    expect(low.effectiveVacancyRate).toBe(0);
    expect(high.effectiveVacancyRate).toBe(1);
  });

  it('maintenanceDelta increases non-recoverable costs and decreases cashflowAfterDebtMonthly', () => {
    const base = computeInvestmentKPIs(makeValues(), ZERO_SENSITIVITY);
    const bumped = computeInvestmentKPIs(makeValues(), { ...ZERO_SENSITIVITY, maintenanceDelta: 50 });
    // Base fixture's non-recoverable HOA cost is 0, so the +50 delta isn't clamped by
    // the Math.max(0, ...) floor: it flows straight through to yearly costs (*12) and
    // back down to monthly cashflow, i.e. an exact -50/month shift.
    expect(bumped.cashflowAfterDebtMonthly).toBeCloseTo(base.cashflowAfterDebtMonthly - 50, 2);
  });
});
