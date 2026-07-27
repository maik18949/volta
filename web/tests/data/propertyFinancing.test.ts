import { describe, it, expect } from 'vitest';
import { fixtures as f } from '../calculations/fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import { monthsBetween } from '@/lib/calculations/dateHelpers';
import { remainingDebt } from '@/lib/calculations/amortizationCalculator';
import type { Database } from '@/lib/supabase/types';
import { computeFinancingOverview } from '@/lib/data/propertyFinancing';
import { computeAmortizationYearTable } from '@/lib/data/propertyFinancing';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

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

describe('computeFinancingOverview', () => {
  const property = makeProperty(); // loan_start_date: '2025-10-01', fixed_interest_period_years: 10
  const today = makeDate(2026, 6, 15);

  it('hasFinancing is false when loan_amount is 0', () => {
    const result = computeFinancingOverview(makeProperty({ loan_amount: 0 }), today);
    expect(result.hasFinancing).toBe(false);
  });

  it('hasFinancing is true and loanAmount matches the property', () => {
    const result = computeFinancingOverview(property, today);
    expect(result.hasFinancing).toBe(true);
    if (result.hasFinancing) expect(result.loanAmount).toBe(f.loanAmount);
  });

  it('remainingDebtNow matches amortizationCalculator.remainingDebt directly', () => {
    const result = computeFinancingOverview(property, today);
    const monthsSinceLoanStart = monthsBetween(f.loanStartDate, today) - 1;
    const expected = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, monthsSinceLoanStart);
    if (result.hasFinancing) expect(result.remainingDebtNow).toBeCloseTo(expected, 1);
  });

  it('fixedRateEndDate is loanStartDate + fixedInterestPeriodYears years', () => {
    const result = computeFinancingOverview(property, today);
    if (result.hasFinancing) {
      expect(result.fixedRateEndDate.getUTCFullYear()).toBe(2035);
      expect(result.fixedRateEndDate.getUTCMonth()).toBe(9); // October, 0-indexed
    }
  });

  it('yearsRemainingUntilFixedRateEnd shrinks over time and never goes negative', () => {
    const earlier = computeFinancingOverview(property, makeDate(2026, 1, 1));
    const later = computeFinancingOverview(property, makeDate(2030, 1, 1));
    const afterFixedRateEnd = computeFinancingOverview(property, makeDate(2036, 1, 1));
    if (earlier.hasFinancing && later.hasFinancing && afterFixedRateEnd.hasFinancing) {
      expect(later.yearsRemainingUntilFixedRateEnd).toBeLessThan(earlier.yearsRemainingUntilFixedRateEnd);
      expect(afterFixedRateEnd.yearsRemainingUntilFixedRateEnd).toBe(0);
    }
  });

  it('remainingDebtAtFixedRateEnd matches remainingDebt at that month count', () => {
    const result = computeFinancingOverview(property, today);
    const monthsToFixedRateEnd = monthsBetween(f.loanStartDate, makeDate(2035, 10, 1)) - 1;
    const expected = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, monthsToFixedRateEnd);
    if (result.hasFinancing) expect(result.remainingDebtAtFixedRateEnd).toBeCloseTo(expected, 1);
  });
});

describe('computeAmortizationYearTable', () => {
  const property = makeProperty();
  const today = makeDate(2026, 6, 15);

  it('hasFinancing is false and rows is empty when loan_amount is 0', () => {
    const result = computeAmortizationYearTable(makeProperty({ loan_amount: 0 }), today);
    expect(result.hasFinancing).toBe(false);
    expect(result.rows).toHaveLength(0);
  });

  it('rows start at the loan start year and chain remainingDebtStart/End across years', () => {
    const result = computeAmortizationYearTable(property, today);
    expect(result.rows[0].year).toBe(2025);
    for (let i = 1; i < result.rows.length; i++) {
      expect(result.rows[i].remainingDebtStart).toBeCloseTo(result.rows[i - 1].remainingDebtEnd, 4);
    }
  });

  it('exactly one row is flagged as the fixed-rate-end year (2035)', () => {
    const result = computeAmortizationYearTable(property, today);
    const flagged = result.rows.filter((r) => r.isFixedRateEndYear);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].year).toBe(2035);
  });

  it('years after the fixed-rate-end year are flagged isPostFixedRatePeriod; the end year itself is not', () => {
    const result = computeAmortizationYearTable(property, today);
    const at2035 = result.rows.find((r) => r.year === 2035)!;
    expect(at2035.isPostFixedRatePeriod).toBe(false);
    const after = result.rows.filter((r) => r.year > 2035);
    expect(after.length).toBeGreaterThan(0);
    for (const row of after) expect(row.isPostFixedRatePeriod).toBe(true);
  });

  it('exactly one row is flagged as the current year', () => {
    const result = computeAmortizationYearTable(property, today);
    const flagged = result.rows.filter((r) => r.isCurrentYear);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].year).toBe(2026);
  });

  it('the schedule is trimmed at payoff (last row reaches ~0), not padded to the full 40-year horizon', () => {
    const result = computeAmortizationYearTable(property, today);
    const lastRow = result.rows[result.rows.length - 1];
    expect(lastRow.remainingDebtEnd).toBeCloseTo(0, 1);
    // Fixture loan (230000 @ 4.3%, ~1% Tilgung) pays off ~2051 -> well under a 40-year window.
    expect(result.rows.length).toBeLessThan(40);
  });
});
