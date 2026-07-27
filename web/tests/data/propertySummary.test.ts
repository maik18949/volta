import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';
import { computePropertySummary } from '@/lib/data/propertySummary';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusEntryRow = Database['public']['Tables']['status_entries']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: 'prop-1',
    user_id: 'user-1',
    name: 'ETW Dresden Neustadt',
    address: 'Dresdner Str. 12',
    city: 'Dresden',
    state: 'Sachsen',
    postal_code: '01099',
    property_type: 'apartment',
    acquisition_type: 'kauf',
    year_built: null,
    notes: '',
    living_area_sqm: 68,
    usable_area_sqm: null,
    land_area_sqm: null,
    rooms: 3,
    bedrooms: null,
    bathrooms: null,
    floor_level: null,
    has_balcony: false,
    has_terrace: false,
    has_garden: false,
    has_basement: false,
    basement_size_sqm: null,
    has_fitted_kitchen: false,
    parking_type: 'nicht_vorhanden',
    parking_count: 0,
    heating_type: null,
    energy_efficiency_class: null,
    condition: null,
    last_renovation_year: null,
    purchase_date: '2025-10-01',
    economic_transfer_date: '2026-02-01',
    purchase_price_unit: f.purchasePriceUnit,
    purchase_price_parking: f.purchasePriceParking,
    land_transfer_tax: f.landTransferTax,
    notary_costs: f.notaryCosts,
    land_registry_costs: f.landRegistryCosts,
    agent_fee: f.agentFee,
    appraisal_costs: f.appraisalCosts,
    renovation_modernization_costs: f.renovationModernizationCosts,
    renovation_afa_eligible: f.renovationAfaEligible,
    cold_rent_monthly: f.coldRentMonthly,
    warmmiete_monthly: null,
    parking_rent_monthly: f.parkingRentMonthly,
    other_income_monthly: 0,
    vacancy_rate_assumption: f.vacancyRateAssumption,
    market_rent_per_sqm: null,
    current_market_value: null,
    hoa_fee_total_monthly: f.hoaFeeTotalMonthly,
    is_hoa_unit_split: true,
    hoa_fee_recoverable_monthly: f.hoaFeeRecoverableMonthly,
    hoa_fee_maintenance_reserve_monthly: f.maintenanceReserveMonthly,
    property_tax_annual: f.propertyTaxAnnual,
    property_management_annual: f.propertyManagementAnnual,
    property_insurance_annual: 0,
    other_costs_monthly: 0,
    hoa_fee_parking_total_monthly: 0,
    is_hoa_parking_split: false,
    hoa_fee_parking_recoverable_monthly: 0,
    hoa_fee_parking_maintenance_reserve_monthly: 0,
    property_tax_parking_annual: 0,
    loan_amount: f.loanAmount,
    interest_rate: f.interestRate,
    amortization_rate: f.amortizationRate,
    fixed_interest_period_years: 10,
    loan_start_date: '2025-10-01',
    monthly_mortgage: f.monthlyMortgage,
    equity_contributed: 0,
    broker_commission_agreement: 0,
    land_value: f.landValue,
    building_value: f.buildingValue,
    depreciation_rate: f.depreciationRate,
    marginal_tax_rate: f.marginalTaxRate,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeStatusEntry(overrides: Partial<StatusEntryRow> = {}): StatusEntryRow {
  return {
    id: 'status-1',
    property_id: 'prop-1',
    date: '2026-02-01',
    status: 'vermietet',
    income_actual_monthly: null,
    notes: '',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computePropertySummary', () => {
  const property = makeProperty();
  const statusHistory = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);

  it('totalInvestment matches the fixture', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(result.totalInvestment).toBeCloseTo(f.totalInvestment, 0);
  });

  it('totalPurchasePrice, purchasePricePerSqm computed from unit+parking price', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(result.purchasePricePerSqm).toBeCloseTo(f.purchasePrice / 68, 0);
  });

  it('remainingDebtNow is less than the original loan (loan is amortizing)', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(result.remainingDebtNow).toBeLessThan(f.loanAmount);
    expect(result.remainingDebtNow).toBeGreaterThan(0);
  });

  it('remainingDebtNow is "–"-equivalent (0) when there is no loan', () => {
    const noLoanProperty = makeProperty({ loan_amount: 0, monthly_mortgage: 0 });
    const result = computePropertySummary(noLoanProperty, statusHistory, today);
    expect(result.remainingDebtNow).toBe(0);
  });

  it('netYield is a small positive-or-negative fraction, not NaN/Infinity', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(Number.isFinite(result.netYield)).toBe(true);
  });

  it('netOperatingIncomeYearly is present, finite, and matches the hand-computed value for the base fixture', () => {
    // effectiveGrossIncomeYearly = (950 + 48) * 12 * (1 - 0.03) = 11616.72
    // operatingCostsNonRecoverableMonthly = hoaFeeNonRecoverableMonthly(90.24) + reserve(34.76)
    //   + propertyManagement/12(33) + propertyInsurance/12(0) + other(0) = 158.0
    //   where hoaFeeNonRecoverableMonthly = 417 - 292 - 34.76 = 90.24
    // operatingCostsNonRecoverableYearly = 158.0 * 12 = 1896
    // netOperatingIncomeYearly = 11616.72 - 1896 = 9720.72
    const result = computePropertySummary(property, statusHistory, today);
    expect(Number.isFinite(result.netOperatingIncomeYearly)).toBe(true);
    expect(result.netOperatingIncomeYearly).toBeCloseTo(9720.72, 2);
    // netYield must be exactly netOperatingIncomeYearly / totalInvestment (the ratio the
    // Portfolio-Karte's weighted Ø Nettorendite is built from — Σ NOI / Σ totalInvestment).
    expect(result.netYield).toBeCloseTo(result.netOperatingIncomeYearly / result.totalInvestment, 6);
  });

  it('status reflects the most recent StatusEntry at/before today', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(result.currentStatus).toBe('vermietet');
  });

  it('currentStatus is resolved correctly even if statusEntryRows arrive out of date order', () => {
    // leerstand from 2026-01-01, then vermietet from 2026-03-01; today = 2026-06-15, so the
    // correct current status is 'vermietet'. Passing them in DESCENDING order (later row first)
    // would make a naive (unsorted) .reverse().find(...) return the WRONG one ('leerstand'),
    // since reversing an already-descending array yields ascending order and `find` returns the
    // first (oldest) match <= today.
    const outOfOrderHistory = [
      makeStatusEntry({ id: 'status-2', date: '2026-03-01', status: 'vermietet' }),
      makeStatusEntry({ id: 'status-1', date: '2026-01-01', status: 'leerstand' }),
    ];
    const result = computePropertySummary(property, outOfOrderHistory, today);
    expect(result.currentStatus).toBe('vermietet');
  });

  it('cashflowAfterTaxMonthly is finite for the current month', () => {
    const result = computePropertySummary(property, statusHistory, today);
    expect(Number.isFinite(result.cashflowAfterTaxMonthly)).toBe(true);
  });

  it('incomeActualMonthly includes other_income_monthly while vermietet', () => {
    const vermietetEntry = [makeStatusEntry()];
    const withOther = computePropertySummary(makeProperty({ other_income_monthly: 75 }), vermietetEntry, today);
    const withoutOther = computePropertySummary(makeProperty({ other_income_monthly: 0 }), vermietetEntry, today);
    expect(withOther.incomeActualMonthly).toBeCloseTo(withoutOther.incomeActualMonthly + 75, 2);
  });
});

describe('computePropertySummary — hoaFeeNonRecoverableMonthly "davon" derivation', () => {
  // Regression test: hoa_fee_recoverable_monthly and hoa_fee_maintenance_reserve_monthly
  // are both "davon" (of which) subsets of hoa_fee_total_monthly per spec-data-model.md,
  // so hoaFeeNonRecoverableMonthly = total - recoverable - reserve. The reserve is then
  // added back separately for operatingCostsNonRecoverableMonthly (it's a real cash
  // outflow, just not tax-deductible) — so it must NOT also be excluded from the
  // "recoverable" subtraction, or it gets double-counted (once via the reserve-inclusive
  // subtraction, once via being added back).
  //
  // Two properties share the same hoa_fee_total_monthly (400/month) and rent
  // (1000/month cold rent, fully vermietet all year). No loan (loanAmount=0 ->
  // interestYear=0), no AfA (building_value=0 -> afaBasis=0), marginal_tax_rate=0
  // (isolates the assertion from tax-effect math, which is already covered above and
  // in taxCalculator.test.ts) and acquisition well before the test year (no proration):
  //
  //  - noSplit: recoverable=0, reserve=0
  //      hoaFeeNonRecoverableMonthly = 400 - 0 - 0 = 400
  //      operatingCostsNonRecoverableMonthly = 400 + 0 (reserve) = 400
  //      cashflowBeforeTax = 1000 - 0 (mortgage) - 400 - 0 (ownerBorneRecoverableWE, always
  //        0 while vermietet) = 600 = cashflowAfterTaxMonthly (tax rate 0)
  //
  //  - split: recoverable=100, reserve=50
  //      hoaFeeNonRecoverableMonthly = 400 - 100 - 50 = 250
  //      operatingCostsNonRecoverableMonthly = 250 + 50 (reserve) = 300
  //      cashflowBeforeTax = 1000 - 0 - 300 - 0 = 700 = cashflowAfterTaxMonthly
  //
  // Splitting the SAME total into recoverable+reserve+remainder must shift
  // cashflowAfterTaxMonthly by exactly the recoverable amount (100) — because while
  // vermietet, only the recoverable portion is assumed tenant-covered via Nebenkosten,
  // and the reserve remains an owner-borne cash cost either way (folded into "400"
  // when unsplit, carved out but added straight back in when split). If the reserve
  // were double-counted (the bug this guards against — subtracting only `recoverable`,
  // not `recoverable + reserve`), operatingCostsNonRecoverableMonthly for `split` would
  // be 350 instead of 300, cashflowAfterTaxMonthly would be 650 instead of 700, and the
  // diff below would be 50 instead of 100.
  const sharedOverrides: Partial<PropertyRow> = {
    loan_amount: 0,
    monthly_mortgage: 0,
    building_value: 0,
    renovation_afa_eligible: 0,
    land_transfer_tax: 0,
    notary_costs: 0,
    land_registry_costs: 0,
    agent_fee: 0,
    appraisal_costs: 0,
    renovation_modernization_costs: 0,
    cold_rent_monthly: 1000,
    parking_rent_monthly: 0,
    hoa_fee_total_monthly: 400,
    property_tax_annual: 0,
    property_management_annual: 0,
    property_insurance_annual: 0,
    other_costs_monthly: 0,
    hoa_fee_parking_total_monthly: 0,
    hoa_fee_parking_recoverable_monthly: 0,
    hoa_fee_parking_maintenance_reserve_monthly: 0,
    property_tax_parking_annual: 0,
    marginal_tax_rate: 0,
    economic_transfer_date: '2020-01-01',
    loan_start_date: '2020-01-01',
  };
  const statusHistory = [makeStatusEntry({ date: '2020-01-01' })];
  const today = makeDate(2026, 6, 15);

  it('splitting the same hoa_fee_total_monthly into recoverable+reserve shifts cashflow by the recoverable amount only, not recoverable+reserve', () => {
    const noSplit = makeProperty({
      ...sharedOverrides,
      is_hoa_unit_split: false,
      hoa_fee_recoverable_monthly: 0,
      hoa_fee_maintenance_reserve_monthly: 0,
    });
    const split = makeProperty({
      ...sharedOverrides,
      is_hoa_unit_split: true,
      hoa_fee_recoverable_monthly: 100,
      hoa_fee_maintenance_reserve_monthly: 50,
    });

    const noSplitResult = computePropertySummary(noSplit, statusHistory, today);
    const splitResult = computePropertySummary(split, statusHistory, today);

    expect(noSplitResult.cashflowAfterTaxMonthly).toBeCloseTo(600, 2);
    expect(splitResult.cashflowAfterTaxMonthly).toBeCloseTo(700, 2);
    expect(splitResult.cashflowAfterTaxMonthly - noSplitResult.cashflowAfterTaxMonthly).toBeCloseTo(100, 2);
  });
});

describe('computePropertySummary — Card 1 breakdown fields', () => {
  const statusHistory = [makeStatusEntry()];
  const today = makeDate(2026, 6, 15);

  it('exposes incomeActualMonthly, cashflowBeforeTaxMonthly, taxEffectMonthly, taxEffectYearly', () => {
    // No loan, no AfA (building_value 0 -> afaBasis 0), tax rate 0 -> taxEffect is
    // deterministically 0 regardless of taxableIncome, isolating the cashflow math.
    const property = makeProperty({
      loan_amount: 0,
      monthly_mortgage: 0,
      building_value: 0,
      marginal_tax_rate: 0,
      cold_rent_monthly: 1000,
      parking_rent_monthly: 0,
      hoa_fee_total_monthly: 400,
      hoa_fee_recoverable_monthly: 0,
      hoa_fee_maintenance_reserve_monthly: 0,
      property_management_annual: 0,
      property_insurance_annual: 0,
      other_costs_monthly: 0,
    });
    const result = computePropertySummary(property, statusHistory, today);

    expect(result.incomeActualMonthly).toBeCloseTo(1000, 2);
    // operatingCostsNonRecoverableMonthly = hoaFeeNonRecoverable(400) + reserve(0) = 400
    // cashflowBeforeTax = 1000 - 0 (mortgage) - 400 - 0 (ownerBorneRecoverableWE, vermietet) = 600
    expect(result.cashflowBeforeTaxMonthly).toBeCloseTo(600, 2);
    expect(result.taxEffectMonthly).toBeCloseTo(0, 2);
    expect(result.taxEffectYearly).toBeCloseTo(0, 2);
    expect(result.cashflowAfterTaxMonthly).toBeCloseTo(600, 2);
  });
});
