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
});
